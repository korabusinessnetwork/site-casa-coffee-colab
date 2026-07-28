# Edge Functions — Casa Coffee Colab (ASAAS · Pontos Fase 3)

Gateway de pagamento: **Asaas** (Checkout hospedado — loja: Pix + Cartão;
assinatura: cartão-só). **Seis** functions (Supabase, Deno) + a lib compartilhada:

```
supabase/functions/
├── _shared/lib.ts             # Asaas (fetch + access_token: Post/Get/Put/Delete), Supabase
│                              # service_role, CORS, JWT, getSiteUrl(), computeCartFromDb,
│                              # getEffectiveSubscription (benefício vigente: ativa OU pausada
│                              # em graça), getUserTierDiscount, getTierMultiplier, creditPoints,
│                              # checkAchievements
├── create-checkout-session/   # Checkout Asaas: assinatura {tier_slug}, loja {items} OU
│                              # upgrade {upgrade_to_tier} (diferença proporcional); exige JWT
├── cancel-subscription/       # PAUSA a assinatura (PUT status=INACTIVE): mantém o benefício
│                              # até current_period_end. Nunca deleta; exige JWT
├── resume-subscription/       # RETOMA a assinatura pausada (PUT status=ACTIVE): reativa a MESMA
│                              # assinatura sem cobrar do zero na graça; exige JWT
├── downgrade-subscription/    # AGENDA a descida de plano pro próximo ciclo (PUT value menor +
│                              # scheduled_downgrade_to) ou DESFAZ ({acao:'cancelar'}); exige JWT
├── redeem-reward/             # resgata recompensa por pontos (rpc redeem_reward); exige JWT
└── asaas-webhook/             # eventos do Asaas; token no header + idempotência + pontos
```

> **Cancelar = pausar (não deletar).** O Checkout hospedado do Asaas cobra na hora
> que a pessoa digita o cartão — então "retomar" via novo checkout cobraria do
> zero. Por isso `cancel-subscription` **pausa** (`PUT status=INACTIVE`,
> mantém o benefício até o fim do período pago) e `resume-subscription`
> **reativa a MESMA assinatura** (`PUT status=ACTIVE`): dentro do período pago não
> gera cobrança nova; se o período já venceu, cobra a partir de hoje reusando o
> cartão salvo.
>
> **Upgrade = só a diferença proporcional.** Com assinatura vigente,
> `{ upgrade_to_tier }` cobra AGORA `floor((precoNovo − precoAtual) ×
> diasRestantes / 30)` (checkout DETACHED, Pix+Cartão) e o webhook (`upg:`) sobe o
> `value` recorrente pro preço cheio do tier novo no próximo vencimento. Se a
> diferença ficar abaixo do mínimo cobrável do Asaas (~R$5), aplica na hora sem
> cobrar (retorna `{ applied: true }`). Tudo server-side (nunca confia no client).
>
> **Downgrade = agendado, sem reembolso.** O espelho invertido do upgrade:
> `downgrade-subscription { tier_slug }` baixa o `value` recorrente no Asaas (só a
> PRÓXIMA cobrança vem menor) e grava `subscriptions.scheduled_downgrade_to` — a
> pessoa **mantém o tier atual até `current_period_end`**. Quem troca o tier de fato
> é o webhook, quando o pagamento da renovação cai. `{ acao: 'cancelar' }` desfaz o
> agendamento e restaura o `value` cheio.

> **SANDBOX primeiro.** A chave de sandbox (`$aact_hmlg_…`) é de homologação. O
> código é **agnóstico de ambiente** — no go-live troca só os secrets
> (`$aact_hmlg_…` → `$aact_prod_…`, novo webhook token, SITE_URL de prod). A base
> da API é derivada do prefixo da chave (`hmlg` = sandbox), sem `if` no código.

## Regras de segredo (relembrando)

Estes vivem **só** nas env vars da function (`supabase secrets`), **nunca** no
client/bundle/repo:

