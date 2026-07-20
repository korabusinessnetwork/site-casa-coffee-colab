// =============================================================================
// Casa Coffee Colab — stripe-webhook (Edge Function, Deno)
// Recebe os eventos do Stripe e mantém subscriptions/profiles em dia.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • SEMPRE verifica a assinatura do Stripe (STRIPE_WEBHOOK_SECRET) — corpo cru.
//   • Idempotência/anti-replay: checa stripe_events pelo event.id; se já
//     processou, responde 200 e sai. Grava o event.id ao final (após sucesso),
//     então uma entrega que falhou é reprocessada na retentativa do Stripe.
//   • Escrita via service_role (ignora RLS).
//   • Comportamento idêntico em test e live — muda só o whsec (secrets).
//
// NÃO precisa de JWT (quem chama é o Stripe, autenticado pela assinatura).
// Não precisa de verify_jwt — desligue no deploy (--no-verify-jwt).
// =============================================================================

import { Stripe, stripe, supabaseAdmin, requireEnv, creditPoints, checkAchievements } from '../_shared/lib.ts';

const WEBHOOK_SECRET = requireEnv('STRIPE_WEBHOOK_SECRET');

// Mapeia o status do Stripe pro enum do banco (trial|ativa|pausada|cancelada).
function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'active':
      return 'ativa';
    case 'trialing':
      return 'trial';
    case 'past_due':
    case 'incomplete':
    case 'paused':
      return 'pausada';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'cancelada';
    default:
      return 'pausada';
  }
}

const contaComoAtiva = (statusBanco: string) => statusBanco === 'ativa' || statusBanco === 'trial';

// Resolve o user_id do Supabase a partir da metadata da assinatura ou do Customer.
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

// Resolve o tier_slug: metadata da assinatura ou lookup pelo price → tiers.
async function resolveTierSlug(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.tier_slug;
  if (fromMeta) return fromMeta;
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const { data } = await supabaseAdmin
    .from('tiers')
    .select('slug')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  return data?.slug ?? null;
}

// Upsert idempotente da assinatura + espelha o tier_slug ativo no profiles.
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(sub);
  const tierSlug = await resolveTierSlug(sub);
  if (!userId) {
    console.warn('[stripe-webhook] assinatura sem user_id resolvível:', sub.id);
    return;
  }

  const statusBanco = mapStatus(sub.status);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  // current_period_end: no nível da assinatura (APIs antigas) OU do item (basil 2025+).
  // Lê o que existir — robusto às duas versões de API.
  // deno-lint-ignore no-explicit-any
  const anySub = sub as any;
  const periodEndUnix =
    anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  // onConflict em stripe_subscription_id (UNIQUE na 0006) → uma linha por assinatura.
  const { error: upErr } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      tier_slug: tierSlug ?? undefined, // tier_slug é NOT NULL; se não resolveu, não sobrescreve
      status: statusBanco,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (upErr) throw upErr;

  // profiles.tier_slug: assinatura ativa/trial → o tier; senão → limpa (null).
  const novoTier = contaComoAtiva(statusBanco) ? (tierSlug ?? null) : null;
  const { error: profErr } = await supabaseAdmin
    .from('profiles')
    .update({ tier_slug: novoTier })
    .eq('id', userId);
  if (profErr) throw profErr;

  // Reavalia conquistas de tier (ex.: 'Gente do Casa' no Ouro). Best-effort.
  await checkAchievements(userId);
}

// =============================================================================
// LOJA (mode 'payment') — cria/atualiza o pedido a partir da sessão paga.
// Idempotente por orders.stripe_checkout_id (UNIQUE na 0007): reentrega do
// evento não duplica. Pix/Boleto são assíncronos → 'completed' pode vir com
// payment_status != 'paid' (cria 'pendente'); o async_payment_succeeded depois
// atualiza pra 'pago'. Escrita via service_role (ignora RLS).
// =============================================================================
interface CartMetaItem { sl?: string; vo?: string; n?: string; u?: number; q?: number }

