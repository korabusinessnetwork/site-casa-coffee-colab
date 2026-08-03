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
- **Asaas** — pagamentos (checkout hospedado).
- **Deploy** na **Vercel**.

---

## Convenção de código

Código **consolidado**: UM arquivo grande por camada, pra facilitar busca durante o desenvolvimento. Não fragmentar em muitos arquivos pequenos.

- `src/app.js` — toda a lógica/JS da camada de interface.
- `src/styles.css` — entrada Tailwind + estilos base.
- `src/schema.sql` — (futuro) todo o schema do banco.

**Header, footer e menu são funções dentro do `app.js`** que injetam HTML nos placeholders da página (`<div id="site-header"></div>` / `<div id="site-footer"></div>`).

**Páginas `.html` continuam separadas** — cada uma é uma URL. Ficam direto em `src/` (a área logada em `src/conta/`), porque **o caminho do arquivo é a URL**: `src/o-casa.html` vira `/o-casa`, `src/conta/perfil.html` vira `/conta/perfil`.

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
- **Páginas**: `src/loja.html` (grid + filtro por categoria) e
  `src/produto.html` (lê `?slug=`, renderiza detalhe; estado vazio gentil se não achar).
  Ambas registradas no `rollupOptions.input` do `vite.config.js`.
- **Carrinho** (`Cart` no `app.js`): estado em **localStorage** (chave `casa_cart`) — o site é
  multi-página, então o carrinho **sobrevive a reloads/navegação**. API:
  `addItem/removeItem/updateQty/getCart/getSubtotalCentavos/getCount/clearCart/onChange`.
  Sincroniza entre abas via evento `storage`.
- **Drawer**: painel lateral reutilizável, injetado uma vez no `<body>`; abre pelo ícone
  `shopping-bag` do header (com badge de contagem). Fecha por X, Esc e clique no backdrop.
  Botão "finalizar compra" chama a `create-checkout-session` e manda pro **Checkout
  hospedado do Asaas** (ver "Pagamentos"); deslogado, passa pelo login e volta pro carrinho.
- **Preços**: sempre cheios, via `formatBRL(centavos)` (ex.: `R$ 49,90`). O **desconto por tier
  de assinatura NÃO é aplicado aqui** — quem aplica é a Edge Function, pelo banco, no checkout.

---

## Páginas & navegação

Todas as páginas ficam direto em `src/` (a área logada em `src/conta/`) e precisam estar
registradas no `rollupOptions.input` do `vite.config.js`. Header/footer vêm do `app.js`.

**URLs limpas — sem `/pages/` e sem `.html`.** O arquivo `src/o-casa.html` é servido em
`/o-casa`. Quem tira a extensão em produção é a **Vercel** (`cleanUrls: true` no
`vercel.json`, que também redireciona 308 de `/x.html` pra `/x`); em desenvolvimento quem
faz isso é o plugin `urlsLimpasNoDev()` do `vite.config.js`, um middleware que anexa
`.html` na requisição quando o arquivo existe. Assim o link é escrito limpo num lugar só e
funciona igual nos dois ambientes. O `vercel.json` guarda ainda redirects permanentes de
`/pages/*` pros caminhos novos, pra não quebrar links antigos em circulação (e-mails de
confirmação do Supabase, `successUrl` de checkouts já emitidos).

| Página        | Arquivo             | URL                | Conteúdo                                                            |
|---------------|---------------------|--------------------|--------------------------------------------------------------------|
| Home          | `home.html`         | `/home`            | hero + carrosséis + teasers (loja/planos) + playlists              |
| O Casa        | `o-casa.html`       | `/o-casa`          | sobre: história, DNA, selo "Feito no Casa", localização (mapa TODO) |
| Cardápio      | `cardapio.html`     | `/cardapio`        | menu literário (lista por seção) — informativo, **sem carrinho**   |
| Loja          | `loja.html`         | `/loja`            | catálogo + filtro por categoria                                    |
| Produto       | `produto.html`      | `/produto?slug=`   | detalhe via `?slug=` (conta como "Loja" na nav)                    |
| Planos        | `planos.html`       | `/planos`          | 4 tiers, sistema de pontos, conquistas; "assinar" é placeholder    |
| Colab         | `colab.html`        | `/colab`           | Residência Gente do Casa; carrossel de colabs; convite (mailto/WhatsApp) |
| Cadastro      | `cadastro.html`     | `/cadastro`        | criar conta (nome/telefone/e-mail/senha); estado "confirme seu e-mail" |
| Login         | `login.html`        | `/login`           | entrar (e-mail/senha) + "esqueci a senha" (reset por e-mail)       |
| Auth OK       | `auth-confirmado.html` | `/auth-confirmado` | retorno do link de confirmação; detecta a sessão na URL         |
| Perfil        | `conta/perfil.html` | `/conta/perfil`    | área logada (protegida): dados, pontos, plano; editar nome/telefone |

A raiz `/` é o `src/index.html`, que só redireciona pra `/home`.

- **NAV** (array no `app.js`): Home, O Casa, Cardápio, Loja, Planos, Colab — todas
  apontam pras páginas reais, com href limpo (`/o-casa`). `activeNavHref()` detecta a
  página atual pelo pathname (tolerando um `.html` no fim, pra links antigos) e marca o
  item ativo com `aria-current="page"` + `text-terracota font-semibold`
  (produto → "Loja"; raiz/`index` → "Home").
