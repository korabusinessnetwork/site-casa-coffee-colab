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
- **Travessão (`—`) em texto que o usuário vê.** No copy visível (HTML e strings do
  `app.js`/`admin.js` que renderizam na tela), **nunca** usar `—` como pontuação de frase —
  usar **vírgula** no lugar. Vale pra qualquer texto novo. **Exceção:** o `—` sozinho como
  glifo de "vazio/sem valor" (célula de tabela vazia, saldo carregando: `valor || '—'`) pode
  ficar — ali a vírgula quebraria a tela. Em comentário de código, documentação e migrations
  o `—` segue liberado (o usuário não vê).

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

- Função `setupCarousel(trackEl, { dots, autoplay, interval })` no `app.js` — serve os tracks
  `[data-carousel="cards"]` (hoje só a **colab**), via `initCarousels`.
- Base em **scroll-snap** horizontal (`.carousel-track`), navegável por swipe/scroll, teclado (setas) e dots.
- A função **suporta** dots e autoplay (com `prefers-reduced-motion` e pausa em hover/foco/toque),
  mas nenhuma página os liga hoje (a colab chama com `dots:false, autoplay:false`).
- **O hero da home NÃO usa `setupCarousel`** — é o `setupHeroCarousel` (fundo full-bleed em
  foto/vídeo por tempo, contrato `[data-hero-carousel]`), chamado no bootstrap.
- Contrato de DOM: `[data-carousel]` › `[data-carousel-track]` (+ opcionais `[data-dots]`,
  `[data-carousel-prev]`, `[data-carousel-next]`).

---

## Loja (catálogo, produto, carrinho)

- **Catálogo (mock)**: array `PRODUTOS` no `app.js` (bloco "CATÁLOGO (MOCK …)"). Cada item:
  `id, nome, slug, categoria (vestuario|acessorios|cafe_grao), preco_centavos, descricao,
  imagemPlaceholder (.photo-*), variantes ({ rotulo, opcoes[] } | null)`.
  > **TODO (Fase 2):** substituir o mock pela tabela **`products` do Supabase** (mesma forma).
- **Tabela de medidas (roupa)**: campo opcional `medidas` (`{ colunas[], linhas[][], nota }`,
  valores em centímetros) nos itens de `vestuario` — a loja não tem provador, então quem
  compra precisa conferir o tamanho antes, senão vira troca. A `initProductPage` renderiza
  um `<details>` **"ver a tabela de medidas"** logo abaixo das variantes (recolhido, pra não
  empurrar o botão de comprar), com as medidas **da peça** (não do corpo), a nota de
  modelagem do produto e o recado de que a medida pode variar 1 ou 2 cm. Aparece também no
  produto **esgotado** (quem espera a volta já quer saber o tamanho). Estilo `.medidas-*` no
  `styles.css`: a tabela cabe inteira a partir de ~360px e, mais estreito que isso, rola
  dentro da própria caixa (`.medidas-scroll`) — a coluna do grid leva `min-w-0` pra página
  nunca ganhar scroll lateral.
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
| O Casa        | `o-casa.html`       | `/o-casa`          | sobre: história, DNA, Mural do Casa (seção escura), localização (mapa + "como chegar"), tour 360 |
| Cardápio      | `cardapio.html`     | `/cardapio`        | menu literário (lista por seção) + tirinha de atalhos entre as seções — informativo, **sem carrinho** |
| Loja          | `loja.html`         | `/loja`            | catálogo + filtro por categoria                                    |
| Produto       | `produto.html`      | `/produto?slug=`   | detalhe via `?slug=` (conta como "Loja" na nav)                    |
| Planos        | `planos.html`       | `/planos`          | 4 tiers, sistema de pontos, conquistas; "assinar" é placeholder    |
| Colab         | `colab.html`        | `/colab`           | Residência Gente do Casa; carrossel de colabs; convite (mailto/WhatsApp) |
| Cadastro      | `cadastro.html`     | `/cadastro`        | criar conta (nome/telefone/e-mail/senha); estado "confirme seu e-mail" |
| Login         | `login.html`        | `/login`           | entrar (e-mail/senha) + "esqueci a senha" (reset por e-mail)       |
| Auth OK       | `auth-confirmado.html` | `/auth-confirmado` | retorno do link de confirmação; detecta a sessão na URL         |
| Perfil        | `conta/perfil.html` | `/conta/perfil`    | área logada (protegida): dados, pontos, plano; editar nome/telefone |

A raiz `/` é o `src/index.html`, que só redireciona pra `/home`.

**URL que não existe cai no `src/404.html`** (`/asdf`, link velho, letra trocada), com o
mesmo estado vazio gentil do `/produto` e do `/gente`: header/footer normais, o caminho
tentado mostrado (`init404Page`, escapado) e saídas pra home/cardápio/o-casa. Quem serve
essa página **com status 404** é a **Vercel** (todo arquivo `404.html` na raiz do `dist` vira
a página de erro do site) em produção, e o middleware `urlsLimpasNoDev()` do
`vite.config.js` em desenvolvimento — sem ele, o fallback de SPA do Vite serviria o
`index.html`, que redireciona pra `/home` e faz o link quebrado **sumir em silêncio**. O
`404.html` está no `rollupOptions.input` e leva `robots: noindex`.

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
- **Cardápio, atalhos entre as seções** (`initCardapioNav`): a página é longa e de puro
  scroll, então uma tirinha de chips (`[data-cardapio-nav]`) gruda no topo da janela
  (`position: sticky; top: 0` — o header do site **rola junto com a página**, o sticky dele
  acaba no `#site-header`, então não há altura de header pra descontar), leva direto pra
  seção e marca onde a pessoa está. Os chips são montados a partir das **próprias seções**
  do HTML (as que têm `aria-labelledby` + `.menu-list`), então seção nova no cardápio já
  aparece na tirinha sem tocar no JS. Rola sozinha no mobile pra manter o chip ativo à
  vista; respeita `prefers-reduced-motion`.
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
- **"Quase lá" (o carimbo digital):** um cartão de foco no topo da `/conta/pontos`, logo abaixo
  do saldo, no espírito do cartão de carimbo de cafeteria. Aponta o **próximo mimo fora de
  alcance** (a recompensa mais barata que o saldo ainda não cobre, do `rewards_catalog` já
  carregado, ordenado asc; estoque zerado não conta) com uma **barrinha de progresso**
  (`saldo/custo`, mínimo 3% pra sempre aparecer): *"faltam X pontos pro teu {mimo}"*. Se o saldo
  já cobre tudo o que está na vitrine, vira o recado *"tu já pode pegar teu mimo"*. **Puro
  visual e só-leitura** (sem migration/secret/função nova): reusa `saldo` + `rewards` que a
  `initPontosPage` já busca. Markup em classes Tailwind (`.card`, `bg-coral`/`bg-line`), honesto,
  sem contador de urgência.
