// =============================================================================
// Casa Coffee Colab — create-checkout-session (Edge Function, Deno)
// Cria um Checkout hospedado do ASAAS. Dois modos:
//   • ASSINATURA  (body { tier_slug }) → chargeTypes ['RECURRENT'] + subscription.
//                 billingTypes = ['CREDIT_CARD'] (recorrência no Asaas é cartão-só).
//   • LOJA        (body { items: [{product_slug, variant, qtd}] }) → ['DETACHED'].
//                 billingTypes = ['PIX','CREDIT_CARD'].
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
  getEffectiveSubscription,
  asaasPost,
  asaasPut,
  reaisFromCentavos,
  AsaasError,
  type CartInputItem,
} from '../_shared/lib.ts';

// minutesToExpire do checkout hospedado (link deixa de valer depois disso).
const CHECKOUT_EXPIRA_MIN = 60;

// NÃO enviamos customerData: quando o objeto é enviado, o Asaas exige cpfCnpj +
// endereço COMPLETO (address/addressNumber/postalCode/province), e a gente NÃO
// coleta nem guarda CPF/endereço. Sem customerData, a PÁGINA HOSPEDADA do Asaas
// coleta nome/CPF/e-mail/telefone/endereço direto do pagador (ver CLAUDE.md).

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== 'POST') return jsonResponse({ error: 'método não permitido' }, 405);

  // 1) Só usuário autenticado (JWT válido).
  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'não autenticado' }, 401);

  // 2) Body.
  let body: { tier_slug?: unknown; items?: unknown; upgrade_to_tier?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const site = getSiteUrl();
  const cancel_url = `${site}/pages/checkout-cancelado.html`;

  try {
    // -------------------------------------------------------------------------
    // MODO UPGRADE (proporcional) — quando vem `upgrade_to_tier`.
    // A pessoa tem assinatura VIGENTE (ativa ou pausada em graça) e quer subir de
    // tier. Cobra AGORA só a diferença proporcional aos dias que faltam do ciclo:
    //   delta = floor((precoNovo − precoAtual) × diasRestantes / 30)
    // A mensalidade recorrente vira o preço CHEIO do tier novo no próximo
    // vencimento — o webhook (upg:) faz o PUT do value quando o delta é pago.
    // Tudo calculado server-side (nunca confia no client). Só upgrade (preço
    // maior); downgrade fica fora de escopo por ora.
    // -------------------------------------------------------------------------
    if (typeof body.upgrade_to_tier === 'string' && body.upgrade_to_tier) {
      const toSlug = body.upgrade_to_tier;

      // Assinatura vigente do PRÓPRIO usuário (gating por status/período; nunca id
      // vindo do client).
      const sub = await getEffectiveSubscription(user.id);
      if (!sub || !sub.asaas_subscription_id) {
        return jsonResponse({ error: 'você não tem uma assinatura vigente pra dar upgrade' }, 400);
      }
      if (sub.tier_slug === toSlug) {
        return jsonResponse({ error: 'você já está nesse plano' }, 400);
      }

      // Preços dos DOIS tiers, do BANCO.
      const { data: tiersData, error: tErr } = await supabaseAdmin
        .from('tiers')
        .select('slug, nome, preco_centavos, ativo')
        .in('slug', [sub.tier_slug, toSlug]);
      if (tErr) return jsonResponse({ error: 'erro ao buscar os planos' }, 500);
      const atual = (tiersData ?? []).find((t) => t.slug === sub.tier_slug);
      const novo = (tiersData ?? []).find((t) => t.slug === toSlug);
      if (!novo || !novo.ativo || !novo.preco_centavos || novo.preco_centavos <= 0) {
        return jsonResponse({ error: 'plano de destino indisponível' }, 400);
      }
      if (!atual || !atual.preco_centavos || atual.preco_centavos <= 0) {
        return jsonResponse({ error: 'plano atual indisponível' }, 400);
      }
      if (novo.preco_centavos <= atual.preco_centavos) {
        return jsonResponse({ error: 'esse plano não é um upgrade do teu atual' }, 400);
      }

      // Dias restantes do ciclo (0..30). Sem período conhecido → assume ciclo cheio.
      const CICLO_DIAS = 30;
      const now = Date.now();
      const endMs = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN;
      let diasRestantes = CICLO_DIAS;
      if (Number.isFinite(endMs)) {
        diasRestantes = Math.ceil((endMs - now) / 86_400_000);
      }
      diasRestantes = Math.max(0, Math.min(CICLO_DIAS, diasRestantes));

      // Diferença proporcional, em centavos (floor, nunca negativo).
      const diffCentavos = novo.preco_centavos - atual.preco_centavos;
      const delta_centavos = Math.max(
        0,
        Math.floor((diffCentavos * diasRestantes) / CICLO_DIAS),
      );

      // Delta abaixo do mínimo do Asaas (~R$5) → aplica o upgrade na hora, sem
      // cobrar (são centavos): sobe o value recorrente e o tier já.
      const ASAAS_MIN_CENTAVOS = 500;
      if (delta_centavos < ASAAS_MIN_CENTAVOS) {
        // 1) Sobe o value recorrente no Asaas.
        await asaasPut(`/subscriptions/${encodeURIComponent(sub.asaas_subscription_id)}`, {
          value: reaisFromCentavos(novo.preco_centavos),
        });
        // 2) Espelha o tier novo no banco: subscriptions PRIMEIRO (é dela que
        // getEffectiveSubscription/getUserTierDiscount leem o tier), profiles depois.
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ tier_slug: toSlug, updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        const { error: profErr } = subErr
          ? { error: null }
          : await supabaseAdmin.from('profiles').update({ tier_slug: toSlug }).eq('id', user.id);
        // Se QUALQUER passo falhar, DESFAZ tudo que pôde ter sido aplicado — senão
        // sobra divergência silenciosa: ou "pagaria mais sem receber o tier", ou (pior)
        // subscriptions já no tier novo enquanto o Asaas volta ao preço antigo →
        // benefício sem pagamento. Reverte na ordem inversa (banco → Asaas), best-effort,
        // e devolve 500 pra pessoa retentar, em vez de fingir que aplicou.
        if (subErr || profErr) {
          // subscriptions.tier_slug só precisa voltar se ELE foi de fato gravado
          // (subErr nulo). Volta pro tier atual (sub.tier_slug), não pro novo.
          if (!subErr) {
            const { error: revSubErr } = await supabaseAdmin
              .from('subscriptions')
              .update({ tier_slug: sub.tier_slug, updated_at: new Date().toISOString() })
              .eq('id', sub.id);
            if (revSubErr) {
              console.error('[create-checkout] falha ao reverter tier_slug da subscription:', revSubErr);
            }
          }
          try {
            await asaasPut(`/subscriptions/${encodeURIComponent(sub.asaas_subscription_id)}`, {
              value: reaisFromCentavos(atual.preco_centavos),
            });
          } catch (revErr) {
            console.error('[create-checkout] falha ao reverter value no Asaas:', revErr);
          }
          throw subErr || profErr;
        }
        return jsonResponse({ applied: true, valor_delta_centavos: delta_centavos });
      }

      // Cobrança única (DETACHED) da diferença. PIX + Cartão (é avulsa, não recorre).
      // externalReference = `upg:<user_id>:<toTier>:<asaas_subscription_id>:<nonce>`.
      // O webhook aplica o upgrade quando ESTE checkout for pago.
      const upgradeRef = `upg:${user.id}:${toSlug}:${sub.asaas_subscription_id}:${crypto.randomUUID()}`;
      const checkout: any = await asaasPost('/checkouts', {
        billingTypes: ['PIX', 'CREDIT_CARD'],
        chargeTypes: ['DETACHED'],
        minutesToExpire: CHECKOUT_EXPIRA_MIN,
        externalReference: upgradeRef,
        callback: {
          successUrl: `${site}/pages/checkout-sucesso.html?upgrade=1`,
          cancelUrl: cancel_url,
          expiredUrl: cancel_url,
          autoRedirect: true,
        },
        items: [
          {
            name: `Upgrade pro Plano ${novo.nome}`,
            description: `diferença proporcional · ${diasRestantes} ${diasRestantes === 1 ? 'dia restante' : 'dias restantes'} do ciclo`,
            quantity: 1,
            value: reaisFromCentavos(delta_centavos),
          },
        ],
      });

      return jsonResponse({ url: checkout.link, valor_delta_centavos: delta_centavos });
    }

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
          subtotal_centavos: subtotal_cents,
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

    // TRAVA ANTI-DUPLICAÇÃO (evita cobrança dobrada): se a pessoa JÁ tem uma
    // assinatura vigente (ativa, ou pausada ainda no período pago), abrir um novo
    // checkout de assinatura criaria uma SEGUNDA recorrência no Asaas — dois
    // cartões cobrados todo mês. Quem já assina troca de plano pelo UPGRADE (perfil),
    // não por um checkout novo. Só deixa passar quem não tem nada vigente (inclui
    // 'cancelada' de verdade — Asaas 404 — que aí vira reassinatura legítima).
    const jaVigente = await getEffectiveSubscription(user.id);
    if (jaVigente) {
      return jsonResponse(
        {
          error:
            'você já tem uma assinatura vigente. pra trocar de plano, usa o upgrade na tua conta 💛',
          ja_assina: true,
          tier_atual: jaVigente.tier_slug ?? null,
        },
        409,
      );
    }

    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (1ª cobrança hoje)
    // externalReference da assinatura: `sub:<user_id>:<tier_slug>:<nonce>`. O nonce
    // (uuid) torna a resolução no webhook inequívoca — mesmo que o usuário cancele e
    // reassine o MESMO tier (GET /subscriptions?externalReference retorna 1 só).
    // O webhook faz split(':') e lê [1]=user_id, [2]=tier_slug (nonce é ignorado).
    const nonce = crypto.randomUUID();
    const checkout: any = await asaasPost('/checkouts', {
      // Assinatura = SÓ cartão. O Asaas recusa RECURRENT com PIX ("CREDIT_CARD é o
      // único método permitido para operações RECURRENT"; PIX exige DETACHED) —
      // Pix não pode ser debitado automaticamente todo mês. A loja (DETACHED) segue
      // com PIX + CREDIT_CARD; só a assinatura é cartão-só.
      billingTypes: ['CREDIT_CARD'],
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
        // CRÍTICO p/ vincular a assinatura no webhook: carimba o NOSSO
        // externalReference NA ASSINATURA criada — não só no checkout. O Asaas NÃO
        // copia o externalReference do checkout pra subscription nem pros pagamentos
        // dela; sem isto, `GET /subscriptions?externalReference` volta vazio no
        // CHECKOUT_PAID e o PAYMENT_CONFIRMED não consegue resolver user/tier (a
        // assinatura não tem o nosso ref). Com isto, tanto o resolveAsaasSubByRef
        // (CHECKOUT_PAID) quanto o fallback do handleSubscriptionPayment (que lê o
        // externalReference da subscription via GET /subscriptions/{id}) passam a
        // achar o `sub:<user>:<tier>:<nonce>`. Campo desconhecido é ignorado pelo
        // Asaas (não dá 400), então é seguro mesmo se o gateway não o honrar.
        externalReference: `sub:${user.id}:${tier.slug}:${nonce}`,
        description: `Assinatura ${tier.nome} · Casa Coffee Colab`,
      },
      items: [
        {
          name: `Plano ${tier.nome}`,
          description: 'assinatura mensal · Casa Coffee Colab',
          quantity: 1,
          value: reaisFromCentavos(tier.preco_centavos),
        },
      ],
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