- **Loja está com selo "em breve" e SEM link** (`semLink: true` na NAV): o item aparece no
  header, no menu mobile e no rodapé como texto morto (`.nav-off`) e na **tab bar do
  mobile** como `.tab-off` (ícone e rótulo apagados, carimbo "em breve" sobre o ícone —
  `renderTabbar` consulta a NAV pelo href, então religar vale pros quatro lugares de uma
  vez). A página continua no ar — dá pra abrir digitando `/loja`. Pra religar o link, é
  só tirar o `semLink`.
- **Cardápio e Planos** usam preços fictícios com nota no rodapé ("* valores ilustrativos" /
  "* valores fictícios, a definir"). Botão **"assinar"** (`initPlanosPage`) chama a
  `create-checkout-session` e leva pro Checkout hospedado do Asaas.
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

## Pagamentos (Asaas — substituiu o Stripe)

Gateway atual: **Asaas** (gateway BR). Assinatura dos 4 tiers **e** loja via
**Asaas Checkout** hospedado (`POST /checkouts` → redireciona pro `link`).
**Sem boleto.** Loja: **Pix + Cartão**; assinatura: **só cartão** — o Asaas não
permite Pix em cobrança recorrente (`RECURRENT` exige `CREDIT_CARD`; Pix não é
debitado sozinho todo mês). O **CPF é coletado na página hospedada do
Asaas** — a gente não guarda CPF. Toda a lógica sensível fica nas **Edge Functions**
(`supabase/functions/`), nunca no client.

> **Migrou do Stripe → Asaas.** As functions `stripe-webhook/` e
> `create-portal-session/` e o `scripts/stripe-seed.mjs` foram **removidos**. As
> colunas `stripe_*` continuam no banco (migrations são imutáveis) mas não são mais
> usadas. O Asaas **não tem seed de preços** (o valor vai no corpo do checkout) nem
> **portal de cobrança hospedado** (por isso as telas de pausar/retomar/upgrade são NOSSAS).

> **Cancelar = pausar (não deletar).** "Cancelar assinatura" faz `PUT status=INACTIVE`
> no Asaas (pausa, não `DELETE`): a pessoa **mantém o benefício até o fim do período já
> pago** (`current_period_end`) e a assinatura vira `status='pausada'` **guardando o
> tier**. "Retomar plano" reativa a MESMA assinatura (`PUT status=ACTIVE`) — dentro do
> período pago, **sem cobrar de novo**; se o período já venceu, reativa cobrando a
> partir de hoje. Assim ninguém "paga do zero" ao voltar. Só quando o Asaas responde
> 404 (assinatura sumiu do gateway) é que tratamos como `cancelada` de fato e limpamos
> o tier.

> **Upgrade = só a diferença proporcional.** Ao subir de tier, cobramos **apenas**
> `floor((preço_novo − preço_atual) × diasRestantes / 30)` agora (os dias já usados do
> ciclo NÃO são cobrados de novo); no próximo vencimento a assinatura já renova pelo
> preço cheio do tier novo. Se a diferença proporcional ficar abaixo do mínimo do Asaas
> (R$5,00 / 500 centavos), a gente **não cobra** — aplica o upgrade na hora de graça e
> só ajusta o `value` da assinatura pro preço novo.

> **Downgrade = agendado, sem reembolso.** O espelho invertido do upgrade: descer de
> plano **não cobra nem devolve nada agora**. A gente baixa o `value` recorrente no Asaas
> (só a PRÓXIMA cobrança vem menor) e grava `subscriptions.scheduled_downgrade_to` — a
> pessoa **mantém o tier atual até `current_period_end`**. Quem troca o tier de fato é o
> `asaas-webhook`, quando o pagamento da renovação cai. Dá pra desfazer enquanto não
> renova ("manter o plano atual"), e um upgrade também cancela a descida agendada.

- **Redirect 100% hospedado:** NÃO existe chave pública de pagamento no bundle. O
  client só chama a function e redireciona pro `link` que ela devolve.
- **Código agnóstico de ambiente:** sandbox e prod rodam o MESMO código — muda só a
  chave (secrets). A base da API (`api-sandbox` vs `api`) é derivada do **prefixo da
  chave** (`hmlg` = sandbox), override opcional via `ASAAS_BASE_URL`. Sem `if` no código.
- **Segredos SÓ nas Edge Functions** (`supabase secrets`, nunca client/bundle/repo):
  `ASAAS_API_KEY` (`$aact_hmlg_…` em sandbox), `ASAAS_WEBHOOK_TOKEN` (token que a gente
  escolhe e cadastra no webhook), `SITE_URL`. Injetados pelo Supabase: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. No **client**, nenhuma chave de pagamento.
