// =============================================================================
// Casa Coffee Colab — create-checkout-session (Edge Function, Deno)
// Cria um Checkout hospedado do ASAAS (Pix + Cartão). Dois modos:
//   • ASSINATURA  (body { tier_slug }) → chargeTypes ['RECURRENT'] + subscription.
//   • LOJA        (body { items: [{product_slug, variant, qtd}] }) → ['DETACHED'].
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Verifica o JWT do usuário logado — só autenticado cria checkout.
//   • NUNCA confia em preço/total vindo do client. Assinatura: preço do BANCO
//     pelo tier_slug. Loja: subtotal somado server-side em products/variants
//     (computeCartFromDb) e desconto do tier ATIVO (getUserTierDiscount).
//   • CPF é digitado pelo pagador na PÁGINA do Asaas (a gente não guarda CPF).
//   • successUrl/cancelUrl montadas server-side a partir de SITE_URL (env).
//   • Comportamento idêntico em sandbox e prod — muda só a chave (secrets).
//
// CORRELAÇÃO (webhook):
//   • LOJA: a gente PRÉ-CRIA o pedido 'pendente' (+ order_items) e usa o
//     `orders.id` como externalReference do checkout. O Asaas não tem campo de
//     desconto, então o carrinho vira UM item consolidado cujo value = total JÁ
//     COM DESCONTO (a discriminação por item fica em order_items, no banco).
//   • ASSINATURA: externalReference = `sub:<user_id>:<tier_slug>` (o webhook
//     resolve a assinatura do Asaas por esse externalReference).
//
// Retorna: { url } — o front redireciona pro Checkout do Asaas.
// =============================================================================

import {
  supabaseAdmin,
  handleCors,
  jsonResponse,
  getUserFromRequest,
  getSiteUrl,
  computeCartFromDb,
  getUserTierDiscount,
  asaasPost,
  reaisFromCentavos,
  AsaasError,
  type CartInputItem,
} from '../_shared/lib.ts';

// minutesToExpire do checkout hospedado (link deixa de valer depois disso).
const CHECKOUT_EXPIRA_MIN = 60;