- `ASAAS_API_KEY` — a chave da API do Asaas (`$aact_hmlg_…` em sandbox). **Vaza
  tudo** — jamais no client. (Uma chave de SANDBOX vazada é tolerável; a de
  **produção** NUNCA pode vazar.)
- `ASAAS_WEBHOOK_TOKEN` — token que tu escolhe e cadastra no webhook do Asaas; o
  webhook compara com o header `asaas-access-token` de cada evento.
- `SITE_URL` — base das `successUrl`/`cancelUrl` (dev: `http://localhost:5173`).

Já injetados pelo Supabase (não precisa setar): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

No **client** NÃO vai nenhuma chave de pagamento: o Checkout do Asaas é 100%
hospedado (o front só redireciona pro `link` que a function devolve). O `.env` do
client tem só o Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e opcional
`VITE_SITE_URL`).

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado (`supabase login`).
- Projeto linkado: `supabase link --project-ref <SEU_PROJECT_REF>`.
- Conta Asaas **sandbox** (grátis): https://sandbox.asaas.com — ver o passo-a-passo abaixo.

## 0) Abrir a conta sandbox do Asaas e pegar a chave

1. Cria a conta grátis em **https://sandbox.asaas.com** (é o ambiente de teste,
   separado da conta de produção — nada cobra de verdade).
2. Dentro do painel sandbox: **Configurações → Integrações → Chave de API** →
   **Gerar chave**. Ela começa com `$aact_hmlg_…`. **Copia e guarda** (é o
   `ASAAS_API_KEY`). Não cola em lugar nenhum do repo/client.
3. Escolhe um **token de webhook** (uma senha forte inventada por ti — ex.: gera
   um UUID). Esse é o `ASAAS_WEBHOOK_TOKEN`; tu vai usá-lo no passo 3.

## 1) Setar os secrets

```bash
supabase secrets set ASAAS_API_KEY='$aact_hmlg_...'      # aspas: a chave tem "$"
supabase secrets set ASAAS_WEBHOOK_TOKEN='o-token-que-escolheu'
supabase secrets set SITE_URL=http://localhost:5173

# conferir:
supabase secrets list
```

> A base da API (sandbox vs prod) é derivada do prefixo da chave. Se algum dia
> precisar forçar, dá pra setar `ASAAS_BASE_URL` — normalmente **não precisa**.

## 2) Deploy das functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy cancel-subscription
supabase functions deploy resume-subscription
supabase functions deploy downgrade-subscription
supabase functions deploy redeem-reward
# o webhook NÃO usa JWT (quem chama é o Asaas, autenticado pelo token no header):
supabase functions deploy asaas-webhook --no-verify-jwt
```

A URL do webhook fica:
`https://<SEU_PROJECT_REF>.functions.supabase.co/asaas-webhook`

## 3) Cadastrar o webhook no Asaas (sandbox)

Painel sandbox → **Configurações → Integrações → Webhooks** (Notificações via
webhook) → **Adicionar**:

- **URL:** `https://<SEU_PROJECT_REF>.functions.supabase.co/asaas-webhook`
- **Token de autenticação:** o mesmo valor de `ASAAS_WEBHOOK_TOKEN` (o Asaas manda
  ele no header `asaas-access-token`; a function rejeita 401 se não bater).
- **Versão da API:** v3.
- **Eventos:** habilita
  - **Checkout:** `CHECKOUT_PAID`, `CHECKOUT_EXPIRED`, `CHECKOUT_CANCELED`.
  - **Pagamento (pontos da assinatura, 1ª cobrança + renovações):**
    `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`.

> Não precisa re-deploy ao cadastrar o webhook: o token já está no secret. Se tu
> TROCAR o token, aí sim: `supabase secrets set ASAAS_WEBHOOK_TOKEN=…` e re-deploy
> do `asaas-webhook`.

## 4) Migration

Roda no **SQL Editor**, nesta ordem, o que ainda faltar depois da 0010:

1. **`0011_asaas.sql`** — os ids do Asaas (`profiles.asaas_customer_id`,
   `subscriptions.asaas_*`, `orders.asaas_*`) e a tabela de idempotência
   `asaas_events`.
