# Edge Functions — Casa Coffee Colab (Stripe 6a+6b · Pontos Fase 3)

Quatro functions (Supabase, Deno) + a lib compartilhada:

```
supabase/functions/
├── _shared/lib.ts             # Stripe, Supabase service_role, CORS, JWT, getSiteUrl(),
│                              # ensureStripeCustomer, computeCartFromDb, getUserTierDiscount,
│                              # getTierMultiplier, creditPoints (pontos)
├── create-checkout-session/   # Checkout: assinatura {tier_slug} OU loja {items}; exige JWT
├── create-portal-session/     # Billing Portal da assinatura; exige JWT
├── redeem-reward/             # resgata recompensa por pontos (rpc redeem_reward); exige JWT
└── stripe-webhook/            # eventos do Stripe; verifica assinatura + idempotência + pontos
```

> **SÓ TEST MODE nesta fase.** Chaves `sk_test_…` / `whsec_…` de test. O código é
> **agnóstico de ambiente** — no go-live troca só os secrets (test → live). Ver o
> checklist de go-live no `CLAUDE.md`.

## Regras de segredo (relembrando)

Estes vivem **só** nas env vars da function (`supabase secrets`), **nunca** no
client/bundle/repo:

- `STRIPE_SECRET_KEY` — `sk_test_…`
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` (vem ao cadastrar o endpoint do webhook)
- `SITE_URL` — base das `success_url`/`cancel_url` (dev: `http://localhost:5173`)

Já injetados pelo Supabase (não precisa setar): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

No **client** vai só `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`) no `.env` — nunca aqui.

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado (`supabase login`).
- Projeto linkado: `supabase link --project-ref <SEU_PROJECT_REF>`.

## 1) Setar os secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set SITE_URL=http://localhost:5173
# o STRIPE_WEBHOOK_SECRET só existe DEPOIS de cadastrar o endpoint (passo 3) — setar então:
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# conferir:
supabase secrets list
```

## 2) Deploy das functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy redeem-reward
# o webhook NÃO usa JWT (quem chama é o Stripe, autenticado pela assinatura):
supabase functions deploy stripe-webhook --no-verify-jwt
```

A URL do webhook fica:
`https://<SEU_PROJECT_REF>.functions.supabase.co/stripe-webhook`

## 3) Cadastrar o endpoint do webhook no Stripe (test)

Stripe Dashboard (**test mode**) → Developers → Webhooks → **Add endpoint**:

- **URL:** `https://<SEU_PROJECT_REF>.functions.supabase.co/stripe-webhook`
- **Eventos (assinatura — 6a):** `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- **Eventos (loja — 6b):** `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed` (Pix/Boleto confirmam/falham depois do
  checkout; cartão já fecha no `checkout.session.completed`).
- **Evento (pontos de renovação — Fase 3):** `invoice.paid` (credita os pontos da
  mensalidade nas RENOVAÇÕES; a 1ª fatura já é creditada no
  `checkout.session.completed`, então o webhook ignora `billing_reason='subscription_create'`).

Copie o **Signing secret** (`whsec_…`) e rode o `supabase secrets set STRIPE_WEBHOOK_SECRET=…`
do passo 1 (depois **re-deploy** o webhook pra pegar o secret novo:
`supabase functions deploy stripe-webhook --no-verify-jwt`).

## 3b) Habilitar Pix e Boleto (loja) — só painel, ZERO código

Stripe Dashboard (**test mode**) → Settings → **Payment methods** → habilite
**Pix** e **Boleto** (cartão já vem ligado). O Checkout usa automaticamente os
métodos habilitados (a function não fixa a lista). Pix/Boleto exigem moeda BRL
(já é o caso). No go-live, repita isso na conta **live**.

## 4) Testar o webhook local (opcional, com Stripe CLI)

```bash
stripe listen --forward-to https://<SEU_PROJECT_REF>.functions.supabase.co/stripe-webhook
# o `stripe listen` imprime um whsec_ próprio pra usar enquanto testa localmente
```

## Logs

```bash
supabase functions logs create-checkout-session
supabase functions logs create-portal-session
supabase functions logs redeem-reward
supabase functions logs stripe-webhook
```

## Sequência completa (resumo)

1. `node scripts/stripe-seed.mjs` → cria produtos/preços test, imprime os `price_id`.
2. Cole os `price_id` na `0006_stripe.sql`, rode-a no **SQL Editor**. Rode também a
   **`0007_orders_stripe.sql`** (loja) e a **`0008_points.sql`** (pontos/recompensas).
3. `supabase secrets set` de `STRIPE_SECRET_KEY` e `SITE_URL`.
4. `supabase functions deploy` das **quatro** functions (webhook com `--no-verify-jwt`).
5. Cadastre/atualize o endpoint do webhook no Stripe (test) com os eventos de
   assinatura, loja **e** `invoice.paid` (pontos de renovação), pegue o `whsec_` e
   `supabase secrets set STRIPE_WEBHOOK_SECRET=…` → re-deploy do webhook.
6. (Loja) Habilite **Pix** e **Boleto** em Settings → Payment methods.
7. No client: `.env` com `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` (e o resto do Supabase).

> **Atualizando de 6b → Fase 3:** já tinha o webhook cadastrado? Só **adicione o
> evento `invoice.paid`** ao endpoint existente, rode a `0008_points.sql`, e faça
> `deploy` do `redeem-reward` + re-`deploy` do `stripe-webhook`.

## Como testar (test mode)

**Assinatura (6a):** logado, em `/planos` clica "assinar" → Checkout → cartão
**4242 4242 4242 4242** (validade futura / CVC / CEP quaisquer) → volta pra
checkout-sucesso. Confere `subscriptions` + `profiles.tier_slug` no banco.

**Loja (6b):**
- Adiciona itens ao carrinho, abre o drawer, "finalizar compra".
  - Deslogado → vai pro login e volta pro carrinho (`?cart=open`).
  - Logado → Checkout do Stripe.
- **Cartão:** `4242 4242 4242 4242` → aprova na hora. O `checkout.session.completed`
  cria a `orders` (status `pago`) + `order_items`. Confere no banco.
- **Boleto (test):** escolhe Boleto no Checkout → o `completed` cria a order como
  `pendente`; pra confirmar, no Dashboard test o boleto tem botão de simular
  pagamento (ou via Stripe CLI). Aí o `async_payment_succeeded` vira `pago`.
- **Pix (test):** escolhe Pix → QR de teste; no test mode o Dashboard/CLI permite
  simular a confirmação → `async_payment_succeeded` → `pago`.
- **Desconto do tier:** com uma assinatura ATIVA, o total no Checkout já vem com o
  `discount_percent` do tier (linha "-X%"). Sem assinatura = 0%. Confere que
  `orders.desconto_centavos`/`total_centavos` batem com o cobrado.

**Billing portal:** no perfil, "gerenciar assinatura" → Billing Portal do Stripe
(cancelar/atualizar cartão) → volta pro perfil.

**Pontos (Fase 3):**
- Após uma compra paga, os pontos = `floor(total_com_desconto × points_multiplier)`
  do tier ativo (sem plano = 1x). Ex.: R$49,41 no Ouro (1,5x) → `floor(74.115)` = **74**.
  Confere no extrato (`/pages/conta/pontos.html`) ou na tabela `points_ledger`.
- **Idempotência:** reenviar o mesmo evento (Stripe → Webhooks → Resend) **não**
  duplica o crédito (unique `(ref_type, ref_id)` no ledger + `stripe_events`).
- **Renovação:** `invoice.paid` com `billing_reason='subscription_cycle'` credita de novo;
  a 1ª fatura (`subscription_create`) não recredita.
- **Resgate:** em `/pages/conta/pontos.html`, "resgatar" → desconta o saldo, cria
  `redemptions`, baixa estoque e (se cupom) gera um código `CASA-XXXX` (30 dias).
  Saldo insuficiente → mensagem gentil, sem débito. Resgate concorrente é serializado
  pelo `for update` na `redeem_reward`.
- **RLS:** anon não lê `points_ledger`/`redemptions`/`coupons` de ninguém (só o dono, logado).