- **`_shared/lib.ts` (Asaas)**: `asaasBaseUrl()`, `AsaasError`, `asaasFetch/Post/Get/Delete`
  (auth via header `access_token`), `reaisFromCentavos`/`centavosFromReais` (o Asaas fala
  em REAIS decimais; o banco em centavos). Helpers agnósticos de gateway (reusados):
  `computeCartFromDb()` (SOMA o subtotal pelo **BANCO** — products/product_variants, nunca
  do client), `getEffectiveSubscription(userId)` (assinatura que CONCEDE benefício agora:
  status em `['ativa','pausada']`, mais recente por `current_period_end`; a `pausada` só
  vale enquanto o período pago não venceu — se nenhuma concede, **auto-cura** limpando
  `profiles.tier_slug`), `getUserTierDiscount()` (desconto do tier vigente via
  `getEffectiveSubscription` → `tiers.discount_percent`; sem assinatura = 0%),
  `getTierMultiplier()`, `asaasPut()` (`PUT /subscriptions/{id}` — muda status/value/
  nextDueDate), `creditPoints()` (idempotente por `(ref_type,ref_id)`), `checkAchievements()`,
  `getUserFromRequest()`, CORS, `jsonResponse()`, `getSiteUrl()`.
- **`create-checkout-session`** — três modos, todos exigem JWT:
  - **assinatura** (`{ tier_slug }` → `chargeTypes:["RECURRENT"]`): lê `preco_centavos` do
    tier no BANCO, `subscription:{ cycle:"MONTHLY", nextDueDate: hoje }`. `externalReference`
    = `sub:<userId>:<tierSlug>:<nonce>` (o nonce garante 1 match ao resolver a assinatura
    criada, mesmo em re-assinatura). `successUrl` → `checkout-sucesso.html?assinatura=1`.
  - **loja** (`{ items: [{product_slug, variant, qtd}] }` → `chargeTypes:["DETACHED"]`):
    recalcula subtotal server-side, aplica o desconto do tier. Como o **Asaas não tem
    campo de desconto**, o carrinho vira **UM item consolidado** cujo `value` = total já
    com desconto (a discriminação real fica em `order_items`). **Pré-cria a `orders`
    como `pendente` + `order_items`**; `externalReference` = `order.id` (UUID); em falha
    do Asaas, apaga a order. `successUrl` → `checkout-sucesso.html?ref=<order.id>`.
  - **upgrade** (`{ upgrade_to_tier }` → `chargeTypes:["DETACHED"]`): valida a assinatura
    vigente via `getEffectiveSubscription`, lê os dois preços no BANCO, **exige que o tier
    novo seja mais caro**. Calcula `diasRestantes = clamp(ceil((fimPeríodo−agora)/dia),
    0..30)` e `delta = max(0, floor((preçoNovo−preçoAtual) × diasRestantes / 30))` —
    **só a diferença proporcional aos dias que faltam**. Se `delta < 500` (mínimo do
    Asaas), aplica o upgrade **na hora e de graça** (`asaasPut` o `value` da assinatura
    pro preço novo + atualiza `subscriptions.tier_slug`/`profiles.tier_slug`) e retorna
    `{ applied:true, valor_delta_centavos }`. Senão, gera um checkout DETACHED só do delta,
    `externalReference` = `upg:<userId>:<toTier>:<asaas_subscription_id>:<nonce>`,
    `successUrl` → `checkout-sucesso.html?upgrade=1`, retorna `{ url, valor_delta_centavos }`.
  - `billingTypes`: **loja/upgrade** `["PIX","CREDIT_CARD"]`; **assinatura** `["CREDIT_CARD"]`
    (o Asaas recusa `RECURRENT` com PIX — só cartão renova sozinho). **Sem `customerData`**
    (mandar parcial faria o Asaas exigir CPF+endereço completo; a página hospedada coleta
    tudo). Todos: `callback` com `successUrl`/`cancelUrl`/`expiredUrl` via `getSiteUrl()`.
- **`cancel-subscription`** (a NOSSA tela substitui o portal): exige JWT, lê a assinatura
  ATIVA do **próprio** usuário (nunca id vindo do client), faz `PUT /subscriptions/{id}`
  com `status=INACTIVE` (**pausa, não deleta**), marca `subscriptions.status='pausada'`
  **mantendo o `tier_slug` e o período** — o benefício segue até `current_period_end`.
  Retorna `{ ok, pausada:true, ativo_ate }`. Asaas 404 (assinatura sumiu do gateway) →
  trata como `cancelada` de fato, limpa o tier, retorna `{ ok, cancelada:true }`.
- **`resume-subscription`** (contrapartida do cancel): exige JWT, lê a assinatura
  **`pausada`** do próprio usuário, faz `PUT /subscriptions/{id}` com `status=ACTIVE`.
  Dentro do período pago → mantém o `nextDueDate` original (**sem cobrar agora**); período
  vencido → `nextDueDate = hoje` (o Asaas cobra o cartão salvo e recomeça o ciclo).
  Marca `subscriptions.status='ativa'` + garante `profiles.tier_slug`. Retorna
  `{ ok, retomada:true, proxima_cobranca }`.
- **`downgrade-subscription`** (o espelho invertido do upgrade): exige JWT, lê a assinatura
  **`ativa`** do próprio usuário. **AGENDAR** (`{ tier_slug }`): exige destino mais barato
  (os dois preços vêm do BANCO), faz `asaasPut` baixando o `value` — só a PRÓXIMA cobrança
  vem menor, o ciclo já pago não muda — e grava `subscriptions.scheduled_downgrade_to`
  **sem tocar no tier atual**; nada é cobrado nem reembolsado. Retorna
  `{ ok, agendado:true, efetivo_em, novo_plano, novo_slug }`. **DESFAZER**
  (`{ acao:'cancelar' }`): limpa a coluna e restaura o `value` cheio. Os dois passos
  (Asaas ↔ banco) se revertem mutuamente em caso de falha, pra nunca sobrar `value` baixo
  sem downgrade agendado. Quem troca o tier de fato é o webhook, na renovação.