2. **`0012_asaas_checkout_link.sql`** — `subscriptions.asaas_checkout_id`, o elo
   que liga o `CHECKOUT_PAID` (sabe user+tier) ao `PAYMENT_*` (sabe o id da
   assinatura).
3. **`0012_downgrade.sql`** — `subscriptions.scheduled_downgrade_to`, sem a qual a
   `downgrade-subscription` não funciona.
4. **`0013_redeem_reward_user_lock.sql`** — corrige gasto duplo de pontos em
   resgates simultâneos (trava a linha do usuário antes de ler o saldo).

Todas são idempotentes e não mexem em nada das migrations anteriores (as colunas
`stripe_*` continuam no banco, só param de ser usadas). Os dois arquivos com
prefixo `0012` são independentes entre si — a ordem entre eles não importa.

## Logs

```bash
supabase functions logs create-checkout-session
supabase functions logs cancel-subscription
supabase functions logs resume-subscription
supabase functions logs downgrade-subscription
supabase functions logs redeem-reward
supabase functions logs asaas-webhook
```

## Sequência completa (resumo)

1. Abre a conta **sandbox** do Asaas, gera a `ASAAS_API_KEY` (`$aact_hmlg_…`) e
   escolhe um `ASAAS_WEBHOOK_TOKEN` (passo 0).
