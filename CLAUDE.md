# Casa Coffee Colab — Contexto do Projeto

Site do **Casa Coffee Colab**, um café-casa de encontros em Novo Hamburgo/RS.
"O Casa é café, afeto e comida boa."

Construído em fases. Esta é a fundação visual — sem backend ainda.

---

## Stack

- **Vite** (vanilla, multi-página) — cada página é uma URL/`.html` própria.
- **Tailwind CSS** (CLI/PostCSS) — não usar CDN.
- **JS vanilla** — sem framework.
- **Fontes** via `@fontsource` (bundled, sem CDN externo).

Fases seguintes (ainda **não** implementadas):
- **Supabase** — auth, banco, RLS, edge functions.
- **Stripe** — pagamentos.
- **Deploy** na **Vercel**.

---

## Convenção de código

Código **consolidado**: UM arquivo grande por camada, pra facilitar busca durante o desenvolvimento. Não fragmentar em muitos arquivos pequenos.

- `src/app.js` — toda a lógica/JS da camada de interface.
- `src/styles.css` — entrada Tailwind + estilos base.
- `src/schema.sql` — (futuro) todo o schema do banco.

**Header, footer e menu são funções dentro do `app.js`** que injetam HTML nos placeholders da página (`<div id="site-header"></div>` / `<div id="site-footer"></div>`).

**Páginas `.html` continuam separadas** — cada uma é uma URL. Ficam em `src/pages/` (exceto a home, que é a entrada principal do Vite).

---

## Paleta (tokens Tailwind)

| Token       | Hex       | Uso                          |
|-------------|-----------|------------------------------|
| `terracota` | `#8c3a2a` | cor primária / acento quente |
| `verde`     | `#305429` | secundária / natureza        |
| `cafe`      | `#5b3c34` | texto escuro / café          |
| `caramelo`  | `#a56a3a` | destaques dourados           |
| `bege`      | `#ead8c1` | fundos claros / papel        |
| `preto`     | `#000000` | —                            |
| `branco`    | `#ffffff` | —                            |

---

## Tipografia

- **Sora** → `font-sora` — texto/UI, corpo.
- **Títulos** → `font-titulo` — placeholder **Fraunces**.
- **Decorativa/manuscrita** → `font-decor` — placeholder **Caveat**.

> **TODO (fontes reais):** as fontes oficiais da marca são **Rexton** (títulos/UI) e **Mayonice** (decorativa) — ambas **pagas**. Enquanto não temos as licenças, usamos **Fraunces** (títulos) e **Caveat** (decorativa) como placeholder. Quando as fontes reais chegarem, trocar em `@fontsource`/`styles.css` e nos tokens `fontFamily` do `tailwind.config.js`. Sora permanece.

---

## Tom de voz da marca

**SEGUIR SEMPRE** — inclusive em microcopy, botões, mensagens de erro e labels.

- Acolhedor, autoral, poético contido, urbano-afetivo, humilde.
- Tratamento **"tu" / "a gente"**.
- CTAs gentis: *"passa aqui?"*, *"fica um pouco"*, *"entra, senta, fica um pouco"*.

**EVITAR sempre:**
- Palavras: *gourmet, luxo, premium, exclusivo, hype, trend*.
- Imperativos agressivos: *"aproveita já!"*, *"corre!"*.
- Qualquer gamificação com cara de cassino (roleta, "gire pra ganhar", contadores de urgência falsos).

---

## Contato oficial (header/footer)

- **Endereço:** R. Victor Hugo Kunz, 411 — Hamburgo Velho, Novo Hamburgo/RS
- **E-mail:** casacoffeecolab@gmail.com
- **Telefone:** (51) 99360-5262
- **Horário:** Seg a sáb 8h–19h · dom 15h–19h

Redes (placeholders por enquanto): Instagram, Facebook, Spotify.

---

## Imagens / fotos reais (TODO)