- **Presentear um plano** (`create-checkout-session` modo presente + `resgatar-presente`):
  o comprador paga **um mês cheio** de um tier **de presente** (cobrança avulsa `DETACHED`,
  Pix ou cartão — **não** vira assinatura dele). Fluxo: `{ gift_tier, mensagem }` →
  pré-cria `gift_subscriptions` (`pendente`) → checkout `externalReference = gift:<id>`,
  `successUrl` → `checkout-sucesso.html?presente=<id>`. No `CHECKOUT_PAID` o webhook marca
  `pago` e gera o **código** `CASA-XXXXXX` (RPC `marcar_presente_pago`, idempotente);
  `CHECKOUT_EXPIRED/CANCELED` cancela o presente `pendente`. Quem ganha resgata o código
  no `/conta/perfil` ("tem um presente?") → `resgatar-presente` → RPC atômica
  `resgatar_presente` (lock, anti-duplo-resgate): cria uma `subscriptions` **`pausada` +
  `current_period_end = agora+30d`** marcada com `presente_id` (SEM `asaas_*` — não recorre)
  e espelha o tier. **Por quê `pausada`+período e não `ativa`:** `getEffectiveSubscription`
  concede benefício pra `pausada` só enquanto o período está no futuro → o presente
  **expira sozinho em 30 dias**, sem cron e sem o risco do "`ativa` concede pra sempre"
  (não há assinatura no Asaas pra gerar `PAYMENT_OVERDUE`). O resgate é **bloqueado** se a
  pessoa já tem plano vigente (o presente fica guardado — não empilha). O perfil trata
  `presente_id` à parte (selo "presente · ativo até {data}", **sem** pausar/retomar/upgrade);
  o `resume-subscription` já barra `pausada` sem `asaas_subscription_id`. Página de compra:
  **`/presentear`** (`initPresentearPage`), linkada nos `/planos`.