2. Roda as migrations `0011` → `0013` no SQL Editor (passo 4).
3. `supabase secrets set` de `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `SITE_URL`.
4. `supabase functions deploy` das **seis** functions (webhook com `--no-verify-jwt`).
5. Cadastra o webhook no Asaas (sandbox) com o token e os eventos de checkout +
   pagamento (passo 3).
6. No client: `.env` com o Supabase (sem nenhuma chave de pagamento).

## Como testar (sandbox)

**Assinatura:** logado, em `/planos` clica "assinar" → Checkout do Asaas → paga
com **cartão de teste** (o sandbox tem cartões de teste na doc do Asaas). A
assinatura é **cartão-só** — o Asaas não permite Pix em cobrança recorrente
(`RECURRENT` exige `CREDIT_CARD`) → volta pra `checkout-sucesso.html?assinatura=1`.
No `CHECKOUT_PAID` a function grava `subscriptions` + espelha `profiles.tier_slug`;
os pontos entram no `PAYMENT_CONFIRMED/RECEIVED`. Confere no banco.

**Loja:**
- Adiciona itens ao carrinho, abre o drawer, "finalizar compra".
  - Deslogado → vai pro login e volta pro carrinho (`?cart=open`).
  - Logado → Checkout do Asaas.
- Paga (cartão de teste ou Pix). O `CHECKOUT_PAID` finaliza a `orders` (que já foi
  PRÉ-CRIADA como `pendente`) pra `pago` + cria os pontos. Se o checkout expira/é
  cancelado, o `CHECKOUT_EXPIRED/CANCELED` marca o pedido pendente como `cancelado`.
- **Desconto do tier:** com assinatura ATIVA, o total do checkout já vem com o
  `discount_percent` do tier (o Asaas não tem campo de desconto, então o carrinho
  vira UM item consolidado cujo valor = total já com desconto; a discriminação real
  fica em `order_items`). Sem assinatura = 0%.

**Pausar assinatura (o "cancelar"):** no perfil → "gerenciar assinatura" →
"pausar assinatura" → confirma → a function `cancel-subscription` faz
`PUT /subscriptions/{id}` com `status=INACTIVE` no Asaas, marca
`subscriptions.status='pausada'` e **mantém** `profiles.tier_slug` — o benefício
segue até `current_period_end`. (Se o Asaas responder 404, aí sim trata como
encerrada: `cancelada` + limpa o tier.) O Asaas não tem portal hospedado — a tela
é nossa.

**Retomar assinatura:** com o plano pausado, o perfil mostra "retomar plano" →
`resume-subscription` faz `PUT status=ACTIVE`. Ainda no período pago
(`current_period_end` no futuro) → mantém o `nextDueDate`, **sem cobrar agora**.
Período já vencido → reativa com `nextDueDate=hoje` (cobra o cartão salvo). Volta
`subscriptions.status='ativa'` e garante `profiles.tier_slug`.

**Upgrade de plano:** com assinatura ATIVA, o perfil lista os tiers acima do atual
→ ao escolher, o client chama `create-checkout-session { upgrade_to_tier }`. A
function calcula a diferença proporcional server-side:
- Diferença ≥ mínimo do Asaas (~R$5) → devolve `{ url }` do checkout DETACHED
  (Pix+Cartão) da diferença; ao pagar, o webhook `upg:` sobe o `value` recorrente
  pro preço cheio e espelha o tier. Volta pra `checkout-sucesso.html?upgrade=1`.
- Diferença < mínimo → aplica na hora (`PUT value` + tier), retorna `{ applied: true }`.
Sem crédito de pontos no upgrade (é ajuste, não compra). Preço maior só entra por aqui.

**Downgrade de plano:** com assinatura ATIVA, o perfil também lista os tiers **abaixo**
do atual → `downgrade-subscription { tier_slug }`. A function exige destino mais barato
(preços do BANCO), baixa o `value` no Asaas e grava `scheduled_downgrade_to` — **sem
mexer no tier atual**. Nada é cobrado nem reembolsado agora: o benefício segue até
`current_period_end` e a renovação vem no valor menor. Quem troca o tier de fato é o
`asaas-webhook` quando o pagamento da renovação cai (troca ANTES de creditar pontos, pra
já valer o multiplicador novo, e limpa a coluna). "Manter o plano atual" →
`{ acao: 'cancelar' }` limpa o agendamento e restaura o `value` cheio. Se um dos dois
passos (Asaas / banco) falhar, o outro é revertido — nunca sobra `value` baixo sem
downgrade agendado.

**Pontos (Fase 3):**
- Após uma compra/assinatura paga, os pontos = `floor(valor × points_multiplier)`
  do tier ativo (sem plano = 1x). Loja: sobre o **total já com desconto**.
- **Idempotência:** reenviar o mesmo evento (o Asaas reenvia em caso de falha) **não**
  duplica o crédito (unique `(ref_type, ref_id)` no ledger + `asaas_events` por `id`).
- **Renovação:** cada mensalidade gera novo `PAYMENT_CONFIRMED/RECEIVED` (ref =
  `payment.id`) → credita de novo, sem duplicar.
- **Resgate:** em `/conta/pontos`, "resgatar" → desconta o saldo, cria
  `redemptions`, baixa estoque e (se cupom) gera um código `CASA-XXXX` (30 dias).
- **RLS:** anon não lê `points_ledger`/`redemptions`/`coupons`/`asaas_events` de
  ninguém (só o dono, logado).

---

## Go-live (produção) — só config/secrets, o código NÃO muda

> **Passar pra conta do dono do site?** Tem um guia de handoff dedicado, passo-a-passo:
> [`HANDOFF.md`](../../HANDOFF.md) na raiz do repo — **Parte 1 (Asaas)** cobre sandbox
> do dono → produção; **Partes 2 e 3** cobrem migrar também o Supabase e a Vercel. O
> resumo abaixo é a versão curta.

1. Cria/usa a conta **de produção** do Asaas (https://www.asaas.com), completa o
   cadastro/KYC, e gera a chave de produção (`$aact_prod_…`).
2. Troca os secrets: `supabase secrets set ASAAS_API_KEY='$aact_prod_…'`,
   um `ASAAS_WEBHOOK_TOKEN` novo, e `SITE_URL=https://<teu-domínio>`. Re-deploy das
   **seis** functions.
3. Cadastra o webhook na conta de **produção** (mesmos eventos), com o token novo.
4. Habilita Pix e Cartão na conta de produção (se ainda não estiverem).
5. O client não muda (não tem chave de pagamento).
