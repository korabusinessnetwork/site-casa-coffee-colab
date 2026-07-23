// =============================================================================
// Casa Coffee Colab — asaas-webhook (Edge Function, Deno)
// Recebe os eventos do ASAAS e mantém orders/subscriptions/profiles + pontos em dia.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Autenticação do webhook: token compartilhado. O Asaas envia o token no
//     header `asaas-access-token` (definido ao cadastrar o webhook). A gente
//     compara com ASAAS_WEBHOOK_TOKEN (secret). Diferente → 401, sem processar.
//     (O Asaas NÃO assina o corpo com HMAC — a defesa é o token no header.)
//   • Idempotência/anti-replay: cada evento tem um `id` (evt_…). Se já está em
//     asaas_events, responde 200 e sai. Grava o id só ao final (após sucesso),
//     então uma entrega que FALHOU é reprocessada na retentativa do Asaas
//     ("at least once delivery").
//   • Escrita via service_role (ignora RLS). Pontos SEMPRE server-side (ledger).
//   • Comportamento idêntico em sandbox e prod — muda só a chave (secrets).
//
// NÃO precisa de JWT (quem chama é o Asaas, autenticado pelo token do header).
// Deploy com --no-verify-jwt.
//
// CORRELAÇÃO (ver create-checkout-session):
//   • LOJA: o checkout foi criado com externalReference = orders.id (UUID). Em
//     CHECKOUT_PAID a gente finaliza ESSE pedido (pendente → pago) e credita os
//     pontos. CHECKOUT_EXPIRED/CANCELED → cancela o pedido pendente.
//   • ASSINATURA: externalReference = `sub:<user_id>:<tier_slug>:<nonce>`. Em
//     CHECKOUT_PAID a gente resolve a Subscription criada
//     (GET /subscriptions?externalReference=<ref> — o nonce garante 1 só), grava
//     a linha em subscriptions e espelha profiles.tier_slug. Os PONTOS da
//     assinatura (1ª cobrança e renovações) são creditados nos eventos de
//     PAGAMENTO (PAYMENT_CONFIRMED/RECEIVED), nunca no CHECKOUT_PAID — assim não
//     duplica e as renovações (que não geram novo checkout) também creditam.
// =============================================================================

import {
  supabaseAdmin,
  requireEnv,
  creditPoints,
  checkAchievements,
  asaasGet,
  asaasPut,
  reaisFromCentavos,
  centavosFromReais,
} from '../_shared/lib.ts';

const WEBHOOK_TOKEN = requireEnv('ASAAS_WEBHOOK_TOKEN');

// --- helpers -----------------------------------------------------------------

// externalReference da assinatura → { userId, tierSlug }. Formato:
// `sub:<user_id>:<tier_slug>:<nonce>`. Retorna null se não for de assinatura.
function parseSubRef(ref: unknown): { userId: string; tierSlug: string } | null {
  if (typeof ref !== 'string' || !ref.startsWith('sub:')) return null;
  const parts = ref.split(':');
  const userId = parts[1];
  const tierSlug = parts[2];
  if (!userId || !tierSlug) return null;
  return { userId, tierSlug };
}

// externalReference de upgrade → { userId, toTier, asaasSubId }. Formato:
// `upg:<user_id>:<to_tier>:<asaas_subscription_id>:<nonce>`. Null se não for upgrade.
function parseUpgRef(
  ref: unknown,
): { userId: string; toTier: string; asaasSubId: string } | null {
  if (typeof ref !== 'string' || !ref.startsWith('upg:')) return null;
  const parts = ref.split(':');
  const userId = parts[1];
  const toTier = parts[2];
  const asaasSubId = parts[3];
  if (!userId || !toTier || !asaasSubId) return null;
  return { userId, toTier, asaasSubId };
}

// Aceita string ('cus_…') ou objeto ({ id }) — o Asaas varia por endpoint.
function idOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'id' in v) return String((v as { id: unknown }).id);
  return null;
}

// Status da Subscription do Asaas → enum do banco (trial|ativa|pausada|cancelada).
function mapSubStatus(s: unknown): string {
  switch (String(s ?? '').toUpperCase()) {
    case 'ACTIVE':
      return 'ativa';
    case 'EXPIRED':
      return 'cancelada';
    case 'INACTIVE':
      return 'pausada';
    default:
      return 'ativa';
  }
}