- **`asaas-webhook`** (deploy com `--no-verify-jwt`): auth = **token compartilhado** no
  header `asaas-access-token` (comparado com `ASAAS_WEBHOOK_TOKEN`; NÃO é HMAC).
  Idempotência via `asaas_events` (PK = `id` do evento, `evt_…`). Em erro → 500 sem gravar
  o evento (o Asaas reenvia); em sucesso → grava e 200.
  - **loja**: `CHECKOUT_PAID` finaliza a MESMA `orders` (por `id` = externalReference) pra
    `pago` (nunca faz downgrade de `pago`) + credita pontos (`ref_type='order'`,
    `ref_id=order.id`, motivo `'compra na loja'`) + `checkAchievements`. `CHECKOUT_EXPIRED`/
    `CHECKOUT_CANCELED` marca o pedido pendente como `cancelado`.
  - **assinatura**: `CHECKOUT_PAID` resolve a assinatura criada via
    `GET /subscriptions?externalReference=…`, faz upsert em `subscriptions` (por
    `asaas_subscription_id`) e espelha `profiles.tier_slug` — **sem pontos aqui**. Os pontos
    vêm dos eventos de **pagamento** `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (`ref_type=
    'subscription'`, `ref_id=payment.id`, motivo `'assinatura'`) — 1ª cobrança E renovações,
    sem duplicar (idempotente por `payment.id`). O handler de pagamento **se auto-cura**
    (cria a linha de subscription se o evento de pagamento chegar antes do checkout).
  - **upgrade** (`externalReference` começa com `upg:`): `CHECKOUT_PAID` do delta aplica o
    upgrade — `asaasPut` o `value` da assinatura (id vem no próprio ref) pro preço cheio do
    tier novo, atualiza `subscriptions.tier_slug`/`profiles.tier_slug` e roda
    `checkAchievements` — **sem creditar pontos pelo delta**. Também **limpa
    `scheduled_downgrade_to`**: subir de plano cancela uma descida agendada.
    `CHECKOUT_EXPIRED`/`CHECKOUT_CANCELED` ignoram refs `sub:`/`upg:` (só cancelam pedidos
    de loja pendentes).
  - **downgrade agendado**: no `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` da renovação, se a
    linha tem `scheduled_downgrade_to`, o handler troca o `tier_slug` pro plano leve
    **antes** de creditar os pontos (pra já valer o multiplicador novo) e limpa a coluna
    no mesmo update — idempotente, o reenvio do evento não desce duas vezes.
- **Migration `0011_asaas`**: `profiles.asaas_customer_id`; `subscriptions.asaas_customer_id`
  + `asaas_subscription_id` (UNIQUE); `orders.asaas_checkout_id` (UNIQUE) + `asaas_payment_id`;
  tabela `asaas_events(id text pk, event, processed_at)` com RLS (SELECT só do owner).
  Idempotente; não mexe em nada anterior (as colunas `stripe_*` ficam intactas, sem uso).
- **Front**: o drawer "finalizar compra" chama a function da loja (deslogado → login e
  volta pro carrinho via `?cart=open`); mostra o aviso do desconto do tier; `checkout-
  sucesso.html` limpa o carrinho e — na loja — sonda `points_ledger` por `?ref=` pra mostrar
  "+X pontos"; na assinatura (`?assinatura=1`) não sonda (os pontos vêm por `payment.id`,
  desconhecido do client); no upgrade (`?upgrade=1`) troca o texto pra "plano turbinado 💛"
  e também não sonda.
- **Front — "gerenciar assinatura" (perfil)**: `initPerfilPage` carrega a assinatura
  (`status` em `['ativa','pausada','cancelada']`, a mais recente) + a lista de `tiers` em
  paralelo e deriva o estado da UI. A célula "teu plano" mostra o nome + um selo de status
  (ativa → ponto verde "ativo"; pausada dentro do período → "pausado · ativo até {data}";
  pausada vencida → "pausado"; cancelada → "encerrado"). A seção `[data-gerenciar]` aparece
  com assinatura ativa/pausada **ou** cancelada-com-tier-conhecido e traz:
  - **ativa** → "fazer upgrade" (abre painel `[data-upgrade-painel]` só com os tiers de
    `ordem` maior, cada botão explicando que cobra **só a diferença dos dias que faltam**;
    ao escolher, chama `create-checkout-session {upgrade_to_tier}` → se `data.url` redireciona
    pro checkout do delta, se `data.applied` mostra "a diferença ficou por nossa conta" e
    recarrega) **e** "pausar assinatura" (confirma → `cancel-subscription`).
  - **ativa, no modal de pausar** → antes de confirmar a pausa, um desvio gentil oferece
    **descer de plano** em vez de sair (`[data-modal-downgrade]`, só com os tiers de `ordem`
    menor). Escolher um abre um passo de confirmação com o preço e a data em que passa a
    valer; confirmar chama `downgrade-subscription { tier_slug }`. Com downgrade já agendado,
    o texto vira "teu {plano} segue ativo até {data}, e a partir daí vira {plano leve}" e
    aparece **"manter o {plano}"** (`[data-manter-plano]` → `downgrade-subscription
    { acao:'cancelar' }`, sem confirmação — é a ação positiva). O upgrade continua ofertado
    e desfaz a descida agendada.
  - **pausada** → "retomar plano" (`resume-subscription`; dentro do período não cobra nada).
  - **cancelada** (Asaas 404 — sumiu do gateway, não dá pra "retomar") → "voltar pro {plano}"
    (`[data-reassinar]`): chama `create-checkout-session {tier_slug}` do MESMO tier — é uma
    **assinatura nova** (checkout hospedado, ciclo do zero), redireciona pro `data.url`.
- **Setup/deploy**: ver `supabase/functions/README.md`. Teste em sandbox com cartão de
  teste (doc do Asaas) ou Pix simulado no painel sandbox.

> **Go-live LIVE (o que muda no dia — só config/secrets, o código NÃO muda):**
> - Criar/usar a conta de **produção** do Asaas (KYC completo) e gerar a chave
>   `$aact_prod_…`.
> - Trocar os secrets das functions: `supabase secrets set` de `ASAAS_API_KEY`
>   (`$aact_prod_…`), um `ASAAS_WEBHOOK_TOKEN` novo e `SITE_URL` (domínio de prod).
>   Re-deploy das **seis** functions.
> - **Cadastrar o webhook na conta LIVE** (o token/endpoint de sandbox não vale em
>   prod), com os eventos de checkout (`CHECKOUT_PAID`/`EXPIRED`/`CANCELED`) e de
>   pagamento (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`).
> - **Habilitar Pix e Cartão na conta LIVE**.
> - No client/Vercel: nada de chave de pagamento (o checkout é hospedado).

---

## Fidelidade / Pontos (Fase 3)

O `points_ledger` (0001, append-only) é a **fonte da verdade**; `profiles.points_balance`
é um **cache** que nunca diverge (trigger). Todo cálculo de saldo é server-side; o front
só LÊ (RLS: cada um lê o próprio ledger).

- **Regra (travada):** fidelidade é **exclusiva de assinante**. Só pontua quem tem plano
  ATIVO no momento da compra — aí ganha 1 ponto por R$1 × `tiers.points_multiplier` do tier.
  **Sem assinatura ativa = ZERO pontos** (a trava fica no `creditPoints`: `tierSlug` nulo →
  0). Loja: sobre o total **já com desconto**. Sempre `floor`. Ex.: R$49,41 no Ouro (1,5x) →
  `floor(74.115)` = 74; sem plano, a MESMA compra rende 0. A LOJA passa
  `order.tier_slug_aplicado` (null quando não havia assinatura no checkout) e a ASSINATURA
  sempre passa o tier vigente — então quem não tem plano não pontua.
- **Migration `0008_points`**: `points_ledger.ref_type/ref_id` (+ UNIQUE parcial pra
  anti-duplicação), trigger `update_points_balance` (soma o delta no cache; seta a GUC
  `casa.trusted_points` pra o `prevent_points_tamper` liberar o write server-side),
  `recalc_points_balance` (reparo, só service_role), `redeem_reward` (resgate ATÔMICO com
  `for update`), `rewards_catalog.slug/cupom_valor_centavos` + seed de recompensas. O
  `motivo` do ledger virou texto livre em PT (`'compra na loja'`, `'assinatura'`,
  `'renovação da assinatura'`, `'resgate: <nome>'`) — o CHECK restritivo foi removido.