// Monta o customerData (prefill) só com o que existe — Asaas rejeita string vazia.
function buildCustomerData(nome?: string | null, email?: string | null, telefone?: string | null) {
  const cd: Record<string, string> = {};
  if (nome) cd.name = nome;
  if (email) cd.email = email;
  if (telefone) cd.phone = telefone;
  return Object.keys(cd).length ? cd : undefined;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== 'POST') return jsonResponse({ error: 'método não permitido' }, 405);

  // 1) Só usuário autenticado (JWT válido).
  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'não autenticado' }, 401);

  // 2) Body.
  let body: { tier_slug?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const site = getSiteUrl();
  const cancel_url = `${site}/pages/checkout-cancelado.html`;

  // Prefill do pagador (nome/telefone do profiles; e-mail do auth). Nunca CPF.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, telefone')
    .eq('id', user.id)
    .maybeSingle();
  const customerData = buildCustomerData(profile?.full_name, user.email, profile?.telefone);

  try {
    // -------------------------------------------------------------------------
    // MODO LOJA (DETACHED) — quando vem `items`.
    // -------------------------------------------------------------------------
    if (Array.isArray(body.items)) {
      const { lines, subtotal_cents } = await computeCartFromDb(body.items as CartInputItem[]);

      // Desconto do tier ATIVO (server-side). Sem assinatura = 0%.
      const { tier_slug, discount_percent } = await getUserTierDiscount(user.id);
      const desconto_centavos = Math.round((subtotal_cents * discount_percent) / 100);
      const total_centavos = subtotal_cents - desconto_centavos;

      // 2.1) PRÉ-CRIA o pedido 'pendente' + itens (server-side; nunca do client).
      // O externalReference do checkout será o orders.id → o webhook finaliza este
      // mesmo pedido (idempotente por orders.id). Se o Asaas falhar, desfaz.
      const { data: order, error: oErr } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pendente',
          origem: 'site',
          subtotal_centavos,
          desconto_centavos,
          total_centavos,
          tier_slug_aplicado: tier_slug,
        })
        .select('id')
        .single();
      if (oErr || !order) {
        console.error('[create-checkout-session] falha ao criar pedido', oErr);
        return jsonResponse({ error: 'não deu pra iniciar o checkout agora' }, 500);
      }

      const rows = lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        variant_id: l.variant_id,
        nome_snapshot: l.nome,
        variante_snapshot: l.variante_label,
        preco_unit_centavos: l.unit_cents,
        qtd: l.qtd,
      }));
      const { error: iErr } = await supabaseAdmin.from('order_items').insert(rows);
      if (iErr) {
        await supabaseAdmin.from('orders').delete().eq('id', order.id); // cascade nos itens
        console.error('[create-checkout-session] falha ao criar itens', iErr);
        return jsonResponse({ error: 'não deu pra iniciar o checkout agora' }, 500);
      }

      // 2.2) Cria o Checkout do Asaas. UM item consolidado = total já com desconto
      // (o Asaas não tem campo de desconto). A discriminação real fica em order_items.
      const totalItens = lines.reduce((s, l) => s + l.qtd, 0);
      const descricao =
        discount_percent > 0
          ? `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} · desconto ${discount_percent}% do teu plano`
          : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;

      let checkout: any;
      try {
        checkout = await asaasPost('/checkouts', {
          billingTypes: ['PIX', 'CREDIT_CARD'],
          chargeTypes: ['DETACHED'],
          minutesToExpire: CHECKOUT_EXPIRA_MIN,
          externalReference: order.id,
          callback: {
            successUrl: `${site}/pages/checkout-sucesso.html?ref=${order.id}`,
            cancelUrl: cancel_url,
            expiredUrl: cancel_url,
            autoRedirect: true,
          },
          items: [
            {
              name: 'Pedido Casa Coffee Colab',
              description: descricao,
              quantity: 1,
              value: reaisFromCentavos(total_centavos),
              externalReference: order.id,
            },
          ],
          customerData,
        });
      } catch (err) {
        // Falhou no Asaas → não deixa pedido órfão.
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        throw err;
      }

      // 2.3) Guarda o id do checkout no pedido (auditoria + UNIQUE de idempotência).
      await supabaseAdmin.from('orders').update({ asaas_checkout_id: checkout.id }).eq('id', order.id);

      return jsonResponse({ url: checkout.link });
    }

    // -------------------------------------------------------------------------
    // MODO ASSINATURA (RECURRENT) — quando vem `tier_slug`.
    // -------------------------------------------------------------------------
    const tier_slug = body.tier_slug;
    if (typeof tier_slug !== 'string' || !tier_slug) {
      return jsonResponse({ error: 'informe tier_slug (assinatura) ou items (loja)' }, 400);
    }

    const { data: tier, error: tierErr } = await supabaseAdmin
      .from('tiers')
      .select('slug, nome, preco_centavos, ativo')
      .eq('slug', tier_slug)
      .maybeSingle();

    if (tierErr) return jsonResponse({ error: 'erro ao buscar o plano' }, 500);
    if (!tier || !tier.ativo) return jsonResponse({ error: 'plano indisponível' }, 400);
    if (!tier.preco_centavos || tier.preco_centavos <= 0) {
      return jsonResponse({ error: 'plano sem preço configurado' }, 400);
    }

    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (1ª cobrança hoje)
    // externalReference da assinatura: `sub:<user_id>:<tier_slug>:<nonce>`. O nonce
    // (uuid) torna a resolução no webhook inequívoca — mesmo que o usuário cancele e
    // reassine o MESMO tier (GET /subscriptions?externalReference retorna 1 só).
    // O webhook faz split(':') e lê [1]=user_id, [2]=tier_slug (nonce é ignorado).
    const nonce = crypto.randomUUID();
    const checkout: any = await asaasPost('/checkouts', {
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: CHECKOUT_EXPIRA_MIN,
      externalReference: `sub:${user.id}:${tier.slug}:${nonce}`,
      callback: {
        successUrl: `${site}/pages/checkout-sucesso.html?assinatura=1`,
        cancelUrl: cancel_url,
        expiredUrl: cancel_url,
        autoRedirect: true,
      },
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: hoje,
      },
      items: [
        {
          name: `Plano ${tier.nome}`,
          description: 'assinatura mensal · Casa Coffee Colab',
          quantity: 1,
          value: reaisFromCentavos(tier.preco_centavos),
        },
      ],
      customerData,
    });

    return jsonResponse({ url: checkout.link });
  } catch (err) {
    // Erros de validação do carrinho (carrinho vazio/produto indisponível/qtd) → 400.
    const msg = (err as Error)?.message ?? '';
    const isValidacao = /carrinho|produto|opção|quantidade|item sem/i.test(msg);
    if (isValidacao) return jsonResponse({ error: msg }, 400);
    if (err instanceof AsaasError) {
      console.error('[create-checkout-session] Asaas', err.status, err.payload);
      return jsonResponse({ error: 'não deu pra iniciar o checkout agora' }, 502);
    }
    console.error('[create-checkout-session]', err);
    return jsonResponse({ error: 'não deu pra iniciar o checkout agora' }, 500);
  }
});
