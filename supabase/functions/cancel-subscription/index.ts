// =============================================================================
// Casa Coffee Colab — cancel-subscription (Edge Function, Deno)
// O Asaas NÃO tem portal de cobrança hospedado (como o Billing Portal do Stripe),
// então a gente tem a NOSSA tela de "cancelar assinatura". Esta function cancela
// a assinatura ativa do usuário logado no Asaas e reflete no banco.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Exige JWT válido (getUserFromRequest). Só o DONO cancela a PRÓPRIA
//     assinatura — a gente lê a linha de subscriptions DELE (nunca um id vindo
//     do client) e é essa que mandamos cancelar no Asaas.
//   • Escrita via service_role (o trigger prevent_points_tamper deixa passar
//     escrita server-side; ver 0005). Espelha profiles.tier_slug = null.
//   • Comportamento idêntico em sandbox e prod — muda só a chave (secrets).
//
// Retorna: { ok: true, proxima_cobranca } — ou erro gentil.
// =============================================================================

import {
  supabaseAdmin,
  handleCors,
  jsonResponse,
  getUserFromRequest,
  asaasDelete,
  AsaasError,
} from '../_shared/lib.ts';

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== 'POST') return jsonResponse({ error: 'método não permitido' }, 405);

  // 1) Só usuário autenticado.
  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'não autenticado' }, 401);

  // 2) Acha a assinatura ATIVA do próprio usuário (a mais recente, se houver mais).
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, asaas_subscription_id, status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'ativa')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) {
    console.error('[cancel-subscription] erro ao ler subscriptions', subErr);
    return jsonResponse({ error: 'não deu pra ler tua assinatura agora' }, 500);
  }
  if (!sub) {
    return jsonResponse({ error: 'a gente não achou uma assinatura ativa no teu nome' }, 404);
  }

  try {
    // 3) Cancela no Asaas (DELETE /subscriptions/{id}). Se não tiver id do Asaas
    // (caso raro/legado), pula a chamada e só reflete no banco.
    if (sub.asaas_subscription_id) {
      await asaasDelete(`/subscriptions/${encodeURIComponent(sub.asaas_subscription_id)}`);
    }

    // 4) Reflete no banco: assinatura 'cancelada' + tira o tier do profile.
    const { error: uErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (uErr) throw uErr;

    const { error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({ tier_slug: null })
      .eq('id', user.id);
    if (pErr) throw pErr;

    return jsonResponse({ ok: true, proxima_cobranca: sub.current_period_end ?? null });
  } catch (err) {
    if (err instanceof AsaasError) {
      // Se o Asaas já não tem a assinatura (404), trata como já cancelada e reflete.
      if (err.status === 404) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelada', updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        await supabaseAdmin.from('profiles').update({ tier_slug: null }).eq('id', user.id);
        return jsonResponse({ ok: true, proxima_cobranca: null });
      }
      console.error('[cancel-subscription] Asaas', err.status, err.payload);
      return jsonResponse({ error: 'não deu pra cancelar no gateway agora' }, 502);
    }
    console.error('[cancel-subscription]', err);
    return jsonResponse({ error: 'não deu pra cancelar agora' }, 500);
  }
});