- **Crédito (`asaas-webhook`, via `creditPoints` de `_shared/lib.ts`)**: loja →
  `CHECKOUT_PAID` (só quando o pedido vira `pago`), `ref_type='order'` / `ref_id=order.id`,
  motivo `'compra na loja'`; assinatura → `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`,
  `ref_type='subscription'` / `ref_id=payment.id`, motivo `'assinatura'` — o MESMO caminho
  serve a 1ª mensalidade e as renovações (o `payment.id` novo de cada ciclo é o que
  diferencia). O `CHECKOUT_PAID` de assinatura **não** credita ponto (senão a 1ª cobrança
  contaria duas vezes), e o delta de upgrade também não. Idempotente por
  `(ref_type, ref_id)` + `asaas_events`. Crédito **nunca** vem do client.
- **Resgate (`redeem-reward` → RPC `redeem_reward`)**: valida JWT, chama a função SQL via
  service_role com o id do PRÓPRIO usuário. A função (revogada de anon/authenticated) trava
  a linha do reward, valida saldo pelo LEDGER/estoque, lança o negativo, cria `redemptions`,
  baixa estoque e gera cupom `CASA-XXXX` (30 dias) se for do tipo cupom. Resgate duplo é
  impossível (lock). Saldo insuficiente → erro gentil, sem débito.
- **Front**: `conta/pontos.html` (`initPontosPage`, atrás do `requireAuth`) — saldo,
  multiplicador do tier, extrato do ledger e grid de recompensas com "resgatar" (desabilitado
  gentil "faltam X pontos" quando não dá). O perfil linka pro extrato; na loja a
  `checkout-sucesso` sonda o ledger pelo `?ref=` (id da order) e mostra "+X pontos 💛" —
  na assinatura não sonda, porque o `ref_id` é o `payment.id`, que o client não conhece.
  Tom acolhedor, ZERO cara de cassino.
- **Go-live:** garantir que o webhook do Asaas (sandbox e live) escuta **`PAYMENT_CONFIRMED`
  e `PAYMENT_RECEIVED`** além dos eventos de checkout — sem eles a assinatura nunca pontua —
  e fazer deploy do `redeem-reward`. Nenhuma regra de pontos muda entre sandbox e live.

---

## Responsividade

- **Mobile-first**, funcionando desde **~320px** (Galaxy Pocket) até **ultrawide (2560px+)**.
- Breakpoints extras no Tailwind: `xs` 375, `3xl` 1920, `4xl` 2560 (mantendo `sm/md/lg/xl/2xl` padrão).
- Sempre respeitar **`prefers-reduced-motion`**.

---

## Estrutura de pastas

