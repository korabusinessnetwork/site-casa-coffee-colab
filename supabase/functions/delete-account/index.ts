// =============================================================================
// Casa Coffee Colab — delete-account (Edge Function, Deno)
// "excluir minha conta" no /conta/perfil. Apaga o usuário do auth; o resto cai
// por cascata (profiles.id → auth.users on delete cascade, e todo o resto
// referencia profiles.id on delete cascade).
//
// ORDEM IMPORTA: primeiro a gente ENCERRA as assinaturas no Asaas, só depois
// apaga a conta. Se apagasse antes e o DELETE no gateway falhasse, a pessoa
// continuaria sendo cobrada todo mês sem conta pra reclamar — e a gente não
// teria mais o asaas_subscription_id pra achar. Aqui é DELETE mesmo (não o
// PUT status=INACTIVE do cancel-subscription): não existe "retomar" depois de
// apagar a conta.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Exige JWT válido (getUserFromRequest). A pessoa só apaga a PRÓPRIA conta —
//     o id vem do token, NUNCA do corpo da requisição.
//   • Escrita via service_role, só dentro da function.
//   • Comportamento idêntico em sandbox e prod — muda só a chave (secrets).
//
// Retorna: { ok: true, apagada: true } — ou erro gentil.
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

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'não autenticado' }, 401);

  // 1) Toda assinatura que ainda pode gerar cobrança (ativa ou pausada dentro do
  // período). Cancelada já não cobra — mas listar não custa e evita fantasma.
  const { data: subs, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, asaas_subscription_id')
    .eq('user_id', user.id)
    .not('asaas_subscription_id', 'is', null);

  if (subErr) {
    console.error('[delete-account] erro ao ler subscriptions', subErr);
    return jsonResponse({ error: 'não deu pra apagar agora' }, 500);
  }

  // 2) Encerra cada uma no gateway. 404 = já não existe lá, segue o baile.
  // Qualquer outro erro ABORTA: melhor a conta continuar de pé do que existir
  // uma cobrança recorrente sem dono.
  try {
    for (const sub of subs ?? []) {
      try {
        await asaasDelete(`/subscriptions/${encodeURIComponent(sub.asaas_subscription_id)}`);
      } catch (err) {
        if (!(err instanceof AsaasError) || err.status !== 404) throw err;
      }
    }
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error('[delete-account] Asaas', err.status, err.payload);
      return jsonResponse({ error: 'não deu pra encerrar tua assinatura agora' }, 502);
    }
    console.error('[delete-account]', err);
    return jsonResponse({ error: 'não deu pra apagar agora' }, 500);
  }

  // 3) Apaga o usuário. O cascata leva profiles, orders, points_ledger,
  // subscriptions, redemptions e as conquistas junto.
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('[delete-account] erro ao apagar usuário', delErr);
    return jsonResponse({ error: 'não deu pra apagar agora' }, 500);
  }

  return jsonResponse({ ok: true, apagada: true });
});
