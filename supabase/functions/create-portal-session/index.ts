// =============================================================================
// Casa Coffee Colab — create-portal-session (Edge Function, Deno)
// Cria uma Stripe Billing Portal Session pro assinante gerenciar/cancelar a
// própria assinatura no Stripe (hospedado). Retorna { url } — o front redireciona.
//
// SEGURANÇA (ver CLAUDE.md › Segurança):
//   • Verifica o JWT — só o próprio usuário logado abre o SEU portal.
//   • customer vem do profiles.stripe_customer_id (server-side), nunca do client.
//   • return_url montado server-side a partir de SITE_URL (env).
//   • Idêntico em test e live — muda só a chave (secrets).
// =============================================================================

import {
  stripe,
  supabaseAdmin,
  handleCors,
  jsonResponse,
  getUserFromRequest,
  getSiteUrl,
} from '../_shared/lib.ts';

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== 'POST') return jsonResponse({ error: 'método não permitido' }, 405);

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'não autenticado' }, 401);

  // Customer do usuário (do banco). Sem customer = nunca assinou/comprou.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    return jsonResponse({ error: 'sem assinatura pra gerenciar por aqui ainda' }, 400);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getSiteUrl()}/pages/conta/perfil.html`,
    });
    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error('[create-portal-session]', err);
    return jsonResponse({ error: 'não deu pra abrir o portal agora' }, 500);
  }
});