Ainda **não temos fotos**. Todas as imagens são **placeholders de gradiente** com as
cores da marca, via utilitários no `styles.css`:

- `.photo-warm` — gradiente terracota→caramelo→café (quente).
- `.photo-green` — gradiente verde→café.
- `.photo-bege` — gradiente bege→caramelo (claro).

> **TODO (trocar por fotos reais):** substituir os `div.photo-*` por `<img>`/`background-image`
> reais quando as fotos chegarem. Onde entram fotos hoje (na `home.html`):
> - **Hero** — 3 slides (fundo full-bleed de cada `article.carousel-slide`).
> - **Feito no Casa** — 4 cards de cardápio (topo de cada card, `aspect-[4/3]`).
> - **Gente do Casa** — 3 cards de colab (faixa lateral de cada card).
> - **A loja do Casa** — 4 cards de produto (`aspect-square`).
> - **Playlists** — o card placeholder vira o embed real do Spotify (`<iframe>`, já
>   comentado no HTML).
> As classes `.photo-*` podem permanecer como fallback/skeleton.

---

## Ícones

- **Lucide** via módulo `lucide` (sem CDN). Uso: `<i data-lucide="nome"></i>` no HTML;
  `renderIcons()` no `app.js` chama `createIcons()` e substitui por SVG **após** injetar markup.
- Importar só os ícones usados (tree-shaking) no topo do `app.js` e registrar em `LUCIDE_ICONS`.

---

## Carrossel

- Função única `setupCarousel(trackEl, { dots, autoplay, interval })` no `app.js` — serve os 3 tracks.
- Base em **scroll-snap** horizontal (`.carousel-track`), navegável por swipe/scroll, teclado (setas) e dots.
- **Autoplay** (só no hero) respeita `prefers-reduced-motion` e pausa em hover/foco/toque.
- Contrato de DOM: `[data-carousel]` › `[data-carousel-track]` (+ opcionais `[data-dots]`,
  `[data-carousel-prev]`, `[data-carousel-next]`).

---

## Loja (catálogo, produto, carrinho)

- **Catálogo (mock)**: array `PRODUTOS` no `app.js` (bloco "CATÁLOGO (MOCK …)"). Cada item:
  `id, nome, slug, categoria (vestuario|acessorios|cafe_grao), preco_centavos, descricao,
  imagemPlaceholder (.photo-*), variantes ({ rotulo, opcoes[] } | null)`.
  > **TODO (Fase 2):** substituir o mock pela tabela **`products` do Supabase** (mesma forma).
- **Páginas**: `src/pages/loja.html` (grid + filtro por categoria) e
  `src/pages/produto.html` (lê `?slug=`, renderiza detalhe; estado vazio gentil se não achar).
  Ambas registradas no `rollupOptions.input` do `vite.config.js`.
- **Carrinho** (`Cart` no `app.js`): estado em **localStorage** (chave `casa_cart`) — o site é
  multi-página, então o carrinho **sobrevive a reloads/navegação**. API:
  `addItem/removeItem/updateQty/getCart/getSubtotalCentavos/getCount/clearCart/onChange`.
  Sincroniza entre abas via evento `storage`.
- **Drawer**: painel lateral reutilizável, injetado uma vez no `<body>`; abre pelo ícone
  `shopping-bag` do header (com badge de contagem). Fecha por X, Esc e clique no backdrop.
  Botão "finalizar compra" é **placeholder** — o **checkout via Stripe vem na Fase 2**.
- **Preços**: sempre cheios, via `formatBRL(centavos)` (ex.: `R$ 49,90`). O **desconto por tier
  de assinatura NÃO é aplicado aqui** — ele entra no checkout (Fase 2).

---

## Páginas & navegação

Todas as páginas ficam em `src/pages/` (uma URL cada) e precisam estar registradas no
`rollupOptions.input` do `vite.config.js`. Header/footer vêm do `app.js`.