// nextDueDate ('YYYY-MM-DD') → ISO (meia-noite) pra current_period_end. Null-safe.
function dueDateToIso(d: unknown): string | null {
  if (typeof d !== 'string' || !d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// Cria/atualiza a linha da assinatura (idempotente por asaas_subscription_id).
// tier_slug é NOT NULL no banco → sempre passamos o resolvido do externalReference.
async function upsertSubscriptionRow(args: {
  userId: string;
  tierSlug: string;
  customerId: string | null;
  asaasSubId: string | null;
  status: string;
  periodEndIso: string | null;
}): Promise<void> {
  const { userId, tierSlug, customerId, asaasSubId, status, periodEndIso } = args;
  const row = {
    user_id: userId,
    tier_slug: tierSlug,
    status,
    asaas_customer_id: customerId,
    asaas_subscription_id: asaasSubId,
    current_period_end: periodEndIso,
    updated_at: new Date().toISOString(),
  };
  if (asaasSubId) {
    // onConflict no id do Asaas (UNIQUE na 0011) → uma linha por assinatura.
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(row, { onConflict: 'asaas_subscription_id' });
    if (error) throw error;
  } else {
    // Sem id do Asaas (fallback raro): insere sem conflito (evita duplicar em
    // reentrega checando se já existe uma ativa desse user/tier).
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('tier_slug', tierSlug)
      .is('asaas_subscription_id', null)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from('subscriptions').update(row).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('subscriptions').insert(row);
      if (error) throw error;
    }
  }
}

// Busca a Subscription no Asaas por asaas_subscription_id (pra atualizar
// nextDueDate/status). Best-effort — retorna null se não achar.
async function fetchAsaasSubscription(subId: string): Promise<any | null> {
  try {
    return await asaasGet(`/subscriptions/${encodeURIComponent(subId)}`);
  } catch (err) {
    console.warn('[asaas-webhook] falha ao buscar subscription', subId, (err as Error).message);
    return null;
  }
}

// Espelha o tier ativo no profiles + persiste o customer do Asaas (best-effort).
async function mirrorProfile(userId: string, tierSlug: string | null, customerId: string | null): Promise<void> {
  const patch: Record<string, unknown> = { tier_slug: tierSlug };
  if (customerId) patch.asaas_customer_id = customerId;
  const { error } = await supabaseAdmin.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

// =============================================================================
// LOJA — finaliza o pedido pré-criado (externalReference = orders.id).
// Idempotente: se já está no status alvo, não retrabalha (creditPoints também é
// idempotente por (order, order.id)). Nunca rebaixa um pedido já 'pago'.
// =============================================================================
async function finalizeStoreOrder(checkout: any, alvo: 'pago' | 'cancelado'): Promise<void> {
  const orderId = typeof checkout?.externalReference === 'string' ? checkout.externalReference : null;
  if (!orderId) {
    console.warn('[asaas-webhook] checkout de loja sem externalReference (order id)');
    return;
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, status, total_centavos, tier_slug_aplicado')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) {
    console.warn('[asaas-webhook] pedido não encontrado pra checkout:', orderId);
    return;
  }

  // Nunca cancela/mexe num pedido que já foi pago.
  if (order.status === 'pago' && alvo === 'cancelado') return;
  // Só cancela pedidos ainda pendentes.
  if (alvo === 'cancelado' && order.status !== 'pendente') return;

  const customerId = idOf(checkout?.customer);
  const patch: Record<string, unknown> = { status: alvo, updated_at: new Date().toISOString() };
  if (order.status !== alvo) {
    const { error } = await supabaseAdmin.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;
  }

  if (alvo !== 'pago') return;

  // Persiste o customer do Asaas no profile do dono (só se ainda não tiver).
  if (customerId && order.user_id) {
    await supabaseAdmin
      .from('profiles')
      .update({ asaas_customer_id: customerId })
      .eq('id', order.user_id)
      .is('asaas_customer_id', null);
  }

  // Pontos da COMPRA: total JÁ COM DESCONTO × multiplicador do tier. Idempotente
  // por (ref_type='order', ref_id=order.id).
  if (order.user_id) {
    await creditPoints({
      userId: order.user_id,
      valorCentavos: order.total_centavos,
      motivo: 'compra na loja',
      refType: 'order',
      refId: order.id,
      tierSlug: order.tier_slug_aplicado,
    });
    await checkAchievements(order.user_id); // Primeira Xícara, Café Viajante… best-effort
  }
}

// =============================================================================
// ASSINATURA — em CHECKOUT_PAID: resolve a Subscription criada e grava a linha +
// espelha o tier. NÃO credita pontos aqui (isso é nos eventos de pagamento).
// =============================================================================
async function activateSubscription(checkout: any): Promise<void> {
  const parsed = parseSubRef(checkout?.externalReference);
  if (!parsed) {
    console.warn('[asaas-webhook] checkout de assinatura com externalReference inválido');
    return;
  }
  const { userId, tierSlug } = parsed;
  const customerId = idOf(checkout?.customer);

  // Resolve a Subscription criada. O nonce no externalReference garante 1 só.
  let asaasSub: any = null;
  try {
    const list = await asaasGet(
      `/subscriptions?externalReference=${encodeURIComponent(checkout.externalReference)}`,
    );
    const arr: any[] = list?.data ?? [];
    if (arr.length) asaasSub = arr[arr.length - 1]; // mais recente
  } catch (err) {
    console.warn('[asaas-webhook] falha ao listar subscriptions por externalReference:', (err as Error).message);
  }
  // Fallback: pelo customer (pega a mais recente do cliente).
  if (!asaasSub && customerId) {
    try {
      const l2 = await asaasGet(`/subscriptions?customer=${encodeURIComponent(customerId)}`);
      const arr: any[] = l2?.data ?? [];
      if (arr.length) asaasSub = arr[0];
    } catch { /* ignora */ }
  }

  const asaasSubId = idOf(asaasSub?.id) ?? (asaasSub?.id ? String(asaasSub.id) : null);
  const status = asaasSub ? mapSubStatus(asaasSub.status) : 'ativa';
  const periodEndIso = dueDateToIso(asaasSub?.nextDueDate);

  await upsertSubscriptionRow({ userId, tierSlug, customerId, asaasSubId, status, periodEndIso });
  await mirrorProfile(userId, tierSlug, customerId);
  await checkAchievements(userId); // conquistas de tier (ex.: virar assinante) best-effort
}

// =============================================================================
// UPGRADE — em CHECKOUT_PAID de um checkout `upg:`: a diferença proporcional foi
// paga. Sobe o value recorrente da assinatura no Asaas pro preço CHEIO do tier
// novo (vale do próximo vencimento em diante), atualiza a linha de subscriptions
// e espelha o tier no profile. Se estava pausada em graça, reativa. SEM pontos
// aqui — o delta é ajuste proporcional, não uma compra. Idempotente: reprocessar
// deixa tudo no mesmo estado.
// =============================================================================
async function applyUpgrade(checkout: any): Promise<void> {
  const parsed = parseUpgRef(checkout?.externalReference);
  if (!parsed) {
    console.warn('[asaas-webhook] checkout de upgrade com externalReference inválido');
    return;
  }
  const { userId, toTier, asaasSubId } = parsed;

  // Preço cheio do tier novo (do banco) → novo value da recorrência.
  const { data: tier } = await supabaseAdmin
    .from('tiers')
    .select('slug, preco_centavos, ativo')
    .eq('slug', toTier)
    .maybeSingle();
  if (!tier || !tier.ativo || !tier.preco_centavos) {
    console.warn('[asaas-webhook] upgrade pra tier inválido:', toTier);
    return;
  }

  // Sobe o value da assinatura recorrente no Asaas e garante ACTIVE. Best-effort
  // no Asaas — a fonte do benefício é o banco (subscriptions/profiles).
  try {
    await asaasPut(`/subscriptions/${encodeURIComponent(asaasSubId)}`, {
      status: 'ACTIVE',
      value: reaisFromCentavos(tier.preco_centavos),
    });
  } catch (err) {
    console.error('[asaas-webhook] falha ao subir value no upgrade:', (err as Error).message);
  }

  // Reflete no banco: tier novo + ativa (por asaas_subscription_id).
  const { error: uErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ tier_slug: toTier, status: 'ativa', updated_at: new Date().toISOString() })
    .eq('asaas_subscription_id', asaasSubId);
  if (uErr) throw uErr;

  // Espelha o tier no profile (customerId=null: não mexe no asaas_customer_id, que
  // é o da assinatura, não o desta cobrança avulsa).
  await mirrorProfile(userId, toTier, null);
  await checkAchievements(userId); // best-effort
}

// =============================================================================
// PAGAMENTO de assinatura (PAYMENT_CONFIRMED/RECEIVED) — credita os pontos e
// mantém subscriptions em dia. Ignora pagamentos de LOJA (tratados em
// CHECKOUT_PAID). Idempotente por (ref_type='subscription', ref_id=payment.id).
// =============================================================================
async function handleSubscriptionPayment(payment: any): Promise<void> {
  const asaasSubId = idOf(payment?.subscription);
  const ref = payment?.externalReference;
  const parsed = parseSubRef(ref);

  // É pagamento de assinatura? Precisa ter subscription id OU externalReference `sub:`.
  if (!asaasSubId && !parsed) return; // pagamento de loja/avulso → ignora aqui

  // Resolve user_id + tier_slug. Preferência: linha de subscriptions (populada no
  // CHECKOUT_PAID). Fallback: parse do externalReference (robusto se o pagamento
  // chegar ANTES do CHECKOUT_PAID).
  let userId: string | null = null;
  let tierSlug: string | null = null;

  if (asaasSubId) {
    const { data: subRow } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier_slug')
      .eq('asaas_subscription_id', asaasSubId)
      .maybeSingle();
    if (subRow) {
      userId = subRow.user_id;
      tierSlug = subRow.tier_slug;
    }
  }
  if (!userId && parsed) {
    userId = parsed.userId;
    tierSlug = parsed.tierSlug;
  }
  if (!userId || !tierSlug) {
    console.warn('[asaas-webhook] pagamento de assinatura sem user resolvível:', payment?.id);
    return;
  }

  // Self-heal: se a linha de subscriptions ainda não existe (pagamento antes do
  // CHECKOUT_PAID), cria/atualiza agora buscando a subscription no Asaas.
  if (asaasSubId) {
    const asaasSub = await fetchAsaasSubscription(asaasSubId);
    await upsertSubscriptionRow({
      userId,
      tierSlug,
      customerId: idOf(payment?.customer),
      asaasSubId,
      status: asaasSub ? mapSubStatus(asaasSub.status) : 'ativa',
      periodEndIso: dueDateToIso(asaasSub?.nextDueDate),
    });
    // Garante o tier espelhado (caso o CHECKOUT_PAID ainda não tenha rodado).
    await mirrorProfile(userId, tierSlug, idOf(payment?.customer));
  }

  // Valor REAL pago (reais decimais → centavos). Fallback pro value da cobrança.
  const valorCentavos = centavosFromReais(Number(payment?.value ?? 0));
  if (valorCentavos > 0) {
    await creditPoints({
      userId,
      valorCentavos,
      motivo: 'assinatura',
      refType: 'subscription',
      refId: String(payment.id),
      tierSlug,
    });
    await checkAchievements(userId); // conquistas de tempo de casa best-effort
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });

  // 1) Autenticação do webhook (token compartilhado no header do Asaas).
  const token = req.headers.get('asaas-access-token') ?? '';
  if (token !== WEBHOOK_TOKEN) {
    console.warn('[asaas-webhook] token inválido/ausente no header asaas-access-token');
    return new Response('não autorizado', { status: 401 });
  }

  // 2) Corpo (JSON). O Asaas manda { id, event, dateCreated, ...payload }.
  let evt: any;
  try {
    evt = await req.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  const eventId: string | null = evt?.id ?? null;
  const eventType: string = evt?.event ?? '';
  if (!eventId || !eventType) return new Response('payload sem id/event', { status: 400 });

  // 3) Idempotência: se já processamos esse event.id, sai com 200.
  const { data: jaVisto } = await supabaseAdmin
    .from('asaas_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (jaVisto) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

  // 4) Processa.
  try {
    switch (eventType) {
      // ---- Checkout ----
      case 'CHECKOUT_PAID': {
        const checkout = evt.checkout ?? {};
        const ref = typeof checkout.externalReference === 'string' ? checkout.externalReference : '';
        if (ref.startsWith('sub:')) {
          await activateSubscription(checkout);
        } else if (ref.startsWith('upg:')) {
          await applyUpgrade(checkout);
        } else {
          await finalizeStoreOrder(checkout, 'pago');
        }
        break;
      }
      case 'CHECKOUT_EXPIRED':
      case 'CHECKOUT_CANCELED': {
        const checkout = evt.checkout ?? {};
        const ref = typeof checkout.externalReference === 'string' ? checkout.externalReference : '';
        // Só a LOJA tem pedido pendente pra cancelar. Assinatura (sub:) e upgrade
        // (upg:) não pré-criam linha, então não há nada a reverter aqui.
        if (!ref.startsWith('sub:') && !ref.startsWith('upg:')) {
          await finalizeStoreOrder(checkout, 'cancelado');
        }
        break;
      }

      // ---- Pagamento (assinatura: 1ª cobrança + renovações) ----
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await handleSubscriptionPayment(evt.payment ?? {});
        break;
      }

      default:
        // Evento que não tratamos: ignora (mas registra como visto pra não voltar).
        break;
    }
  } catch (err) {
    // Falhou → NÃO grava asaas_events; o Asaas reenvia e a gente reprocessa
    // (a idempotência dos créditos/pedidos protege contra duplicar). Responde 500.
    console.error(`[asaas-webhook] erro processando ${eventType} (${eventId}):`, err);
    return new Response('erro ao processar', { status: 500 });
  }

  // 5) Marca o event.id como processado (idempotência).
  const { error: insErr } = await supabaseAdmin
    .from('asaas_events')
    .insert({ id: eventId, event: eventType });
  if (insErr && insErr.code !== '23505') {
    console.error('[asaas-webhook] falha ao registrar event.id:', insErr);
    return new Response('erro ao registrar evento', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