- **Go-live:** garantir que o webhook do Asaas (sandbox e live) escuta **`PAYMENT_CONFIRMED`
  e `PAYMENT_RECEIVED`** além dos eventos de checkout — sem eles a assinatura nunca pontua —
  e fazer deploy do `redeem-reward`. Nenhuma regra de pontos muda entre sandbox e live.

---

## Indica um amigo (Fase 3 — crescimento)

Cada usuário ganha um **código de indicação**; quem é trazido cria conta pelo link
`/cadastro?indica=CÓDIGO`, assina, e quando o **primeiro pagamento confirma** os **dois
ganham pontos**. A recompensa cai no PAGAMENTO (não no cadastro) de propósito: só
compensa quando entra gente de verdade pagando, matando conta-fantasma.

- **Migration `0021_indicacoes` (PENDENTE — aplicar no SQL Editor):** coluna
  `profiles.referral_code` (unique), tabela `referrals` (`referrer_id` ON DELETE SET
  NULL, `referred_id` UNIQUE → cada conta é indicada no máx. 1 vez, `status`
  pendente|premiado|invalido) com RLS (cada um lê só o que fez/recebeu; **sem escrita
  pelo client**), e 3 RPCs SECURITY DEFINER: `meu_codigo_indicacao()` (gera/retorna o
  código do próprio `auth.uid()`, granted a `authenticated`), `registrar_indicacao(codigo)`
  (usa `auth.uid()` como INDICADO — o client nunca diz quem é; barra auto-indicação, quem
  já foi indicado e quem já tem assinatura; granted a `authenticated`) e
  `premiar_indicacao(referred_id, pts_indicador, pts_indicado)` (idempotente
  pendente→premiado, credita os dois no `points_ledger`; granted **só a `service_role`**).
- **Valores dos pontos = FICTÍCIOS**, provisórios: constantes `REFERRAL_PTS_INDICADOR`
  (150) / `REFERRAL_PTS_INDICADO` (100) no topo do `asaas-webhook` — **uma fonte de
  verdade**, passadas pra `premiar_indicacao`. A copy do `/conta/perfil` restata os
  números (procurar "VALOR FICTÍCIO"). Ajustar depois.
- **Pontos de indicação NÃO passam pelo multiplicador de tier** (é bônus fixo, não compra):
  entram direto no ledger com `ref_type='indicacao'` (indicador) e `'indicacao_bonus'`
  (indicado), ambos `ref_id = referral.id` — ref_type distinto deixa os dois coexistir no
  UNIQUE `(ref_type, ref_id)`.
- **`asaas-webhook` (já deployado em 03/ago/2026):** no `PAYMENT_CONFIRMED`/`RECEIVED` da
  assinatura, depois de creditar os pontos da assinatura, chama `premiar_indicacao` com o
  id do pagante. Sem indicação pendente → `rewarded:false` sem erro; erro de DB estoura
  (o Asaas reenvia, tudo idempotente).
- **Front:** `initIndicacao()` (boot, toda página) capta o `?indica=` pro localStorage e,
  quando logado, registra o vínculo uma vez via `registrar_indicacao` (limpa o rastro só
  na resposta definitiva do banco). `/cadastro` mostra um oi gentil se veio por convite.
  `/conta/perfil` tem a seção "traz quem tu gosta" (`[data-indica]`): pega o código via
  `meu_codigo_indicacao`, monta o link, botão "copiar" (com fallback de seleção), e conta
  quantos amigos já entraram (`referrals` premiados). Tudo **tolerante**: se a 0021 ainda
  não foi aplicada, a seção fica escondida e o registro só é adiado — nada quebra.
- **Falta:** aplicar a `0021` no SQL Editor + subir o front. Nenhum secret novo; nenhum
  evento novo no webhook.

---

## Recado da casa (aviso no topo do site)

Uma tarja fina no topo (antes do `<header>`) que o Casa acende com um recado curto e
datado: *"hoje tem fornada de brioche a partir das 15h 🥐"*, *"a gente fecha 17h nesse
sábado"*. Some sozinha quando a janela expira; a pessoa pode fechar e ela não volta
(o front lembra pelo id). Editável **só pelo owner** no console do adm.

- **Migration `0022_avisos` (PENDENTE — aplicar no SQL Editor):** tabela `avisos_casa`
  (`texto` ≤160, `emoji`, `link_url`/`link_label`, janela `inicio_em`/`fim_em`,
  `prioridade`, `ativo`) com RLS: **leitura pública SÓ do vigente** (a policy filtra
  `ativo` + janela com `now()` — anon nunca vê rascunho/agendado/expirado; owner vê tudo).
  **Escrita** só via 3 RPCs SECURITY DEFINER gated por `is_owner()`:
  `admin_avisos_listar()`, `admin_aviso_salvar(...)` (cria/edita), `admin_aviso_remover(id)`
  — deny-by-default pro client, sem INSERT/UPDATE/DELETE de RLS.