| Página        | Arquivo             | Conteúdo                                                            |
|---------------|---------------------|--------------------------------------------------------------------|
| Home          | `home.html`         | hero + carrosséis + teasers (loja/planos) + playlists              |
| O Casa        | `o-casa.html`       | sobre: história, DNA, selo "Feito no Casa", localização (mapa TODO) |
| Cardápio      | `cardapio.html`     | menu literário (lista por seção) — informativo, **sem carrinho**   |
| Loja          | `loja.html`         | catálogo + filtro por categoria                                    |
| Produto       | `produto.html`      | detalhe via `?slug=` (conta como "Loja" na nav)                    |
| Planos        | `planos.html`       | 4 tiers, sistema de pontos, conquistas; "assinar" é placeholder    |
| Colab         | `colab.html`        | Residência Gente do Casa; carrossel de colabs; convite (mailto/WhatsApp) |
| Cadastro      | `cadastro.html`     | criar conta (nome/telefone/e-mail/senha); estado "confirme seu e-mail" |
| Login         | `login.html`        | entrar (e-mail/senha) + "esqueci a senha" (reset por e-mail)       |
| Auth OK       | `auth-confirmado.html` | retorno do link de confirmação; detecta a sessão na URL         |
| Perfil        | `conta/perfil.html` | área logada (protegida): dados, pontos, plano; editar nome/telefone |

- **NAV** (array no `app.js`): Home, O Casa, Cardápio, Loja, Planos, Colab — todas
  apontam pras páginas reais. `activeNavHref()` detecta a página atual pelo pathname e
  marca o item ativo com `aria-current="page"` + `text-terracota font-semibold`
  (produto → "Loja"; raiz/`index.html` → "Home").
- **Cardápio e Planos** usam preços fictícios com nota no rodapé ("* valores ilustrativos" /
  "* valores fictícios, a definir"). Botão **"assinar"** (`initPlanosPage`) só revela um aviso
  gentil — o checkout via Stripe vem na Fase 2.
- **Colab** reutiliza o `setupCarousel` via `data-carousel="cards"` (mesmo contrato da home).

---

## Autenticação (Fase 2 — Supabase Auth)