async function upsertStoreOrder(
  session: Stripe.Checkout.Session,
  opts: { failed?: boolean } = {},
): Promise<void> {
  const meta = session.metadata ?? {};
  if (meta.kind !== 'store') return; // não é pedido de loja
  const userId = meta.user_id;
  if (!userId) {
    console.warn('[stripe-webhook] sessão de loja sem user_id:', session.id);
    return;
  }

  // Valores REAIS cobrados (fonte da verdade = Stripe). Fallback pro que a
  // create-checkout-session calculou server-side (metadata), nunca do client.
  const subtotal = session.amount_subtotal ?? Number(meta.subtotal_cents ?? 0);
  const discount = session.total_details?.amount_discount ?? 0;
  const total = session.amount_total ?? subtotal - discount;

  const status = opts.failed ? 'cancelado' : session.payment_status === 'paid' ? 'pago' : 'pendente';
  const tierSlug = meta.tier_slug || null;
  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;

  // Idempotência: já existe pedido pra esta sessão? Atualiza status/totais
  // (ex.: pendente → pago no async), sem reinserir itens.
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_checkout_id', session.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        subtotal_centavos: subtotal,
        desconto_centavos: discount,
        total_centavos: total,
        stripe_payment_intent: paymentIntent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
    // Boleto/Pix: o crédito acontece quando VIRA 'pago' (async_payment_succeeded).
    await creditOrderPoints(status, userId, total, tierSlug, session.id);
    return;
  }

  // Cria o pedido.
  const { data: order, error: oErr } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: userId,
      status,
      origem: 'site',
      subtotal_centavos: subtotal,
      desconto_centavos: discount,
      total_centavos: total,
      tier_slug_aplicado: tierSlug,
      stripe_checkout_id: session.id,
      stripe_payment_intent: paymentIntent,
    })
    .select('id')
    .single();

  if (oErr) {
    if (oErr.code === '23505') return; // corrida: outra entrega já criou
    throw oErr;
  }

  // Itens, a partir do snapshot server-side (metadata.items). Resolve os FKs
  // product_id/variant_id por slug/opcao (nullable — on delete set null).
  let itens: CartMetaItem[] = [];
  try {
    itens = JSON.parse(meta.items ?? '[]');
  } catch {
    itens = [];
  }

  const rows = [];
  for (const it of itens) {
    let productId: string | null = null;
    let variantId: string | null = null;
    let varianteSnapshot: string | null = it.vo || null;

    if (it.sl) {
      const { data: p } = await supabaseAdmin.from('products').select('id').eq('slug', it.sl).maybeSingle();
      productId = p?.id ?? null;
      if (productId && it.vo) {
        const { data: v } = await supabaseAdmin
          .from('product_variants')
          .select('id, rotulo, opcao')
          .eq('product_id', productId)
          .eq('opcao', it.vo)
          .maybeSingle();
        if (v) {
          variantId = v.id;
          varianteSnapshot = v.rotulo ? `${v.rotulo}: ${v.opcao}` : v.opcao;
        }
      }
    }

    rows.push({
      order_id: order.id,
      product_id: productId,
      variant_id: variantId,
      nome_snapshot: it.n ?? it.sl ?? 'item',
      variante_snapshot: varianteSnapshot,
      preco_unit_centavos: it.u ?? 0,
      qtd: it.q ?? 1,
    });
  }

  if (rows.length) {
    const { error: iErr } = await supabaseAdmin.from('order_items').insert(rows);
    if (iErr) {
      // Rollback best-effort: sem itens, o pedido não deve ficar órfão. Deleta e
      // deixa o Stripe reentregar (idempotência recria limpo).
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw iErr;
    }
  }

  // Pontos da COMPRA: sobre o total JÁ COM DESCONTO, com o multiplicador do tier
  // aplicado. Só quando 'pago'. Idempotente por (order, session.id).
  await creditOrderPoints(status, userId, total, tierSlug, session.id);
}

// Credita os pontos do pedido só quando 'pago' (cartão na hora; boleto/Pix no
// async). Idempotente pelo (ref_type='order', ref_id=session.id) do ledger.
async function creditOrderPoints(
  status: string,
  userId: string,
  totalCentavos: number,
  tierSlug: string | null,
  sessionId: string,
): Promise<void> {
  if (status !== 'pago') return;
  await creditPoints({
    userId,
    valorCentavos: totalCentavos,
    motivo: 'compra na loja',
    refType: 'order',
    refId: sessionId,
    tierSlug,
  });
  // Reavalia conquistas de compra (Primeira Xícara, Café Viajante…). Best-effort.
  await checkAchievements(userId);
}