- **Owner-only de propósito:** o whitelist de permissões do console é fechado por CHECK
  (0017), então "avisos" **não** entra em `PERMISSOES` como grantável; a aba `recados`
  usa `perm: 'avisos'`, que só quem tem `tudo` (adm do Casa) enxerga. Delegar pra outro
  papel pediria uma migration alterando aquele CHECK.
- **Front:** `renderAvisoBar()` (boot, toda página) lê o vigente (RLS), injeta a tarja
  antes do header, escapa texto/link (link só interno `/x` ou `http(s)`), fecha com ×
  (colapso via `grid-template-rows`, sem cortar texto) e lembra o id fechado no
  localStorage (`casa_avisos_lidos`). Tolerante: sem a 0022, a tarja só não aparece.
- **Console:** aba **recados** (`viewRecados` em `admin.js`) — form pra escrever/agendar/
  ligar-desligar + lista com editar/remover.
- **Falta:** aplicar a `0022` no SQL Editor + subir o front. Nenhum secret novo.

---

## A trilha do Casa (playlists do Spotify)

A seção "a trilha do Casa" na home: playlists reais do Spotify (embed), curadas por
clima ("pra focar", "manhã lenta"), com uma marcada como **tocando agora** (selo
pulsante). Editável **só pelo owner** no console — nada de URL hardcoded.

- **Migration `0023_trilha` (PENDENTE — aplicar no SQL Editor):** tabela `playlists_casa`
  (`nome`, `clima`, `spotify_url`, `ordem`, `ativo`, `tocando`) com RLS (**leitura pública
  só das ativas**; owner vê tudo) + índice único parcial garantindo **uma `tocando` por
  vez**. Escrita só via 3 RPCs SECURITY DEFINER `is_owner()` (`admin_trilha_listar`/
  `admin_trilha_salvar`/`admin_trilha_remover`) — `salvar` zera o `tocando` das outras.
- **Owner-only:** aba `trilha` no console usa `perm: 'trilha'` (não grantável, igual a
  `avisos` — o whitelist de permissões é fechado por CHECK).
- **Front:** `initTrilha()` (boot, home) lê as ativas e monta os cards; a `tocando` vem
  primeiro com selo. **`spotifyEmbed()` é a trava de segurança:** converte o link no src
  de embed e **só devolve `open.spotify.com/embed/...`** (URL normal, `/embed`, `/intl-xx`
  ou URI `spotify:`) — qualquer outra coisa vira `null` e NÃO vira `<iframe>` (bloqueia
  host falso, subdomínio-armadilha `open.spotify.com.evil.com`, `javascript:`). Tolerante:
  sem a 0023, a seção fica escondida.
- **Console:** `viewTrilha` (`admin.js`) — form (nome/clima/link/ordem/na-home/tocando) +
  lista com editar/remover. Bloqueia no submit link que não é do Spotify.
- **Falta:** aplicar a `0023` + subir o front. Nenhum secret novo.

### O som de agora (faixa ao vivo do Spotify, na home)

Uma seção **minimalista e centralizada** entre as *features* e o rodapé da home, na paleta
da casa (terracota/paper), **sem card pesado**, dois estados:

- **AO VIVO** (`[data-som-live]`): capa do álbum, selo "tocando agora" (pontinho pulsando),
  nome da faixa (serifado), artista e uma **barrinha de progresso** que anda sozinha. Vem da
  faixa que realmente toca na conta Spotify do Casa.
- **GENTIL** (`[data-som-idle]`): equalizador miúdo, "o som do Casa", título "o que embala a
  casa" e o **link "ouvir no Spotify"** — quando nada está tocando (ou a integração está off).

**Como o ao vivo funciona (built, DESLIGADO por enquanto):**
- **Edge Function `spotify-now-playing`** (deploy com `--no-verify-jwt`, leitura pública):
  troca o `SPOTIFY_REFRESH_TOKEN` por um access token (cacheado 1h na instância), chama
  `GET /me/player/currently-playing` e devolve `{ tocando, nome, artista, album, capa, url,
  progresso_ms, duracao_ms }` ou `{ tocando:false }`. **Não** importa o `_shared/lib.ts` (que
  exige `ASAAS_API_KEY` no topo) — é auto-contida. Cache curto de 10s protege de rate limit.
  Secrets **só na function**: `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`/`SPOTIFY_REFRESH_TOKEN`.
- **Front `initSomDoCasa()`**: com a flag `SOM_AO_VIVO` (hoje `false`) sonda a function a cada
  15s e alterna live↔idle; a barra avança client-side entre os polls; pausa em aba escondida;
  para de sondar se a function some (erro) ou volta `configurado:false`. Capa só de `i.scdn.co`,
  link só de `open.spotify.com` (trava anti-URL-forjada). Link do idle vem do `MARCA.redes`
  (fonte única do rodapé); placeholder `'#'` não abre aba em branco.
- **Pra LIGAR** (a Spotify Web API é **grátis**, não exige Premium pra LER): `npm run
  spotify-token` (OAuth uma vez, pega o refresh token), `npx supabase secrets set` os três
  `SPOTIFY_*`, `npx supabase functions deploy spotify-now-playing --no-verify-jwt`, e virar
  `SOM_AO_VIVO = true` no `app.js`. **Condição prática:** o som do Casa precisa tocar por essa
  conta Spotify (é o que a API enxerga). Passo a passo no cabeçalho de `scripts/spotify-token.mjs`.

---

## Meu cantinho (perfil público do assinante)

Um cartãozinho público e **opt-in** do assinante em **`/gente/{handle}`** — dá rosto à
comunidade sem expor nada sensível. Mostra: apelido (ou 1º nome), foto, plano, "na casa
desde", o "café de sempre" (dos campos do 0014) e os recados que deixou no Mural.
**Ficam SEMPRE de fora:** e-mail, telefone, pontos, endereço, nome real completo.