Toda a lógica fica no bloco `// ===== AUTH =====` do `app.js`. **Só a anon key no client**
(`import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) — a RLS é quem protege
os dados. Nada de service_role no bundle.

- **Client**: `export const supabase` (via `@supabase/supabase-js`). Se o `.env` não
  estiver preenchido (placeholder), `supabase` fica `null` e as telas degradam com aviso
  gentil, sem quebrar.
- **Helpers**: `getSession()`, `getUser()`, `getProfile()` (lê a **própria** linha do
  `profiles` — RLS `id = auth.uid()`), `signOut()`. O **papel (role) vem sempre do
  `profiles`**, nunca de valor do client.
- **Header**: `initAuth()` + `updateAuthUI(session)` preenchem `[data-auth-slot]` /
  `[data-auth-slot-mobile]`. Deslogado → "entrar"; logado → nome + "sair". Reage a
  `onAuthStateChange` (inclusive login/logout em outra aba). O nome de exibição vem do
  `user_metadata.full_name` e é **sempre escapado** (`escapeHtml`) antes de ir pro DOM.
- **Cadastro** (`initCadastroPage`): valida no client (nome, e-mail, senha ≥ 8, confirmação);
  `signUp` passa `full_name` + `telefone` em `options.data` → a trigger `handle_new_user`
  popula o `profiles`. Com "Confirm email" ligado, mostra o estado "confirme seu e-mail".
  O link de confirmação volta pra `auth-confirmado.html` via `options.emailRedirectTo`.
- **Login** (`initLoginPage`): `signInWithPassword`; "esqueci a senha" usa
  `resetPasswordForEmail`. Após entrar, respeita `?redirect=` (só caminho interno —
  `sanitizeRedirect`, anti open-redirect).
- **Confirmação** (`initAuthConfirmadoPage`, `auth-confirmado.html`): o supabase-js
  detecta a sessão na URL (`detectSessionInUrl`, padrão). Logado → "ir pra minha conta";
  senão → link pro login.
- **Base URL dos e-mails** (`siteBase()`): `import.meta.env.VITE_SITE_URL || window.location.origin`
  — **sem localhost hardcoded**. Serve `emailRedirectTo` (confirmação) e `redirectTo` (reset).
  Em prod, defina `VITE_SITE_URL` como env var na Vercel apontando pro domínio final.
- **Guard** (`requireAuth`): páginas com `[data-perfil-root]` (área `conta/`) exigem sessão;
  sem sessão → redireciona pro login guardando o destino. Nunca confia em role do client.
- **Perfil** (`initPerfilPage`): mostra dados + pontos + plano (via `tier_slug`); edita
  nome/telefone com `update` na própria linha (RLS garante) **e** espelha no `auth.updateUser`
  (metadata) pra o header refletir o nome novo.

> **Hardening / go-live (checklist de deploy):**
> - **"Confirm email" DEVE estar LIGADO** no Supabase (Auth settings). Pra testar o
>   happy-path local, o humano pode desligar temporariamente — mas **RE-LIGAR antes do deploy**.
> - **Site URL + Redirect URLs** (Supabase → Authentication → URL Configuration): precisam
>   listar **tanto o localhost de dev** (ex.: `http://localhost:5173` e `http://localhost:4173`)
>   **quanto o domínio final da Vercel** (prod). Sem isso, os links de confirmação/reset são
>   rejeitados. **Isto é config de painel, não código.**
> - Definir a env var **`VITE_SITE_URL`** na Vercel apontando pro domínio de prod (o código
>   já usa `siteBase()`; localmente o fallback é `window.location.origin`).

---

## Pagamentos (Fase 6 — Stripe)

Fundação em **test mode**: assinatura dos 4 tiers via **Stripe Checkout** hospedado.
Toda a lógica sensível fica nas **Edge Functions** (`supabase/functions/`), nunca no client.

- **Código agnóstico de ambiente:** test e live rodam o MESMO código — muda só a
  chave (secrets). Sem `if test/if live` no código.
- **Segredos SÓ nas Edge Functions** (`supabase secrets`, nunca client/bundle/repo):
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`. Injetados pelo Supabase:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. No **client** só `VITE_STRIPE_PUBLISHABLE_KEY`.
- **`_shared/lib.ts`**: client Stripe (fetch http client do Deno), Supabase service_role,
  CORS, `getUserFromRequest()` (valida o JWT), `jsonResponse()`, `getSiteUrl()`.
- **`_shared/lib.ts` (loja, 6b)**: `ensureStripeCustomer()`, `computeCartFromDb()`
  (valida itens e SOMA o subtotal pelo **BANCO** — products/product_variants, nunca do
  client) e `getUserTierDiscount()` (desconto do tier ATIVO via `profiles.tier_slug →
  tiers.discount_percent`; sem assinatura = 0%).
- **`create-checkout-session`** — dois modos:
  - **assinatura** (`{ tier_slug }` → mode `subscription`): lê `stripe_price_id` do BANCO.
  - **loja** (`{ items: [{product_slug, variant, qtd}] }` → mode `payment`): recalcula
    subtotal server-side, aplica o desconto do tier via **Stripe Coupon `percent_off`
    dinâmico** (`duration:'once'`, `max_redemptions:1`), e grava um snapshot compacto do
    carrinho em `metadata.items` pro webhook. **Sem `payment_method_types`** → o Checkout
    usa os métodos habilitados no Dashboard (cartão/Pix/Boleto) sem hardcode.
  - Ambos: valida JWT, cria/reusa Customer, monta `success_url`/`cancel_url` via `getSiteUrl()`.
- **`create-portal-session`** (6b): valida JWT, pega `profiles.stripe_customer_id`, cria
  uma **Billing Portal Session** (`return_url` → perfil). Assinante gerencia/cancela no Stripe.
- **`stripe-webhook`** (deploy com `--no-verify-jwt`): SEMPRE verifica a assinatura
  (`constructEventAsync`) + idempotência via `stripe_events` (PK = `event.id`).
  - **assinatura**: `customer.subscription.*` e `checkout.session.completed` (mode
    subscription) → upsert `subscriptions` + espelha `profiles.tier_slug`.
  - **loja**: `checkout.session.completed` (mode payment) cria `orders` + `order_items`
    via service_role (idempotente por `orders.stripe_checkout_id`), com
    `subtotal/desconto/total` vindos de `session.amount_*` (valor REAL cobrado).
    Pix/Boleto são assíncronos → `completed` pode criar `pendente` e o
    `checkout.session.async_payment_succeeded` finaliza pra `pago` (`async_payment_failed`
    → `cancelado`). Crédito de **pontos** é Fase 3 (só TODO comentado, já com o `total`).
- **Migration `0006_stripe`**: `stripe_events`, `profiles.stripe_customer_id`, UNIQUE em
  `subscriptions.stripe_subscription_id`, `UPDATE`s dos `tiers.stripe_price_id`.
- **Migration `0007_orders_stripe`**: auditoria de `orders`/`order_items` (a 0001 já tinha
  as colunas — reusadas pelos nomes canônicos PT: `subtotal_centavos`/`desconto_centavos`/
  `total_centavos`/`tier_slug_aplicado`/`stripe_checkout_id`/`preco_unit_centavos`) +
  índice **UNIQUE em `orders.stripe_checkout_id`** (idempotência do webhook da loja).
- **Front (loja)**: o drawer "finalizar compra" chama a function mode `payment` (deslogado
  → login e volta pro carrinho via `?cart=open`); mostra o aviso do desconto do tier;
  `checkout-sucesso.html` limpa o carrinho; o perfil tem "gerenciar assinatura" (portal).
- **Setup/deploy**: ver `supabase/functions/README.md`. Teste com o cartão
  **4242 4242 4242 4242** (validade futura / CVC / CEP quaisquer); Pix/Boleto se simulam
  no Dashboard/CLI do test mode.

> **Go-live LIVE (o que muda no dia — só config/secrets, o código NÃO muda):**
> - **Criar os produtos/preços em LIVE mode** (rodar `scripts/stripe-seed.mjs` com a
>   `sk_live_…`), pegar os `price_id` live e rodar uma **migration NOVA** com os
>   `UPDATE public.tiers set stripe_price_id=… ` live (a 0006 é imutável).
> - Trocar os secrets das functions pros de LIVE: `supabase secrets set` de
>   `STRIPE_SECRET_KEY` (`sk_live_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…` do endpoint
>   **live**) e `SITE_URL` (domínio de prod). Re-deploy das **três** functions.
> - **Cadastrar um novo endpoint de webhook em LIVE mode** no Stripe (o whsec de test
>   não vale em live), com os eventos de assinatura **e** de loja
>   (`checkout.session.completed`, `customer.subscription.*`,
>   `checkout.session.async_payment_succeeded|failed`).
> - **Habilitar Pix e Boleto na conta LIVE** (Settings → Payment methods) — cartão já vem.
> - No client/Vercel: `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`.
> - Conferir que os 4 tiers têm `stripe_price_id` live no banco antes de abrir as vendas.

---

## Fidelidade / Pontos (Fase 3)

O `points_ledger` (0001, append-only) é a **fonte da verdade**; `profiles.points_balance`
é um **cache** que nunca diverge (trigger). Todo cálculo de saldo é server-side; o front
só LÊ (RLS: cada um lê o próprio ledger).

- **Regra (travada):** 1 ponto por R$1 × `tiers.points_multiplier` do tier ATIVO no
  momento (sem assinatura = 1x). Loja: sobre o total **já com desconto**. Sempre `floor`.
  Ex.: R$49,41 no Ouro (1,5x) → `floor(74.115)` = 74.
- **Migration `0008_points`**: `points_ledger.ref_type/ref_id` (+ UNIQUE parcial pra
  anti-duplicação), trigger `update_points_balance` (soma o delta no cache; seta a GUC
  `casa.trusted_points` pra o `prevent_points_tamper` liberar o write server-side),
  `recalc_points_balance` (reparo, só service_role), `redeem_reward` (resgate ATÔMICO com
  `for update`), `rewards_catalog.slug/cupom_valor_centavos` + seed de recompensas. O
  `motivo` do ledger virou texto livre em PT (`'compra na loja'`, `'assinatura'`,
  `'renovação da assinatura'`, `'resgate: <nome>'`) — o CHECK restritivo foi removido.
- **Crédito (stripe-webhook, via `creditPoints` de `_shared/lib.ts`)**: loja →
  `checkout.session.completed`/`async_payment_succeeded` (só quando `pago`), ref `order`;
  assinatura → `checkout.session.completed` (1ª mensalidade), ref `subscription_start`;
  renovação → **`invoice.paid`** com `billing_reason='subscription_cycle'` (a
  `subscription_create` é ignorada — já creditada), ref `subscription_renewal`. Idempotente
  por `(ref_type, ref_id)` + `stripe_events`. Crédito **nunca** vem do client.
- **Resgate (`redeem-reward` → RPC `redeem_reward`)**: valida JWT, chama a função SQL via
  service_role com o id do PRÓPRIO usuário. A função (revogada de anon/authenticated) trava
  a linha do reward, valida saldo pelo LEDGER/estoque, lança o negativo, cria `redemptions`,
  baixa estoque e gera cupom `CASA-XXXX` (30 dias) se for do tipo cupom. Resgate duplo é
  impossível (lock). Saldo insuficiente → erro gentil, sem débito.
- **Front**: `conta/pontos.html` (`initPontosPage`, atrás do `requireAuth`) — saldo,
  multiplicador do tier, extrato do ledger e grid de recompensas com "resgatar" (desabilitado
  gentil "faltam X pontos" quando não dá). O perfil linka pro extrato; a `checkout-sucesso`
  sonda o ledger pelo `session_id` e mostra "+X pontos 💛". Tom acolhedor, ZERO cara de cassino.
- **Go-live:** adicionar o evento **`invoice.paid`** ao endpoint de webhook (test e live) e
  fazer deploy do `redeem-reward`. Nenhuma regra de pontos muda entre test e live.

---

## Responsividade

- **Mobile-first**, funcionando desde **~320px** (Galaxy Pocket) até **ultrawide (2560px+)**.
- Breakpoints extras no Tailwind: `xs` 375, `3xl` 1920, `4xl` 2560 (mantendo `sm/md/lg/xl/2xl` padrão).
- Sempre respeitar **`prefers-reduced-motion`**.

---

## Estrutura de pastas

```
/
├── index.html            # home (entrada principal do Vite)
├── src/
│   ├── app.js            # header/footer/menu + lógica de UI
│   ├── styles.css        # entrada Tailwind + base
│   ├── pages/            # demais páginas .html (uma por URL)
│   └── assets/           # imagens, ícones, etc.
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

---

## Comandos

- `npm run dev` — servidor de desenvolvimento (Vite).
- `npm run build` — build de produção.
- `npm run preview` — pré-visualiza o build.

## Segurança (regras obrigatórias — valem a partir da Fase 2)

Segredos:
- .env no .gitignore; .env.example (sem valores reais) versionado. NUNCA commitar segredo.
- Só no client/Vercel: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_PUBLISHABLE_KEY.
- SÓ nas env vars das Edge Functions (nunca no bundle/Vercel/repo): SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, POS_WEBHOOK_SECRET.

Banco (RLS-by-default):
- Toda tabela sobe com RLS habilitado e deny-by-default. Nenhuma tabela sem política explícita.
- points_ledger, subscriptions, orders, redemptions, audit_log: cliente só LÊ o próprio registro; escrita só via Edge Function (service_role) ou trigger.
- role do usuário vem de profiles (fonte confiável), NUNCA de valor enviado pelo client. Troca de papel só pelo owner e registrada no audit_log.

Confiança zero no client:
- Pontos calculados e gravados só server-side (ledger append-only). Front só lê.
- create-checkout-session recalcula preço, desconto do tier e total pelo BANCO — nunca confia no valor/carrinho do client.
- Webhooks (Stripe e PDV): verificar assinatura (Stripe signature / HMAC) + idempotência por id de evento (anti-replay). SEMPRE.
- Escapar toda string vinda do banco antes de injetar no DOM (evitar XSS no JS vanilla).

Gate de fim de leva (backend): rodar antes de commitar —
1) grep por chaves secretas no código/dist; 2) confirmar RLS on em toda tabela nova; 3) npm audit; 4) nenhuma escrita sensível no client.
- Implementado em `npm run security-check` (`scripts/security-check.mjs`, estático) + `scripts/check-rls.sql` (prova de RLS ao vivo no SQL Editor, incl. teste negativo como anon). Rodar o security-check ANTES de commitar/subir.

