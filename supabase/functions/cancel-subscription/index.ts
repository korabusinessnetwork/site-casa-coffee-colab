// =============================================================================
// Casa Coffee Colab — cancel-subscription (Edge Function, Deno)
// O Asaas NÃO tem portal de cobrança hospedado (como o Billing Portal do Stripe),
// então a gente tem a NOSSA tela. Aqui "cancelar" = PAUSAR: a pessoa para de ser
// cobrada, MAS mantém o benefício até o fim do período já pago
// (current_period_end). Depois é só "retomar" (resume-subscription) — sem pagar
// de novo, reativando a MESMA assinatura no Asaas.
//
// Por que pausar em vez de deletar: o checkout hospedado do Asaas cobra na hora
// que a pessoa digita o cartão. Se a gente deletasse, "retomar" viraria um novo
// checkout cobrando do zero. Pausar (PUT status=INACTIVE) para as próximas
// cobranças sem perder a assinatura — reativar (status=ACTIVE) não gera cobrança
// nova enquanto o nextDueDate estiver no futuro.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Exige JWT válido (getUserFromRequest). Só o DONO pausa a PRÓPRIA
//     assinatura — a gente lê a linha de subscriptions DELE (nunca um id vindo
//     do client) e é essa que mandamos pausar no Asaas.
//   • Escrita via service_role (auth.uid()=null → passa pelo prevent_points_tamper).
//     Em pausa, MANTÉM profiles.tier_slug (o benefício segue até o vencimento).
//   • Comportamento idêntico em sandbox e prod — muda só a chave (secrets).
//
// Retorna: { ok: true, pausada: true, ativo_ate } — ou { ok, cancelada: true } se
// o Asaas já não tiver a assinatura — ou erro gentil.
// =============================================================================

import {
  supabaseAdmin,
  handleCors,
  jsonResponse,
  getUserFromRequest,
  asaasPut,
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
    // 3) Pausa no Asaas (PUT /subscriptions/{id} status=INACTIVE). Se não tiver id
    // do Asaas (caso raro/legado), pula a chamada e só reflete no banco.
    if (sub.asaas_subscription_id) {
      await asaasPut(`/subscriptions/${encodeURIComponent(sub.asaas_subscription_id)}`, {
        status: 'INACTIVE',
      });
    }

    // 4) Reflete no banco: assinatura 'pausada'. MANTÉM tier_slug no profile e o
    // current_period_end — o benefício segue vivo até o fim do período pago.
    const { error: uErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'pausada', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (uErr) throw uErr;

    return jsonResponse({
      ok: true,
      pausada: true,
      ativo_ate: sub.current_period_end ?? null,
    });
  } catch (err) {
    if (err instanceof AsaasError) {
      // Asaas já não tem a assinatura (404) → trata como encerrada de vez: marca
      // 'cancelada' e tira o tier (não há período a preservar).
      if (err.status === 404) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelada', updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        await supabaseAdmin.from('profiles').update({ tier_slug: null }).eq('id', user.id);
        return jsonResponse({ ok: true, cancelada: true, ativo_ate: null });
      }
      console.error('[cancel-subscription] Asaas', err.status, err.payload);
      return jsonResponse({ error: 'não deu pra pausar no gateway agora' }, 502);
    }
    console.error('[cancel-subscription]', err);
    return jsonResponse({ error: 'não deu pra pausar agora' }, 500);
  }
});