- **Migration `0024_perfil_publico` (PENDENTE — aplicar no SQL Editor):** colunas
  `profiles.perfil_publico` (bool, opt-in) e `profiles.handle` (slug único da URL) + 2 RPCs
  SECURITY DEFINER:
  - `definir_perfil_publico(ativar)` — o dono (`auth.uid()`) liga/desliga; ao ligar gera um
    handle único e estável (slug do apelido/nome, tira acento). **Exige assinante**
    (`tier_slug` não nulo), como o Mural. Granted a `authenticated`.
  - `perfil_publico(handle)` — leitura **pública** (granted a `anon`), devolve um jsonb com
    EXATAMENTE os campos seguros (hand-picked) + os recados do dono; `null` se não existe ou
    não é público. **A exposição NÃO é RLS na `profiles`** (abriria a linha toda) — é este
    payload curado.
- **Rota `/gente/{handle}`:** `gente.html` (registrada no `rollupOptions.input`). URL
  dinâmica servida por **rewrite**: `vercel.json` (`rewrites: /gente/:handle → /gente.html`)
  em prod e o middleware `urlsLimpasNoDev` (regex `/gente/{x}` → `gente.html`) no dev.
- **Front:** `initGentePage()` lê o handle do path, chama `perfil_publico`, monta o cartão
  (café via `cafeFrase`, "desde" via `membroDesde`), escapa tudo; estado vazio gentil se o
  handle não existe/fechou. `/conta/perfil` ganhou a seção **"meu cantinho"**
  (`[data-cantinho]`): toggle liga/desliga (`definir_perfil_publico`), mostra o link + copiar.
  Tudo tolerante à migration pendente (seção some, página cai no vazio).
- **Falta:** aplicar a `0024` + subir o front. Nenhum secret novo.

---

## Hoje o Casa é teu — brunch de aniversário (Fase 3)