## Migrations do banco (Supabase)

Todo SQL que precisa rodar no SQL Editor do Supabase vira um arquivo numerado em supabase/migrations/, na ordem de aplicação (ex: 0001_init.sql, 0002_rls.sql, 0003_seed.sql). O humano aplica cada migration MANUALMENTE no SQL Editor, em ordem.
- Migrations são APPEND-ONLY e IMUTÁVEIS: depois de aplicada, nunca edite. Mudança nova = arquivo novo numerado.
- Cada migration deve ser autocontida e, quando possível, idempotente (IF NOT EXISTS / CREATE OR REPLACE).
- Ao gerar migrations, SEMPRE diga ao humano exatamente quais arquivos rodar e em que ordem.
- Não existe mais um schema.sql único — as migrations numeradas são a fonte da verdade do banco.
- Aplicadas até agora: `0001_init` (tabelas + funções de papel + triggers), `0002_rls` (RLS + policies), `0003_seed` (tiers/produtos/conquistas/parceiros), `0004_reconcile` (5 tabelas da Fase 3: `rewards_catalog`, `events`, `coupons`, `pos_webhook_events`, `unclaimed_points` + colunas `tiers.points_multiplier/discount_percent` e `profiles.points_balance/tier_slug`), `0005_profiles_phone` (coluna `profiles.telefone` + `handle_new_user` populando telefone + trigger `prevent_points_tamper` blindando `points_balance`/`tier_slug` contra escrita do client), `0006_stripe` (`stripe_events` + `profiles.stripe_customer_id` + UNIQUE em `subscriptions.stripe_subscription_id` + price IDs dos tiers), `0007_orders_stripe` (UNIQUE em `orders.stripe_checkout_id` pra idempotência da loja), `0008_points` (Fase 3: `points_ledger.ref_type/ref_id` + UNIQUE `(ref_type,ref_id)`, trigger `update_points_balance` que sincroniza o cache, `prevent_points_tamper` com bypass via GUC `casa.trusted_points`, `recalc_points_balance`, `redeem_reward` atômica, `rewards_catalog.slug/cupom_valor_centavos` + seed de recompensas), `0009_achievements` (Fase 3 conquistas: coluna `achievements.criterios` jsonb + função `check_achievements(uuid)` SECURITY DEFINER que avalia os critérios e concede os emblemas server-side, chamada nos webhooks e no resgate), `0010_achievement_hints` (coluna `achievements.dica` + seed das dicas "como desbloquear" por slug, mostradas no card bloqueado e no tooltip dos emblemas do painel).
- `partners` e `tiers` têm PK = **slug**; FKs pra elas seguem a convenção `*_slug` (ex.: `profiles.tier_slug`, `rewards_catalog.partner_slug`), não `*_id`.