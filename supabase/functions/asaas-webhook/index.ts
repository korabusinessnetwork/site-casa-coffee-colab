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
  getEffectiveSubscription,
} from '../_shared/lib.ts';

const WEBHOOK_TOKEN = requireEnv('ASAAS_WEBHOOK_TOKEN');

// --- helpers -----------------------------------------------------------------

// Compara o token recebido com o secret em TEMPO CONSTANTE (defesa contra timing
// side-channel — um `!==` de string curto-circuita no 1º char diferente, vazando
// prefixo/comprimento por timing). Compara os digests SHA-256 (32 bytes fixos), o
// que também esconde a diferença de comprimento. É barato e roda a cada webhook.
async function tokenConfere(recebido: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(recebido)),
    crypto.subtle.digest('SHA-256', enc.encode(WEBHOOK_TOKEN)),
  ]);
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

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
  if (!asaasSubId) {
    // Sem id do Asaas a gente NÃO cria linha: uma assinatura sem
    // asaas_subscription_id concede o tier mas NÃO dá pra pausar/upgrade/retomar
    // (linha-fantasma). Em vez de gravar algo ingerenciável, lança — o webhook
    // responde 500 e o Asaas REENVIA; na retentativa a subscription já costuma
    // estar listável (GET /subscriptions?externalReference). E os eventos de
    // PAGAMENTO (PAYMENT_CONFIRMED/RECEIVED) trazem o subscription.id e criam a
    // linha correta de qualquer forma. Idempotência protege contra duplicar.
    throw new Error('subscription do Asaas ainda não resolvível (sem id) — retry');
  }

  // onConflict no id do Asaas (UNIQUE na 0011) → uma linha por assinatura.
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(row, { onConflict: 'asaas_subscription_id' });
  if (error) throw error;
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

  // Resolve a Subscription criada. O nonce no externalReference garante 1 só. NÃO
  // usamos fallback por customer: pegar "a mais recente do cliente" (arr[0]) pode
  // agarrar a assinatura ERRADA (outra recorrência do mesmo cliente) e gravar o
  // asaas_subscription_id trocado. Se o externalReference ainda não resolve (lag de
  // propagação), a gente prefere LANÇAR e deixar o Asaas reenviar — na retentativa
  // a subscription já aparece. (Ver auditoria, Raiz B — B1.)
  let asaasSub: any = null;
  try {
    const list = await asaasGet(
      `/subscriptions?externalReference=${encodeURIComponent(checkout.externalReference)}`,
    );
    const arr: any[] = list?.data ?? [];
    if (arr.length) asaasSub = arr[arr.length - 1]; // mais recente com ESTE ref (nonce → 1 só)
  } catch (err) {
    console.warn('[asaas-webhook] falha ao listar subscriptions por externalReference:', (err as Error).message);
  }

  const asaasSubId = idOf(asaasSub?.id) ?? (asaasSub?.id ? String(asaasSub.id) : null);
  if (!asaasSubId) {
    // Sem id resolvível → não grava linha-fantasma (A4). Lança pra reprocessar.
    throw new Error('subscription do Asaas ainda não resolvível por externalReference — retry');
  }
  const status = mapSubStatus(asaasSub.status);
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

  // Self-heal: mantém a linha de subscriptions em dia — MAS só grava status/período
  // quando temos dados CONFIÁVEIS do gateway. fetchAsaasSubscription é best-effort e
  // devolve null em qualquer falha (timeout/5xx). NUNCA chutar 'ativa'/período=null:
  // isso (a) ressuscitaria uma assinatura 'pausada' que recebeu um PAYMENT_RECEIVED
  // tardio, e (b) destruiria um current_period_end correto. Ver auditoria (Raiz B).
  if (asaasSubId) {
    const asaasSub = await fetchAsaasSubscription(asaasSubId);
    if (asaasSub) {
      // Dados confiáveis do Asaas → upsert com status/período REAIS.
      const statusReal = mapSubStatus(asaasSub.status);
      await upsertSubscriptionRow({
        userId,
        tierSlug,
        customerId: idOf(payment?.customer),
        asaasSubId,
        status: statusReal,
        periodEndIso: dueDateToIso(asaasSub?.nextDueDate),
      });
      // Só espelha o tier no profile se a assinatura de fato CONCEDE benefício agora
      // (ativa). Se veio INACTIVE/EXPIRED, não força o tier.
      if (statusReal === 'ativa') await mirrorProfile(userId, tierSlug, idOf(payment?.customer));
    } else {
      // Fetch falhou (transitório). NÃO sobrescreve nada com chute. Se a linha já
      // existe, mantém os dados confiáveis anteriores e segue pro crédito (o
      // pagamento aconteceu de verdade). Se NÃO existe, força retry (o Asaas
      // reenvia; na retentativa o fetch resolve) em vez de gravar algo ingerenciável.
      const { data: existente } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('asaas_subscription_id', asaasSubId)
        .maybeSingle();
      if (!existente) {
        throw new Error('subscription não resolvível no gateway (fetch falhou) — retry');
      }
    }
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

// =============================================================================
// FALHA de cobrança de assinatura (PAYMENT_OVERDUE/DELETED/REFUNDED/CHARGEBACK).
// Sem isso, uma RENOVAÇÃO que o cartão recusa deixaria a linha travada em 'ativa'
// com current_period_end no passado — e getEffectiveSubscription concede benefício
// pra QUALQUER linha 'ativa' (a checagem de período só vale pra 'pausada'). Ou
// seja: renovação falha = plano de graça pra sempre. (Ver auditoria, Raiz B.)
//
// Correção: ao falhar, pausa a assinatura no BANCO (status='pausada', SEM mexer no
// período — que já está vencido, então não concede). Se o cartão for recuperado
// depois (o Asaas continua tentando), o PAYMENT_CONFIRMED reativa via
// handleSubscriptionPayment. Self-heal do profiles.tier_slug via
// getEffectiveSubscription (limpa se nenhuma assinatura concede mais).
//
// NÃO tocamos no gateway aqui (o Asaas já sabe do overdue e gerencia a retentativa
// dele). Só refletimos o estado no nosso banco. Ignora pagamentos de LOJA/avulsos.
async function handleSubscriptionPaymentFailure(payment: any): Promise<void> {
  const asaasSubId = idOf(payment?.subscription);
  const parsed = parseSubRef(payment?.externalReference);
  if (!asaasSubId && !parsed) return; // cobrança de loja/avulsa não recorre → ignora

  let userId: string | null = null;

  if (asaasSubId) {
    const { data: subRow } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('asaas_subscription_id', asaasSubId)
      .maybeSingle();
    if (subRow) {
      userId = subRow.user_id;
      // Só rebaixa se estava 'ativa' (não sobrescreve uma 'cancelada'/'pausada'
      // já decidida por outro fluxo). Mantém current_period_end (vencido → sem grant).
      if (subRow.status === 'ativa') {
        const { error: uErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'pausada', updated_at: new Date().toISOString() })
          .eq('id', subRow.id);
        if (uErr) throw uErr;
      }
    }
  }
  if (!userId && parsed) userId = parsed.userId;

  // Self-heal do tier: se NENHUMA assinatura concede mais, limpa profiles.tier_slug.
  if (userId) await getEffectiveSubscription(userId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });

  // 1) Autenticação do webhook (token compartilhado no header do Asaas).
  // Comparação em tempo constante (ver tokenConfere) — não usar `!==` direto.
  const token = req.headers.get('asaas-access-token') ?? '';
  if (!(await tokenConfere(token))) {
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

      // ---- Falha de cobrança de assinatura (renovação recusada / estorno) ----
      // Rebaixa a assinatura pra 'pausada' pra o benefício não persistir de graça.
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE': {
        await handleSubscriptionPaymentFailure(evt.payment ?? {});
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