Cumpre a promessa que a 0014 já deixava no ar (`profiles.nascimento`: "no dia tem café
por nossa conta"), num tamanho maior: no **mês do aniversário**, o assinante reserva um
**brunch de aniversário** (pra uma pessoa — o mesmo mimo que a casa já dá hoje). Resgata
no `/conta/perfil`, recebe um **código** `CASA-XXXXXX`, mostra no balcão; o staff confere
e dá baixa no console. **Um por ano.**

- **Perk de assinante**, como o Mural/pontos/cantinho: só resgata quem tem `tier_slug`
  vigente. E só **no mês** do aniversário (janela generosa — dá pra vir num dia de semana).
  O código vale **30 dias** a partir do resgate.
- **Migration `0025_brinde_aniversario` (PENDENTE — aplicar no SQL Editor):** tabela
  `brindes_aniversario` (`user_id`, `ano`, `codigo` unique, `valido_ate`, `status`
  ativo|usado, UNIQUE `(user_id, ano)`) com RLS (cada um lê o próprio; staff com
  `resgates` lê todos; **escrita só via RPC**) + 4 RPCs SECURITY DEFINER:
  - `meu_brinde_aniversario()` (authenticated) — só LÊ: devolve o estado pro card
    (`tem_data`, `assinante`, `eh_mes`, `eh_dia`, `ja_resgatou`, `codigo`, `valido_ate`,
    `situacao` ativo|usado|expirado). Fuso `America/Sao_Paulo`.
  - `resgatar_brinde_aniversario()` (authenticated) — reserva o brunch do ano;
    **recomputa todas as travas no banco** (mês, assinatura, duplicidade), lock na própria
    linha + trata `unique_violation` → idempotente por `(user, ano)`.
  - `admin_brindes_listar(busca, status, limite)` e `admin_brinde_usar(id)` — gated por
    **`tem_permissao('resgates')`** (não precisou de permissão nova no whitelist do 0017:
    honrar o brunch no balcão É baixa de recompensa em mãos). `usar` recusa código já usado
    (idempotente) ou vencido, e grava no `audit_log`.
- **Front:** o card `[data-aniversario]` no `/conta/perfil` aparece **só** quando faz
  sentido (é o mês, ou há código vivo): assinante no mês → botão "quero meu brunch"; código
  reservado → a caixa com o código + validade; usado/expirado → recado gentil; sem plano no
  mês → CTA pros planos. No console, a aba **"aniversários"** (`viewAniversarios`, ícone
  `cake`, visível a quem tem `resgates`) lista os brindes com busca (código/nome) + filtros
  (a validar / usados / vencidos) e o botão "brunch entregue". Tudo tolerante à migration
  pendente (a RPC falha → card some, sem ruído). Helper `dataDiaMes` formata datas FUTURAS
  (validade) sem o drift de fuso do `new Date` — o `dataCurta` não serve (devolve "hoje").
- **Falta:** aplicar a `0025` + subir o front. Nenhum secret novo; nenhuma Edge Function.

---

## A agenda do Casa — encontros (Fase 3)

O Casa se define como *"um café-casa de **encontros**"*, e agora o site tem encontro. A
tabela `events` já existia na `0004_reconcile` (nome, descrição, data, vagas, ativo) e
**nunca fora usada** — a `0026` a acorda: o owner cadastra os próximos encontros no
console, eles aparecem numa seção **"a agenda do Casa"** na home, e o **assinante confirma
presença** ("eu vou"), com uma lotação gentil (as `vagas` que a 0004 já previa).

- **Migration `0026_agenda` (PENDENTE — aplicar no SQL Editor):** duas colunas novas em
  `events` (`local`, `updated_at`) + tabela `event_rsvps` (`(event_id, user_id)` PK =
  anti-duplicata, RLS: cada um lê o próprio, owner lê todos; **escrita só via RPC**) + 6
  RPCs SECURITY DEFINER:
  - `agenda_proximos()` — leitura **pública** (anon vê a agenda; só não tem "eu vou"),
    devolve os ativos e futuros (tolera 4h de folga) com `confirmados` (contagem SEM expor
    quem) e `eu_vou`/`lotado` do próprio caller. Granted a `anon`+`authenticated`.
  - `confirmar_presenca(id)` / `cancelar_presenca(id)` (authenticated) — RSVP. Confirmar é
    **perk de assinante** (exige `tier_slug`); recomputa tudo no banco (assinante, evento
    ativo/futuro, lotação) com **lock na linha do evento** (a vaga não estoura); idempotente.
  - `admin_eventos_listar()` / `admin_evento_salvar(...)` / `admin_evento_remover(id)` —
    gated por `is_owner()` (owner-only, `perm:'eventos'` não grantável, igual a avisos/trilha).
- **Front:** `initAgenda()` (boot, home) lê `agenda_proximos` e monta os cards (data via
  `dataEvento`, "eu vou" alterna sem recarregar; deslogado → login e volta; sem-plano → a
  RPC barra com recado gentil). A seção fica escondida sem encontros ou sem a migration. No
  console, a aba **"agenda"** (`viewAgenda`, ícone `calendar-days`, owner-only) tem form
  (nome/data/local/vagas/descrição/na-home) + lista com confirmados, editar e remover.
- **"Quem vai" (`0028_agenda_quem_vai`, PENDENTE):** a `agenda_proximos` ganhou a coluna
  `vao_publicos` (jsonb) — os **rostinhos** de quem confirmou **E** ligou o perfil público
  (`perfil_publico`), com `handle`/nome de exibição/`avatar_url` (os mesmos campos já
  públicos do `/gente`). Quem não optou nunca aparece, só soma em `confirmados`. O card da
  home mostra até 6 avatares (`avatarBolha`, link pro `/gente/{handle}`, inicial como
  fallback) + um "+N" pro resto. Reescreve só a função de leitura (DROP+CREATE, muda a
  assinatura); nenhuma tabela/permissão nova.
- **"Guarda no teu calendário" (só front, sem migration):** cada card com data marcada
  ganha o link **"guarda no teu calendário"** (`googleCalUrl`), um **link direto pro Google
  Agenda** (`calendar.google.com/calendar/render?action=TEMPLATE&…`) — abre numa aba nova
  com nome/quando/onde/descrição prontos, **sem baixar arquivo** (`.ics`). Monta a URL 100%
  no client a partir dos dados que a `initAgenda` já tem: `text=nome`, `dates` em UTC
  compacto (`YYYYMMDDTHHMMSSZ`, sufixo `Z` → cai certo em qualquer fuso), duração assumida
  de **2h** (os eventos não têm hora de fim), `location = local + endereço do Casa` e
  `details=descricao`. Encontro **sem data** (`em breve`) não mostra o link (não dá pra
  agendar o indefinido). Ícone `calendar-plus`.
- **Falta:** aplicar a `0026` **e** a `0028` + subir o front. Nenhum secret novo; nenhuma
  Edge Function.

---

## Teus favoritos no cardápio (Fase 3)

O `/cardapio` era uma lista bonita mas estática. Agora quem está logado **favorita**
um item (um coraçãozinho) e ganha um bloco **"teus favoritos"** no topo, pra reencontrar
o de sempre num toque. De quebra, o Casa vê no console **o que a casa mais ama**.

- **Aberto a qualquer pessoa logada** (não é perk de assinante) — quanto mais gente marca,
  mais sinal pra casa. O cardápio é HTML curado, então o item é identificado por um `slug`
  **derivado do nome** (`slugify`, no client) — nada de tabela de menu.
- **Migration `0027_cardapio_favoritos` (PENDENTE — aplicar no SQL Editor):** tabela
  `cardapio_favoritos` (`(user_id, item_slug)` PK, `item_nome` snapshot pro console,
  `user_id` default `auth.uid()`). Favorito é dado **benigno** (não entra na lista de
  sensíveis do security-check): a **escrita é direta pelo client via RLS**, sempre travada
  em `auth.uid()` (policies select/insert/delete own) — sem Edge Function. O console lê o
  agregado por `admin_cardapio_favoritos()` (SECURITY DEFINER, gated por
  `tem_permissao('relatorios')`), que conta por slug e mostra o nome **mais frequente**
  (resiliente a um snapshot adulterado; o console escapa tudo).
- **Front:** `initCardapioFavoritos()` (boot) só age logado: deriva o slug de cada
  `.menu-item` pelo nome, injeta um coração em cada um, lê os favoritos do usuário e monta o
  bloco de chips (cada chip rola até o item com um flash). Toggle otimista (insert/delete),
  desfaz se o servidor recusar; `23505` (já favoritado) conta como sucesso. Tolerante: sem
  sessão ou sem a migration, nenhum coração aparece. No console, a aba **"favoritos"**
  (`viewFavoritos`, ícone `heart`, quem tem `relatorios`) lista o ranking com barrinha.
- **Falta:** aplicar a `0027` + subir o front. Nenhum secret novo; nenhuma Edge Function.

---

## Ficou pra depois (lista de desejos da loja) (Fase 3)

O irmão do "teus favoritos" do cardápio, agora na loja: um **coração em cada produto**
(catálogo e página de produto) que **salva pra depois** sem botar no carrinho. Uma tirinha
**"ficou pra depois"** no topo da `/loja` e um **espelho no `/conta/perfil`** reúnem o que a
pessoa guardou, tirando o atrito do "gostei mas agora não". De quebra, o Casa vê no console
**o que a casa mais quer** (demanda represada por produto).

- **Aberto a qualquer pessoa logada** (não é perk de assinante). O catálogo é mock no client
  (`PRODUTOS`), então o produto é identificado pelo **mesmo `slug` da URL `/produto`**; o
  `produto_nome` é snapshot pro console.
- **Migration `0029_loja_desejos` (PENDENTE — aplicar no SQL Editor):** tabela `loja_desejos`
  (`(user_id, produto_slug)` PK, `produto_nome` snapshot, `user_id` default `auth.uid()`).
  Desejo é dado **benigno** (fora da lista de sensíveis do security-check): **escrita direta
  pelo client via RLS**, sempre travada em `auth.uid()` (policies select/insert/delete own),
  sem Edge Function. O console lê o agregado por `admin_loja_desejos()` (SECURITY DEFINER,
  `tem_permissao('relatorios')`), que conta por slug e mostra o nome **mais frequente**
  (resiliente a snapshot adulterado; o console escapa tudo).
- **Front:** `initLojaDesejos()` só age logado, em três superfícies (tolerante sem a 0029,
  sem sessão → nada aparece): (1) injeta um coração sobre a foto de cada card do catálogo
  (`.prod-fav`, via `[data-produto][data-slug]`); (2) revela o botão "guardar pra depois" na
  página de produto (`[data-desejo-produto]`, `hidden` até logar); (3) monta a tirinha de
  chips (link pro produto + `×` pra tirar) nas seções `[data-loja-desejos]` (topo da `/loja`)
  e `[data-desejos-perfil]` (perfil). Todos os corações de um mesmo slug andam juntos; toggle
  **otimista** (insert/delete, `23505` = já guardado = sucesso), desfaz se o servidor recusar.
  A chamada do boot não pega o perfil (montado pós-guard), então `initPerfilPage` **religa**
  `initLojaDesejos()` no fim. No console, a aba **"desejos"** (`viewDesejos`, ícone `bookmark`,
  quem tem `relatorios`) lista o ranking com barrinha, igual aos favoritos.
- **Falta:** aplicar a `0029` + subir o front. Nenhum secret novo; nenhuma Edge Function.

---

## Volta pra vitrine (avisa quando o produto voltar) (Fase 3)

Puxa o gancho da lista de desejos: produto **esgotado** (`disponivel: false` no mock
`PRODUTOS`) não fica mudo, ganha um selo **"esgotado"** e o botão **"me avisa quando
voltar"**. Quando a casa repõe (flip pra disponível), o aviso chega no **sino de
notificações do header** ("voltou pra vitrine"), visível em qualquer página. Pro Casa, o
console mostra **quantas pessoas esperam cada produto** — o sinal mais forte pra reposição.

- **Disponibilidade no mock:** `PRODUTOS[].disponivel` (ausente = disponível; só marca-se
  `false`). Hoje **Torra Vale dos Sinos** e **Caneca de autor** estão esgotados.
- **Migration `0030_avisos_reposicao` (PENDENTE — aplicar no SQL Editor):** tabela
  `avisos_reposicao` (mesma forma do `loja_desejos`: PK `(user_id, produto_slug)`,
  `produto_nome` snapshot, `user_id` default `auth.uid()`). Dado **benigno** (fora da lista
  de sensíveis): **escrita direta pelo client via RLS** (select/insert/delete own), sem Edge
  Function. Agregado do console por `admin_avisos_reposicao()` (SECURITY DEFINER,
  `tem_permissao('relatorios')`, conta por slug com o nome mais frequente).
- **Front — botões "me avisa":** o esgotado é 100% do mock (client), então `cardProdutoHTML`
  e `initProductPage` já renderizam o selo + "me avisa" sem depender de sessão/banco (na
  página de produto, esgotado troca quantidade/carrinho pela nota + botão). `initReposicao()`
  liga só os botões: deslogado → manda pro login; logado → carrega os avisos, pinta o estado
  (toggle otimista, `23505` = já pediu = sucesso); migration pendente → botão inerte ("aviso
  em breve"). **Não há mais tirinha inline** — quem mostra o "voltou" é o sino.
- **Front — o "voltou" é UMA das fontes do sino de notificações** (`initNotificacoes`,
  header, toda página — ver **"O Casa te avisa"** abaixo). Filtra os `avisos_reposicao` cujo
  produto **voltou** (existe e está disponível agora); "já vi" **apaga a linha** do banco
  (best-effort, RLS-direct).
- **Console:** aba **"esperando"** (`viewReposicao`, ícone `bell-ring`, quem tem `relatorios`)
  lista o ranking de quem espera cada produto, com barrinha.
- **Falta:** aplicar a `0030` + subir o front. Nenhum secret novo; nenhuma Edge Function.

---

## O Casa te avisa (central de notificações no header)

O sino do header deixou de servir só o "voltou pra vitrine" e virou uma **central** que
junta, num painel só, os avisos que antes viviam espalhados pelo site. **Cinco fontes**,
todas **só-leitura** de tabelas que já existem, cada uma lendo apenas o registro do
**próprio** usuário (RLS own-record) — **nenhuma tabela, secret ou Edge Function nova**.

- **As fontes** (`initNotificacoes`, boot, toda página — cada uma é tolerante: erro /
  migration pendente → `[]`, some sem quebrar):
  1. **voltou pra vitrine** — `avisos_reposicao` (0030) cujo produto está disponível agora.
     Ícone `bell-ring`. Dispensa **apagando a linha** (RLS-direct).
  2. **indicação premiada** — `referrals` (0021) com `referrer_id = eu` e `status='premiado'`.
     Ícone `users`, leva pro `/conta/perfil`.
  3. **presente resgatado** — `gift_subscriptions` (0019) com `comprador_id = eu` e
     `status='resgatado'`. Ícone `gift`, leva pro `/conta/perfil`.
  4. **brunch de aniversário** — RPC `meu_brinde_aniversario` (0025) quando `assinante &&
     eh_mes && !ja_resgatou`. Ícone `cake`, leva pro `/conta/perfil`.
  5. **encontro chegando** — RPC `agenda_proximos` (0026) com `eu_vou` e `data` numa janela
     de **48h** (tolera 4h já começado). Ícone `calendar-days`, sub via `dataEvento`.
- **Dispensar ("já vi"):** o **voltou** apaga a linha do banco; as **derivadas** (não há linha
  pra apagar) guardam o `id` no **localStorage** (`casa_notif_lidas`, helpers `notifLidas()`/
  `marcarNotifLida()`, mesmo padrão do `renderAvisoBar`). O badge tampa em **"9+"**.
- **Markup/estilo:** cada item ganhou uma **coluna de ícone** (`.notif-item-ico` redondo +
  `.notif-item-corpo` com tag/nome/sub). No **mobile** o painel é `position: fixed` com o
  `top` medido do header ao abrir (respeita a tarja de recado). Mecânica de abrir/fechar
  (clique-fora/Esc/scale-opacity) reusa o padrão do painel do usuário.
- **Só-leitura, zero confiança nova:** o sino nunca **credita** nada, só **reflete** estado
  que os webhooks/RPCs já produziram. Deslogado → escondido.
- **Falta:** nada além do que cada fonte já pede (0019/0021/0025/0026/0030 + subir o front).
  Migration pendente de uma fonte só apaga aquela fonte do painel.

---

## O teu de sempre (cartão pessoal na home) — DESATIVADO

> **DESATIVADO em 04/ago/2026** (a pedido): a chamada `initTeuDeSempre()` está comentada
> no bootstrap, então o cartão **não renderiza**. O visual e a posição vão ser repensados
> pra não competir com o hero da home. A função e a seção `[data-teu-de-sempre]` (que fica
> `hidden`) seguem no código, é só descomentar a linha do boot pra religar.

Um cartãozinho no **topo da home**, só pra **quem está logado**, que junta num olhar o
que a pessoa já tem espalhado pelo site, um atalho afetivo pro dia a dia. **Só-leitura**,
**sem migration, sem secret, sem Edge Function** (reusa tabelas/RPCs que já existem).

- **O que mostra** (`initTeuDeSempre`, boot, só age com `[data-teu-de-sempre]` + logado):
  uma saudação pela hora local com o 1º nome do `profile` e até três blocos:
  1. **plano + pontos** — `profile.tier_slug` (nome via `tiers`) + `points_balance`, leva
     pro `/conta/pontos`. **Sem plano** → um convite gentil "vem fazer parte" pro `/planos`.
  2. **próximo encontro que confirmou** — `agenda_proximos` (0026) filtrando `eu_vou` e
     pegando o mais próximo ainda por vir; leva pra `#a-agenda` (a seção da agenda ganhou
     esse `id` na home). Sub via `dataEvento`.
  3. **teus favoritos do cardápio** — `cardapio_favoritos` (0027), até 4 chips (link pro
     `/cardapio`) + "+N".
- **Tolerante:** cada fonte é isolada (erro/migration pendente → aquela parte some); o
  cartão só depende do `profiles` (tabela base). Deslogado → seção fica `hidden`. Nada de
  escrita. Estilo `.tds-*` no `styles.css` (grid `auto-fit`, empilha no mobile).
- **Falta:** nada de banco, é só front (subir o merge). As partes 2 e 3 ganham conteúdo
  conforme as migrations 0026/0027 forem aplicadas.

---

## Como chegar (/o-casa)

O bloco de localização do `/o-casa` já tinha o **mapa** (embed do Google, que geocoda o
negócio pelo nome+endereço). Faltava a **ação de chegar**: `initComoChegar()` preenche
`[data-como-chegar]` com três botões, a partir do `MARCA.contato.endereco` (fonte única):

- **"traçar rota"** → Google Maps directions (`maps/dir/?api=1&destination=<nome+endereço>`).
- **"abrir no Waze"** → `waze.com/ul?q=<nome+endereço>&navigate=yes` (Waze é muito usado no RS).
- **"copiar endereço"** → `navigator.clipboard` com feedback ("copiado"); fallback gentil
  ("copia na mão") se o clipboard estiver bloqueado.

Front puro, **sem chave/API paga, sem migration**: as URLs de rota levam o endereço por
texto e o app de mapa geocoda o lugar certo. O endereço vive só no `MARCA` (mesmo do rodapé).

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
  texto, anti-flood 30s, grava via service_role. Front: seção no `/o-casa` (post-its na
  **seção escura**, no lugar do antigo selo "Feito no Casa", que saiu da página) +
  `initMuralPage` (lê a parede público; compose só pra assinante; deslogado/sem-plano vê
  CTA pros planos; leitura tolerante se a migration ainda não foi aplicada). **Falta:**
  aplicar esta migration + subir o front.
- **`0021_indicacoes` — PENDENTE (aplicar no SQL Editor).** "Indica um amigo": coluna
  `profiles.referral_code` (unique), tabela `referrals` (`referred_id` UNIQUE, `status`
  pendente|premiado|invalido) com RLS (lê só o que fez/recebeu; sem escrita pelo client), e
  as RPCs `meu_codigo_indicacao()`/`registrar_indicacao(text)` (granted a `authenticated`,
  usam `auth.uid()`) + `premiar_indicacao(uuid,int,int)` (granted só a `service_role`,
  idempotente pendente→premiado, credita os dois no ledger). O `asaas-webhook` (**já
  deployado em 03/ago/2026**) chama `premiar_indicacao` no primeiro pagamento do indicado;
  valores dos pontos são FICTÍCIOS nas constantes do webhook. Front tolerante à migration
  pendente. **Falta:** aplicar esta migration + subir o front. Ver "Indica um amigo" acima.
- **`0022_avisos` — PENDENTE (aplicar no SQL Editor).** "Recado da casa": tabela
  `avisos_casa` (RLS: leitura pública só do vigente por `ativo`+janela; owner vê tudo) +
  3 RPCs SECURITY DEFINER `is_owner()` (`admin_avisos_listar`/`admin_aviso_salvar`/
  `admin_aviso_remover`) — sem escrita pelo client. Front: `renderAvisoBar` (tarja no topo,
  toda página) + aba **recados** no console (owner-only). Tolerante à migration pendente.
  **Falta:** aplicar + subir o front. Nenhum secret novo. Ver "Recado da casa" acima.
- **`0023_trilha` — PENDENTE (aplicar no SQL Editor).** "A trilha do Casa": tabela
  `playlists_casa` (RLS leitura pública só das ativas; owner vê tudo; índice único parcial
  = uma `tocando` por vez) + 3 RPCs SECURITY DEFINER `is_owner()` (`admin_trilha_listar`/
  `salvar`/`remover`). Front: `initTrilha` (home) com `spotifyEmbed` trancando o src em
  `open.spotify.com/embed` + aba **trilha** no console (owner-only). Tolerante à migration
  pendente. **Falta:** aplicar + subir o front. Nenhum secret novo. Ver "A trilha do Casa" acima.
- **`0024_perfil_publico` — PENDENTE (aplicar no SQL Editor).** "Meu cantinho": colunas
  `profiles.perfil_publico`/`handle` + RPCs `definir_perfil_publico(bool)` (dono liga/desliga,
  exige assinante) e `perfil_publico(text)` (leitura pública anon, payload seguro curado —
  NÃO é RLS na profiles). Front: página `/gente/{handle}` (rewrite no vercel.json + middleware
  do dev) + seção "meu cantinho" no `/conta/perfil`. Tolerante à migration pendente.
  **Falta:** aplicar + subir o front. Ver "Meu cantinho" acima.
- **`0025_brinde_aniversario` — PENDENTE (aplicar no SQL Editor).** "Hoje o Casa é teu":
  tabela `brindes_aniversario` (UNIQUE `(user_id, ano)`, RLS: dono lê o próprio, staff com
  `resgates` lê todos, escrita só via RPC) + 4 RPCs SECURITY DEFINER
  (`meu_brinde_aniversario`/`resgatar_brinde_aniversario` a `authenticated`;
  `admin_brindes_listar`/`admin_brinde_usar` gated por `tem_permissao('resgates')`). Front:
  card no `/conta/perfil` + aba "aniversários" no console. Tolerante à migration pendente.
  **Falta:** aplicar + subir o front. Nenhum secret novo; nenhuma Edge Function. Ver
  "Hoje o Casa é teu — brunch de aniversário" acima.
- **`0026_agenda` — PENDENTE (aplicar no SQL Editor).** "A agenda do Casa": acorda a tabela
  `events` (0004) com colunas `local`/`updated_at` + tabela `event_rsvps` (PK composta, RLS
  dono/owner, escrita só via RPC) + 6 RPCs SECURITY DEFINER (`agenda_proximos` pública;
  `confirmar_presenca`/`cancelar_presenca` a `authenticated`, RSVP perk de assinante com lock
  anti-estouro de vaga; `admin_evento_listar/salvar/remover` gated por `is_owner()`,
  owner-only). Front: seção "a agenda do Casa" na home (`initAgenda`) + aba "agenda" no
  console. Tolerante à migration pendente. **Falta:** aplicar + subir o front. Nenhum secret
  novo; nenhuma Edge Function. Ver "A agenda do Casa — encontros" acima.
- **`0027_cardapio_favoritos` — PENDENTE (aplicar no SQL Editor).** "Teus favoritos":
  tabela `cardapio_favoritos` (PK `(user_id, item_slug)`, `item_nome` snapshot,
  `user_id` default `auth.uid()`) com RLS de **escrita direta pelo client** (select/insert/
  delete own, sempre `auth.uid()` — dado benigno, fora da lista de sensíveis) + RPC
  `admin_cardapio_favoritos()` (SECURITY DEFINER, `tem_permissao('relatorios')`, agrega por
  slug com o nome mais frequente). Front: corações no `/cardapio` + bloco "teus favoritos"
  (`initCardapioFavoritos`, slug derivado do nome) + aba "favoritos" no console. Tolerante à
  migration pendente. **Falta:** aplicar + subir o front. Nenhum secret novo; nenhuma Edge
  Function. Ver "Teus favoritos no cardápio" acima.
- **`0028_agenda_quem_vai` — PENDENTE (aplicar no SQL Editor).** "Quem vai": reescreve a
  função `agenda_proximos` (DROP+CREATE, muda a assinatura) pra devolver `vao_publicos`
  (jsonb) — os presentes que ligaram o perfil público (handle/nome/avatar, curado, só campos
  já públicos). Sem tabela nova, sem permissão nova. Front: avatares no card da agenda
  (`avatarBolha`). **Depende da `0026` estar aplicada** (usa `event_rsvps`). Tolerante:
  sem ela, `agenda_proximos` fica na versão da 0026 e a home só não mostra rostos. **Falta:**
  aplicar (depois da 0026) + subir o front. Ver "Quem vai" na seção da agenda.
- **`0029_loja_desejos` — PENDENTE (aplicar no SQL Editor).** "Ficou pra depois": tabela
  `loja_desejos` (PK `(user_id, produto_slug)`, `produto_nome` snapshot, `user_id` default
  `auth.uid()`) com RLS de **escrita direta pelo client** (select/insert/delete own, sempre
  `auth.uid()` — dado benigno, fora da lista de sensíveis) + RPC `admin_loja_desejos()`
  (SECURITY DEFINER, `tem_permissao('relatorios')`, agrega por slug com o nome mais
  frequente). Front: corações no catálogo/produto + tirinha "ficou pra depois" na `/loja` e
  espelho no `/conta/perfil` (`initLojaDesejos`) + aba "desejos" no console. Tolerante à
  migration pendente. **Falta:** aplicar + subir o front. Nenhum secret novo; nenhuma Edge
  Function. Ver "Ficou pra depois (lista de desejos da loja)" acima.
- **`0030_avisos_reposicao` — PENDENTE (aplicar no SQL Editor).** "Volta pra vitrine":
  tabela `avisos_reposicao` (PK `(user_id, produto_slug)`, `produto_nome` snapshot,
  `user_id` default `auth.uid()`) com RLS de **escrita direta pelo client** (select/insert/
  delete own — dado benigno, fora da lista de sensíveis) + RPC `admin_avisos_reposicao()`
  (SECURITY DEFINER, `tem_permissao('relatorios')`, agrega por slug com o nome mais
  frequente). Front: selo "esgotado" + "me avisa quando voltar" nos produtos `disponivel:
  false`, tirinha "voltou pra vitrine" na `/loja` e no `/conta/perfil` (`initReposicao`) +
  aba "esperando" no console. Tolerante à migration pendente. **Falta:** aplicar + subir o
  front. Nenhum secret novo; nenhuma Edge Function. Ver "Volta pra vitrine" acima.
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
