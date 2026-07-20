// =============================================================================
// Casa Coffee Colab — create-checkout-session (Edge Function, Deno)
// Cria uma Stripe Checkout Session. Dois modos:
//   • ASSINATURA  (6a): body { tier_slug } → mode 'subscription'.
//   • LOJA        (6b): body { items: [{product_slug, variant, qtd}] } → 'payment'.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Verifica o JWT do usuário logado — só autenticado cria checkout.
//   • NUNCA confia em preço/total vindo do client. Assinatura: price do BANCO
//     pelo tier_slug. Loja: subtotal somado server-side em products/variants
//     (computeCartFromDb) e desconto do tier ATIVO (getUserTierDiscount).
//   • success_url/cancel_url montadas server-side a partir de SITE_URL (env).
//   • Comportamento idêntico em test e live — muda só a chave (secrets).
//
// Retorna: { url } — o front redireciona pro Checkout do Stripe.
// =============================================================================

import {
  stripe,
  supabaseAdmin,
  handleCors,
  jsonResponse,
  getUserFromRequest,
  getSiteUrl,
  ensureStripeCustomer,
  computeCartFromDb,
  getUserTierDiscount,
  type CartInputItem,
} from '../_shared/lib.ts';

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
  const success_url = `${site}/pages/checkout-sucesso.html?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${site}/pages/checkout-cancelado.html`;

  try {
    // Cliente do Stripe (reusa/cria) — serve pros dois modos.
    const customerId = await ensureStripeCustomer(user);

    // -------------------------------------------------------------------------
    // MODO LOJA (payment) — quando vem `items`.
    // -------------------------------------------------------------------------
    if (Array.isArray(body.items)) {
      const { lines, subtotal_cents } = await computeCartFromDb(body.items as CartInputItem[]);

      // Desconto do tier ATIVO (server-side). Sem assinatura = 0%.
      const { tier_slug, discount_percent } = await getUserTierDiscount(user.id);

      // Desconto aplicado via Coupon percent_off DINÂMICO (duration 'once').
      // Escolhi coupon em vez de mexer no unit_amount de cada linha porque:
      //   (a) preserva o preço cheio de cada item no Checkout (transparente);
      //   (b) o desconto vira UMA linha clara "-X%" pro cliente;
      //   (c) o webhook lê o valor real cobrado em session.total_details, sem
      //       recalcular rateio/arredondamento por linha.
      // max_redemptions:1 → o coupon efêmero não pode ser reusado.
      let discounts: { coupon: string }[] | undefined;
      if (discount_percent > 0) {
        const coupon = await stripe.coupons.create({
          percent_off: discount_percent,
          duration: 'once',
          name: `Desconto ${tier_slug} (${discount_percent}%)`,
          max_redemptions: 1,
          metadata: { user_id: user.id, tier_slug: tier_slug ?? '' },
        });
        discounts = [{ coupon: coupon.id }];
      }

      // Snapshot COMPACTO do carrinho (server-side) pro webhook criar order_items.
      // Não é dado do client — é o resultado da validação/preço do BANCO.
      const itemsMeta = JSON.stringify(
        lines.map((l) => ({
          sl: l.product_slug,
          vo: l.variant_opcao ?? '',
          n: l.nome,
          u: l.unit_cents,
          q: l.qtd,
        })),
      );
      // Metadata do Stripe: máx. 500 chars por valor. Carrinho enorme → erro gentil.
      if (itemsMeta.length > 490) {
        return jsonResponse({ error: 'carrinho grande demais pro checkout — tira alguns itens?' }, 400);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        client_reference_id: user.id,
        // SEM payment_method_types: o Checkout usa automaticamente os métodos
        // habilitados no Dashboard (cartão já vem; Pix/Boleto é só ligar no painel,
        // ZERO código). É o equivalente ao automatic_payment_methods pro Checkout.
        line_items: lines.map((l) => ({
          quantity: l.qtd,
          price_data: {
            currency: 'brl',
            unit_amount: l.unit_cents, // preço do BANCO, nunca do client
            product_data: { name: l.variante_label ? `${l.nome} — ${l.variante_label}` : l.nome },
          },
        })),
        discounts, // undefined quando não há desconto
        metadata: {
          kind: 'store',
          user_id: user.id,
          tier_slug: tier_slug ?? '',
          discount_percent: String(discount_percent),
          subtotal_cents: String(subtotal_cents),
          items: itemsMeta,
        },
        payment_intent_data: { metadata: { kind: 'store', user_id: user.id } },
        success_url,
        cancel_url,
      });

      return jsonResponse({ url: session.url });
    }

    // -------------------------------------------------------------------------
    // MODO ASSINATURA (subscription) — quando vem `tier_slug`.
    // -------------------------------------------------------------------------
    const tier_slug = body.tier_slug;
    if (typeof tier_slug !== 'string' || !tier_slug) {
      return jsonResponse({ error: 'informe tier_slug (assinatura) ou items (loja)' }, 400);
    }

    const { data: tier, error: tierErr } = await supabaseAdmin
      .from('tiers')
      .select('slug, nome, stripe_price_id, ativo')
      .eq('slug', tier_slug)
      .maybeSingle();

    if (tierErr) return jsonResponse({ error: 'erro ao buscar o plano' }, 500);
    if (!tier || !tier.ativo) return jsonResponse({ error: 'plano indisponível' }, 400);
    if (!tier.stripe_price_id) {
      return jsonResponse({ error: 'plano ainda não tem preço configurado' }, 400);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, tier_slug: tier.slug } },
      metadata: { user_id: user.id, tier_slug: tier.slug },
      allow_promotion_codes: true,
      success_url,
      cancel_url,
    });

    return jsonResponse({ url: session.url });
  } catch (err) {
    // Erros de validação do carrinho (carrinho vazio/produto indisponível/qtd) → 400.
    const msg = (err as Error)?.message ?? '';
    const isValidacao = /carrinho|produto|opção|quantidade|item sem/i.test(msg);
    if (isValidacao) return jsonResponse({ error: msg }, 400);
    console.error('[create-checkout-session]', err);
    return jsonResponse({ error: 'não deu pra iniciar o checkout agora' }, 500);
  }
});