```
/
├── src/                  # root do Vite — o caminho do arquivo é a URL
│   ├── index.html        # raiz "/" → redireciona pra /home
│   ├── home.html         # /home … e assim por diante, uma página por URL
│   ├── app.js            # header/footer/menu + lógica de UI
│   ├── styles.css        # entrada Tailwind + base
│   ├── conta/            # área logada (/conta/perfil, /conta/pontos, …)
│   └── assets/           # publicDir: servido na raiz (/fotos/…)
├── supabase/
│   ├── migrations/       # SQL numerado, append-only
│   └── functions/        # Edge Functions (segredos só aqui)
├── vercel.json           # cleanUrls + redirects do /pages/ legado
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
- `npm run avatares-orfaos` — varre o bucket `avatares` do Storage e lista as fotos
  que ninguém usa. Ver "Fotos órfãs no Storage" abaixo.
- `npm run criar-adm-master` — cria a conta do adm master do console (login `casa`,
  e-mail interno `casa@casacoffeecolab.com.br`, senha inicial `casa1234`,
  `role='owner'` + `master=true`). Precisa da **service_role no ambiente** (mesmo
  esquema do comando acima) e da migration `0017_admin` aplicada. Idempotente: se a
  conta já existe, não duplica nem mexe na senha — `--resetar-senha` repõe a inicial
  (o e-mail é interno, então "esqueci a senha" não chega em lugar nenhum) e volta a
  exigir a troca no primeiro acesso.

### Fotos órfãs no Storage (`scripts/avatares-orfaos.mjs`)

O Storage **não tem cascata**: se uma conta some por fora da `delete-account`, ou se o
upload sobe mas o `update` do perfil falha depois, o arquivo fica lá ocupando espaço sem
dono. O script cruza o bucket com a **fonte da verdade — `profiles.avatar_url`** (extrai o
caminho da URL pública, ignorando o `?v=`): todo arquivo que ninguém aponta é órfão, o que
cobre de uma vez pasta de conta apagada, foto antiga e upload meio-caminho.

Precisa da **service_role** (lê o bucket inteiro e o `profiles`), então ela vai **só no
ambiente do comando** — nunca no `.env` do repo, nunca hardcoded:

```powershell
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role>"
node scripts/avatares-orfaos.mjs            # só relata (dry-run, o padrão)
node scripts/avatares-orfaos.mjs --apagar   # relata e limpa
```

- **Dry-run por padrão.** Sem `--apagar` nada é removido.
- **Carência de 24h:** arquivo sem dono mas recém-subido não é apagado (pode ser upload em
  andamento com o `update` do perfil ainda a caminho). Override: `--horas=0`.
- Também avisa **referência quebrada** (perfil aponta pra arquivo que não existe mais) —
  não é lixo, mas é avatar que não carrega.

## Segurança (regras obrigatórias — valem a partir da Fase 2)

Segredos:
- .env no .gitignore; .env.example (sem valores reais) versionado. NUNCA commitar segredo.
- Só no client/Vercel: SUPABASE_URL, SUPABASE_ANON_KEY. (O checkout do Asaas é hospedado — NÃO existe chave pública de pagamento no bundle.)
- SÓ nas env vars das Edge Functions (nunca no bundle/Vercel/repo): SUPABASE_SERVICE_ROLE_KEY, ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, POS_WEBHOOK_SECRET.

Banco (RLS-by-default):
- Toda tabela sobe com RLS habilitado e deny-by-default. Nenhuma tabela sem política explícita.
- points_ledger, subscriptions, orders, redemptions, audit_log: cliente só LÊ o próprio registro; escrita só via Edge Function (service_role) ou trigger.
- role do usuário vem de profiles (fonte confiável), NUNCA de valor enviado pelo client. Troca de papel só pelo owner e registrada no audit_log.

Confiança zero no client:
- Pontos calculados e gravados só server-side (ledger append-only). Front só lê.
- create-checkout-session recalcula preço, desconto do tier e total pelo BANCO — nunca confia no valor/carrinho do client.
- Webhooks (Asaas e PDV): verificar autenticidade (Asaas → token no header `asaas-access-token` vs `ASAAS_WEBHOOK_TOKEN`; PDV → HMAC) + idempotência por id de evento (anti-replay). SEMPRE.
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
- Aplicadas até agora: `0001_init` (tabelas + funções de papel + triggers), `0002_rls` (RLS + policies), `0003_seed` (tiers/produtos/conquistas/parceiros), `0004_reconcile` (5 tabelas da Fase 3: `rewards_catalog`, `events`, `coupons`, `pos_webhook_events`, `unclaimed_points` + colunas `tiers.points_multiplier/discount_percent` e `profiles.points_balance/tier_slug`), `0005_profiles_phone` (coluna `profiles.telefone` + `handle_new_user` populando telefone + trigger `prevent_points_tamper` blindando `points_balance`/`tier_slug` contra escrita do client), `0006_stripe` (`stripe_events` + `profiles.stripe_customer_id` + UNIQUE em `subscriptions.stripe_subscription_id` + price IDs dos tiers), `0007_orders_stripe` (UNIQUE em `orders.stripe_checkout_id` pra idempotência da loja), `0008_points` (Fase 3: `points_ledger.ref_type/ref_id` + UNIQUE `(ref_type,ref_id)`, trigger `update_points_balance` que sincroniza o cache, `prevent_points_tamper` com bypass via GUC `casa.trusted_points`, `recalc_points_balance`, `redeem_reward` atômica, `rewards_catalog.slug/cupom_valor_centavos` + seed de recompensas), `0009_achievements` (Fase 3 conquistas: coluna `achievements.criterios` jsonb + função `check_achievements(uuid)` SECURITY DEFINER que avalia os critérios e concede os emblemas server-side, chamada nos webhooks e no resgate), `0010_achievement_hints` (coluna `achievements.dica` + seed das dicas "como desbloquear" por slug, mostradas no card bloqueado e no tooltip dos emblemas do painel), `0011_asaas` (**migração Stripe→Asaas**: `profiles.asaas_customer_id`, `subscriptions.asaas_customer_id`/`asaas_subscription_id` (UNIQUE), `orders.asaas_checkout_id` (UNIQUE)/`asaas_payment_id`, tabela `asaas_events` com RLS), `0012_asaas_checkout_link` (`subscriptions.asaas_checkout_id` — o elo que liga o `CHECKOUT_PAID`, que sabe user+tier, ao `PAYMENT_*`, que sabe o id da assinatura), `0012_downgrade` (`subscriptions.scheduled_downgrade_to` — sem ela a `downgrade-subscription` não roda; os dois arquivos `0012` são independentes entre si, a ordem entre eles não importa), `0013_redeem_reward_user_lock` (trava a linha do usuário antes de ler o saldo, matando o gasto duplo de pontos em resgates simultâneos).
- **Banco em dia:** o humano aplicou a leva `0011_asaas` → `0012_asaas_checkout_link` → `0012_downgrade` → `0013_redeem_reward_user_lock` no SQL Editor em **28/jul/2026**, e a `0014_perfil` (campos novos do `/conta/perfil`) na sequência.
- **`0015_avatar` — APLICADA em 29/jul/2026.** Bucket `avatares` no Storage (público, limite de **3 MB**, só `image/jpeg|png|webp`), coluna `profiles.avatar_url` e as policies de `storage.objects` (leitura pública; escrita/troca/apagar só na pasta `{auth.uid()}/`). É o que faz a foto de perfil subir.
- **`0016_sessoes` — APLICADA em 29/jul/2026.** Funções `minhas_sessoes()`, `encerrar_sessao(uuid)`
  e `encerrar_outras_sessoes()` (SECURITY DEFINER, `search_path` fixo, `revoke` de `anon`/`public`,
  `grant` só a `authenticated`). Existem porque o schema `auth` **não é exposto pelo PostgREST** —
  sem elas o client não consegue ler `auth.sessions`. Dono sempre de `auth.uid()`, sessão atual
  sempre da claim `session_id` do JWT: o client nunca diz de quem é a sessão. É o que alimenta a
  lista de aparelhos conectados no `/conta/perfil` (sem ela a tela cai no fallback "sair de todos
  os aparelhos").
- **`0019_presentes` — PENDENTE (aplicar no SQL Editor).** "Presentear um plano": tabela
  `gift_subscriptions` (+ RLS: comprador/quem-resgatou lê o próprio), coluna
  `subscriptions.presente_id` (marca a assinatura vinda de presente), e as RPCs
  SECURITY DEFINER `marcar_presente_pago(uuid,text)` (webhook gera o código no pagamento)
  e `resgatar_presente(uuid,text)` (resgate atômico com lock). **As Edge Functions já foram
  deployadas em 03/ago/2026** (`create-checkout-session`, `asaas-webhook` com
  `--no-verify-jwt`, e a nova `resgatar-presente`) — os caminhos de presente só disparam com
  pedido de presente, que não existe até o front subir. **Falta só:** (1) aplicar esta
  migration no SQL Editor e (2) subir o front (merge `trabalho`→`main`). Nenhum secret novo;
  nenhum evento novo no webhook (usa `CHECKOUT_PAID/EXPIRED/CANCELED`).
- **`0020_mural` — PENDENTE (aplicar no SQL Editor).** "Mural do Casa": tabela
  `mural_notes` (recado curto ≤240, `autor_nome` snapshot, `status` aprovado|oculto) com
  RLS — **leitura pública** dos `aprovado` (o `/o-casa` é aberto; autor vê os próprios,
  staff vê tudo), **escrita só via Edge Function** (deny-by-default pro client), autor
  apaga o próprio recado, staff modera (ocultar/apagar). Function **nova** `postar-mural`
  (**já deployada em 03/ago/2026**): exige JWT, valida **assinante vigente** via
  `getEffectiveSubscription` (perk exclusivo de assinante, igual aos pontos), sanitiza o
  texto, anti-flood 30s, grava via service_role. Front: seção no `/o-casa` (post-its) +
  `initMuralPage` (lê a parede público; compose só pra assinante; deslogado/sem-plano vê
  CTA pros planos; leitura tolerante se a migration ainda não foi aplicada). **Falta:**
  aplicar esta migration + subir o front.
- `partners` e `tiers` têm PK = **slug**; FKs pra elas seguem a convenção `*_slug` (ex.: `profiles.tier_slug`, `rewards_catalog.partner_slug`), não `*_id`.

---

## Operação

Estas regras existem porque o custo de uma sessão agêntica se concentra em turnos
e subagentes, não em tokens de resposta. Entenda o motivo e aplique com julgamento;
não são checklist.

### Subagentes

Cada subagente refaz contexto do zero, explora, reporta, e eu releio o relatório —
o custo se multiplica e a latência também.

- Delegue apenas para investigação ampla genuinamente paralela em vários arquivos,
  ou trilhas independentes de tamanho real.
- Não delegue trabalho que se resolve em algumas chamadas de ferramenta.
- Nunca delegue para verificar o próprio trabalho: verificação pertence ao loop
  principal.
- Se um subagente resolve, use um. Mantenha a contagem baixa e não redo o trabalho
  dele depois que ele reporta.
- Ao disparar vários para trabalho independente, mande todos no mesmo bloco para
  rodarem em paralelo.

### Verificação

Você já verifica seu próprio trabalho por padrão. Não adicione um passo separado de
verificação nem revise duas vezes por precaução — isso duplica custo sem achar mais
nada. Verifique quando houver motivo concreto (teste falhou, resultado inesperado),
não por ritual.

### Escopo

Entregue o que foi pedido, no escopo pedido. Interprete ambiguidade como um colega
cuidadoso faria: decisões pequenas (nome de variável, valor default, qual de duas
abordagens equivalentes) você toma e menciona; mudança de escopo ou ação destrutiva
você pergunta antes.

Se achar que o pedido está errado ou que existe caminho melhor, diga em uma frase e
siga com o pedido — não estreite, alargue nem transforme por conta própria. Termine a
tarefa inteira; se algo ficou de fora, diga o que e por quê em vez de reportar
"pronto".

Não adicione features, refactor, abstração, error handling ou fallback além do que a
tarefa exige. Correção de bug não pede faxina em volta.

### Comunicação

Seu texto entre chamadas de ferramenta é o que eu leio — eu não vejo seu raciocínio
nem os resultados crus.

- Antes da primeira ferramenta, uma frase do que você vai fazer.
- Durante, atualize só quando achar algo que importa ou mudar de direção.
- Não narre ação rotineira ("agora vou...", "deixa eu ver...").
- Ao terminar, abra pelo resultado — a primeira frase responde "o que aconteceu".
  Detalhe depois.
- Legível vale mais que curto. Encurte cortando o que não muda minha decisão, não
  comprimindo em fragmentos, setas (`A → B → falha`) ou abreviação. Escreva frases
  completas com os termos por extenso.
- Se corrigir um erro seu, corrija e siga. Só comente quando o erro muda o que eu
  faria; sem pedido de desculpas, sem ruminar.