// Pontos da RENOVAÇÃO mensal (invoice.paid). A PRIMEIRA fatura
// ('subscription_create') NÃO credita aqui — já veio pelo checkout.session.completed.
// Só o ciclo ('subscription_cycle') credita. Idempotente por (subscription_renewal, invoice.id).
async function creditInvoicePoints(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason !== 'subscription_cycle') return;
  const amount = invoice.amount_paid ?? 0;
  if (amount <= 0) return;

  // deno-lint-ignore no-explicit-any
  const anyInv = invoice as any;
  let userId: string | null = null;
  let tierSlug: string | null = null;

  const subId = typeof anyInv.subscription === 'string' ? anyInv.subscription : anyInv.subscription?.id ?? null;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    userId = sub.metadata?.user_id ?? null;
    tierSlug = sub.metadata?.tier_slug ?? null;
  }
  if (!userId) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
    if (customerId) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, tier_slug')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      userId = data?.id ?? null;
      tierSlug = tierSlug ?? data?.tier_slug ?? null;
    }
  }
  if (!userId) {
    console.warn('[stripe-webhook] invoice.paid sem user resolvível:', invoice.id);
    return;
  }

  await creditPoints({
    userId,
    valorCentavos: amount,
    motivo: 'renovação da assinatura',
    refType: 'subscription_renewal',
    refId: invoice.id,
    tierSlug,
  });
  // Reavalia conquistas de tempo de casa (subscription_months). Best-effort.
  await checkAchievements(userId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('sem assinatura', { status: 400 });

  const payload = await req.text(); // corpo CRU (obrigatório pra verificar a assinatura)

  // 1) Verifica a assinatura (async: o Deno usa SubtleCrypto).
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] assinatura inválida:', (err as Error).message);
    return new Response('assinatura inválida', { status: 400 });
  }

  // 2) Idempotência: se o event.id já foi processado, sai com 200.
  const { data: jaVisto } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();
  if (jaVisto) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

  // 3) Processa os eventos de assinatura.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
          // Pontos da mensalidade paga agora (1ª fatura). A renovação vem no
          // invoice.paid ('subscription_cycle'). Idempotente por (subscription_start, session.id).
          const userId = session.metadata?.user_id;
          if (userId && session.amount_total) {
            await creditPoints({
              userId,
              valorCentavos: session.amount_total,
              motivo: 'assinatura',
              refType: 'subscription_start',
              refId: session.id,
              tierSlug: session.metadata?.tier_slug ?? null,
            });
          }
        } else if (session.mode === 'payment') {
          // Loja: cartão fecha aqui como 'paid'; Pix/Boleto podem vir 'unpaid'
          // (async) e o async_payment_succeeded abaixo finaliza pra 'pago'.
          await upsertStoreOrder(session);
        }
        break;
      }
      // Pix/Boleto (pagamento assíncrono) confirmam/falham depois do checkout.
      case 'checkout.session.async_payment_succeeded': {
        await upsertStoreOrder(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        await upsertStoreOrder(event.data.object as Stripe.Checkout.Session, { failed: true });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      // Renovação mensal da assinatura → credita pontos do ciclo.
      case 'invoice.paid': {
        await creditInvoicePoints(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        // Evento que não tratamos: ignora (mas registra como visto pra não voltar).
        break;
    }
  } catch (err) {
    // Falhou o processamento → NÃO grava stripe_events; o Stripe reenvia e a gente
    // reprocessa (a idempotência protege contra duplicar). Responde 500.
    console.error(`[stripe-webhook] erro processando ${event.type} (${event.id}):`, err);
    return new Response('erro ao processar', { status: 500 });
  }

  // 4) Marca o event.id como processado (idempotência).
  const { error: insErr } = await supabaseAdmin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  // Corrida rara (duas entregas simultâneas): outra instância já inseriu → ok, é idempotente.
  if (insErr && insErr.code !== '23505') {
    console.error('[stripe-webhook] falha ao registrar event.id:', insErr);
    return new Response('erro ao registrar evento', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
