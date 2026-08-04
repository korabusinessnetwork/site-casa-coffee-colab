// =============================================================================
// Casa Coffee Colab, app.js
// Camada de interface (JS vanilla). Um arquivo por camada, ver CLAUDE.md.
//
// Header, footer e menu são funções que injetam HTML nos placeholders da página:
//   <div id="site-header"></div>  /  <div id="site-footer"></div>
// Cada página .html é uma URL própria; ela chama initSite() no fim.
// =============================================================================

import './styles.css';
import {
  createIcons,
  Coffee,
  Sunrise,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Music,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Heart,
  Sparkles,
  Hand,
  Award,
  Star,
  Gift,
  Mail,
  MessageCircle,
  User,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  ChevronDown,
  CreditCard,
  KeyRound,
  Settings2,
  ArrowUpCircle,
  ArrowUp,
  PlayCircle,
  Camera,
  Monitor,
  Smartphone,
  Tablet,
  Utensils,
  Users,
  CalendarDays,
  CalendarPlus,
  Bookmark,
  Bell,
  BellOff,
  BellRing,
} from 'lucide';
import { createClient } from '@supabase/supabase-js';

// Ícones Lucide usados no site. createIcons() substitui <i data-lucide="..."> por SVG.
// Chamar sempre DEPOIS de injetar markup novo no DOM.
const LUCIDE_ICONS = {
  Coffee,
  Sunrise,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Music,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Heart,
  Sparkles,
  Hand,
  Award,
  Star,
  Gift,
  Mail,
  MessageCircle,
  User,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  ChevronDown,
  CreditCard,
  KeyRound,
  Settings2,
  ArrowUpCircle,
  ArrowUp,
  PlayCircle,
  Camera,
  Monitor,
  Smartphone,
  Tablet,
  Utensils,
  Users,
  CalendarDays,
  CalendarPlus,
  Bookmark,
  Bell,
  BellOff,
  BellRing,
};
function renderIcons() {
  createIcons({ icons: LUCIDE_ICONS });
}

// Liga todo botão [data-toggle-senha] do escopo pra mostrar/ocultar a senha do
// input irmão (dentro do mesmo container .relative). Acessível (aria-*) e troca
// o ícone eye ↔ eye-off. Reutilizado no login e no cadastro.
function setupPasswordToggles(scope) {
  scope.querySelectorAll('[data-toggle-senha]').forEach((btn) => {
    const input = btn.parentElement?.querySelector('input');
    if (!input) return;
    btn.addEventListener('click', () => {
      const revelando = input.type === 'password';
      input.type = revelando ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(revelando));
      btn.setAttribute('aria-label', revelando ? 'ocultar senha' : 'mostrar senha');
      btn.innerHTML = `<i data-lucide="${revelando ? 'eye-off' : 'eye'}" class="h-5 w-5"></i>`;
      renderIcons();
      input.focus();
    });
  });
}

// --- Dados da marca (fonte única) ----------------------------------------------
const MARCA = {
  nome: 'Casa Coffee Colab',
  bio: 'O Casa é café, afeto e comida boa',
  cta: 'Entra, senta, fica um pouco',
  contato: {
    endereco: 'R. Victor Hugo Kunz, 411, Hamburgo Velho, Novo Hamburgo/RS',
    email: 'casacoffeecolab@gmail.com',
    telefone: '(51) 99360-5262',
    // O telefone do rodapé abre o WhatsApp já com a conversa começada.
    whatsappNumero: '5551993605262',
    whatsappMensagem: 'Oii, gente do casa!! Quero saber mais sobre vocês!!',
    horario: 'Seg a sáb 8h–19h · dom 15h–19h',
  },
  redes: [
    { nome: 'Instagram', href: '#' },
    { nome: 'Facebook', href: '#' },
    { nome: 'Spotify', href: '#' },
  ],
};

// Navegação principal. Aponta pras páginas reais (cada uma é uma URL).
// Dois campos opcionais por item:
//   selo    — carimbo sobre o rótulo (ver .nav-selo no styles.css).
//   semLink — o item vira texto, sem clique. A PÁGINA CONTINUA NO AR: quem
//             souber a URL entra direto. É só o menu que para de oferecer.
const NAV = [
  { rotulo: 'Home', href: '/home' },
  { rotulo: 'O Casa', href: '/o-casa' },
  { rotulo: 'Cardápio', href: '/cardapio' },
  { rotulo: 'Loja', href: '/loja', selo: 'em breve', semLink: true },
  { rotulo: 'Planos', href: '/planos' },
  { rotulo: 'Colab', href: '/colab' },
];

// Qual item da NAV corresponde à página atual (pra marcar como ativo).
// As URLs são limpas (/o-casa), mas o .html continua aceito — em dev dá pra
// abrir /o-casa.html, e links antigos ainda chegam aqui via redirect.
// "produto" conta como "Loja"; a raiz "/" conta como "Home".
function activeNavHref() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const base = path.substring(path.lastIndexOf('/') + 1).replace(/\.html$/, '');
  if (base === '' || base === 'index') return '/home';
  if (base === 'produto') return '/loja';
  const found = NAV.find((item) => item.href === '/' + base);
  return found ? found.href : null;
}

// =============================================================================
// AUTH (Supabase Auth)
// Só a ANON key no client, a RLS do banco é quem protege os dados (ver CLAUDE.md).
// O papel (role) do usuário vem SEMPRE do profiles (banco), nunca do client.
// Sessão persiste no localStorage (padrão do supabase-js) e sobrevive à navegação.
// =============================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseConfigurado =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) &&
  !/placeholder/i.test(SUPABASE_URL);

// Fotografia da URL ANTES de o supabase-js consumi-la. Com detectSessionInUrl
// (padrão), o client troca o token do hash por uma sessão e LIMPA a barra de
// endereço — junto vai o `type=recovery`, único sinal de que aquele link veio do
// "esqueci a senha" e não da confirmação de e-mail. Lido aqui, no corpo do
// módulo, o valor é capturado antes de qualquer await; lido lá na página, já
// seria tarde.
const HASH_DE_ENTRADA = typeof window !== 'undefined' ? window.location.hash : '';
const QUERY_DE_ENTRADA = typeof window !== 'undefined' ? window.location.search : '';

// Client único (ou null se ainda não configurado, as telas degradam com aviso gentil).
export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabaseConfigurado) {
  // Aviso só no console, nada de segredo, nada de quebrar a página.
  console.warn(
    '[Casa] Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.'
  );
}

// Escapa toda string vinda do banco/usuário antes de injetar no DOM (anti-XSS).
function escapeHtml(valor) {
  return String(valor ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// --- Helpers de sessão/perfil --------------------------------------------------
async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// Lê a PRÓPRIA linha do profiles (RLS: id = auth.uid()). role vem daqui, não do client.
async function getProfile() {
  if (!supabase) return null;
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, telefone, role, points_balance, tier_slug, avatar_url')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

// Marca que o "sair" partiu da própria pessoa. Serve pro onAuthStateChange
// distinguir isso de uma sessão que caiu sozinha (refresh token vencido ou
// revogado noutro aparelho) — ver `initAuth`.
let saindoDeProposito = false;

async function signOut() {
  saindoDeProposito = true;
  if (supabase) await supabase.auth.signOut();
}

// Base URL do site pra links de e-mail (confirmação/reset). Env-driven, sem
// hardcode: usa VITE_SITE_URL (dev e prod) e cai pro origin atual se não houver.
// (`||` e não `??` de propósito: trata VITE_SITE_URL="" como ausente.)
function siteBase() {
  return import.meta.env.VITE_SITE_URL || window.location.origin;
}

// Nome de exibição (metadata do signup > e-mail). Sempre escapado por quem injeta.
function nomeDeExibicao(session) {
  const u = session?.user;
  if (!u) return '';
  return u.user_metadata?.full_name || u.email || 'você';
}

// Traduz erros do Supabase pro tom da casa (sem vazar detalhe técnico).
function mensagemDeErroAuth(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'parece que esse e-mail já tem conta por aqui. tenta entrar? 💛';
  if (m.includes('invalid login credentials'))
    return 'o e-mail ou a senha não bateram. tenta de novo, com calma.';
  if (m.includes('email not confirmed'))
    return 'falta confirmar teu e-mail. dá uma olhada na tua caixa de entrada?';
  if (m.includes('password') && m.includes('at least'))
    return 'a senha precisa de pelo menos 8 caracteres.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'muitas tentativas seguidas. respira, toma um café e tenta daqui a pouco.';
  if (m.includes('failed to fetch') || m.includes('networkerror'))
    return 'a gente não conseguiu falar com o servidor agora. confere tua conexão?';
  return 'algo não saiu como esperado. tenta de novo daqui a pouco?';
}

// =============================================================================
// CATÁLOGO (MOCK, virá do Supabase na Fase 2)
// TODO: substituir este array pela tabela `products` do Supabase (ver CLAUDE.md).
// Cada produto: id, nome, slug, categoria, preco_centavos, descricao,
// imagemPlaceholder (classe .photo-*), variantes (opcional).
// =============================================================================
const CATEGORIAS = {
  vestuario: 'Vestuário',
  acessorios: 'Acessórios',
  cafe_grao: 'Café em grão',
};

const PRODUTOS = [
  {
    id: 'cafe-alma',
    nome: 'Café em grão · Alma do Casa · 250g',
    slug: 'cafe-alma-do-casa-250g',
    categoria: 'cafe_grao',
    preco_centavos: 4990,
    descricao:
      'Nosso blend autoral, encorpado, de final doce. Torrado em micro-lote pra chegar fresquinho na tua xícara.',
    imagemPlaceholder: 'ph-drink',
    variantes: { rotulo: 'Moagem', opcoes: ['Grão inteiro', 'Moído p/ coado', 'Moído p/ espresso'] },
  },
  {
    id: 'cafe-vale',
    nome: 'Café em grão · Torra Vale dos Sinos · 250g',
    slug: 'cafe-torra-vale-dos-sinos-250g',
    categoria: 'cafe_grao',
    preco_centavos: 5490,
    descricao:
      'Micro-lote de um produtor vizinho, com notas de castanha e caramelo. A gente serve por tempo limitado.',
    imagemPlaceholder: 'ph-tote',
    variantes: { rotulo: 'Moagem', opcoes: ['Grão inteiro', 'Moído p/ coado', 'Moído p/ espresso'] },
    disponivel: false,
  },
  {
    id: 'cafe-afeto',
    nome: 'Café em grão · Descafeinado Afeto · 250g',
    slug: 'cafe-descafeinado-afeto-250g',
    categoria: 'cafe_grao',
    preco_centavos: 5290,
    descricao:
      'Pra ficar um pouco mais sem perder o sono. Descafeinado suave, doce e redondo, no teu ritmo.',
    imagemPlaceholder: 'ph-tan light',
    variantes: { rotulo: 'Moagem', opcoes: ['Grão inteiro', 'Moído p/ coado', 'Moído p/ espresso'] },
  },
  {
    id: 'moletom-casa',
    nome: 'Moletom Casa Coffee',
    slug: 'moletom-casa-coffee',
    categoria: 'vestuario',
    preco_centavos: 19990,
    descricao:
      'Quentinho pra vestir nos dias de café e chuva. Algodão macio, bordado discreto do Casa no peito.',
    imagemPlaceholder: 'ph-tote',
    variantes: { rotulo: 'Tamanho', opcoes: ['P', 'M', 'G', 'GG'] },
  },
  {
    id: 'camiseta-feito',
    nome: 'Camiseta "feito no Casa"',
    slug: 'camiseta-feito-no-casa',
    categoria: 'vestuario',
    preco_centavos: 8990,
    descricao:
      'Leve, de algodão, com a nossa frase preferida estampada. Pra levar um pedacinho do Casa por aí.',
    imagemPlaceholder: 'ph-drink',
    variantes: { rotulo: 'Tamanho', opcoes: ['P', 'M', 'G', 'GG'] },
  },
  {
    id: 'avental-casa',
    nome: 'Avental do Casa',
    slug: 'avental-do-casa',
    categoria: 'vestuario',
    preco_centavos: 11990,
    descricao:
      'O mesmo avental que a gente usa na cozinha. Linho encorpado, bolso na frente, feito pra durar.',
    imagemPlaceholder: 'ph-tan light',
    variantes: { rotulo: 'Tamanho', opcoes: ['Único'] },
  },
  {
    id: 'caneca-autor',
    nome: 'Caneca de autor',
    slug: 'caneca-de-autor',
    categoria: 'acessorios',
    preco_centavos: 5990,
    descricao:
      'Cerâmica feita à mão pelo Ateliê Lomba Grande, em residência com a gente. Cada peça é única.',
    imagemPlaceholder: 'ph-drink',
    variantes: null,
    disponivel: false,
  },
  {
    id: 'bolsa-linho',
    nome: 'Bolsa de linho',
    slug: 'bolsa-de-linho',
    categoria: 'acessorios',
    preco_centavos: 7990,
    descricao:
      'Do tamanho certo pra um livro, o café e o resto do dia. Linho natural que envelhece bonito.',
    imagemPlaceholder: 'ph-tote',
    variantes: null,
  },
  {
    id: 'ecobag-passa',
    nome: 'Ecobag "passa aqui?"',
    slug: 'ecobag-passa-aqui',
    categoria: 'acessorios',
    preco_centavos: 3990,
    descricao:
      'Nosso convite favorito, pra carregar junto. Algodão cru, alça reforçada, cabe a feira inteira.',
    imagemPlaceholder: 'ph-tan light',
    variantes: null,
  },
  {
    id: 'kit-coador',
    nome: 'Kit coador + filtro de pano',
    slug: 'kit-coador-filtro-pano',
    categoria: 'acessorios',
    preco_centavos: 6990,
    descricao:
      'Pra fazer em casa o café que tu toma aqui. Suporte de madeira e filtro de pano reutilizável.',
    imagemPlaceholder: 'ph-drink',
    variantes: null,
  },
];

const getProdutoPorSlug = (slug) => PRODUTOS.find((p) => p.slug === slug) || null;
const getProdutoPorId = (id) => PRODUTOS.find((p) => p.id === id) || null;

// Preço em R$ (ex.: 4990 → "R$ 49,90")
function formatBRL(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// =============================================================================
// CARRINHO
// Estado persistido em localStorage (chave "casa_cart"), o site é multi-página,
// então o carrinho PRECISA sobreviver a reloads/navegação.
// Item guardado: { key, produtoId, variante, qtd }. `key` = produtoId::variante,
// pra somar o mesmo produto+variante e separar variantes diferentes.
// =============================================================================
const CART_KEY = 'casa_cart';
const cartListeners = new Set();

const Cart = {
  getCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },
  _save(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* localStorage indisponível (modo privado), segue em memória da sessão */
    }
    cartListeners.forEach((fn) => fn(items));
  },
  addItem(produtoId, variante = null, qtd = 1) {
    if (!getProdutoPorId(produtoId)) return;
    const q = Math.max(1, parseInt(qtd, 10) || 1);
    const key = `${produtoId}::${variante || ''}`;
    const items = this.getCart();
    const existente = items.find((it) => it.key === key);
    if (existente) existente.qtd += q;
    else items.push({ key, produtoId, variante: variante || null, qtd: q });
    this._save(items);
  },
  updateQty(key, qtd) {
    const q = parseInt(qtd, 10) || 0;
    let items = this.getCart();
    items = q <= 0 ? items.filter((it) => it.key !== key) : items.map((it) => (it.key === key ? { ...it, qtd: q } : it));
    this._save(items);
  },
  removeItem(key) {
    this._save(this.getCart().filter((it) => it.key !== key));
  },
  clearCart() {
    this._save([]);
  },
  getCount() {
    // Ignora item cujo produto sumiu do catálogo (mesma regra do subtotal, do
    // render do drawer e do checkout) — senão o badge do header conta fantasma
    // que a pessoa não vê em lugar nenhum.
    return this.getCart().reduce((n, it) => n + (getProdutoPorId(it.produtoId) ? it.qtd : 0), 0);
  },
  getSubtotalCentavos() {
    return this.getCart().reduce((sum, it) => {
      const p = getProdutoPorId(it.produtoId);
      return sum + (p ? p.preco_centavos * it.qtd : 0);
    }, 0);
  },
  onChange(fn) {
    cartListeners.add(fn);
    return () => cartListeners.delete(fn);
  },
};

// Retirar na casa ou receber em casa. Mora ao lado do carrinho no localStorage
// porque a escolha precisa sobreviver ao desvio pro login (deslogado, o checkout
// manda pra /login e volta com ?cart=open). O client guarda só QUAL dos dois — o
// endereço em si a Edge Function lê do perfil, no banco. Padrão: retirada.
const CART_MODO_KEY = 'casa_cart_modo';
let cartModoMemoria = 'retirada'; // fallback quando o localStorage não existe
function getCartModo() {
  try {
    const v = localStorage.getItem(CART_MODO_KEY);
    if (v === 'entrega' || v === 'retirada') return v;
  } catch {
    /* modo privado: cai na memória da sessão */
  }
  return cartModoMemoria;
}
function setCartModo(modo) {
  const v = modo === 'entrega' ? 'entrega' : 'retirada';
  cartModoMemoria = v;
  try {
    localStorage.setItem(CART_MODO_KEY, v);
  } catch {
    /* modo privado: a escolha vale só enquanto a aba estiver aberta */
  }
}

// --- Header --------------------------------------------------------------------
function renderHeader() {
  const slot = document.getElementById('site-header');
  if (!slot) return;

  const ativo = activeNavHref();

  // Nav editorial (uppercase/letter-spacing vêm do CSS .mainnav a). aria-current
  // marca a página atual; o CSS pinta em dourado.
  // Item semLink vira <span class="nav-off"> em vez de <a>: mesmo tipo, mesmo
  // lugar na fila, só não clica. O CSS estiliza os dois juntos.
  const navItem = (item, extra = '') => {
    const on = item.href === ativo;
    const selo = item.selo ? `<span class="nav-selo">${item.selo}</span>` : '';
    const marca = on ? ' aria-current="page"' : '';
    if (item.semLink) {
      return `<span class="nav-off${item.selo ? ' tem-selo' : ''}"${marca}>${item.rotulo}${selo}</span>`;
    }
    return `<a href="${item.href}"${marca}${item.selo ? ' class="tem-selo"' : ''}${extra}>${item.rotulo}${selo}</a>`;
  };

  const linksDesktop = NAV.map((item) => navItem(item)).join('');
  const linksMobile = NAV.map((item) => navItem(item, ' data-menu-link')).join('');

  slot.innerHTML = `
    <header id="topo" class="site-header" data-site-header>
      <div class="wrap">
        <!-- Marca (logo oficial; o texto acessível vive no aria-label do link) -->
        <a href="/home" class="brand" aria-label="Casa Coffee Colab, início">
          <img src="/logo-casa-coffee-colab.png" alt="" width="365" height="156" class="brand-logo" />
        </a>

        <!-- Nav desktop -->
        <nav class="mainnav" aria-label="Navegação principal">${linksDesktop}</nav>

        <div class="header-right">
          <!-- Auth (desktop), preenchido por updateAuthUI conforme a sessão -->
          <div class="auth-desktop" data-auth-slot></div>

          <!-- Carrinho -->
          <button type="button" class="hdr-icon" aria-label="Abrir carrinho" data-cart-toggle>
            <i data-lucide="shopping-bag"></i>
            <span class="cart-badge hidden" data-cart-count aria-live="polite">0</span>
          </button>

          <!-- CTA -->
          <a href="/o-casa" class="btn-visit">Visite-nos</a>

          <!-- Hambúrguer (mobile) -->
          <button type="button" class="burger" aria-label="Abrir menu"
            aria-expanded="false" aria-controls="menu-mobile" data-menu-toggle>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Menu mobile (dropdown sob o header) -->
      <div id="menu-mobile" class="menu-mobile hidden" data-menu-panel>
        <nav class="menu-inner" aria-label="Navegação mobile">
          ${linksMobile}
          <!-- Auth (mobile), preenchido por updateAuthUI conforme a sessão -->
          <div data-auth-slot-mobile></div>
        </nav>
      </div>
    </header>
  `;

  initHeaderInteractions();
}

function initHeaderInteractions() {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const panel = document.querySelector('[data-menu-panel]');

  // Estado do header conforme a página:
  // - home (tem [data-hero-transparent]): transparente sobre o hero escuro e vira
  //   sólido (.scrolled) ao passar do hero;
  // - páginas internas (sem hero escuro): já entra sólido desde o topo.
  if (header) {
    const heroTransparente = !!document.querySelector('[data-hero-transparent]');
    if (heroTransparente) {
      const aplicar = () => {
        header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.72);
      };
      aplicar();
      window.addEventListener('scroll', aplicar, { passive: true });
    } else {
      header.classList.add('scrolled');
    }
  }

  // Menu hambúrguer (a animação em X vem do CSS via aria-expanded na .burger)
  if (toggle && panel) {
    const fechar = () => {
      panel.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
    };
    const abrir = () => {
      panel.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
    };
    toggle.addEventListener('click', () => {
      const aberto = toggle.getAttribute('aria-expanded') === 'true';
      aberto ? fechar() : abrir();
    });
    // Fecha ao clicar num link ou apertar Esc
    panel.querySelectorAll('[data-menu-link]').forEach((el) =>
      el.addEventListener('click', fechar)
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fechar();
    });
  }
}

// --- Recado da casa (tarja de aviso no topo) -----------------------------------
const AVISOS_LIDOS_KEY = 'casa_avisos_lidos';

function avisosLidos() {
  try {
    const arr = JSON.parse(localStorage.getItem(AVISOS_LIDOS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function marcarAvisoLido(id) {
  try {
    const lidos = avisosLidos().filter((x) => x !== id);
    lidos.push(id);
    // Mantém só os últimos 50 pra não crescer sem fim.
    localStorage.setItem(AVISOS_LIDOS_KEY, JSON.stringify(lidos.slice(-50)));
  } catch {
    /* sem localStorage: ignora */
  }
}

// Só aceita link interno ("/algo") ou http(s) absoluto — nada de javascript: etc.
function linkAvisoSeguro(url) {
  if (typeof url !== 'string' || !url) return null;
  const u = url.trim();
  if (/^\/(?![/\\])/.test(u)) return u; // caminho interno
  if (/^https?:\/\//i.test(u)) return u; // absoluto http(s)
  return null;
}

// Acende a tarja do "recado da casa" no topo (se houver um vigente e ainda não
// fechado). Leitura pública: a RLS só devolve o recado ativo dentro da janela.
// Injeta ANTES do <header> no #site-header, então rola junto com o topo da página.
async function renderAvisoBar() {
  const slot = document.getElementById('site-header');
  if (!slot || !supabase) return;

  let avisos = [];
  try {
    const { data, error } = await supabase
      .from('avisos_casa')
      .select('id, texto, emoji, link_url, link_label')
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) return; // migration 0022 pendente / erro → sem tarja, sem ruído
    avisos = Array.isArray(data) ? data : [];
  } catch {
    return;
  }

  const lidos = avisosLidos();
  const aviso = avisos.find((a) => !lidos.includes(a.id));
  if (!aviso) return;

  const barra = document.createElement('div');
  barra.className = 'aviso-casa';
  barra.setAttribute('role', 'status');

  const emoji = aviso.emoji ? `<span class="aviso-casa-emoji" aria-hidden="true">${escapeHtml(aviso.emoji)}</span>` : '';
  const href = linkAvisoSeguro(aviso.link_url);
  const link = href
    ? `<a class="aviso-casa-link" href="${escapeHtml(href)}">${escapeHtml(aviso.link_label || 'ver mais')} →</a>`
    : '';

  barra.innerHTML = `
    <div class="aviso-casa-in">
      <p class="aviso-casa-txt">${emoji}<span>${escapeHtml(aviso.texto)}</span>${link}</p>
      <button type="button" class="aviso-casa-x" data-aviso-fechar aria-label="fechar este recado">
        <i data-lucide="x"></i>
      </button>
    </div>`;

  slot.insertBefore(barra, slot.firstChild);
  renderIcons();

  barra.querySelector('[data-aviso-fechar]')?.addEventListener('click', () => {
    marcarAvisoLido(aviso.id);
    barra.classList.add('saindo');
    const remover = () => barra.remove();
    // Some com uma transição curta (respeitada pelo CSS em prefers-reduced-motion).
    barra.addEventListener('transitionend', remover, { once: true });
    setTimeout(remover, 400); // fallback caso a transição não dispare
  });
}

// --- Meu cantinho (perfil público do assinante em /gente/{handle}) --------------
const CAFE_METODO_LABEL = { coado: 'coado', prensa: 'na prensa', aeropress: 'aeropress', espresso: 'espresso', moka: 'na moka' };
const CAFE_TORRA_LABEL = { clara: 'torra clara', media: 'torra média', escura: 'torra escura' };
const CAFE_LEITE_LABEL = { puro: 'puro', integral: 'com leite', vegetal: 'com leite vegetal', tanto: 'com ou sem leite' };
const CAFE_HORARIO_LABEL = { manha: 'de manhã', almoco: 'no almoço', tarde: 'à tarde', fim: 'no fim do dia' };

// "coado · torra média · com leite" a partir dos campos do café (o que estiver preenchido).
function cafeFrase(p) {
  const partes = [
    CAFE_METODO_LABEL[p.cafe_metodo],
    CAFE_TORRA_LABEL[p.cafe_torra],
    CAFE_LEITE_LABEL[p.cafe_leite],
    CAFE_HORARIO_LABEL[p.cafe_horario],
  ].filter(Boolean);
  return partes.join(' · ');
}

// "hoje" / "ontem" / "04/08" a partir de um ISO. (Versão de módulo; o mural tem um
// const local homônimo que a sombreia lá dentro — sem conflito.)
function dataCurta(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const umDia = 86_400_000;
  const diff = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / umDia);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// "DD/MM" a partir de uma data. Diferente do `dataCurta` (que é pra datas
// PASSADAS — devolve "hoje"/"ontem"): aqui serve datas FUTURAS (validade do
// brinde) e parseia 'YYYY-MM-DD' na mão, sem o drift de fuso do `new Date`.
function dataDiaMes(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// "desde ago/2026" a partir de um ISO.
function membroDesde(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `desde ${mes}/${d.getFullYear()}`;
}

// Página /gente/{handle}: o cartão público de quem optou. Leitura pública via RPC
// perfil_publico (só campos seguros). Tolerante: sem a migration 0024, cai no vazio.
async function initGentePage() {
  const root = document.querySelector('[data-gente-root]');
  if (!root) return;

  const partes = window.location.pathname.split('/').filter(Boolean);
  const handle = decodeURIComponent(partes[1] || '').trim(); // /gente/{handle}

  const vazio = (titulo, texto) => {
    root.innerHTML = `
      <div class="gente-vazio">
        <span class="gente-vazio-ic" aria-hidden="true">☕</span>
        <h1>${escapeHtml(titulo)}</h1>
        <p>${escapeHtml(texto)}</p>
        <a href="/home" class="btn ghost">voltar pro Casa</a>
      </div>`;
    renderIcons();
  };

  if (!handle) return vazio('cadê o cantinho?', 'esse link tá sem nome. confere se copiou ele inteiro?');
  if (!supabase) return vazio('cantinho fora do ar', 'a gente não conseguiu abrir agora. tenta de novo daqui a pouco? 💛');

  let dados = null;
  try {
    const { data, error } = await supabase.rpc('perfil_publico', { p_handle: handle });
    if (error) return vazio('cantinho fora do ar', 'a gente não conseguiu abrir agora. tenta de novo daqui a pouco? 💛');
    dados = data;
  } catch {
    return vazio('cantinho fora do ar', 'a gente não conseguiu abrir agora. tenta de novo daqui a pouco? 💛');
  }
  if (!dados) return vazio('esse cantinho não existe (ou fechou)', 'talvez a pessoa tenha preferido guardar o dela só pra si. tá tudo bem 💛');

  const nome = escapeHtml(dados.nome || 'alguém do Casa');
  document.title = `${dados.nome || 'Gente'} · Casa Coffee Colab`;
  const iniciais = escapeHtml(iniciaisDoNome(dados.nome || 'Casa'));
  const avatar = dados.avatar_url
    ? `<img class="gente-avatar-img" src="${escapeHtml(dados.avatar_url)}" alt="foto de ${nome}" />`
    : `<span class="gente-avatar-ini">${iniciais}</span>`;
  const tier = dados.tier_nome
    ? `<span class="gente-tier"><i data-lucide="award" class="h-4 w-4"></i>${escapeHtml(dados.tier_nome)}</span>`
    : '';
  const desde = membroDesde(dados.membro_desde);
  const cafe = cafeFrase(dados);
  const recados = Array.isArray(dados.recados) ? dados.recados : [];

  const recadosHtml = recados.length
    ? `<div class="gente-recados">
         <h2 class="gente-sub">recados que deixou na parede</h2>
         <div class="gente-recados-lista">
           ${recados
             .map(
               (r) => `<article class="gente-recado"><p>${escapeHtml(r.texto || '')}</p><span>${dataCurta(r.created_at)}</span></article>`,
             )
             .join('')}
         </div>
       </div>`
    : '';

  root.innerHTML = `
    <article class="gente-card">
      <div class="gente-avatar">${avatar}</div>
      <h1 class="gente-nome">${nome}</h1>
      <div class="gente-meta">
        ${tier}
        ${desde ? `<span class="gente-desde"><i data-lucide="heart" class="h-4 w-4"></i>na casa ${escapeHtml(desde)}</span>` : ''}
      </div>
      ${cafe ? `<p class="gente-cafe"><span>o café de sempre</span>${escapeHtml(cafe)}</p>` : ''}
    </article>
    ${recadosHtml}`;
  renderIcons();
}

// --- A trilha do Casa (playlists do Spotify, curadas no console) ----------------
// Converte um link do Spotify (URL normal, /embed, /intl-xx, ou URI spotify:...)
// no src de embed CANÔNICO. Só devolve open.spotify.com/embed/... — qualquer outra
// coisa vira null e NÃO vira iframe (trava de injeção: o src é sempre nosso domínio).
function spotifyEmbed(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  const tipos = /^(playlist|album|track|artist|show|episode)$/i;
  const uri = s.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/i);
  if (uri) return `https://open.spotify.com/embed/${uri[1].toLowerCase()}/${uri[2]}`;
  try {
    const u = new URL(s);
    if (u.hostname !== 'open.spotify.com') return null;
    const partes = u.pathname.split('/').filter(Boolean).filter((p) => p !== 'embed' && !/^intl-/i.test(p));
    const [tipo, id] = partes;
    if (!tipo || !id || !tipos.test(tipo) || !/^[A-Za-z0-9]+$/.test(id)) return null;
    return `https://open.spotify.com/embed/${tipo.toLowerCase()}/${id}`;
  } catch {
    return null;
  }
}

// Acende a seção "a trilha do Casa" na home com as playlists ativas (a marcada como
// "tocando" vem primeiro, com selo pulsante). Leitura pública; tolerante à migration
// 0023 pendente (sem tabela → seção fica escondida, sem ruído).
async function initTrilha() {
  const sec = document.querySelector('[data-trilha]');
  if (!sec || !supabase) return;
  const grid = sec.querySelector('[data-trilha-grid]');
  if (!grid) return;

  let lista = [];
  try {
    const { data, error } = await supabase
      .from('playlists_casa')
      .select('id, nome, clima, spotify_url, tocando, ordem')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return;
    lista = Array.isArray(data) ? data : [];
  } catch {
    return;
  }

  // Converte + valida os embeds; descarta link que não é do Spotify.
  const cards = lista
    .map((p) => ({ ...p, embed: spotifyEmbed(p.spotify_url) }))
    .filter((p) => p.embed);
  if (!cards.length) return; // nada válido → seção segue escondida

  // A "tocando" primeiro; o resto mantém a ordem.
  cards.sort((a, b) => (b.tocando ? 1 : 0) - (a.tocando ? 1 : 0));

  grid.innerHTML = cards
    .map((p) => {
      const agora = p.tocando
        ? `<span class="trilha-agora"><span class="trilha-eq" aria-hidden="true"><i></i><i></i><i></i></span>tocando agora</span>`
        : '';
      const clima = p.clima ? `<span class="trilha-clima">${escapeHtml(p.clima)}</span>` : '';
      return `
        <article class="trilha-card${p.tocando ? ' tocando' : ''}">
          <div class="trilha-card-topo">
            <div>${clima}<h3 class="trilha-nome">${escapeHtml(p.nome || 'playlist')}</h3></div>
            ${agora}
          </div>
          <iframe class="trilha-embed" src="${escapeHtml(p.embed)}" width="100%" height="152"
                  loading="lazy" frameborder="0" allow="encrypted-media; clipboard-write"
                  title="${escapeHtml(p.nome || 'playlist')} no Spotify"></iframe>
        </article>`;
    })
    .join('');

  sec.hidden = false;
}

// "sáb, 12 de set · 19h" a partir de um ISO. Sem hora certa (:00) mostra só o dia.
// Data nula → "em breve" (encontro sem data marcada ainda).
function dataEvento(iso) {
  if (!iso) return 'em breve';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'em breve';
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const temHora = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (!temHora) return dia;
  const hora =
    d.getMinutes() === 0
      ? `${d.getHours()}h`
      : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

// Link DIRETO pro Google Agenda (template de evento já preenchido) — sem baixar
// arquivo: abre o Google Calendar numa aba nova com nome/quando/onde/descrição
// prontos, a pessoa só confirma. Encontro sem data marcada → null (não dá pra
// agendar o indefinido). Duração assumida de 2h (os eventos não têm hora de fim).
function googleCalUrl(ev) {
  if (!ev?.data) return null;
  const inicio = new Date(ev.data);
  if (Number.isNaN(inicio.getTime())) return null;
  const fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
  // Google quer UTC compacto: YYYYMMDDTHHMMSSZ. O sufixo Z faz o horário cair
  // certo em qualquer fuso de quem clica.
  const carimbo = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ondeBase = MARCA.contato.endereco;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.nome || 'Encontro no Casa Coffee Colab',
    dates: `${carimbo(inicio)}/${carimbo(fim)}`,
    details: ev.descricao || 'Um encontro no Casa Coffee Colab. Passa aqui?',
    location: ev.local ? `${ev.local}, ${ondeBase}` : `Casa Coffee Colab, ${ondeBase}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// --- Agenda do Casa (próximos encontros, com "eu vou") -------------------------
// Lê a agenda pública (RPC agenda_proximos) e monta os cards. Confirmar presença
// é perk de assinante: deslogado/sem-plano vê o convite gentil; assinante alterna
// "eu vou" ↔ "não vou mais". Tolerante: sem a migration 0026, a seção fica escondida.
async function initAgenda() {
  const sec = document.querySelector('[data-agenda]');
  if (!sec || !supabase) return;
  const lista = sec.querySelector('[data-agenda-lista]');
  if (!lista) return;

  let itens = [];
  try {
    const { data, error } = await supabase.rpc('agenda_proximos');
    if (error) return; // migration pendente / erro → seção fica hidden
    itens = Array.isArray(data) ? data : [];
  } catch {
    return;
  }
  if (!itens.length) return; // sem encontros → seção segue escondida

  const { data: sessData } = await supabase.auth.getSession();
  const logado = Boolean(sessData?.session);

  // Um rostinho de quem vai (só de quem ligou o perfil público): avatar ou
  // inicial, linkando pro /gente/{handle}. Tudo escapado.
  const avatarBolha = (pessoa) => {
    const nome = pessoa?.nome || 'alguém do Casa';
    const ini = (nome.trim().charAt(0) || '?').toUpperCase();
    const href = '/gente/' + encodeURIComponent(pessoa?.handle || '');
    const dentro =
      pessoa?.avatar_url && /^https?:\/\//.test(pessoa.avatar_url)
        ? `<img src="${escapeHtml(pessoa.avatar_url)}" alt="" loading="lazy" />`
        : `<span class="ini">${escapeHtml(ini)}</span>`;
    return `<a class="agenda-av" href="${escapeHtml(href)}" title="${escapeHtml(nome)}">${dentro}</a>`;
  };

  const cardHtml = (ev) => {
    const quando = dataEvento(ev.data);
    const local = ev.local ? `<span class="agenda-local">${escapeHtml(ev.local)}</span>` : '';
    const desc = ev.descricao ? `<p class="agenda-desc">${escapeHtml(ev.descricao)}</p>` : '';
    // Lotação: "12 vão" ou "12/20 · faltam 8". Sem vagas definidas → só a contagem.
    const n = Number(ev.confirmados) || 0;
    let lot;
    if (ev.vagas != null) {
      const faltam = Math.max(0, Number(ev.vagas) - n);
      lot = ev.lotado ? `${n}/${ev.vagas} · lotado` : `${n}/${ev.vagas} · ${faltam} ${faltam === 1 ? 'vaga' : 'vagas'}`;
    } else {
      lot = n > 0 ? `${n} ${n === 1 ? 'confirmado' : 'confirmados'}` : 'seja o primeiro';
    }
    // Quem vai (rostinhos públicos). Mostra até 6; o "+N" cobre o resto (públicos
    // além do limite + quem confirmou sem perfil público).
    const vao = Array.isArray(ev.vao_publicos) ? ev.vao_publicos : [];
    const mostrados = vao.slice(0, 6);
    const extra = Math.max(0, n - mostrados.length);
    // Guarda no calendário: link direto pro Google Agenda (só com data marcada).
    const cal = googleCalUrl(ev);
    const guardar = cal
      ? `<a class="agenda-cal" href="${escapeHtml(cal)}" target="_blank" rel="noopener noreferrer">
           <i data-lucide="calendar-plus" aria-hidden="true"></i><span>guarda no teu calendário</span>
         </a>`
      : '';
    const quemVai = mostrados.length
      ? `<div class="agenda-vao">
           <div class="agenda-avatares">
             ${mostrados.map(avatarBolha).join('')}
             ${extra > 0 ? `<span class="agenda-av mais">+${extra}</span>` : ''}
           </div>
           <span class="agenda-vao-txt">${escapeHtml(mostrados[0].nome || 'gente do Casa')}${mostrados.length > 1 || extra > 0 ? ' e mais gente vão' : ' vai'}</span>
         </div>`
      : '';
    return `
      <article class="agenda-card${ev.eu_vou ? ' vou' : ''}" data-ev="${escapeHtml(ev.id)}">
        <div class="agenda-quando"><i data-lucide="calendar-days" aria-hidden="true"></i><span>${escapeHtml(quando)}</span></div>
        <div class="agenda-corpo">
          <h3 class="agenda-nome">${escapeHtml(ev.nome || 'encontro')}</h3>
          ${local}
          ${desc}
        </div>
        ${quemVai}
        <div class="agenda-rodape">
          <span class="agenda-lot" data-ev-lot>${escapeHtml(lot)}</span>
          <button type="button" class="btn ${ev.eu_vou ? 'ghost' : 'solid'} sm agenda-btn" data-ev-btn>
            ${ev.eu_vou ? 'eu vou 💛' : 'eu vou'}
          </button>
        </div>
        ${guardar}
        <p class="agenda-msg hidden text-sm" data-ev-msg aria-live="polite"></p>
      </article>`;
  };

  lista.innerHTML = itens.map(cardHtml).join('');
  sec.hidden = false;
  renderIcons();

  // Estado local por evento (pra alternar sem recarregar a página).
  const estado = new Map(itens.map((ev) => [String(ev.id), { eu_vou: ev.eu_vou, lotado: ev.lotado }]));

  lista.querySelectorAll('[data-ev]').forEach((card) => {
    const id = card.dataset.ev;
    const btn = card.querySelector('[data-ev-btn]');
    const lotEl = card.querySelector('[data-ev-lot]');
    const msgEl = card.querySelector('[data-ev-msg]');
    const vagas = itens.find((e) => String(e.id) === String(id))?.vagas ?? null;

    const dizer = (txt, tom = 'erro') => {
      if (!msgEl) return;
      msgEl.textContent = txt;
      msgEl.className = 'agenda-msg text-sm ' + (tom === 'ok' ? 'text-olive' : 'text-coral');
      msgEl.hidden = !txt;
    };
    const pintarLot = (n) => {
      if (!lotEl) return;
      if (vagas != null) {
        const faltam = Math.max(0, Number(vagas) - n);
        lotEl.textContent = faltam === 0 ? `${n}/${vagas} · lotado` : `${n}/${vagas} · ${faltam} ${faltam === 1 ? 'vaga' : 'vagas'}`;
      } else {
        lotEl.textContent = n > 0 ? `${n} ${n === 1 ? 'confirmado' : 'confirmados'}` : 'seja o primeiro';
      }
    };
    const pintarBtn = (vou) => {
      card.classList.toggle('vou', vou);
      btn.classList.toggle('ghost', vou);
      btn.classList.toggle('solid', !vou);
      btn.textContent = vou ? 'eu vou 💛' : 'eu vou';
    };

    btn?.addEventListener('click', async () => {
      dizer('');
      // Deslogado → manda pro login e volta pra home.
      if (!logado) {
        window.location.href = '/login?redirect=' + encodeURIComponent('/home');
        return;
      }
      const st = estado.get(String(id)) || { eu_vou: false };
      btn.disabled = true;
      try {
        const rpcNome = st.eu_vou ? 'cancelar_presenca' : 'confirmar_presenca';
        const { data: r, error } = await supabase.rpc(rpcNome, { p_event_id: id });
        if (error || !r?.ok) {
          dizer(r?.erro || 'não deu pra confirmar agora. tenta de novo? 💛');
          if (r?.lotado) pintarLot(Number(r?.confirmados) || (vagas ?? 0));
          return;
        }
        st.eu_vou = Boolean(r.eu_vou);
        estado.set(String(id), st);
        pintarBtn(st.eu_vou);
        pintarLot(Number(r.confirmados) || 0);
        if (st.eu_vou) dizer('teu lugar tá guardado 💛', 'ok');
        else dizer('');
      } catch {
        dizer('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// --- Cardápio: teus favoritos --------------------------------------------------
// O /cardapio é HTML curado (não vem do banco), então o item é identificado por
// um slug estável derivado do NOME (slugify). Favoritar é aberto a qualquer pessoa
// logada; a escrita é direta na `cardapio_favoritos` via RLS (dado benigno, sempre
// travado em auth.uid()). Tolerante: sem sessão ou sem a migration 0027, nada aparece.
function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function initCardapioFavoritos() {
  const secBlock = document.querySelector('[data-cardapio-favoritos]');
  const items = Array.from(document.querySelectorAll('.menu-item'));
  if (!secBlock || !items.length || !supabase) return;

  const { data: sessData } = await supabase.auth.getSession();
  if (!sessData?.session) return; // corações só pra quem está logado

  // Mapeia slug → { el, nome } (o slug estável vem do nome curado no HTML).
  const porSlug = new Map();
  for (const li of items) {
    const nome = li.querySelector('.mi-name')?.textContent.trim() || '';
    const slug = slugify(nome);
    if (!nome || !slug || porSlug.has(slug)) continue;
    porSlug.set(slug, { el: li, nome });
    li.dataset.item = slug;
  }
  if (!porSlug.size) return;

  const favs = new Set();
  try {
    const { data, error } = await supabase.from('cardapio_favoritos').select('item_slug');
    if (error) return; // migration pendente → sem corações
    (data || []).forEach((r) => favs.add(r.item_slug));
  } catch {
    return;
  }

  const chipsEl = secBlock.querySelector('[data-cf-chips]');

  const pintarBloco = () => {
    const marcados = [...porSlug.entries()].filter(([slug]) => favs.has(slug));
    if (!marcados.length) {
      secBlock.hidden = true;
      return;
    }
    chipsEl.innerHTML = marcados
      .map(([slug, { nome }]) => `<button type="button" class="cf-chip" data-cf-goto="${escapeHtml(slug)}">${escapeHtml(nome)}</button>`)
      .join('');
    secBlock.hidden = false;
    chipsEl.querySelectorAll('[data-cf-goto]').forEach((b) => {
      b.addEventListener('click', () => {
        const alvo = porSlug.get(b.dataset.cfGoto)?.el;
        if (!alvo) return;
        alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        alvo.classList.add('mi-flash');
        setTimeout(() => alvo.classList.remove('mi-flash'), 1200);
      });
    });
  };

  const pintarCoracao = (btn, on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-label', on ? 'tirar dos favoritos' : 'adicionar aos favoritos');
  };

  for (const [slug, { el, nome }] of porSlug) {
    el.classList.add('has-fav');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mi-fav';
    btn.dataset.fav = slug;
    btn.innerHTML = '<i data-lucide="heart"></i>';
    pintarCoracao(btn, favs.has(slug));
    el.appendChild(btn);

    btn.addEventListener('click', async () => {
      const on = favs.has(slug);
      btn.disabled = true;
      // Otimista: pinta já e reflete no bloco.
      if (on) favs.delete(slug);
      else favs.add(slug);
      pintarCoracao(btn, !on);
      pintarBloco();
      try {
        if (on) {
          const { error } = await supabase.from('cardapio_favoritos').delete().eq('item_slug', slug);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('cardapio_favoritos').insert({ item_slug: slug, item_nome: nome });
          if (error && error.code !== '23505') throw error; // 23505 = já era favorito, ok
        }
      } catch {
        // Desfaz o otimista se o servidor recusou.
        if (on) favs.add(slug);
        else favs.delete(slug);
        pintarCoracao(btn, on);
        pintarBloco();
      } finally {
        btn.disabled = false;
      }
    });
  }

  pintarBloco();
  renderIcons();
}

// --- Ficou pra depois (lista de desejos da loja) -------------------------------
// Um coração em cada produto que SALVA pra depois sem botar no carrinho, com uma
// tirinha "ficou pra depois" no topo da /loja e um espelho no /conta/perfil.
// Espelha o padrão do cardapio_favoritos (0027): dado benigno, escrita RLS-direct
// travada em auth.uid(). Só pra quem está logado; tolerante sem a migration 0029.
async function initLojaDesejos() {
  if (!supabase) return;
  const grid = document.querySelector('[data-catalog-grid]');
  const btnProduto = document.querySelector('[data-desejo-produto]');
  const tirinhas = Array.from(document.querySelectorAll('[data-loja-desejos], [data-desejos-perfil]'));
  if (!grid && !btnProduto && !tirinhas.length) return;

  const { data: sessData } = await supabase.auth.getSession();
  if (!sessData?.session) return; // guardar pra depois só pra quem está logado

  // Set de slugs guardados + nome de cada um (preferindo o mock atual; cai no
  // snapshot do banco se o produto saiu da vitrine).
  const desejos = new Set();
  const nomePorSlug = new Map();
  try {
    const { data, error } = await supabase.from('loja_desejos').select('produto_slug, produto_nome');
    if (error) return; // migration pendente → some tudo, sem ruído
    (data || []).forEach((r) => {
      desejos.add(r.produto_slug);
      nomePorSlug.set(r.produto_slug, r.produto_nome);
    });
  } catch {
    return;
  }

  const nomeDe = (slug) => getProdutoPorSlug(slug)?.nome || nomePorSlug.get(slug) || slug;

  // Todos os corações de um mesmo slug (card + página de produto) andam juntos.
  const botoesPorSlug = new Map();
  const registrar = (slug, btn) => {
    if (!botoesPorSlug.has(slug)) botoesPorSlug.set(slug, new Set());
    botoesPorSlug.get(slug).add(btn);
  };

  const pintarBtn = (btn, on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    if (btn.classList.contains('prod-guardar')) {
      const txt = btn.querySelector('span');
      if (txt) txt.textContent = on ? 'guardado 💛' : 'guardar pra depois';
      btn.setAttribute('aria-label', on ? 'tirar da lista de desejos' : 'guardar pra depois');
    } else {
      btn.setAttribute('aria-label', on ? 'tirar da lista de desejos' : 'guardar pra depois');
    }
  };
  const repintarSlug = (slug) => {
    const on = desejos.has(slug);
    (botoesPorSlug.get(slug) || []).forEach((b) => pintarBtn(b, on));
  };

  // Tirinha "ficou pra depois" (loja + perfil): chips linkando pro produto, com ×.
  const pintarTirinhas = () => {
    if (!tirinhas.length) return;
    const slugs = [...desejos];
    for (const sec of tirinhas) {
      const chipsEl = sec.querySelector('[data-ld-chips]');
      if (!chipsEl) continue;
      if (!slugs.length) {
        sec.hidden = true;
        chipsEl.innerHTML = '';
        continue;
      }
      chipsEl.innerHTML = slugs
        .map((slug) => {
          const nome = nomeDe(slug);
          return `<span class="ld-chip">
            <a href="/produto?slug=${encodeURIComponent(slug)}">${escapeHtml(nome)}</a>
            <button type="button" class="ld-chip-x" data-ld-remove="${escapeHtml(slug)}" aria-label="tirar ${escapeHtml(nome)} da lista">
              <i data-lucide="x"></i>
            </button>
          </span>`;
        })
        .join('');
      sec.hidden = false;
    }
    renderIcons();
  };

  // Toggle otimista, compartilhado por corações e ×: pinta já, reflete em toda
  // parte, persiste e desfaz se o servidor recusar.
  const alternar = async (slug) => {
    const estava = desejos.has(slug);
    if (estava) desejos.delete(slug);
    else desejos.add(slug);
    repintarSlug(slug);
    pintarTirinhas();
    try {
      if (estava) {
        const { error } = await supabase.from('loja_desejos').delete().eq('produto_slug', slug);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('loja_desejos').insert({ produto_slug: slug, produto_nome: nomeDe(slug) });
        if (error && error.code !== '23505') throw error; // 23505 = já guardado, ok
      }
    } catch {
      // desfaz o otimista
      if (estava) desejos.add(slug);
      else desejos.delete(slug);
      repintarSlug(slug);
      pintarTirinhas();
    }
  };

  // Corações nos cards do catálogo (injetados por JS, como no cardápio).
  if (grid) {
    grid.querySelectorAll('[data-produto][data-slug]').forEach((card) => {
      const slug = card.dataset.slug;
      if (!slug) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prod-fav';
      btn.dataset.desejo = slug;
      btn.innerHTML = '<i data-lucide="heart"></i>';
      pintarBtn(btn, desejos.has(slug));
      card.appendChild(btn);
      registrar(slug, btn);
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        await alternar(slug);
        btn.disabled = false;
      });
    });
  }

  // Botão "guardar pra depois" na página de produto (revela e liga).
  if (btnProduto) {
    const slug = btnProduto.dataset.desejoProduto;
    btnProduto.hidden = false;
    pintarBtn(btnProduto, desejos.has(slug));
    registrar(slug, btnProduto);
    btnProduto.addEventListener('click', async () => {
      btnProduto.disabled = true;
      await alternar(slug);
      btnProduto.disabled = false;
    });
  }

  // × das tirinhas (delegação por container, sobrevive ao re-render).
  for (const sec of tirinhas) {
    const chipsEl = sec.querySelector('[data-ld-chips]');
    chipsEl?.addEventListener('click', (e) => {
      const x = e.target.closest('[data-ld-remove]');
      if (!x) return;
      alternar(x.dataset.ldRemove);
    });
  }

  pintarTirinhas();
  renderIcons();
}

// --- Volta pra vitrine (avisa quando o produto esgotado voltar) ----------------
// Nos produtos esgotados (disponivel:false no mock), o botão "me avisa quando
// voltar" registra interesse; quando a casa repõe (flip pra disponível), a tirinha
// "voltou pra vitrine" aparece na volta da pessoa (/loja e /conta/perfil). Escrita
// RLS-direct travada em auth.uid() (migration 0030). Deslogado → login; tolerante.
async function initReposicao() {
  if (!supabase) return;
  const avisarBtns = Array.from(document.querySelectorAll('[data-avisar]'));
  const tirinhas = Array.from(document.querySelectorAll('[data-reposicao], [data-reposicao-perfil]'));
  if (!avisarBtns.length && !tirinhas.length) return;

  const irProLogin = () => {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${destino}`;
  };

  const { data: sessData } = await supabase.auth.getSession();
  if (!sessData?.session) {
    // Deslogado: o botão existe (produto esgotado), mas leva pro login. As
    // tirinhas "voltou" dependem dos avisos do usuário, então nem aparecem.
    avisarBtns.forEach((btn) => btn.addEventListener('click', irProLogin));
    return;
  }

  const avisos = new Set();
  const nomePorSlug = new Map();
  try {
    const { data, error } = await supabase.from('avisos_reposicao').select('produto_slug, produto_nome');
    if (error) {
      // migration 0030 pendente: sem onde registrar. Deixa o botão gentilmente inerte.
      avisarBtns.forEach((btn) => {
        btn.disabled = true;
        const txt = btn.querySelector('span');
        if (txt) txt.textContent = 'aviso em breve';
      });
      return;
    }
    (data || []).forEach((r) => {
      avisos.add(r.produto_slug);
      nomePorSlug.set(r.produto_slug, r.produto_nome);
    });
  } catch {
    return;
  }

  const nomeDe = (slug) => getProdutoPorSlug(slug)?.nome || nomePorSlug.get(slug) || slug;

  // Todos os botões "me avisa" de um mesmo slug (card + página de produto) juntos.
  const botoesPorSlug = new Map();
  const pintarBtn = (btn, on) => {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    const txt = btn.querySelector('span');
    if (txt) txt.textContent = on ? 'a gente te avisa 💛' : 'me avisa quando voltar';
    btn.setAttribute('aria-label', on ? 'cancelar o aviso de reposição' : 'me avisa quando voltar');
  };
  const repintar = (slug) => {
    const on = avisos.has(slug);
    (botoesPorSlug.get(slug) || []).forEach((b) => pintarBtn(b, on));
  };

  // Tirinha "voltou pra vitrine": avisos cujo produto está disponível AGORA.
  const pintarTirinhas = () => {
    if (!tirinhas.length) return;
    const voltaram = [...avisos].filter((slug) => {
      const prod = getProdutoPorSlug(slug);
      return prod && prod.disponivel !== false;
    });
    for (const sec of tirinhas) {
      const chipsEl = sec.querySelector('[data-rep-chips]');
      if (!chipsEl) continue;
      if (!voltaram.length) {
        sec.hidden = true;
        chipsEl.innerHTML = '';
        continue;
      }
      chipsEl.innerHTML = voltaram
        .map((slug) => {
          const nome = nomeDe(slug);
          return `<span class="rep-chip">
            <a href="/produto?slug=${encodeURIComponent(slug)}">${escapeHtml(nome)}</a>
            <span class="rep-tag">voltou 💛</span>
            <button type="button" class="rep-chip-x" data-rep-visto="${escapeHtml(slug)}" aria-label="ok, já vi ${escapeHtml(nome)}">
              <i data-lucide="x"></i>
            </button>
          </span>`;
        })
        .join('');
      sec.hidden = false;
    }
    renderIcons();
  };

  // Toggle otimista do "me avisa" (registra/cancela interesse).
  const alternar = async (slug) => {
    const estava = avisos.has(slug);
    if (estava) avisos.delete(slug);
    else avisos.add(slug);
    repintar(slug);
    pintarTirinhas();
    try {
      if (estava) {
        const { error } = await supabase.from('avisos_reposicao').delete().eq('produto_slug', slug);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('avisos_reposicao').insert({ produto_slug: slug, produto_nome: nomeDe(slug) });
        if (error && error.code !== '23505') throw error; // 23505 = já pediu, ok
      }
    } catch {
      if (estava) avisos.add(slug);
      else avisos.delete(slug);
      repintar(slug);
      pintarTirinhas();
    }
  };

  // "já vi" na tirinha: o produto voltou, apaga o aviso.
  const dispensar = async (slug) => {
    if (!avisos.has(slug)) return;
    avisos.delete(slug);
    pintarTirinhas();
    try {
      const { error } = await supabase.from('avisos_reposicao').delete().eq('produto_slug', slug);
      if (error) throw error;
    } catch {
      avisos.add(slug);
      pintarTirinhas();
    }
  };

  avisarBtns.forEach((btn) => {
    const slug = btn.dataset.avisar;
    if (!slug) return;
    if (!botoesPorSlug.has(slug)) botoesPorSlug.set(slug, new Set());
    botoesPorSlug.get(slug).add(btn);
    pintarBtn(btn, avisos.has(slug));
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      await alternar(slug);
      btn.disabled = false;
    });
  });

  for (const sec of tirinhas) {
    const chipsEl = sec.querySelector('[data-rep-chips]');
    chipsEl?.addEventListener('click', (e) => {
      const x = e.target.closest('[data-rep-visto]');
      if (!x) return;
      dispensar(x.dataset.repVisto);
    });
  }

  pintarTirinhas();
  renderIcons();
}

// --- Footer --------------------------------------------------------------------
function renderFooter() {
  const slot = document.getElementById('site-footer');
  if (!slot) return;

  const { contato, redes } = MARCA;

  // Mesmo critério do header: item semLink não vira link aqui também, senão o
  // rodapé abriria a porta que o menu de cima fechou.
  const linksNav = NAV.map((item) => {
    const selo = item.selo ? `<span class="nav-selo">${item.selo}</span>` : '';
    return item.semLink
      ? `<span class="nav-off">${item.rotulo}${selo}</span>`
      : `<a href="${item.href}">${item.rotulo}</a>`;
  }).join('');

  const linksRedes = redes
    .map((r) => `<a href="${r.href}" aria-label="${r.nome}">${r.nome}</a>`)
    .join('');

  slot.innerHTML = `
    <footer class="foot">
      <div class="wrap">
        <!-- Marca + bio -->
        <div>
          <a href="/home" class="brand" aria-label="Casa Coffee Colab, início">
            <img src="/logo-casa-coffee-colab.png" alt="" width="365" height="156" class="brand-logo" />
          </a>
          <p class="decor">${MARCA.bio}</p>
        </div>

        <!-- Navegação -->
        <div>
          <p class="ft-label">Navegar</p>
          <nav aria-label="Rodapé, navegação">${linksNav}</nav>
        </div>

        <!-- A casa -->
        <div>
          <p class="ft-label">A casa</p>
          <address>
            <p>${contato.endereco}</p>
            <a href="mailto:${contato.email}">${contato.email}</a>
            <a
              href="https://wa.me/${contato.whatsappNumero}?text=${encodeURIComponent(contato.whatsappMensagem)}"
              target="_blank"
              rel="noopener"
              >${contato.telefone}</a
            >
            <p>${contato.horario}</p>
          </address>
        </div>

        <!-- Redes -->
        <div>
          <p class="ft-label">Redes</p>
          <nav aria-label="Rodapé, redes sociais">${linksRedes}</nav>
        </div>
      </div>

      <div class="bottom">
        <div class="wrap">
          <p>© ${new Date().getFullYear()} Casa Coffee Colab · Novo Hamburgo/RS</p>
          <p>Feito com afeto ☕</p>
        </div>
      </div>
    </footer>
  `;
}

// --- Tab bar (mobile) ----------------------------------------------------------
// Barra fixa inferior que só aparece sob 820px (CSS .tabbar). Injetada uma vez no
// <body>; espelha os principais destinos e marca o ativo com aria-current.
function renderTabbar() {
  if (document.querySelector('[data-tabbar]')) return; // injeta uma vez só

  const ativo = activeNavHref();
  const HOME = '/home';
  const on = (href) => (href === ativo ? ' aria-current="page"' : '');

  // Mesmo critério do header, do menu mobile e do rodapé: item com semLink na NAV
  // (hoje a Loja) vira texto morto aqui também, com o carimbo "em breve". Senão a
  // tab bar — que é A navegação no celular — abriria a porta que os outros fecharam.
  // O rótulo vem à parte porque aqui a nav usa nome curto ("Clube" pra /planos).
  const tab = (href, icone, rotulo) => {
    const item = NAV.find((n) => n.href === href) || {};
    const corpo = `<i data-lucide="${icone}"></i><span>${rotulo}</span>`;
    if (!item.semLink) return `<a href="${href}"${on(href)}>${corpo}</a>`;
    const selo = item.selo ? `<span class="nav-selo">${item.selo}</span>` : '';
    return `<span class="tab-off">${corpo}${selo}</span>`;
  };

  const el = document.createElement('nav');
  el.className = 'tabbar';
  el.setAttribute('data-tabbar', '');
  el.setAttribute('aria-label', 'Navegação rápida');
  el.innerHTML = `
    ${tab('/cardapio', 'utensils', 'Cardápio')}
    ${tab('/loja', 'shopping-bag', 'Loja')}
    <a href="${HOME}" class="center" aria-label="Início"${on(HOME)}>C</a>
    ${tab('/planos', 'sparkles', 'Clube')}
    ${tab('/colab', 'users', 'Colab')}
  `;
  document.body.appendChild(el);
}

// --- Carrossel do hero (foto ou vídeo) -----------------------------------------
// Contrato de DOM: [data-hero-carousel] › [data-hero-media] › N [data-hero-slide].
// Cada slide carrega uma <img>, um <video> (com data-video) ou o gradiente. O
// avanço é por tempo (data-duracao, padrão 6s) pra foto e pelo fim do arquivo
// pra vídeo. [data-hero-skip] pula pro próximo e [data-hero-prev] volta pro
// anterior — os dois dão a volta nas pontas e reiniciam a contagem do slide.
function setupHeroCarousel() {
  const hero = document.querySelector('[data-hero-carousel]');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
  const skip = hero.querySelector('[data-hero-skip]');
  const prev = hero.querySelector('[data-hero-prev]');
  if (!slides.length) return;

  // Um slide só não é carrossel: nada pra pular nem pra voltar, nada pra agendar.
  if (slides.length < 2) {
    slides[0].classList.add('is-on');
    if (skip) skip.hidden = true;
    if (prev) prev.hidden = true;
    return;
  }

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = Math.max(0, slides.findIndex((s) => s.classList.contains('is-on')));
  let timer = null;

  const videoDe = (slide) => slide.querySelector('video');

  const mostrar = (i) => {
    const anterior = slides[atual];
    atual = (i + slides.length) % slides.length;

    if (anterior && anterior !== slides[atual]) {
      anterior.classList.remove('is-on');
      const v = videoDe(anterior);
      if (v) v.pause();
    }
    slides[atual].classList.add('is-on');
    agendar();
  };

  const agendar = () => {
    clearTimeout(timer);
    if (semMovimento) return; // sem autoplay: só o botão avança

    const slide = slides[atual];
    const video = videoDe(slide);
    if (video) {
      // O vídeo manda no tempo dele. Se o navegador barrar o autoplay (acontece
      // sem interação prévia), cai no tempo de foto pra não travar o carrossel.
      video.currentTime = 0;
      const tocando = video.play();
      if (tocando && typeof tocando.catch === 'function') {
        tocando.catch(() => {
          timer = setTimeout(() => mostrar(atual + 1), 6000);
        });
      }
      return;
    }
    const espera = Number(slide.getAttribute('data-duracao')) || 6000;
    timer = setTimeout(() => mostrar(atual + 1), espera);
  };

  slides.forEach((slide) => {
    const v = videoDe(slide);
    if (v) {
      v.muted = true; // sem áudio: é fundo, não filme
      v.playsInline = true;
      v.addEventListener('ended', () => mostrar(atual + 1));
    }
  });

  if (skip) skip.addEventListener('click', () => mostrar(atual + 1));
  if (prev) prev.addEventListener('click', () => mostrar(atual - 1));

  // Aba escondida não gasta bateria tocando vídeo pra ninguém.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(timer);
      const v = videoDe(slides[atual]);
      if (v) v.pause();
    } else {
      agendar();
    }
  });

  slides[atual].classList.add('is-on');
  agendar();
}

// --- Reveal on scroll ----------------------------------------------------------
// Revela elementos .reveal ao entrarem na viewport (adiciona .in). Respeita
// prefers-reduced-motion (o CSS já deixa tudo visível nesse caso).
function initReveal() {
  const alvos = document.querySelectorAll('.reveal');
  if (!alvos.length) return;

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (semMovimento || !('IntersectionObserver' in window)) {
    alvos.forEach((el) => el.classList.add('in'));
    return;
  }

  // O que já está na tela quando a página abre aparece NA HORA e sem animação
  // (.ja-visivel zera a transição). Só quem vem de baixo ganha o fade ao rolar —
  // animar o que a pessoa já está olhando é atraso, não charme.
  const altura = window.innerHeight || document.documentElement.clientHeight;
  const pendentes = [];
  alvos.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < altura && r.bottom > 0) el.classList.add('in', 'ja-visivel');
    else pendentes.push(el);
  });
  if (!pendentes.length) return;

  // threshold 0: basta encostar na viewport. Um bloco alto (o grid da loja tem
  // várias linhas de produto) nunca chega a mostrar uma fração grande de si
  // mesmo, então qualquer threshold acima de zero o deixaria invisível.
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: '0px 0px -40px 0px' }
  );
  pendentes.forEach((el) => obs.observe(el));
}

// =============================================================================
// VOLTAR AO TOPO, botão flutuante no canto inferior direito (qualquer página).
// Injetado uma vez no <body>. Aparece depois que a pessoa rola um tanto e some
// perto do topo. Clicar sobe suave (ou na hora, se prefers-reduced-motion).
// =============================================================================
function setupVoltarAoTopo() {
  if (document.querySelector('[data-voltar-topo]')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'voltar-topo';
  btn.setAttribute('data-voltar-topo', '');
  btn.setAttribute('aria-label', 'voltar ao topo');
  btn.innerHTML = '<i data-lucide="arrow-up"></i>';
  document.body.appendChild(btn);

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: semMovimento ? 'auto' : 'smooth' });
  });

  // Mostra depois de rolar ~400px. rAF pra não recalcular a cada tick do scroll.
  let travado = false;
  const atualizar = () => {
    travado = false;
    btn.classList.toggle('is-on', window.scrollY > 400);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (travado) return;
      travado = true;
      window.requestAnimationFrame(atualizar);
    },
    { passive: true }
  );
  atualizar();
}

// =============================================================================
// DRAWER DO CARRINHO, painel lateral reutilizável (qualquer página).
// Injetado uma vez no <body>. Fecha por X, Esc e clique no backdrop.
// Anima com transições CSS (zeradas por prefers-reduced-motion no styles.css).
// =============================================================================
function renderDrawer() {
  if (document.querySelector('[data-drawer-root]')) return; // injeta uma vez só
  const el = document.createElement('div');
  el.innerHTML = `
    <div data-drawer-root class="fixed inset-0 z-[60] hidden" aria-hidden="true">
      <div data-drawer-backdrop class="absolute inset-0 bg-preto/50 opacity-0 transition-opacity duration-300"></div>
      <aside
        data-drawer-panel
        role="dialog"
        aria-modal="true"
        aria-label="Teu carrinho"
        class="absolute right-0 top-0 flex h-full w-full max-w-sm translate-x-full flex-col shadow-2xl transition-transform duration-300"
        style="background:var(--paper)"
      >
        <header class="flex items-center justify-between border-b border-line px-5 py-4">
          <p class="title sm">Teu carrinho</p>
          <button type="button" data-drawer-close aria-label="Fechar carrinho" class="rounded-full p-1.5 text-ink hover:bg-ink/10">
            <i data-lucide="x" class="h-5 w-5"></i>
          </button>
        </header>
        <div data-cart-items class="flex-1 overflow-y-auto px-5"></div>
        <footer data-cart-footer class="hidden border-t border-line px-5 py-4">
          <div data-modo-grupo role="group" aria-label="Como tu prefere receber" class="mb-4">
            <p class="text-xs text-muted">como tu prefere receber?</p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button type="button" class="filtro" data-modo="retirada" aria-pressed="true">retirar na casa</button>
              <button type="button" class="filtro" data-modo="entrega" aria-pressed="false">receber em casa</button>
            </div>
            <p class="mt-2 hidden text-xs text-muted" data-modo-nota></p>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">subtotal</span>
            <span class="title sm" data-cart-subtotal>R$ 0,00</span>
          </div>
          <p class="mt-2 hidden text-center text-xs" style="color:var(--green)" data-cart-discount></p>
          <button type="button" data-checkout class="btn solid block mt-4">finalizar compra</button>
          <p class="mt-3 hidden text-center text-xs text-coral" data-checkout-note aria-live="polite"></p>
        </footer>
      </aside>
    </div>
  `;
  document.body.appendChild(el.firstElementChild);
}

// Redesenha badge + conteúdo do drawer a partir do estado do Cart.
function updateCartUI() {
  const count = Cart.getCount();

  // Badge
  const badge = document.querySelector('[data-cart-count]');
  if (badge) {
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  }

  const wrap = document.querySelector('[data-cart-items]');
  const footer = document.querySelector('[data-cart-footer]');
  if (!wrap || !footer) return;

  const items = Cart.getCart();
  // Empty-check pela MESMA regra do subtotal/badge/checkout (getCount ignora
  // produto sumido do catálogo) — senão um carrinho só de itens-fantasma escapa
  // do estado vazio e mostra rodapé "R$ 0,00" + "finalizar compra" que não faz nada.
  if (Cart.getCount() === 0) {
    wrap.innerHTML = `
      <div class="empty">
        <p class="e-title">teu carrinho tá vazio</p>
        <p class="mx-auto max-w-[16rem]">passa na loja e leva junto o que te agradar, no teu ritmo.</p>
        <a href="/loja" class="btn solid">ver a loja</a>
      </div>`;
    footer.classList.add('hidden');
    renderIcons();
    return;
  }

  wrap.innerHTML = items
    .map((it) => {
      const p = getProdutoPorId(it.produtoId);
      if (!p) return '';
      return `
      <div class="flex gap-3 border-b border-line py-4" data-cart-row data-key="${it.key}">
        <div class="ph ${p.imagemPlaceholder} h-16 w-16 shrink-0" style="border-radius:8px"></div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-ink">${escapeHtml(p.nome)}</p>
          ${it.variante ? `<p class="text-xs text-muted">${escapeHtml(it.variante)}</p>` : ''}
          <div class="mt-2 flex items-center justify-between gap-2">
            <div class="inline-flex items-center rounded-full border border-line">
              <button type="button" data-cart-dec aria-label="Diminuir quantidade" class="grid h-7 w-7 place-items-center text-ink hover:text-coral">
                <i data-lucide="minus" class="h-4 w-4"></i>
              </button>
              <span class="w-7 text-center text-sm" data-cart-qty>${it.qtd}</span>
              <button type="button" data-cart-inc aria-label="Aumentar quantidade" class="grid h-7 w-7 place-items-center text-ink hover:text-coral">
                <i data-lucide="plus" class="h-4 w-4"></i>
              </button>
            </div>
            <span class="text-sm font-medium text-ink">${formatBRL(p.preco_centavos * it.qtd)}</span>
          </div>
        </div>
        <button type="button" data-cart-remove aria-label="Remover do carrinho" class="self-start p-1 text-muted hover:text-coral">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </div>`;
    })
    .join('');

  const subtotalEl = footer.querySelector('[data-cart-subtotal]');
  if (subtotalEl) subtotalEl.textContent = formatBRL(Cart.getSubtotalCentavos());

  // Aviso do desconto do tier (informativo, o valor real entra no checkout).
  const descEl = footer.querySelector('[data-cart-discount]');
  if (descEl) {
    if (cartDiscountPct > 0) {
      descEl.textContent = `teu desconto de ${cartDiscountPct}% já entra no checkout 💛`;
      descEl.classList.remove('hidden');
    } else {
      descEl.classList.add('hidden');
    }
  }

  updateModoUI(footer);

  footer.classList.remove('hidden');
  renderIcons();
}

// Sincroniza os dois botões de "como tu prefere receber" com a escolha guardada,
// e escreve embaixo o que ela significa: o endereço da casa, o teu endereço, ou
// um convite gentil pra completar o perfil (o mesmo que a Edge Function exige).
function updateModoUI(footer) {
  const grupo = footer.querySelector('[data-modo-grupo]');
  if (!grupo) return;
  const modo = getCartModo();
  grupo.querySelectorAll('[data-modo]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === modo));
  });

  const nota = grupo.querySelector('[data-modo-nota]');
  if (!nota) return;
  if (modo === 'retirada') {
    nota.textContent = `a gente te espera na ${MARCA.contato.endereco}.`;
    nota.classList.remove('hidden');
    return;
  }
  if (!cartEndereco) {
    // Sem perfil carregado ainda (ou deslogado): não promete nem assusta.
    nota.textContent = 'a gente leva até o endereço da tua conta.';
    nota.classList.remove('hidden');
    return;
  }
  if (cartEndereco.completo) {
    nota.textContent = `vamos levar até ${cartEndereco.resumo}.`;
  } else {
    nota.innerHTML =
      'pra levar até tua casa, falta teu endereço, <a href="/conta/perfil" class="underline">completa lá na tua conta</a>? 💛';
  }
  nota.classList.remove('hidden');
}

function openDrawer() {
  const root = document.querySelector('[data-drawer-root]');
  if (!root) return;
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');
  requestAnimationFrame(() => {
    root.querySelector('[data-drawer-backdrop]')?.classList.add('opacity-100');
    root.querySelector('[data-drawer-panel]')?.classList.remove('translate-x-full');
  });
  root.querySelector('[data-drawer-close]')?.focus();
}

function closeDrawer() {
  const root = document.querySelector('[data-drawer-root]');
  if (!root || root.classList.contains('hidden')) return;
  const backdrop = root.querySelector('[data-drawer-backdrop]');
  const panel = root.querySelector('[data-drawer-panel]');
  backdrop?.classList.remove('opacity-100');
  panel?.classList.add('translate-x-full');
  root.setAttribute('aria-hidden', 'true');
  const finish = () => {
    root.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) finish();
  else setTimeout(finish, 320); // acompanha a duração da transição
}

// Liga o carrinho: drawer, badge, eventos e persistência entre abas.
function initCart() {
  renderDrawer();

  // Abre pelo botão do header
  document.querySelector('[data-cart-toggle]')?.addEventListener('click', openDrawer);

  const root = document.querySelector('[data-drawer-root]');
  if (root) {
    root.querySelector('[data-drawer-close]')?.addEventListener('click', closeDrawer);
    root.querySelector('[data-drawer-backdrop]')?.addEventListener('click', closeDrawer);

    // Controles de quantidade / remover (delegação)
    root.querySelector('[data-cart-items]')?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-cart-row]');
      if (!row) return;
      const key = row.getAttribute('data-key');
      const item = Cart.getCart().find((it) => it.key === key);
      if (!item) return;
      if (e.target.closest('[data-cart-inc]')) Cart.updateQty(key, item.qtd + 1);
      else if (e.target.closest('[data-cart-dec]')) Cart.updateQty(key, item.qtd - 1);
      else if (e.target.closest('[data-cart-remove]')) Cart.removeItem(key);
    });

    // Retirar na casa / receber em casa (delegação: o footer é redesenhado).
    root.querySelector('[data-cart-footer]')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-modo]');
      if (!btn) return;
      setCartModo(btn.getAttribute('data-modo'));
      updateCartUI();
    });

    // Checkout, chama a Edge Function create-checkout-session (mode 'payment').
    const checkoutBtn = root.querySelector('[data-checkout]');
    const checkoutNote = root.querySelector('[data-checkout-note]');
    const avisarCheckout = (msg) => {
      if (!checkoutNote) return;
      checkoutNote.textContent = msg; // textContent (nunca innerHTML), anti-XSS
      checkoutNote.classList.remove('hidden');
    };
    checkoutBtn?.addEventListener('click', async () => {
      checkoutNote?.classList.add('hidden');

      const itens = Cart.getCart()
        .map((it) => {
          const p = getProdutoPorId(it.produtoId);
          return p ? { product_slug: p.slug, variant: it.variante || null, qtd: it.qtd } : null;
        })
        .filter(Boolean);
      if (itens.length === 0) return;

      if (!supabase) return avisarCheckout('o checkout ainda não tá ligado por aqui (config pendente). 💛');

      // Requer login (o pedido/desconto/pontos dependem do usuário). Deslogado →
      // manda pro login e VOLTA pro carrinho (?cart=open reabre o drawer).
      const session = await getSession();
      if (!session) {
        const destino = encodeURIComponent(window.location.pathname + '?cart=open');
        window.location.href = `/login?redirect=${destino}`;
        return;
      }

      const texto = checkoutBtn.textContent;
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'te levando pro pagamento…';
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { items: itens, modo: getCartModo() },
        });
        if (error || !data?.url) {
          // Endereço incompleto: a function devolve 400 com uma mensagem pronta,
          // no tom da casa (supabase-js guarda a resposta não-2xx em error.context).
          let corpo = data || null;
          if (!corpo && error?.context?.json) {
            try { corpo = await error.context.json(); } catch { /* corpo não-JSON, tudo bem */ }
          }
          if (corpo?.endereco_incompleto) {
            avisarCheckout(corpo.error || 'falta teu endereço pra gente levar até aí. 💛');
            return;
          }
          avisarCheckout('não deu pra abrir o pagamento agora. tenta de novo daqui a pouco? 💛');
          return;
        }
        window.location.href = data.url; // Checkout hospedado do Asaas
      } catch {
        avisarCheckout('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = texto;
      }
    });
  }

  // Fecha com Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Reage a mudanças do carrinho (nesta aba) e em outras abas
  Cart.onChange(updateCartUI);
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) updateCartUI();
  });

  updateCartUI(); // estado inicial
  loadCartDiscount(); // busca o desconto do tier (se logado) e mostra no drawer

  // Volta do login pro carrinho: ?cart=open reabre o drawer.
  if (new URLSearchParams(window.location.search).get('cart') === 'open') {
    openDrawer();
  }
}

// Busca os dois pedaços que o drawer precisa saber sobre quem tá comprando: o
// desconto do tier e o endereço do perfil. Os dois são SÓ informativos — quem
// aplica o desconto e quem lê o endereço de verdade é a Edge Function, no banco.
let cartDiscountPct = 0;
let cartEndereco = null; // { completo, resumo } — null enquanto não carregou
async function loadCartDiscount() {
  if (!supabase) return;
  const user = await getUser();
  if (!user) return;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('tier_slug, end_cep, end_rua, end_numero, end_complemento, end_bairro, end_cidade, end_uf')
    .eq('id', user.id)
    .maybeSingle();
  if (!perfil) return;

  // Mesma lista de obrigatórios da create-checkout-session: o aviso daqui só
  // antecipa, com carinho, o 400 que viria de lá.
  const txt = (v) => String(v ?? '').trim();
  const completo = ['end_cep', 'end_rua', 'end_numero', 'end_bairro', 'end_cidade', 'end_uf'].every(
    (c) => txt(perfil[c])
  );
  const complemento = txt(perfil.end_complemento);
  cartEndereco = {
    completo,
    resumo: completo
      ? `${txt(perfil.end_rua)}, ${txt(perfil.end_numero)}${complemento ? ` · ${complemento}` : ''}, ` +
        `${txt(perfil.end_bairro)}, ${txt(perfil.end_cidade)}/${txt(perfil.end_uf)}`
      : '',
  };

  if (perfil.tier_slug) {
    const { data: tier } = await supabase
      .from('tiers')
      .select('discount_percent')
      .eq('slug', perfil.tier_slug)
      .maybeSingle();
    cartDiscountPct = Number(tier?.discount_percent || 0);
  }
  updateCartUI();
}

// =============================================================================
// Carrossel reutilizável (scroll-snap), serve pros 3 tracks da home.
//
// Contrato de DOM:
//   <div data-carousel="hero|cards">
//     <div data-carousel-track class="carousel-track">…slides…</div>
//     <div data-dots></div>                 (opcional, bolinhas)
//     <button data-carousel-prev>…</button> (opcional, desktop)
//     <button data-carousel-next>…</button> (opcional, desktop)
//   </div>
//
// setupCarousel(trackEl, { dots, autoplay, interval })
//   - autoplay só roda se NÃO for prefers-reduced-motion; pausa em hover/foco/toque.
//   - dots clicáveis refletem o slide atual (usado só no hero).
//   - navegável por teclado (setas) e por swipe/scroll no mobile.
// =============================================================================
function setupCarousel(trackEl, { dots = false, autoplay = false, interval = 5500 } = {}) {
  if (!trackEl) return;
  const slides = Array.from(trackEl.children);
  if (slides.length === 0) return;

  const root = trackEl.closest('[data-carousel]') || trackEl.parentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Torna o track acessível/foca­vel pra navegação por teclado
  if (!trackEl.hasAttribute('tabindex')) trackEl.setAttribute('tabindex', '0');
  if (!trackEl.hasAttribute('role')) trackEl.setAttribute('role', 'region');
  if (!trackEl.hasAttribute('aria-label')) trackEl.setAttribute('aria-label', 'Carrossel');

  // Posição (à esquerda) de cada slide, relativa ao primeiro
  const slideLeft = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
  const currentIndex = () => {
    const x = trackEl.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((_, i) => {
      const d = Math.abs(slideLeft(i) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };
  const goTo = (i) => {
    const idx = (i + slides.length) % slides.length;
    trackEl.scrollTo({ left: slideLeft(idx), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  // --- Dots -----------------------------------------------------------------
  let dotEls = [];
  const dotsWrap = dots ? root?.querySelector('[data-dots]') : null;
  if (dotsWrap) {
    dotsWrap.innerHTML = slides
      .map(
        (_, i) =>
          `<button type="button" class="dot" data-dot="${i}" aria-label="Ir para o slide ${i + 1}"></button>`
      )
      .join('');
    dotEls = Array.from(dotsWrap.querySelectorAll('[data-dot]'));
    dotEls.forEach((d, i) =>
      d.addEventListener('click', () => {
        goTo(i);
        restart();
      })
    );
  }

  const syncUI = () => {
    const cur = currentIndex();
    dotEls.forEach((d, i) =>
      d.setAttribute('aria-current', i === cur ? 'true' : 'false')
    );
  };

  // --- Autoplay -------------------------------------------------------------
  let timer = null;
  const canAuto = autoplay && !reduceMotion && slides.length > 1;
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  const start = () => {
    if (canAuto && !timer && !document.hidden) {
      timer = setInterval(() => goTo(currentIndex() + 1), interval);
    }
  };
  const restart = () => {
    stop();
    start();
  };

  if (canAuto) {
    // Pausa em hover, foco e toque; retoma depois
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    root.addEventListener('pointerdown', stop);
    root.addEventListener('pointerup', restart);
    root.addEventListener('touchstart', stop, { passive: true });
    root.addEventListener('touchend', restart, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  // --- Botões prev/next (opcionais) -----------------------------------------
  root?.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
    goTo(currentIndex() - 1);
    restart();
  });
  root?.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
    goTo(currentIndex() + 1);
    restart();
  });

  // --- Teclado --------------------------------------------------------------
  trackEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(currentIndex() + 1);
      restart();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(currentIndex() - 1);
      restart();
    }
  });

  // --- Sincroniza dots ao rolar (throttle com rAF) --------------------------
  let ticking = false;
  trackEl.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          syncUI();
          ticking = false;
        });
      }
    },
    { passive: true }
  );

  syncUI();
  start();
}

// =============================================================================
// PÁGINA DE CATÁLOGO (loja.html), grid + filtro por categoria.
// DOM: [data-catalog-grid] pro grid; [data-filter="all|<categoria>"] nos botões.
// =============================================================================
function cardProdutoHTML(p) {
  // Esgotado / fora da vitrine: em vez de "adicionar", oferece "me avisa quando
  // voltar" (initReposicao liga o botão; deslogado → login). Selo sobre a foto.
  const esgotado = p.disponivel === false;
  const acao = esgotado
    ? `<button type="button" class="btn ghost sm prod-avisar" data-avisar="${escapeHtml(p.slug)}" style="flex:1"><i data-lucide="bell"></i><span>me avisa quando voltar</span></button>`
    : p.variantes
      ? `<a href="/produto?slug=${p.slug}" class="btn solid sm" style="flex:1">escolher</a>`
      : `<button type="button" data-add="${p.id}" class="btn solid sm" style="flex:1">adicionar</button>`;
  const selo = esgotado ? `<span class="prod-esgotado">esgotado</span>` : '';
  return `
    <article class="prod${esgotado ? ' is-esgotado' : ''}" data-produto data-categoria="${p.categoria}" data-slug="${escapeHtml(p.slug)}">
      <a href="/produto?slug=${p.slug}" class="block" aria-label="${escapeHtml(p.nome)}">
        <div class="ph ${p.imagemPlaceholder}">${selo}</div>
      </a>
      <div class="prod-body">
        <p class="prod-cat">${escapeHtml(CATEGORIAS[p.categoria] ?? '')}</p>
        <h3 class="leading-tight">
          <a href="/produto?slug=${p.slug}" class="hover:text-coral">${escapeHtml(p.nome)}</a>
        </h3>
        <p class="price">${formatBRL(p.preco_centavos)}</p>
        <div class="mt-2 flex gap-2">
          <a href="/produto?slug=${p.slug}" class="btn ghost sm" style="flex:1">ver</a>
          ${acao}
        </div>
      </div>
    </article>`;
}

function initCatalogPage() {
  const grid = document.querySelector('[data-catalog-grid]');
  if (!grid) return;

  grid.innerHTML = PRODUTOS.map(cardProdutoHTML).join('');

  const vazio = document.querySelector('[data-catalog-empty]');
  const botoes = Array.from(document.querySelectorAll('[data-filter]'));

  const aplicarFiltro = (cat) => {
    let visiveis = 0;
    grid.querySelectorAll('[data-produto]').forEach((card) => {
      const mostra = cat === 'all' || card.getAttribute('data-categoria') === cat;
      card.classList.toggle('hidden', !mostra);
      if (mostra) visiveis += 1;
    });
    if (vazio) vazio.classList.toggle('hidden', visiveis > 0);
    botoes.forEach((b) => {
      const ativo = b.getAttribute('data-filter') === cat;
      b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });
  };

  botoes.forEach((b) =>
    b.addEventListener('click', () => aplicarFiltro(b.getAttribute('data-filter')))
  );

  // "adicionar" direto (produtos sem variante) abre o drawer
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    Cart.addItem(btn.getAttribute('data-add'), null, 1);
    openDrawer();
  });

  aplicarFiltro('all');
  renderIcons();
}

// =============================================================================
// PÁGINA DE PRODUTO (produto.html), lê ?slug=, renderiza o detalhe.
// DOM: [data-product-root] recebe o markup (ou o estado vazio gentil).
// =============================================================================
function initProductPage() {
  const rootEl = document.querySelector('[data-product-root]');
  if (!rootEl) return;

  const slug = new URLSearchParams(window.location.search).get('slug');
  const p = slug ? getProdutoPorSlug(slug) : null;

  if (!p) {
    rootEl.innerHTML = `
      <div class="empty">
        <p class="e-title">a gente não achou esse produto</p>
        <p class="mx-auto max-w-sm">pode ser que ele tenha saído da vitrine. dá uma olhada no que tem por lá?</p>
        <a href="/loja" class="btn solid">voltar pra loja</a>
      </div>`;
    renderIcons();
    return;
  }

  document.title = `${p.nome}, Casa Coffee Colab`;

  let variante = p.variantes ? p.variantes.opcoes[0] : null;
  let qtd = 1;
  const esgotado = p.disponivel === false;

  const variantesHTML = p.variantes
    ? `
      <div class="mt-6">
        <span class="lbl">${escapeHtml(p.variantes.rotulo)}</span>
        <div class="mt-2 flex flex-wrap gap-2" data-variantes>
          ${p.variantes.opcoes
            .map(
              (o, i) =>
                `<button type="button" data-variante="${escapeHtml(o)}" aria-pressed="${i === 0}" class="rounded-full border px-4 py-2 text-sm transition-colors ${
                  i === 0 ? 'border-coral bg-coral/10 text-coral' : 'border-line text-ink hover:border-coral'
                }">${escapeHtml(o)}</button>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // Bloco de compra: disponível → quantidade + adicionar; esgotado → "me avisa
  // quando voltar" (initReposicao liga; deslogado → login). O "guardar pra depois"
  // (coração) fica nos dois casos, dá pra guardar mesmo esgotado.
  const guardarBtn = `<button type="button" class="btn ghost prod-guardar" data-desejo-produto="${escapeHtml(p.slug)}" hidden>
              <i data-lucide="heart"></i><span>guardar pra depois</span>
            </button>`;
  const compraHTML = esgotado
    ? `<div class="mt-6">
          <p class="prod-esgotado-nota"><i data-lucide="bell-off"></i>esse saiu da vitrine por enquanto. deixa que a gente te avisa quando voltar.</p>
          <div class="mt-3 flex flex-wrap items-center gap-4">
            <button type="button" class="btn solid prod-avisar" data-avisar="${escapeHtml(p.slug)}"><i data-lucide="bell"></i><span>me avisa quando voltar</span></button>
            ${guardarBtn}
          </div>
        </div>`
    : `<div class="mt-6">
          <span class="lbl">Quantidade</span>
          <div class="mt-2 flex flex-wrap items-center gap-4">
            <div class="inline-flex items-center rounded-full border border-line">
              <button type="button" data-qty-dec aria-label="Diminuir quantidade" class="grid h-10 w-10 place-items-center text-ink hover:text-coral">
                <i data-lucide="minus" class="h-4 w-4"></i>
              </button>
              <span class="w-10 text-center" data-qty>1</span>
              <button type="button" data-qty-inc aria-label="Aumentar quantidade" class="grid h-10 w-10 place-items-center text-ink hover:text-coral">
                <i data-lucide="plus" class="h-4 w-4"></i>
              </button>
            </div>
            <button type="button" data-add-detail class="btn solid">adicionar ao carrinho</button>
            ${guardarBtn}
          </div>
        </div>`;

  rootEl.innerHTML = `
    <div class="grid gap-8 lg:grid-cols-2">
      <div class="ph ${p.imagemPlaceholder} aspect-square w-full">${esgotado ? '<span class="prod-esgotado">esgotado</span>' : ''}</div>
      <div>
        <a href="/loja" class="inline-flex items-center gap-1 text-sm text-muted hover:text-coral">
          <i data-lucide="chevron-left" class="h-4 w-4"></i> voltar pra loja
        </a>
        <p class="mt-4 prod-cat">${escapeHtml(CATEGORIAS[p.categoria] ?? '')}</p>
        <h1 class="title md mt-1">${escapeHtml(p.nome)}</h1>
        <p class="mt-3 title sm" style="color:var(--coral)">${formatBRL(p.preco_centavos)}</p>
        <p class="mt-4 max-w-prose text-ink-2">${escapeHtml(p.descricao)}</p>
        ${esgotado ? '' : variantesHTML}
        ${compraHTML}
        <p class="mt-6 text-xs text-muted">leva junto, no teu ritmo. o frete e o pagamento a gente acerta no checkout (em breve).</p>
      </div>
    </div>`;

  // Variante
  rootEl.querySelectorAll('[data-variante]').forEach((btn) =>
    btn.addEventListener('click', () => {
      variante = btn.getAttribute('data-variante');
      rootEl.querySelectorAll('[data-variante]').forEach((b) => {
        const ativo = b === btn;
        b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        b.classList.toggle('border-coral', ativo);
        b.classList.toggle('bg-coral/10', ativo);
        b.classList.toggle('text-coral', ativo);
        b.classList.toggle('border-line', !ativo);
      });
    })
  );

  // Quantidade
  const qtyEl = rootEl.querySelector('[data-qty]');
  const setQtd = (v) => {
    qtd = Math.max(1, v);
    if (qtyEl) qtyEl.textContent = String(qtd);
  };
  rootEl.querySelector('[data-qty-dec]')?.addEventListener('click', () => setQtd(qtd - 1));
  rootEl.querySelector('[data-qty-inc]')?.addEventListener('click', () => setQtd(qtd + 1));

  // Adicionar → abre o drawer
  rootEl.querySelector('[data-add-detail]')?.addEventListener('click', () => {
    Cart.addItem(p.id, variante, qtd);
    openDrawer();
  });

  renderIcons();
}

// =============================================================================
// BOTÕES "assinar" ([data-assinar][data-tier]), leva DIRETO pro Checkout do Asaas.
// Liga tanto a página de planos (planos.html) quanto o teaser "Faz parte do Casa"
// da home, o mesmo contrato de DOM. A Edge Function create-checkout-session (modo
// assinatura) monta o link; aqui a gente só redireciona. Deslogado → login e volta
// pra origem. Sem supabase configurado, degrada com aviso gentil.
// =============================================================================
function initPlanosPage() {
  const botoes = document.querySelectorAll('[data-assinar]');
  if (botoes.length === 0) return;
  const nota = document.querySelector('[data-assinar-note]');

  const avisar = (msg) => {
    if (!nota) return;
    nota.textContent = msg; // textContent (nunca innerHTML), sem risco de XSS
    nota.classList.remove('hidden');
    nota.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Deslogado → manda pro login guardando o destino: volta pra ONDE clicou
  // (home ou /planos), não sempre pros planos. Caminho interno → seguro
  // (o login sanitiza via sanitizeRedirect, anti open-redirect).
  const irProLogin = () => {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${destino}`;
  };

  // Abre o Checkout hospedado do Asaas (modo assinatura). O preço vem do BANCO na
  // Edge Function, o client só manda o tier_slug; functions.invoke já envia o JWT
  // da sessão no Authorization (a function valida e vincula a assinatura ao user.id).
  const irProPagamento = async (tier, btn) => {
    const textoBtn = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'te levando pro pagamento…';
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier_slug: tier },
      });
      if (error || !data?.url) {
        avisar('não deu pra abrir o pagamento agora. tenta de novo daqui a pouco? 💛');
        return;
      }
      window.location.href = data.url; // Checkout hospedado do Asaas
    } catch {
      avisar('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
    } finally {
      btn.disabled = false;
      btn.textContent = textoBtn;
    }
  };

  // Assinatura VIGENTE do próprio usuário (espelho client-side da trava do backend).
  // Lê a própria linha de subscriptions (RLS: só o dono lê) e aplica o MESMO gating
  // do getEffectiveSubscription: 'ativa' concede sempre; 'pausada' só enquanto o
  // período pago não venceu; 'ativa' ganha de 'pausada' no desempate. Retorna a que
  // concede benefício agora, ou null. É só UX, o backend (409) é a trava de verdade.
  const assinaturaVigente = async (userId) => {
    if (!userId) return null;
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('tier_slug, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['ativa', 'pausada'])
      .order('current_period_end', { ascending: false, nullsFirst: false });
    if (error || !subs?.length) return null;
    const rows = subs.slice().sort((a, b) => (a.status === 'ativa' ? 0 : 1) - (b.status === 'ativa' ? 0 : 1));
    const now = Date.now();
    return (
      rows.find(
        (r) =>
          r.status === 'ativa' ||
          (r.status === 'pausada' && !!r.current_period_end && Date.parse(r.current_period_end) > now),
      ) ?? null
    );
  };

  // Confirmação de conta ANTES de pagar: mostra com qual conta (a sessão em cache) a
  // pessoa vai assinar e deixa TROCAR de conta. Assim ninguém assina numa conta em
  // cache sem querer, dá pra escolher outra. Montado via DOM (o e-mail entra por
  // textContent, nunca innerHTML) → sem risco de XSS.
  const pedirConfirmacao = (tier, btn, email) => {
    if (!nota) return irProPagamento(tier, btn); // página sem a nota → comportamento antigo
    nota.textContent = ''; // limpa qualquer box anterior (evita empilhar em cliques repetidos)
    nota.classList.remove('hidden');

    const box = document.createElement('div');
    box.className = 'notice info';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'flex-start';

    const linha = document.createElement('p');
    linha.append('vais assinar como ');
    const emailEl = document.createElement('strong');
    emailEl.className = 'font-semibold';
    emailEl.textContent = email || 'tua conta'; // textContent → e-mail escapado por natureza
    linha.append(emailEl);

    const trocarLinha = document.createElement('p');
    trocarLinha.className = 'mt-1 text-muted';
    trocarLinha.append('não é você? ');
    const trocar = document.createElement('button');
    trocar.type = 'button';
    trocar.className = 'font-medium text-coral hover:underline';
    trocar.textContent = 'trocar de conta';
    trocar.addEventListener('click', async () => {
      trocar.disabled = true;
      trocar.textContent = 'saindo…';
      await signOut(); // limpa a sessão em cache
      irProLogin(); // volta pra cá depois de logar de novo
    });
    trocarLinha.append(trocar);

    const continuar = document.createElement('button');
    continuar.type = 'button';
    continuar.className =
      'btn solid sm mt-3';
    continuar.textContent = 'continuar pro pagamento';
    continuar.addEventListener('click', () => {
      continuar.disabled = true; // trava contra duplo-clique (evita abrir 2 checkouts)
      irProPagamento(tier, btn);
    });

    box.append(linha, trocarLinha, continuar);
    nota.append(box);
    nota.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  botoes.forEach((btn) =>
    btn.addEventListener('click', async () => {
      const tier = btn.dataset.tier;
      if (!tier) return;

      // Config pendente → degrada com aviso gentil, sem quebrar.
      if (!supabase) return avisar('a assinatura ainda não tá ligada por aqui (config pendente). 💛');

      // Deslogado → login. Logado → confirma a conta antes de pagar (dá pra trocar).
      const session = await getSession();
      if (!session) return irProLogin();

      // Já assina? Abrir um novo checkout criaria uma 2ª recorrência (cobrança
      // dobrada), o backend recusa (409), mas a gente avisa gentil aqui antes,
      // apontando pro upgrade no perfil (troca de plano sem pagar do zero).
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'conferindo…';
      let vigente = null;
      try {
        vigente = await assinaturaVigente(session.user?.id);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
      if (vigente) {
        avisar(
          'você já tem uma assinatura vigente por aqui 💛 pra trocar de plano, usa o "fazer upgrade" na tua conta, a gente cobra só a diferença dos dias que faltam.',
        );
        return;
      }

      pedirConfirmacao(tier, btn, session.user?.email);
    })
  );
}

// Página "presentear um plano" (/presentear): escolhe o tier, escreve o bilhete e
// abre o Checkout hospedado do Asaas em modo PRESENTE (cobrança única — não vira
// assinatura do comprador). O preço vem do BANCO na Edge Function; o client só
// manda { gift_tier, mensagem }. Deslogado → login guardando o destino.
function initPresentearPage() {
  const root = document.querySelector('[data-presentear]');
  if (!root) return;

  const btn = root.querySelector('[data-gift-btn]');
  const nota = root.querySelector('[data-gift-note]');
  const msgEl = root.querySelector('[data-gift-msg]');
  const countEl = root.querySelector('[data-gift-count]');

  // Contador do bilhete (feedback vivo, sem passar de 280).
  const atualizarContador = () => {
    if (!msgEl || !countEl) return;
    countEl.textContent = `${msgEl.value.length}/280`;
  };
  msgEl?.addEventListener('input', atualizarContador);
  atualizarContador();

  const avisar = (msg) => {
    if (!nota) return;
    nota.textContent = msg; // textContent (nunca innerHTML) → sem XSS
    nota.classList.remove('hidden');
    nota.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const irProLogin = () => {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${destino}`;
  };

  const tierEscolhido = () => root.querySelector('input[name="gift-tier"]:checked')?.value || '';

  btn?.addEventListener('click', async () => {
    const tier = tierEscolhido();
    if (!tier) return avisar('escolhe um plano pra presentear 💛');

    if (!supabase) return avisar('presentear ainda não tá ligado por aqui (config pendente). 💛');

    const session = await getSession();
    if (!session) return irProLogin();

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'te levando pro pagamento…';
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { gift_tier: tier, mensagem: msgEl?.value?.trim() || '' },
      });
      if (error || !data?.url) {
        avisar('não deu pra abrir o pagamento agora. tenta de novo daqui a pouco? 💛');
        return;
      }
      window.location.href = data.url; // Checkout hospedado do Asaas
    } catch {
      avisar('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// Mural do Casa (/o-casa): recados de assinante como post-its na parede. Leitura
// pública (qualquer um vê os 'aprovado'); escrita gated por assinatura na Edge
// Function postar-mural (server-side). Aqui o client só LÊ, mostra o compose pra
// quem pode, e chama a function pra postar. Todo texto do banco é escapado.
async function initMuralPage() {
  const root = document.querySelector('[data-mural]');
  if (!root) return;

  const lista = root.querySelector('[data-mural-lista]');
  const vazio = root.querySelector('[data-mural-vazio]');
  const compose = root.querySelector('[data-mural-compose]');
  const ctaEl = root.querySelector('[data-mural-cta]');
  const textoEl = root.querySelector('[data-mural-texto]');
  const countEl = root.querySelector('[data-mural-count]');
  const btn = root.querySelector('[data-mural-btn]');
  const msgEl = root.querySelector('[data-mural-msg]');

  const mostrarCta = (html) => {
    if (!ctaEl) return;
    ctaEl.innerHTML = html; // conteúdo controlado (só links internos fixos)
    ctaEl.hidden = false;
  };

  if (!supabase) {
    mostrarCta('o mural chega já já. 💛');
    return;
  }

  // Data curta e gentil pro rodapé do post-it.
  const dataCurta = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const hoje = new Date();
    const umDia = 86_400_000;
    const diff = Math.floor((hoje.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / umDia);
    if (diff <= 0) return 'hoje';
    if (diff === 1) return 'ontem';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Sessão + ids dos MEUS recados (pra mostrar o "apagar"). RLS deixa cada um ler
  // os próprios (inclusive ocultos); no público a lista não traz user_id.
  const session = await getSession();
  const meusIds = new Set();
  if (session) {
    const { data: meus } = await supabase.from('mural_notes').select('id').eq('user_id', session.user.id);
    (meus || []).forEach((r) => meusIds.add(r.id));
  }

  const cardHtml = (n) => {
    const podeApagar = meusIds.has(n.id);
    const apagar = podeApagar
      ? `<button type="button" class="mural-apagar" data-apagar="${escapeHtml(n.id)}" aria-label="apagar teu recado">×</button>`
      : '';
    return `
      <article class="mural-note">
        ${apagar}
        <p>${escapeHtml(n.texto || '')}</p>
        <span class="mural-autor">— ${escapeHtml(n.autor_nome || 'alguém do Casa')} · ${dataCurta(n.created_at)}</span>
      </article>`;
  };

  // Carrega a parede (aprovados, mais novos primeiro). Limite generoso.
  const carregar = async () => {
    const { data: notas, error } = await supabase
      .from('mural_notes')
      .select('id, autor_nome, texto, created_at')
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) {
      // Migration 0020 ainda não aplicada? degrada gentil (a parede fica vazia).
      if (vazio) { vazio.textContent = 'o mural chega já já. 💛'; vazio.hidden = false; }
      return;
    }
    if (lista) lista.innerHTML = (notas || []).map(cardHtml).join('');
    if (vazio) vazio.hidden = (notas || []).length > 0;
  };
  await carregar();

  // Apagar o próprio recado (RLS garante que só o dono/staff apaga).
  lista?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-apagar]');
    if (!b) return;
    const id = b.getAttribute('data-apagar');
    if (!id || !window.confirm('tirar teu recado da parede?')) return;
    b.disabled = true;
    const { error } = await supabase.from('mural_notes').delete().eq('id', id);
    if (error) { b.disabled = false; return; }
    b.closest('.mural-note')?.remove();
    meusIds.delete(id);
    if (lista && lista.children.length === 0 && vazio) vazio.hidden = false;
  });

  // Estado do compose: só assinante vigente escreve. Deslogado/sem plano → CTA.
  if (!session) {
    mostrarCta(
      'o mural é de quem faz parte do Casa. <a href="/planos">assina um plano</a> e deixa teu recado na parede. 💛',
    );
    return;
  }

  // Assinatura vigente do próprio usuário (espelho da trava server-side). 'ativa'
  // concede sempre; 'pausada' só no período pago. É só UX — o backend é a trava real.
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', session.user.id)
    .in('status', ['ativa', 'pausada'])
    .order('current_period_end', { ascending: false, nullsFirst: false });
  const agora = Date.now();
  const vigente = (subs || []).some(
    (r) =>
      r.status === 'ativa' ||
      (r.status === 'pausada' && !!r.current_period_end && Date.parse(r.current_period_end) > agora),
  );

  if (!vigente) {
    mostrarCta(
      'quase lá 💛 o mural é um agrado de quem tem plano. <a href="/planos">vem pro clube</a> e deixa teu recado.',
    );
    return;
  }

  // Assinante: libera o compose.
  if (compose) compose.hidden = false;
  const atualizarContador = () => {
    if (countEl && textoEl) countEl.textContent = `${textoEl.value.length}/240`;
  };
  textoEl?.addEventListener('input', atualizarContador);
  atualizarContador();

  const mostrarMsg = (txt, tom = 'erro') => {
    if (!msgEl) return;
    msgEl.textContent = txt; // textContent → sem XSS
    msgEl.className = 'mt-2 text-sm ' + (tom === 'ok' ? 'text-olive' : 'text-coral');
    msgEl.classList.remove('hidden');
  };

  btn?.addEventListener('click', async () => {
    const texto = (textoEl?.value || '').trim();
    if (!texto) return mostrarMsg('escreve teu recado 💛');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'colando…';
    try {
      const { data, error } = await supabase.functions.invoke('postar-mural', { body: { texto } });
      if (error || !data?.ok) {
        let m = data?.error || '';
        if (!m && typeof error?.context?.json === 'function') {
          try {
            const corpo = await error.context.json();
            if (corpo?.error) m = String(corpo.error);
          } catch {
            /* corpo não-JSON */
          }
        }
        mostrarMsg(m || 'não deu pra colar teu recado agora. tenta de novo? 💛');
        return;
      }
      // Sucesso: cola o recado novo no topo da parede.
      if (msgEl) msgEl.classList.add('hidden');
      if (textoEl) textoEl.value = '';
      atualizarContador();
      meusIds.add(data.note.id);
      if (lista) lista.insertAdjacentHTML('afterbegin', cardHtml(data.note));
      if (vazio) vazio.hidden = true;
    } catch {
      mostrarMsg('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// Página de sucesso do checkout: compra concluída → esvazia o carrinho local.
// (A fonte da verdade do pedido é o banco, gravado pelo webhook; o carrinho é só UI.)
// Também mostra "+X pontos" quando o webhook terminar de creditar (é assíncrono,
// então a gente sonda o ledger algumas vezes pelo `ref` da URL, o orders.id que a
// gente passou como externalReference/successUrl no checkout da LOJA).
// Na volta da ASSINATURA a successUrl é `?assinatura=1` (sem ref): os pontos da
// assinatura são creditados no evento de pagamento (ref = payment.id, que o client
// não conhece), então aqui a gente só esvazia o carrinho e deixa o aviso da página.
async function initCheckoutSucessoPage() {
  const wrap = document.querySelector('[data-checkout-sucesso]');
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  // Só esvazia o carrinho quando houver um sinal REAL de retorno de checkout
  // (?ref= da loja, ?assinatura=1 ou ?upgrade=1). Abrir/reabrir /checkout-sucesso
  // avulso (histórico, bookmark) não deve apagar o carrinho montado.
  const voltaDeCheckout =
    !!params.get('ref') || params.get('assinatura') === '1' || params.get('upgrade') === '1';
  if (voltaDeCheckout) Cart.clearCart();

  // A copy do HTML é NEUTRA; aqui a gente especializa por fluxo. textContent em
  // tudo → sem risco de XSS. Fonte da verdade continua sendo o banco (webhook).
  const tituloEl = wrap.querySelector('[data-sucesso-titulo]') ?? wrap.querySelector('h1');
  const textoEl = wrap.querySelector('[data-sucesso-texto]') ?? wrap.querySelector('p');
  const setCopy = (titulo, texto) => {
    if (tituloEl) tituloEl.textContent = titulo;
    if (textoEl) textoEl.textContent = texto;
  };

  const ref = params.get('ref');

  // Upgrade (?upgrade=1): a volta é da diferença proporcional, não de uma compra
  // nova, deixa a copy coerente (sem "pedido").
  if (params.get('upgrade') === '1') {
    setCopy(
      'plano turbinado 💛',
      'teu upgrade tá confirmado. o novo plano já vale a partir de agora, a diferença de hoje foi só pelos dias que faltavam do ciclo.',
    );
    return; // sem pontos a sondar aqui (upgrade é ajuste, não compra)
  }

  // Assinatura (?assinatura=1, sem ref): boas-vindas ao plano.
  if (params.get('assinatura') === '1') {
    setCopy(
      'bem-vindo à turma do Casa 💛',
      'tua assinatura tá confirmada. a gente já tá preparando teu cantinho, teu plano aparece na tua conta em instantes, assim que o pagamento termina de conversar com a gente.',
    );
    return; // pontos da assinatura vêm por payment.id (o client não conhece) → não sonda
  }

  // Presente (?presente=<gift.id>): o comprador pagou um presente. O código é
  // gerado pelo webhook (assíncrono), então sonda gift_subscriptions (RLS: o
  // comprador lê o próprio) até o código aparecer e mostra pra ele entregar.
  const presenteId = params.get('presente');
  if (presenteId) {
    setCopy(
      'presente a caminho 💛',
      'teu pagamento tá confirmado. assim que ele termina de conversar com a gente, teu código aparece aqui embaixo pra tu entregar.',
    );
    const slotG = wrap.querySelector('[data-pontos-credito]');
    if (!slotG || !supabase) return;
    const sessionG = await getSession();
    if (!sessionG) return;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const { data } = await supabase
        .from('gift_subscriptions')
        .select('codigo')
        .eq('id', presenteId)
        .maybeSingle();
      if (data?.codigo) {
        setCopy(
          'teu presente tá pronto 💛',
          'entrega o código abaixo pra quem tu quiser — a pessoa resgata em "tenho um presente", lá na conta dela.',
        );
        slotG.textContent = `teu código: ${data.codigo}`; // textContent → sem XSS
        slotG.classList.remove('hidden');
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return;
  }

  // Loja (?ref=<order.id>): copy de PEDIDO, não de plano.
  if (ref) {
    setCopy(
      'pedido confirmado 💛',
      'teu pagamento tá confirmado. a gente já tá cuidando do teu pedido, ele aparece na tua conta em instantes, assim que o pagamento termina de conversar com a gente.',
    );
  }

  const slot = wrap.querySelector('[data-pontos-credito]');
  if (!slot || !supabase) return;

  if (!ref) return; // assinatura (?assinatura=1) ou sem ref → nada a sondar

  const session = await getSession();
  if (!session) return;

  // O crédito de pontos vem pelo webhook (idempotente, ref_id = orders.id).
  // Sonda o ledger algumas vezes; se aparecer, mostra o carinho. Sem drama se não.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data } = await supabase
      .from('points_ledger')
      .select('delta')
      .eq('user_id', session.user.id)
      .eq('ref_id', ref)
      .maybeSingle();
    if (data && Number(data.delta) > 0) {
      slot.textContent = `+${Number(data.delta).toLocaleString('pt-BR')} pontos pra ti 💛`;
      slot.classList.remove('hidden');
      return;
    }
    await new Promise((r) => setTimeout(r, 1500)); // espera o webhook processar
  }
}

// =============================================================================
// AUTH, UI do header, guard de rota e páginas (cadastro/login/perfil).
// =============================================================================

// Sai da conta e volta pra home.
async function doSignOut() {
  await signOut();
  window.location.href = '/home';
}

// Título do nome exibido: capitaliza a inicial de cada termo, mantendo conectores
// pt-BR ("de/da/do/das/dos/e") minúsculos. Não mexe em e-mail (fallback raro) nem
// no genérico "você". Ex.: "matheus bonato" → "Matheus Bonato".
function tituloNome(str) {
  const s = String(str || '').trim();
  if (!s || s.includes('@')) return s;
  const conect = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return s.replace(/\S+/g, (termo, offset) => {
    const low = termo.toLocaleLowerCase('pt-BR');
    if (offset > 0 && conect.has(low)) return low;
    return low.charAt(0).toLocaleUpperCase('pt-BR') + low.slice(1);
  });
}

// Iniciais pro avatar: 1ª letra do primeiro termo + 1ª do último (ignora
// conectores), sempre maiúsculas. "matheus bonato" → "MB"; "matheus" → "M";
// "maria da silva" → "MS"; e-mail → 1ª letra antes do "@".
function iniciaisNome(str) {
  const s = String(str || '').trim();
  if (!s) return '?';
  if (s.includes('@')) return (s.charAt(0) || '?').toLocaleUpperCase('pt-BR');
  const conect = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const termos = s.split(/\s+/).filter(Boolean);
  const sig = termos.filter((t) => !conect.has(t.toLocaleLowerCase('pt-BR')));
  const base = sig.length ? sig : termos;
  const a = base[0].charAt(0);
  const b = base.length > 1 ? base[base.length - 1].charAt(0) : '';
  return (a + b || '?').toLocaleUpperCase('pt-BR');
}

// Preenche os slots de auth do header conforme a sessão (deslogado ↔ logado).
// Logado (desktop) → painel do usuário "mini-game" (avatar + dropdown com anel de
// progresso, saldo, emblemas e links). Mobile → lista compacta no drawer.
function updateAuthUI(session) {
  const raw = nomeDeExibicao(session) || '?';
  const nome = escapeHtml(tituloNome(raw)); // capitalizado + sempre escapado (anti-XSS)
  const inicial = escapeHtml(iniciaisNome(raw)); // iniciais do nome + sobrenome, maiúsculas

  const slot = document.querySelector('[data-auth-slot]');
  if (slot) {
    slot.innerHTML = session
      ? authDesktopLogado(nome, inicial)
      : `<a href="/login" class="hdr-auth-link">entrar</a>`;
  }

  const slotM = document.querySelector('[data-auth-slot-mobile]');
  if (slotM) {
    slotM.innerHTML = session
      ? authMobileLogado(nome)
      : `<a href="/login" data-menu-link>entrar</a>`;
  }

  // Liga o "sair" dos botões do header (o painel liga o seu próprio ao renderizar).
  [slot, slotM].forEach((s) => s?.querySelector('[data-signout]')?.addEventListener('click', doSignOut));

  if (session) {
    // Trigger do painel (desktop).
    slot?.querySelector('[data-user-panel-trigger]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.querySelector('[data-user-panel]');
      panel?.dataset.aberto === 'true' ? closeUserPanel() : openUserPanel();
    });
    initUserPanelGlobal(); // fecha por Esc/clique-fora (uma vez só)
    hydrateAuthHeader();   // completa saldo (drawer) e foto de perfil (avatares)
  }
  renderIcons();
}

// Markup do usuário logado no header desktop: botão-gatilho (avatar+nome) + painel.
function authDesktopLogado(nome, inicial) {
  return `
    <div class="relative" data-user-panel-wrap>
      <button type="button" data-user-panel-trigger aria-haspopup="true" aria-expanded="false" class="hdr-user-trigger">
        <span class="hdr-user-avatar" data-hdr-avatar>${inicial}</span>
        <span class="hdr-user-name">${nome}</span>
        <i data-lucide="chevron-down" style="width:15px;height:15px;opacity:.55"></i>
      </button>
      <div data-user-panel data-aberto="false" role="menu" aria-hidden="true"
        class="invisible absolute right-0 top-full z-50 mt-2 w-80 origin-top-right scale-95 card opacity-0 shadow-xl backdrop-blur-md transition duration-200">
        <p class="text-center text-sm text-muted">só um instante…</p>
      </div>
    </div>`;
}

// Markup do usuário logado no drawer mobile: lista compacta (saldo + links).
function authMobileLogado(nome) {
  return `
    <div class="flex items-center gap-2 py-1 text-lg text-ink">
      <span class="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-coral/10 text-coral" data-hdr-avatar><i data-lucide="user" class="h-4 w-4"></i></span>
      <span class="truncate">${nome}</span>
    </div>
    <p class="pb-1 pl-10 text-sm text-muted"><span data-auth-saldo>—</span> pontos</p>
    <a href="/conta/perfil" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="user" class="h-5 w-5 text-coral"></i>meu perfil</a>
    <a href="/conta/pontos" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="gift" class="h-5 w-5 text-coral"></i>meus pontos</a>
    <a href="/conta/conquistas" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="award" class="h-5 w-5 text-coral"></i>minhas conquistas</a>
    <a href="/conta/pedidos" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="shopping-bag" class="h-5 w-5 text-coral"></i>meus pedidos</a>
    <button type="button" data-signout class="mt-2 inline-flex items-center gap-2 text-muted hover:text-coral">
      <i data-lucide="log-out" class="h-5 w-5"></i>sair da conta
    </button>`;
}

// Fecha o painel por Esc e por clique fora, ligado UMA vez (evita empilhar
// listeners a cada updateAuthUI). Consulta o painel vivo no momento do evento.
let userPanelGlobalWired = false;
function initUserPanelGlobal() {
  if (userPanelGlobalWired) return;
  userPanelGlobalWired = true;
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('[data-user-panel-wrap]');
    const panel = wrap?.querySelector('[data-user-panel]');
    if (!wrap || !panel || panel.dataset.aberto !== 'true') return;
    if (!wrap.contains(e.target)) closeUserPanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const panel = document.querySelector('[data-user-panel]');
    if (panel?.dataset.aberto === 'true') {
      closeUserPanel();
      document.querySelector('[data-user-panel-trigger]')?.focus();
    }
  });
}

function openUserPanel() {
  const panel = document.querySelector('[data-user-panel]');
  const trigger = document.querySelector('[data-user-panel-trigger]');
  if (!panel) return;
  panel.dataset.aberto = 'true';
  trigger?.setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.remove('invisible', 'scale-95', 'opacity-0');
  panel.classList.add('scale-100', 'opacity-100');
  if (panel.dataset.carregado !== 'true') {
    panel.dataset.carregado = 'true';
    renderUserPanel(panel);
  }
}

function closeUserPanel() {
  const panel = document.querySelector('[data-user-panel]');
  const trigger = document.querySelector('[data-user-panel-trigger]');
  if (!panel) return;
  panel.dataset.aberto = 'false';
  trigger?.setAttribute('aria-expanded', 'false');
  panel.setAttribute('aria-hidden', 'true');
  panel.classList.add('scale-95', 'opacity-0');
  panel.classList.remove('scale-100', 'opacity-100');
  // Some da árvore de foco só depois da transição de saída.
  setTimeout(() => {
    if (panel.dataset.aberto !== 'true') panel.classList.add('invisible');
  }, 200);
}

// Preenche o painel com dados frescos: anel (pontos → próxima recompensa),
// saldo (count-up), emblemas e links. Tudo do banco é escapado antes do DOM.
async function renderUserPanel(panel) {
  if (!supabase) {
    panel.innerHTML = `<p class="text-center text-sm text-muted">tua conta ainda não está ligada por aqui (config pendente).</p>`;
    return;
  }
  const session = await getSession();
  if (!session) return;
  const profile = await getProfile();
  const saldo = Number(profile?.points_balance || 0);

  const [tierRes, rewardsRes, achRes, uachRes] = await Promise.all([
    profile?.tier_slug
      ? supabase.from('tiers').select('nome').eq('slug', profile.tier_slug).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('rewards_catalog').select('nome, custo_em_pontos, ativo, estoque').eq('ativo', true).order('custo_em_pontos', { ascending: true }),
    supabase.from('achievements').select('slug, nome, dica, icone, ordem').eq('ativo', true).order('ordem', { ascending: true }),
    supabase.from('user_achievements').select('achievement_slug').eq('user_id', session.user.id),
  ]);

  const planoNome = tierRes.data?.nome || (profile?.tier_slug ? profile.tier_slug : null);
  const rewards = (rewardsRes.data || []).filter((r) => r.estoque === null || Number(r.estoque) > 0);
  const proximo = rewards.find((r) => Number(r.custo_em_pontos) > saldo);

  // Anel: pontos → próxima recompensa acessível.
  let percent;
  let faltamTxt;
  if (!rewards.length) {
    percent = 0;
    faltamTxt = 'junta pontos e troca por agrados quando quiser';
  } else if (!proximo) {
    percent = 1;
    faltamTxt = 'teus pontos já dão pra qualquer agrado 💛';
  } else {
    const custo = Number(proximo.custo_em_pontos);
    percent = custo > 0 ? Math.min(saldo / custo, 1) : 0;
    const faltam = custo - saldo;
    faltamTxt = saldo <= 0
      ? `faltam ${faltam.toLocaleString('pt-BR')} pontos pro teu primeiro agrado`
      : `faltam ${faltam.toLocaleString('pt-BR')} pontos pro ${escapeHtml(proximo.nome)}`;
  }

  const desbloq = new Set((uachRes.data || []).map((u) => u.achievement_slug));
  const emblemas = (achRes.data || [])
    .slice(0, 8)
    .map((a) => {
      const icone = iconeConquista(a.icone);
      const on = desbloq.has(a.slug);
      const dicaTip = a.dica ? `, ${escapeHtml(a.dica)}` : '';
      return on
        ? `<span title="${escapeHtml(a.nome)}" class="grid h-9 w-9 place-items-center rounded-full bg-coral/10 text-coral"><i data-lucide="${icone}" class="h-4 w-4"></i></span>`
        : `<span title="${escapeHtml(a.nome)}${dicaTip}" class="grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-muted"><i data-lucide="lock" class="h-4 w-4"></i></span>`;
    })
    .join('');

  const R = 34;
  const C = 2 * Math.PI * R;
  const alvoOffset = C * (1 - percent);

  panel.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" class="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="${R}" fill="none" stroke="currentColor" stroke-width="6" class="text-line" />
          <circle data-ring cx="40" cy="40" r="${R}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"
            class="text-coral" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"
            style="transition: stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1);" />
        </svg>
        <span class="absolute inset-0 grid place-items-center font-titulo text-lg text-coral" data-saldo-anim>0</span>
      </div>
      <div class="min-w-0">
        <p class="font-titulo text-lg leading-tight">${planoNome ? escapeHtml(planoNome) : 'sem plano ainda'}</p>
        <p class="mt-0.5 text-sm text-muted">${faltamTxt}</p>
      </div>
    </div>

    ${emblemas ? `<div class="mt-4 flex flex-wrap gap-2">${emblemas}</div>` : ''}

    <div class="mt-4 grid gap-0.5 border-t border-line pt-3 text-sm">
      <a href="/conta/perfil" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="user" class="h-4 w-4 text-coral"></i>meu perfil</a>
      <a href="/conta/pontos" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="gift" class="h-4 w-4 text-coral"></i>meus pontos</a>
      <a href="/conta/conquistas" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="award" class="h-4 w-4 text-coral"></i>minhas conquistas</a>
      <a href="/conta/pedidos" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="shopping-bag" class="h-4 w-4 text-coral"></i>meus pedidos</a>
      ${
        planoNome
          ? `<button type="button" data-panel-assinatura class="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-ink transition-colors hover:bg-ink/5"><i data-lucide="credit-card" class="h-4 w-4 text-coral"></i>minha assinatura</button>`
          : `<a href="/planos" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="credit-card" class="h-4 w-4 text-coral"></i>conhecer os planos</a>`
      }
      <button type="button" data-signout class="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-muted transition-colors hover:bg-ink/5 hover:text-coral"><i data-lucide="log-out" class="h-4 w-4"></i>sair da conta</button>
    </div>`;

  renderIcons();

  // Anima o anel + count-up do saldo. Respeita prefers-reduced-motion (estado final direto).
  const ring = panel.querySelector('[data-ring]');
  const saldoEl = panel.querySelector('[data-saldo-anim]');
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz) {
    if (ring) ring.style.strokeDashoffset = alvoOffset.toFixed(1);
    if (saldoEl) saldoEl.textContent = saldo.toLocaleString('pt-BR');
  } else {
    requestAnimationFrame(() => {
      if (ring) ring.style.strokeDashoffset = alvoOffset.toFixed(1);
    });
    animarContagem(saldoEl, saldo, 900);
  }

  panel.querySelector('[data-signout]')?.addEventListener('click', doSignOut);
  panel.querySelector('[data-panel-assinatura]')?.addEventListener('click', irParaAssinatura);
}

// Count-up (easeOutCubic) do 0 até o alvo. Usado no saldo do painel.
function animarContagem(el, alvo, dur = 900) {
  if (!el) return;
  const inicio = performance.now();
  const passo = (t) => {
    const p = Math.min((t - inicio) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(alvo * eased).toLocaleString('pt-BR');
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// "minha assinatura" (painel do header) → leva pro perfil, onde fica a nossa tela
// de gerenciar/cancelar (o Asaas não tem portal de cobrança hospedado).
function irParaAssinatura() {
  window.location.href = '/conta/perfil';
}

// Uma leitura só do perfil pra completar o header depois que ele já apareceu:
// o saldo no drawer mobile e a foto nos dois avatares. O header nasce com as
// iniciais e a foto entra por cima quando chega — assim ninguém espera o banco
// pra ver o topo montado.
async function hydrateAuthHeader() {
  if (!supabase) return;
  const profile = await getProfile();
  if (!profile) return;

  const saldo = Number(profile.points_balance || 0).toLocaleString('pt-BR');
  document.querySelectorAll('[data-auth-saldo]').forEach((el) => (el.textContent = saldo));

  pintarAvatarHeader(profile.avatar_url);
}

// Troca as iniciais (desktop) e o ícone genérico (drawer) pela foto de perfil.
// Sem foto, não mexe em nada — as iniciais seguem sendo o estado normal. O
// `/conta/perfil` chama isto de novo ao subir uma foto nova, pra o topo mudar
// na hora, sem recarregar.
export function pintarAvatarHeader(url) {
  if (!url) return;
  document.querySelectorAll('[data-hdr-avatar]').forEach((el) => {
    let img = el.querySelector('img');
    if (!img) {
      el.textContent = ''; // sai a inicial / o <i> do lucide
      img = document.createElement('img');
      img.alt = ''; // decorativa: o nome da pessoa já vem escrito do lado
      el.appendChild(img);
      // Apaga o fundo coral das iniciais: com a foto por cima ele só apareceria
      // como um anel na borda. O tamanho e o recorte redondo vêm do CSS.
      el.classList.add('tem-foto');
    }
    // Via propriedade, não innerHTML: a URL vem do banco e nunca é parseada como markup.
    img.src = String(url);
  });
}

// Header reflete o estado de auth e reage a login/logout (inclusive entre abas).
async function initAuth() {
  updateAuthUI(await getSession());
  if (supabase) {
    supabase.auth.onAuthStateChange((evento, session) => {
      updateAuthUI(session);
      // Sessão caiu sozinha numa página logada (refresh token vencido, ou o
      // aparelho foi encerrado de outro lugar): sem isto a pessoa fica numa
      // tela logada morta, e todo botão que chama Edge Function volta 401.
      // O `saindoDeProposito` evita brigar com o "sair", que já navega sozinho.
      if (
        evento === 'SIGNED_OUT' &&
        !saindoDeProposito &&
        window.location.pathname.startsWith('/conta/')
      ) {
        const destino = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?redirect=${destino}&expirou=1`);
      }
    });
  }
}

// --- Indica um amigo (captura do link + registro do vínculo) -------------------
const INDICA_KEY = 'casa_indica';

// Roda em toda página (boot). Duas coisas:
//  1) Se a URL trouxe ?indica=CODE (link de convite), guarda o código no
//     localStorage — entre clicar o link e logar (confirmar e-mail) tem navegação,
//     então o código precisa sobreviver a reloads.
//  2) Se há código guardado E a pessoa está logada, registra o vínculo UMA vez via
//     RPC registrar_indicacao (o banco valida quem é o indicado por auth.uid() — o
//     client nunca diz "sou fulano"). O código só é limpo quando a RPC responde
//     (registrou, já-indicado, já-é-da-casa, inválido): erro de rede/migration
//     pendente mantém o rastro pra tentar de novo depois.
async function initIndicacao() {
  try {
    const code = (new URLSearchParams(window.location.search).get('indica') || '').trim().toUpperCase();
    if (code && /^[A-Z0-9]{4,16}$/.test(code)) localStorage.setItem(INDICA_KEY, code);
  } catch {
    /* sem localStorage/URL: ignora */
  }

  let code = null;
  try {
    code = localStorage.getItem(INDICA_KEY);
  } catch {
    code = null;
  }
  if (!code || !supabase) return;

  const session = await getSession();
  if (!session) return; // ainda não logou — tenta num próximo load

  const { error } = await supabase.rpc('registrar_indicacao', { p_codigo: code });
  // Sem erro de transporte = houve resposta definitiva do banco (ok ou recusa
  // gentil). Aí sim limpa. Erro (RPC ausente / rede) mantém pra retry.
  if (!error) {
    try {
      localStorage.removeItem(INDICA_KEY);
    } catch {
      /* ignora */
    }
  }
}

// Guard: exige sessão. Sem sessão → manda pro login guardando o destino.
// NUNCA confia em role do client, quem precisar de papel lê do profiles (banco).
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?redirect=${destino}`);
    return null;
  }
  return session;
}

// Só aceita redirect INTERNO, anti open-redirect (defesa em camadas). Precisa começar
// com "/" seguido de char que NÃO seja "/" nem "\": o navegador normaliza "\"→"/" em
// schemes especiais, então tanto "//evil.com" quanto "/\evil.com" virariam host externo.
// Também rejeita barra invertida e chars de controle em qualquer posição e, por fim,
// resolve via URL confirmando que a origem é a NOSSA, devolvendo só o caminho normalizado.
function sanitizeRedirect(valor) {
  if (typeof valor !== 'string' || !valor) return null;
  if (!/^\/(?![/\\])/.test(valor)) return null;          // bloqueia "//" e "/\"
  if (/[\x00-\x1f\x7f\\]/.test(valor)) return null;      // sem chars de controle nem "\"
  try {
    const url = new URL(valor, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    // Re-valida a SAÍDA: o parser WHATWG colapsa segmentos ("/.//evil" → "//evil";
    // "/..//evil" → "//evil"), e um pathname que volte a começar com "//" ou "/\"
    // vira protocol-relative (host externo) no window.location.href. Reaplica o mesmo
    // gate de entrada sobre o caminho final antes de devolver.
    const out = url.pathname + url.search + url.hash;
    if (!/^\/(?![/\\])/.test(out)) return null;
    return out;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// --- Cadastro ------------------------------------------------------------------
function initCadastroPage() {
  const form = document.querySelector('[data-cadastro-form]');
  if (!form) return;

  setupPasswordToggles(form); // olhinho nas duas senhas

  // Chegou por um convite de indicação (?indica=CODE)? Um oi gentil no topo do form.
  // O vínculo em si é registrado depois, logado, pela initIndicacao — aqui é só afeto.
  try {
    const temConvite = (new URLSearchParams(window.location.search).get('indica') || '').trim();
    if (temConvite && !form.querySelector('[data-convite-aviso]')) {
      const aviso = document.createElement('p');
      aviso.dataset.conviteAviso = '';
      aviso.className = 'cadastro-convite';
      aviso.textContent = 'alguém do Casa te convidou 💛 cria tua conta e, quando assinares, vocês dois ganham pontos.';
      form.prepend(aviso);
    }
  } catch {
    /* sem URL: ignora */
  }

  const erroEl = form.querySelector('[data-form-erro]');
  const btn = form.querySelector('[type="submit"]');
  const mostrarErro = (msg) => {
    if (!erroEl) return;
    erroEl.textContent = msg;
    erroEl.classList.remove('hidden');
  };
  const limparErro = () => {
    if (!erroEl) return;
    erroEl.textContent = '';
    erroEl.classList.add('hidden');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErro();

    const nome = form.nome.value.trim();
    const telefone = form.telefone.value.trim();
    const email = form.email.value.trim();
    const senha = form.senha.value;
    const confirma = form.confirma.value;

    if (!nome) return mostrarErro('conta pra gente teu nome? 💛');
    if (!EMAIL_RE.test(email)) return mostrarErro('esse e-mail parece incompleto. dá uma conferida?');
    if (senha.length < 8) return mostrarErro('a senha precisa de pelo menos 8 caracteres.');
    if (senha !== confirma) return mostrarErro('as senhas não são iguais. confere pra gente?');
    if (!supabase) return mostrarErro('o cadastro ainda não tá ligado por aqui (config pendente).');

    const textoBtn = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'criando tua conta…';
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          // nome e telefone vão pro raw_user_meta_data → a trigger handle_new_user popula o profiles.
          data: { full_name: nome, telefone },
          // link do e-mail de confirmação volta pra uma página do próprio site (env-driven).
          emailRedirectTo: `${siteBase()}/auth-confirmado`,
        },
      });
      if (error) return mostrarErro(mensagemDeErroAuth(error));

      if (data.session) {
        // "Confirm email" desligado → já entrou. Vai pro perfil.
        window.location.href = '/conta/perfil';
        return;
      }

      // "Confirm email" ligado → estado "confirme seu e-mail".
      form.classList.add('hidden');
      const sucesso = document.querySelector('[data-cadastro-sucesso]');
      if (sucesso) {
        const alvo = sucesso.querySelector('[data-email-alvo]');
        if (alvo) alvo.textContent = email; // textContent (não innerHTML), sem risco de XSS
        sucesso.classList.remove('hidden');
      }
    } catch (err) {
      mostrarErro(mensagemDeErroAuth(err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoBtn;
      }
    }
  });
}

// --- Login (+ esqueci a senha) -------------------------------------------------
function initLoginPage() {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;

  const erroEl = form.querySelector('[data-form-erro]');
  const btn = form.querySelector('[type="submit"]');
  const resetMsg = form.querySelector('[data-reset-msg]');
  const redirect = sanitizeRedirect(new URLSearchParams(window.location.search).get('redirect'));

  setupPasswordToggles(form); // olhinho de mostrar/ocultar senha

  const mostrarErro = (msg) => {
    if (!erroEl) return;
    erroEl.textContent = msg;
    erroEl.classList.remove('hidden');
  };
  const limparErro = () => {
    if (!erroEl) return;
    erroEl.textContent = '';
    erroEl.classList.add('hidden');
  };

  // Veio de uma sessão que caiu sozinha (ver `initAuth`): explica o motivo, em
  // vez de deixar a pessoa achar que foi deslogada à toa.
  if (new URLSearchParams(window.location.search).get('expirou') === '1') {
    mostrarErro('tua sessão expirou por segurança. entra de novo que a gente te leva de volta. 💛');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErro();
    if (resetMsg) resetMsg.classList.add('hidden');

    const email = form.email.value.trim();
    const senha = form.senha.value;
    if (!EMAIL_RE.test(email)) return mostrarErro('esse e-mail parece incompleto. dá uma conferida?');
    if (!senha) return mostrarErro('falta a senha. 💛');
    if (!supabase) return mostrarErro('o login ainda não tá ligado por aqui (config pendente).');

    const textoBtn = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'entrando…';
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) return mostrarErro(mensagemDeErroAuth(error));
      window.location.href = redirect || '/conta/perfil';
    } catch (err) {
      mostrarErro(mensagemDeErroAuth(err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoBtn;
      }
    }
  });

  // Esqueci a senha, envia o link de redefinição (Supabase resetPasswordForEmail).
  form.querySelector('[data-reset]')?.addEventListener('click', async () => {
    limparErro();
    const email = form.email.value.trim();
    if (!EMAIL_RE.test(email))
      return mostrarErro('preenche teu e-mail ali em cima que a gente te manda o link. 💛');
    if (!supabase) return mostrarErro('o reset de senha ainda não tá ligado por aqui (config pendente).');
    try {
      // Vai pra /auth-confirmado, não pro /login: é lá que mora o painel de
      // criar a senha nova. O /login só tem o campo da senha ATUAL — quem
      // clicava no link caía numa tela logada sem jeito nenhum de trocar.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteBase()}/auth-confirmado`,
      });
    } catch {
      /* não revela se o e-mail existe, mensagem é sempre a mesma */
    }
    if (resetMsg) {
      resetMsg.textContent = 'se esse e-mail tiver conta, o link pra criar uma senha nova já tá a caminho. 💛';
      resetMsg.classList.remove('hidden');
    }
  });
}

// --- Continuar com o Google ----------------------------------------------------
// Um botão só, injetado nos dois formulários pelo [data-google-slot]: pro Supabase
// não existe "cadastro com Google" separado de "login com Google" — o mesmo
// signInWithOAuth cria a conta na primeira vez (a trigger handle_new_user popula o
// profiles com o nome que vem do Google) e só entra nas seguintes.
//
// O retorno cai sempre em /auth-confirmado, a MESMA URL que os e-mails de
// confirmação já usam — assim não precisa cadastrar redirect novo no Supabase. O
// destino final viaja no sessionStorage (a mesma aba volta do Google), e não na
// query, justamente pra manter a URL de retorno idêntica à que já está liberada.
const POS_LOGIN_KEY = 'casa_pos_login';

// Logo oficial do Google (obrigatório no botão, pelas diretrizes da marca).
const GOOGLE_LOGO_SVG = `
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.97-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>`;

function initGoogleAuth() {
  const slots = document.querySelectorAll('[data-google-slot]');
  if (!slots.length) return;

  // Mesmo ?redirect= que o login por senha respeita (já anti open-redirect).
  const destino =
    sanitizeRedirect(new URLSearchParams(window.location.search).get('redirect')) ||
    '/conta/perfil';

  slots.forEach((slot) => {
    slot.innerHTML = `
      <p class="auth-ou">ou</p>
      <button type="button" class="btn-google" data-google>
        ${GOOGLE_LOGO_SVG}
        <span>continuar com o Google</span>
      </button>`;

    const btn = slot.querySelector('[data-google]');
    const erroEl = slot.closest('form')?.querySelector('[data-form-erro]');
    const mostrarErro = (msg) => {
      if (!erroEl) return;
      erroEl.textContent = msg;
      erroEl.classList.remove('hidden');
    };

    btn.addEventListener('click', async () => {
      if (!supabase)
        return mostrarErro('o login com o Google ainda não tá ligado por aqui (config pendente).');

      btn.disabled = true;
      try {
        sessionStorage.setItem(POS_LOGIN_KEY, destino);
      } catch {
        /* aba em modo restrito: sem o bilhete, a volta cai no perfil mesmo */
      }
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${siteBase()}/auth-confirmado`,
            // deixa escolher a conta em vez de entrar direto na última usada.
            queryParams: { prompt: 'select_account' },
          },
        });
        // Sem erro o supabase-js já mandou o navegador pro Google — daqui não volta.
        if (error) {
          btn.disabled = false;
          mostrarErro(mensagemDeErroAuth(error));
        }
      } catch (err) {
        btn.disabled = false;
        mostrarErro(mensagemDeErroAuth(err));
      }
    });
  });
}

// --- Perfil (área logada) ------------------------------------------------------
// Colunas do perfil estendido (migration 0014_perfil). Não tem CPF de propósito:
// quem coleta CPF é a página hospedada do Asaas, a gente não guarda.
const PERFIL_CAMPOS_EXTRA =
  'apelido, nascimento, cafe_metodo, cafe_torra, cafe_leite, cafe_restricoes, cafe_horario, ' +
  'end_cep, end_rua, end_numero, end_complemento, end_bairro, end_cidade, end_uf, avisos, avatar_url';

// Foto de perfil (migration 0015_avatar). Os mesmos limites estão no bucket do
// Storage — aqui é só pra avisar a pessoa antes de subir 10 MB à toa.
const AVATAR_BUCKET = 'avatares';
const AVATAR_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const AVATAR_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

// Opções das preferências de café. Os `valor` batem com os CHECKs da migration.
const CAFE_METODOS = [
  { valor: 'coado', rotulo: 'coado' },
  { valor: 'prensa', rotulo: 'prensa' },
  { valor: 'aeropress', rotulo: 'aeropress' },
  { valor: 'espresso', rotulo: 'espresso' },
  { valor: 'moka', rotulo: 'moka' },
];
const CAFE_TORRAS = [
  { valor: 'clara', rotulo: 'clara e frutada' },
  { valor: 'media', rotulo: 'média' },
  { valor: 'escura', rotulo: 'escura' },
];
const CAFE_LEITES = [
  { valor: 'puro', rotulo: 'puro, sempre' },
  { valor: 'integral', rotulo: 'integral' },
  { valor: 'vegetal', rotulo: 'vegetal' },
  { valor: 'tanto', rotulo: 'tanto faz' },
];
const CAFE_HORARIOS = [
  { valor: 'manha', rotulo: 'de manhã cedo' },
  { valor: 'almoco', rotulo: 'na hora do almoço' },
  { valor: 'tarde', rotulo: 'meio da tarde' },
  { valor: 'fim', rotulo: 'no fim do dia' },
];

// Avisos (jsonb `profiles.avisos`). `padrao` espelha o default da migration.
const PERFIL_AVISOS = [
  { chave: 'lotes', titulo: 'lote novo na casa', sub: 'quando chega um café novo no balcão', padrao: true },
  { chave: 'pontos', titulo: 'pontos pra vencer', sub: 'a gente te avisa uma semana antes', padrao: true },
  { chave: 'cobranca', titulo: 'cobrança da assinatura', sub: 'recibo e lembrete antes de cada renovação', padrao: true },
  { chave: 'eventos', titulo: 'eventos e cursos', sub: 'cupping, aulas e noites de música', padrao: false },
  { chave: 'whats', titulo: 'whatsapp', sub: 'prefiro ser avisado por lá, não por e-mail', padrao: true },
];

// Máscaras de digitação (o banco guarda o texto formatado, como já fazia o telefone).
function mascaraTelefone(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function mascaraCep(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Iniciais pro avatar (no máximo duas letras, da primeira e da última palavra).
function iniciaisDoNome(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '☕';
  const primeira = partes[0][0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] || '' : '';
  return (primeira + ultima).toUpperCase();
}

// Nome legível do aparelho a partir do user-agent que o GoTrue guardou. É
// heurística mesmo — user-agent é string livre, não dá pra ter certeza. Serve
// só pra pessoa reconhecer ("ah, esse é o meu celular"); nada depende disso.
function nomeDoAparelho(ua) {
  const s = String(ua || '');
  if (!s.trim()) return 'aparelho desconhecido';

  // Ordem importa: Edge e Opera se disfarçam de Chrome, Chrome se disfarça de Safari.
  const navegador = /\bEdgA?\//.test(s)
    ? 'Edge'
    : /\bOPR\/|\bOpera\//.test(s)
      ? 'Opera'
      : /SamsungBrowser\//.test(s)
        ? 'Samsung Internet'
        : /\bFirefox\/|\bFxiOS\//.test(s)
          ? 'Firefox'
          : /\bChrome\/|\bCriOS\//.test(s)
            ? 'Chrome'
            : /\bSafari\//.test(s)
              ? 'Safari'
              : '';

  const sistema = /\biPhone\b/.test(s)
    ? 'iPhone'
    : /\biPad\b/.test(s)
      ? 'iPad'
      : /\bAndroid\b/.test(s)
        ? 'Android'
        : /\bWindows\b/.test(s)
          ? 'Windows'
          : /\bMac OS X\b|\bMacintosh\b/.test(s)
            ? 'Mac'
            : /\bLinux\b/.test(s)
              ? 'Linux'
              : '';

  if (navegador && sistema) return `${navegador} no ${sistema}`;
  return navegador || sistema || 'aparelho desconhecido';
}

function iconeDoAparelho(ua) {
  const s = String(ua || '');
  if (/\biPad\b|\bTablet\b/.test(s)) return 'tablet';
  if (/\biPhone\b|\biPod\b|\bAndroid\b|\bMobile\b/.test(s)) return 'smartphone';
  return 'monitor';
}

// "hoje às 14:30" / "ontem às 09:12" / "12/07 às 20:05" — data curta e gentil.
function quandoCurto(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const hoje = dia(new Date());
  const diff = Math.round((hoje - dia(d)) / 86400000);
  if (diff === 0) return `hoje às ${hora}`;
  if (diff === 1) return `ontem às ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

async function initPerfilPage() {
  const root = document.querySelector('[data-perfil-root]');
  if (!root) return;

  const session = await requireAuth();
  if (!session) return; // já redirecionou pro login

  const email = escapeHtml(session.user.email || '');
  const profile = await getProfile();
  const nome = escapeHtml(profile?.full_name || nomeDeExibicao(session));
  const telefone = escapeHtml(profile?.telefone || '');
  const pontos = Number(profile?.points_balance || 0).toLocaleString('pt-BR');

  // ── Estado da assinatura (pra "gerenciar assinatura") ─────────────────────
  // Lê a linha MAIS RECENTE do próprio usuário em ('ativa','pausada','cancelada')
  //, RLS garante que só vem a dele. E a lista de tiers (leitura pública) pra
  // montar as opções de upgrade e o nome/preço do plano. Nada disso confia no
  // client: preço e cálculo do upgrade são refeitos server-side na Edge Function.
  // ('cancelada' entra pra oferecer "voltar pro plano", a assinatura sumiu do
  // Asaas, então é um checkout novo, não um "retomar".)
  let plano = 'ainda sem plano';
  let planoSlug = profile?.tier_slug || null;
  let subStatus = null; // 'ativa' | 'pausada' | 'cancelada' | null
  let periodEndMs = NaN;
  let ativoAte = ''; // DD/MM (current_period_end formatado)
  let agendadoSlug = null; // scheduled_downgrade_to (downgrade agendado pro próximo ciclo)
  let ehPresente = false; // a linha vigente nasceu de um presente resgatado (sem recorrência)
  let tiers = []; // [{ slug, nome, preco_centavos, ordem, ativo }]
  // Campos do perfil estendido (apelido, café, endereço, avisos — migration 0014).
  // Consulta separada e TOLERANTE de propósito: se a migration ainda não foi
  // aplicada no banco, o select falha, `extra` fica null e a página segue de pé
  // com os campos vazios, em vez de derrubar o perfil inteiro.
  let extra = null;

  if (supabase) {
    const [subRes0, tiersRes, extraRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('tier_slug, status, current_period_end, scheduled_downgrade_to, presente_id')
        .eq('user_id', session.user.id)
        .in('status', ['ativa', 'pausada', 'cancelada'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('tiers').select('slug, nome, preco_centavos, ordem, ativo').order('ordem'),
      supabase.from('profiles').select(PERFIL_CAMPOS_EXTRA).eq('id', session.user.id).maybeSingle(),
    ]);
    // Fallback TOLERANTE: se a migration 0019 (coluna presente_id) ainda não foi
    // aplicada, o select acima falha inteiro — re-tenta SEM presente_id pra o plano
    // do assinante não sumir da tela nesse meio-tempo. (Mesmo espírito da consulta
    // `extra`, tolerante à 0014.) Sem a coluna, ehPresente fica false — ok.
    let subRes = subRes0;
    if (subRes0.error) {
      subRes = await supabase
        .from('subscriptions')
        .select('tier_slug, status, current_period_end, scheduled_downgrade_to')
        .eq('user_id', session.user.id)
        .in('status', ['ativa', 'pausada', 'cancelada'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }
    tiers = Array.isArray(tiersRes.data) ? tiersRes.data : [];
    extra = extraRes.data || null;
    const sub = subRes.data;
    if (sub) {
      subStatus = sub.status;
      planoSlug = sub.tier_slug || planoSlug;
      agendadoSlug = sub.scheduled_downgrade_to || null;
      ehPresente = Boolean(sub.presente_id);
      if (sub.current_period_end) {
        const d = new Date(sub.current_period_end);
        if (!Number.isNaN(d.getTime())) {
          periodEndMs = d.getTime();
          ativoAte = d.toLocaleDateString('pt-BR');
        }
      }
    }
    const tierAtual = tiers.find((t) => t.slug === planoSlug);
    if (tierAtual) plano = escapeHtml(tierAtual.nome);
    else if (planoSlug) plano = escapeHtml(planoSlug);
  }

  // Estados derivados (a UI decide o que mostrar a partir daqui).
  const agora = Date.now();
  const ativa = subStatus === 'ativa';
  const emGraca = subStatus === 'pausada' && Number.isFinite(periodEndMs) && periodEndMs > agora;
  const pausada = subStatus === 'pausada'; // em graça OU vencida, dá pra retomar dos dois
  // Encerrada de vez no Asaas (404): não dá pra "retomar", só re-assinar. Só vale
  // como estado gerenciável se ainda sabemos qual era o tier (pra oferecer a volta).
  const reassinavel = subStatus === 'cancelada' && Boolean(planoSlug);
  // Presente resgatado: assinatura 'pausada' de origem-presente, SEM recorrência no
  // Asaas. Concede o benefício até current_period_end e some sozinha — não há o que
  // "gerenciar" (nada pra cancelar/retomar/dar upgrade no gateway). Fica fora do
  // temGerenciar pra não cair nos fluxos de assinatura paga.
  const presenteVigente = ehPresente && Number.isFinite(periodEndMs) && periodEndMs > agora;
  const temGerenciar = !ehPresente && (ativa || pausada || reassinavel); // assinatura paga gerenciável
  const temPlano = temGerenciar || presenteVigente || Boolean(profile?.tier_slug);
  const proximaCobranca = ativoAte;
  const ordemAtual = tiers.find((t) => t.slug === planoSlug)?.ordem ?? 0;
  // Downgrade AGENDADO (vale no próximo ciclo). Só existe em assinatura ATIVA (a
  // function exige 'ativa'). Mesmo com downgrade agendado a gente OFERECE upgrade:
  // subir de plano CANCELA a descida agendada (as Edge Functions do upgrade limpam o
  // scheduled_downgrade_to ao aplicar). O que NÃO reaparece é o desvio de "plano
  // leve" no modal de pausar (já está mais leve, seria puxa-empurra).
  const tierAgendado = agendadoSlug ? tiers.find((t) => t.slug === agendadoSlug) : null;
  const agendadoNome = tierAgendado ? escapeHtml(tierAgendado.nome) : agendadoSlug ? escapeHtml(agendadoSlug) : '';
  const temDowngradeAgendado = ativa && Boolean(agendadoSlug);
  // Upgrade faz sentido com assinatura ATIVA e tiers acima do atual, inclusive com
  // downgrade agendado (o upgrade tem prioridade e desfaz a descida).
  const tiersUpgrade = ativa ? tiers.filter((t) => (t.ordem ?? 0) > ordemAtual) : [];
  // Desvio gentil de retenção: SÓ aparece dentro do fluxo de pausar, e SÓ se não
  // houver downgrade já agendado. Planos ATIVOS mais leves que o atual (ordem menor).
  const tiersDowngrade =
    ativa && !agendadoSlug ? tiers.filter((t) => t.ativo !== false && (t.ordem ?? 0) < ordemAtual) : [];

  // Valores do formulário. Tudo que vem do banco é escapado antes de virar
  // atributo/texto no DOM (o site é JS vanilla, não tem escape automático).
  const val = (v) => escapeHtml(v == null ? '' : String(v));
  const iniciais = escapeHtml(iniciaisDoNome(profile?.full_name || nomeDeExibicao(session)));
  const avatarUrl = extra?.avatar_url || '';
  const emailVerificado = Boolean(session.user.email_confirmed_at || session.user.confirmed_at);
  // Default da migration primeiro, o que estiver salvo por cima.
  const avisos = {
    ...Object.fromEntries(PERFIL_AVISOS.map((a) => [a.chave, a.padrao])),
    ...(extra?.avisos && typeof extra.avisos === 'object' ? extra.avisos : {}),
  };
  const chips = (grupo, opcoes, atual) =>
    opcoes
      .map(
        (o) =>
          `<button type="button" class="pf-chip" data-chip="${grupo}" data-value="${o.valor}" aria-pressed="${
            atual === o.valor ? 'true' : 'false'
          }">${o.rotulo}</button>`,
      )
      .join('');

  root.innerHTML = `
    <div class="pf">
      <header class="pf-hero">
        <div class="pf-avatar" data-avatar>
          ${
            avatarUrl
              ? `<img src="${val(avatarUrl)}" alt="tua foto de perfil" data-avatar-img />`
              : `<span aria-hidden="true" data-avatar-iniciais>${iniciais}</span>`
          }
          <button type="button" class="pf-avatar-btn" data-avatar-btn aria-label="trocar tua foto">
            <i data-lucide="camera"></i>
          </button>
          <input
            type="file"
            class="sr-only"
            accept="${AVATAR_TIPOS.join(',')}"
            data-avatar-input
            aria-label="escolher uma foto tua"
          />
        </div>
        <div class="pf-hero-txt">
          <p class="pf-script">que bom te ver</p>
          <h1 class="pf-name">oi, ${nome}</h1>
        </div>
      </header>

      <section class="pf-stats" aria-label="resumo da conta">
        <div class="pf-stat">
          <p class="lbl">teus pontos</p>
          <p class="pf-n">${pontos}</p>
          <a href="/conta/pontos">ver extrato e resgatar</a>
        </div>
        <div class="pf-stat${temPlano ? '' : ' pf-stat-plano'}">
          <p class="lbl">teu plano</p>
          <p class="pf-plano">${plano}</p>
          ${
            ehPresente
              ? presenteVigente
                ? `<p class="status"><span class="dot gold"></span>presente · ativo até ${ativoAte}</p>`
                : `<p class="status"><span class="dot muted"></span>presente encerrado</p>`
              : ativa
                ? `<p class="status"><span class="dot green"></span>ativo</p>`
                : emGraca
                  ? `<p class="status"><span class="dot gold"></span>pausado · ativo até ${ativoAte}</p>`
                  : pausada
                    ? `<p class="status"><span class="dot muted"></span>pausado</p>`
                    : reassinavel
                      ? `<p class="status"><span class="dot muted"></span>encerrado</p>`
                      : `<a href="/planos">ver os planos</a>`
          }
          ${
            temPlano
              ? ''
              : `<div class="pf-presente" data-presente-resgate>
            <button type="button" class="pf-presente-chip" data-presente-toggle aria-expanded="false" aria-controls="pf-presente-corpo">
              tem um presente?
            </button>
            <div class="pf-presente-pop" id="pf-presente-corpo" data-presente-corpo hidden>
              <p class="pf-presente-sub">ganhou um mês do Casa de alguém? digita o código e ele é teu.</p>
              <label class="field" for="pf-presente">
                <span class="lbl">código do presente</span>
                <input id="pf-presente" type="text" data-presente-codigo placeholder="CASA-XXXXXX" autocomplete="off" spellcheck="false" />
                <span class="hint">é do tipo CASA-XXXXXX, quem te deu passou pra ti.</span>
              </label>
              <div class="pf-actions">
                <button type="button" class="btn solid sm" data-presente-btn>resgatar presente</button>
              </div>
              <p class="hidden text-sm" data-presente-msg aria-live="polite"></p>
            </div>
          </div>`
          }
        </div>
        <div class="pf-stat">
          <p class="lbl">e-mail</p>
          <p class="pf-email">${email}</p>
          ${
            emailVerificado
              ? `<p class="status"><span class="dot green"></span>verificado</p>`
              : `<p class="status"><span class="dot gold"></span>falta confirmar</p>`
          }
        </div>
      </section>

      <!-- Hoje o Casa é teu 🎂: no mês do aniversário, o assinante reserva um brunch
           (pra uma pessoa) por nossa conta. Preenchido pós-render (RPC
           meu_brinde_aniversario). Escondido por padrão; o JS revela só quando faz
           sentido (é o teu mês, ou tem código vivo). Migration 0025 pendente → some. -->
      <section class="card pf-aniver" data-aniversario hidden>
        <div class="pf-aniver-head">
          <span class="pf-aniver-emoji" aria-hidden="true">🎂</span>
          <div>
            <p class="pf-script" data-aniver-script>é o teu mês</p>
            <h2 class="pf-aniver-titulo" data-aniver-titulo>este mês, o Casa é teu</h2>
          </div>
        </div>
        <p class="pf-aniver-txt" data-aniver-txt></p>
        <div class="pf-aniver-corpo" data-aniver-corpo></div>
      </section>

      <section class="pf-prog" aria-label="perfil completo">
        <div class="pf-prog-top">
          <p class="pf-prog-title">teu perfil tá <em data-progress-pct>0%</em> completo</p>
          <p class="pf-prog-hint">quanto mais tu contar, melhor a gente acerta teu café</p>
        </div>
        <div class="pf-prog-track" role="progressbar" aria-label="perfil completo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="pf-prog-bar" data-progress-bar style="width:0%"></div>
        </div>
      </section>

      <form class="card pf-sec" data-section="dados" novalidate>
        <div class="pf-head">
          <h2>teus dados</h2>
          <p>atualiza quando quiser, é só teu.</p>
        </div>
        <div class="pf-grid">
          <label class="field" for="pf-nome">
            <span class="lbl">nome completo</span>
            <input id="pf-nome" name="nome" type="text" value="${nome}" autocomplete="name" />
          </label>
          <label class="field" for="pf-apelido">
            <span class="lbl">como te chamar</span>
            <input id="pf-apelido" name="apelido" type="text" value="${val(extra?.apelido)}" placeholder="do jeito que teus amigos te chamam" autocomplete="nickname" />
          </label>
          <label class="field" for="pf-telefone">
            <span class="lbl">celular / whatsapp</span>
            <input id="pf-telefone" name="telefone" type="tel" value="${telefone}" inputmode="tel" autocomplete="tel" data-mask="phone" />
          </label>
          <label class="field" for="pf-nascimento">
            <span class="lbl">aniversário</span>
            <input id="pf-nascimento" name="nascimento" type="date" value="${val(extra?.nascimento)}" autocomplete="bday" />
            <span class="hint">no teu dia tem café por nossa conta</span>
          </label>
          <label class="field pf-wide" for="pf-email">
            <span class="lbl">e-mail</span>
            <input id="pf-email" name="email" type="email" value="${email}" readonly />
            <button type="button" class="pf-inline-link" data-trocar-email>trocar e-mail</button>
          </label>
        </div>
        <div class="hidden" data-email-painel>
          <label class="field" for="pf-email-novo">
            <span class="lbl">e-mail novo</span>
            <input id="pf-email-novo" type="email" inputmode="email" autocomplete="email" placeholder="teu e-mail novo" />
            <span class="hint">a gente manda um link pro endereço novo. ele só passa a valer depois que tu confirmar por lá.</span>
          </label>
          <div class="pf-actions">
            <button type="button" class="btn solid sm" data-email-enviar>mandar o link</button>
            <button type="button" class="btn ghost sm" data-email-cancelar>deixa quieto</button>
          </div>
          <p class="hidden text-sm" data-email-msg aria-live="polite"></p>
        </div>
        <p class="hidden text-sm" data-perfil-msg aria-live="polite"></p>
        <div><button type="submit" class="btn solid">salvar teus dados</button></div>
      </form>

      <form class="card pf-sec g-lg" data-section="cafe" novalidate>
        <div class="pf-head">
          <h2>teu café</h2>
          <p>o barista dá uma olhada aqui antes de moer.</p>
        </div>
        <div class="pf-chip-group">
          <span class="lbl">método de casa</span>
          <div class="pf-chips" role="group" aria-label="método de casa">${chips('metodo', CAFE_METODOS, extra?.cafe_metodo)}</div>
        </div>
        <div class="pf-chip-group">
          <span class="lbl">torra preferida</span>
          <div class="pf-chips" role="group" aria-label="torra preferida">${chips('torra', CAFE_TORRAS, extra?.cafe_torra)}</div>
        </div>
        <div class="pf-chip-group">
          <span class="lbl">com leite?</span>
          <div class="pf-chips" role="group" aria-label="com leite">${chips('leite', CAFE_LEITES, extra?.cafe_leite)}</div>
        </div>
        <div class="pf-grid">
          <label class="field" for="pf-restricoes">
            <span class="lbl">restrições / alergias</span>
            <input id="pf-restricoes" name="restricoes" type="text" value="${val(extra?.cafe_restricoes)}" placeholder="sem lactose, sem castanha…" />
          </label>
          <label class="field" for="pf-horario">
            <span class="lbl">costuma passar</span>
            <select id="pf-horario" name="horario">
              <option value="">quando dá</option>
              ${CAFE_HORARIOS.map(
                (o) =>
                  `<option value="${o.valor}"${extra?.cafe_horario === o.valor ? ' selected' : ''}>${o.rotulo}</option>`,
              ).join('')}
            </select>
          </label>
        </div>
        <div><button type="submit" class="btn solid">salvar teu café</button></div>
      </form>

      <form class="card pf-sec" data-section="entrega" data-endereco-form novalidate>
        <div class="pf-head">
          <h2>onde te entregamos</h2>
          <p>endereço da tua assinatura. dá pra retirar aqui na casa também.</p>
        </div>
        <div class="pf-grid addr">
          <label class="field" for="pf-cep">
            <span class="lbl">cep</span>
            <input id="pf-cep" name="cep" type="text" value="${val(extra?.end_cep)}" placeholder="93000-000" inputmode="numeric" autocomplete="postal-code" data-mask="cep" data-endereco-campo readonly />
          </label>
          <label class="field pf-wide" for="pf-rua">
            <span class="lbl">rua</span>
            <input id="pf-rua" name="rua" type="text" value="${val(extra?.end_rua)}" autocomplete="address-line1" data-endereco-campo readonly />
          </label>
          <label class="field" for="pf-numero">
            <span class="lbl">número</span>
            <input id="pf-numero" name="numero" type="text" value="${val(extra?.end_numero)}" inputmode="numeric" data-endereco-campo readonly />
          </label>
          <label class="field" for="pf-complemento">
            <span class="lbl">complemento</span>
            <input id="pf-complemento" name="complemento" type="text" value="${val(extra?.end_complemento)}" placeholder="apto 302" autocomplete="address-line2" data-endereco-campo readonly />
          </label>
          <label class="field" for="pf-bairro">
            <span class="lbl">bairro</span>
            <input id="pf-bairro" name="bairro" type="text" value="${val(extra?.end_bairro)}" data-endereco-campo readonly />
          </label>
          <label class="field" for="pf-cidade">
            <span class="lbl">cidade</span>
            <input id="pf-cidade" name="cidade" type="text" value="${val(extra?.end_cidade)}" autocomplete="address-level2" data-endereco-campo readonly />
          </label>
          <label class="field" for="pf-uf">
            <span class="lbl">uf</span>
            <input id="pf-uf" name="uf" type="text" value="${val(extra?.end_uf)}" placeholder="RS" maxlength="2" autocomplete="address-level1" data-uf data-endereco-campo readonly />
          </label>
        </div>
        <div class="pf-actions">
          <button type="button" class="btn ghost" data-endereco-editar>editar</button>
          <button type="submit" class="btn solid" data-endereco-salvar disabled>salvar endereço</button>
        </div>
      </form>

      <section class="card pf-sec">
        <div class="pf-head">
          <h2>teus avisos</h2>
          <p>a gente fala pouco, e só do que importa.</p>
        </div>
        <div class="pf-toggles">
          ${PERFIL_AVISOS.map(
            (a) => `<div class="pf-toggle">
                      <div class="pf-toggle-txt">
                        <b>${a.titulo}</b>
                        <span>${a.sub}</span>
                      </div>
                      <button type="button" class="pf-switch" role="switch" data-aviso="${a.chave}" aria-checked="${
                        avisos[a.chave] ? 'true' : 'false'
                      }" aria-label="${a.titulo}"><span></span></button>
                    </div>`,
          ).join('')}
        </div>
        <p class="hidden text-sm" data-avisos-msg aria-live="polite"></p>
      </section>

      ${
        temGerenciar
          ? `<section class="card pf-sec" data-gerenciar>
              <div class="flex items-center gap-2">
                <i data-lucide="settings-2" class="h-5 w-5 text-coral"></i>
                <h2 class="font-titulo text-xl">gerenciar assinatura</h2>
              </div>
              ${
                ativa
                  ? temDowngradeAgendado
                    ? `<p class="mt-2 text-sm text-ink-2">teu <strong class="font-semibold text-ink">${plano}</strong> segue ativo${
                        proximaCobranca ? ` até <strong class="font-semibold text-ink">${proximaCobranca}</strong>` : ''
                      }, e a partir daí vira <strong class="font-semibold text-ink">${agendadoNome}</strong>, um plano mais leve, sem pagar do zero. mudou de ideia? dá pra manter o ${plano}, ou subir pra um plano maior.</p>`
                    : `<p class="mt-2 text-sm text-ink-2">teu <strong class="font-semibold text-ink">${plano}</strong> tá ativo.${
                        proximaCobranca ? ` próxima cobrança em <strong class="font-semibold text-ink">${proximaCobranca}</strong>.` : ''
                      }</p>`
                  : emGraca
                    ? `<p class="mt-2 text-sm text-ink-2">teu <strong class="font-semibold text-ink">${plano}</strong> tá pausado. os benefícios seguem até <strong class="font-semibold text-ink">${ativoAte}</strong>, e a gente não te cobra de novo. quando quiser, é só retomar (sem pagar do zero).</p>`
                    : reassinavel
                      ? `<p class="mt-2 text-sm text-ink-2">tua assinatura do <strong class="font-semibold text-ink">${plano}</strong> foi encerrada. quando quiser voltar, a porta tá aberta, é uma assinatura nova, começando um ciclo do zero.</p>`
                      : `<p class="mt-2 text-sm text-ink-2">teu plano tá pausado e o período já acabou. dá pra retomar quando quiser, reativando a mesma assinatura.</p>`
              }

              <div class="mt-4 flex flex-wrap gap-3">
                ${
                  temDowngradeAgendado
                    ? `<button type="button" data-manter-plano class="btn solid sm"><i data-lucide="heart" class="h-4 w-4"></i>manter o ${plano}</button>`
                    : ''
                }
                ${
                  ativa && tiersUpgrade.length
                    ? `<button type="button" data-upgrade-abrir class="${
                        temDowngradeAgendado ? 'btn ghost' : 'btn solid'
                      } sm"><i data-lucide="arrow-up-circle" class="h-4 w-4"></i>fazer upgrade</button>`
                    : ''
                }
                ${
                  ativa
                    ? `<button type="button" data-cancelar-assinatura class="btn ghost sm">pausar assinatura</button>`
                    : reassinavel
                      ? `<button type="button" data-reassinar data-tier="${escapeHtml(planoSlug)}" class="btn solid sm"><i data-lucide="play-circle" class="h-4 w-4"></i>voltar pro ${plano}</button>`
                      : `<button type="button" data-retomar class="btn solid sm"><i data-lucide="play-circle" class="h-4 w-4"></i>retomar plano</button>`
                }
              </div>

              ${
                ativa && tiersUpgrade.length
                  ? `<div class="mt-4 hidden card flat" style="border-color:var(--gold)" data-upgrade-painel>
                       <p class="text-sm text-ink-2">tu paga só a <strong class="font-semibold text-ink">diferença proporcional</strong> pelos dias que faltam${
                         proximaCobranca ? ` até ${proximaCobranca}` : ''
                       }. no próximo ciclo, o valor cheio do novo plano.</p>
                       ${
                         temDowngradeAgendado
                           ? `<p class="mt-2 text-sm text-ink-2">e olha: subir de plano desfaz a descida pro <strong class="font-semibold text-ink">${agendadoNome}</strong> que tava agendada, tu segue pra cima. 💛</p>`
                           : ''
                       }
                       <div class="mt-3 grid gap-2">
                         ${tiersUpgrade
                           .map(
                             (t) =>
                               `<button type="button" data-upgrade-tier="${escapeHtml(t.slug)}" class="flex items-center justify-between rounded-lg bg-card px-4 py-2.5 text-left ring-1 ring-line transition hover:ring-coral/40 disabled:opacity-50">
                                  <span class="text-sm font-medium text-ink">${escapeHtml(t.nome)}</span>
                                  <span class="text-sm text-coral">${formatBRL(t.preco_centavos)}/mês</span>
                                </button>`,
                           )
                           .join('')}
                       </div>
                     </div>`
                  : ''
              }

              <p class="mt-3 hidden text-sm text-ink-2" data-assinatura-msg aria-live="polite"></p>

              <!-- Modal reutilizável: passo 1 = confirmação (só no pausar); passo 2 =
                   carregando (pausar E retomar). Overlay fixo cobrindo a tela. Fecha por
                   Esc/backdrop só na confirmação; no carregando fica travado (a pessoa
                   aguarda o back). Spinner respeita prefers-reduced-motion (motion-safe). -->
              <div class="fixed inset-0 z-50 hidden items-center justify-center bg-preto/40 p-4 backdrop-blur-sm" data-modal aria-hidden="true">
                <div class="w-full max-w-sm card shadow-xl" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
                  <div data-modal-confirm>
                    <h3 id="modal-titulo" class="font-titulo text-xl text-ink" data-modal-titulo>tem certeza?</h3>
                    <p class="mt-2 text-sm text-ink-2" data-modal-texto></p>
                    <div class="mt-5 flex justify-end gap-3">
                      <button type="button" data-modal-nao class="btn solid sm">deixa quieto</button>
                      <button type="button" data-modal-sim class="btn ghost sm">sim, pausar</button>
                    </div>
                    ${
                      tiersDowngrade.length
                        ? `<div class="mt-5 hidden border-t border-line pt-4" data-modal-downgrade>
                             <p class="text-center lbl">ou, se preferir</p>
                             <p class="mt-2 text-sm text-ink-2">dá pra continuar com a gente num plano mais leve. tu mantém o ${plano}${
                               proximaCobranca ? ` até ${proximaCobranca}` : ''
                             } e, a partir daí, segue no novo, sem pagar do zero.</p>
                             <div class="mt-3 grid gap-2">
                               ${tiersDowngrade
                                 .map(
                                   (t) =>
                                     `<button type="button" data-downgrade-tier="${escapeHtml(t.slug)}" class="flex items-center justify-between rounded-lg bg-paper-2 px-4 py-2.5 text-left ring-1 ring-line transition hover:ring-olive/40 disabled:opacity-50">
                                        <span class="text-sm font-medium text-ink">${escapeHtml(t.nome)}</span>
                                        <span class="text-sm text-olive">${formatBRL(t.preco_centavos)}/mês</span>
                                      </button>`,
                                 )
                                 .join('')}
                             </div>
                           </div>`
                        : ''
                    }
                  </div>
                  ${
                    tiersDowngrade.length
                      ? `<!-- Passo intermediário: confirma a descida de plano (evita missclick
                               no botão do plano leve). Só é alcançável pelo off-ramp acima. -->
                         <div data-modal-downgrade-confirm class="hidden">
                           <h3 class="font-titulo text-xl text-ink">descer pro plano <span data-dg-nome></span>?</h3>
                           <p class="mt-2 text-sm text-ink-2" data-dg-texto></p>
                           <div class="mt-5 flex justify-end gap-3">
                             <button type="button" data-dg-voltar class="btn solid sm">voltar</button>
                             <button type="button" data-dg-sim class="btn ghost sm">sim, quero o mais leve</button>
                           </div>
                         </div>`
                      : ''
                  }
                  <div data-modal-loading class="hidden flex-col items-center py-4 text-center">
                    <span class="inline-block h-8 w-8 rounded-full border-2 border-line border-t-coral motion-safe:animate-spin" aria-hidden="true"></span>
                    <p class="mt-3 text-sm text-ink-2" data-modal-loading-texto aria-live="polite">só um instante… 💛</p>
                  </div>
                </div>
              </div>
            </section>`
          : ''
      }

      <div class="pf-links">
        <a class="pf-link" href="/conta/conquistas">
          <span><i data-lucide="award" class="h-4 w-4"></i>minhas conquistas</span>
          <span class="arw" aria-hidden="true">→</span>
        </a>
      </div>

      <!-- Indica um amigo: convite pra trazer gente. Preenchido pós-render (RPC
           meu_codigo_indicacao). Fica escondido até termos o código — se a migration
           0021 ainda não foi aplicada, some sem deixar caco na tela. -->
      <section class="pf-indica" data-indica hidden>
        <div class="pf-head">
          <h2>traz quem tu gosta</h2>
          <p>manda teu convite pra quem ia gostar do Casa. quando teu amigo entra e assina, vocês <strong>dois ganham pontos</strong> 💛</p>
        </div>
        <div class="pf-indica-card">
          <span class="pf-indica-label">teu convite</span>
          <div class="pf-indica-linkbox">
            <span class="pf-indica-link" data-indica-link>gerando teu convite…</span>
            <button type="button" class="pf-indica-copy" data-indica-copy aria-label="copiar o convite">
              <i data-lucide="copy" class="h-4 w-4"></i><span>copiar</span>
            </button>
          </div>
          <p class="pf-indica-conta" data-indica-conta hidden></p>
        </div>
      </section>

      <!-- Meu cantinho: perfil público opt-in em /gente/{handle}. Preenchido
           pós-render (RPCs do 0024). Escondido até sabermos o estado; se a migration
           ainda não foi aplicada, some sem deixar caco. -->
      <section class="pf-indica" data-cantinho hidden>
        <div class="pf-head">
          <h2>meu cantinho</h2>
          <p>um cartãozinho teu, público, pra dar rosto à comunidade — apelido, teu café de sempre, teus recados. <strong>e-mail, telefone e pontos ficam de fora</strong>, sempre.</p>
        </div>
        <div class="pf-indica-card">
          <label class="pf-cantinho-toggle">
            <input type="checkbox" data-cantinho-check />
            <span data-cantinho-label>mostrar meu cantinho</span>
          </label>
          <div class="pf-cantinho-link" data-cantinho-linkwrap hidden>
            <div class="pf-indica-linkbox">
              <a class="pf-indica-link" data-cantinho-link href="#" target="_blank" rel="noopener"></a>
              <button type="button" class="pf-indica-copy" data-cantinho-copy aria-label="copiar o link">
                <i data-lucide="copy" class="h-4 w-4"></i><span>copiar</span>
              </button>
            </div>
          </div>
          <p class="pf-indica-conta" data-cantinho-msg hidden></p>
        </div>
      </section>

      <!-- Voltou pra vitrine: o que a pessoa esperava e voltou ao estoque.
           Preenchido pós-render por initReposicao. Escondido sem nada / sem a 0030. -->
      <section class="loja-desejos loja-voltou" data-reposicao-perfil hidden>
        <div class="pf-head">
          <h2>voltou pra vitrine</h2>
          <p>produtos que tu pediu pra avisar e já voltaram ao estoque. toca pra abrir.</p>
        </div>
        <div class="ld-chips" data-rep-chips></div>
      </section>

      <!-- Ficou pra depois: espelho da lista de desejos da loja. Preenchido
           pós-render por initLojaDesejos (chamada no fim desta função). Escondido
           sem desejos / sem a migration 0029. -->
      <section class="loja-desejos" data-desejos-perfil hidden>
        <div class="pf-head">
          <h2>ficou pra depois</h2>
          <p>o que tu guardou na loja pra levar num outro dia. toca pra abrir, ou tira da lista.</p>
        </div>
        <div class="ld-chips" data-ld-chips></div>
      </section>

      <section>
        <div class="pf-head">
          <h2>conta e privacidade</h2>
          <p>teus dados são teus. leva contigo quando quiser.</p>
        </div>
        <div class="pf-links">
          <button type="button" class="pf-link" data-acao="senha">
            <span>trocar a senha</span><span class="arw" aria-hidden="true">→</span>
          </button>
          <button type="button" class="pf-link" data-acao="sessoes" aria-expanded="false" aria-controls="pf-sessoes">
            <span>aparelhos conectados</span><span class="arw" aria-hidden="true">→</span>
          </button>
          <div class="pf-sessoes" id="pf-sessoes" data-sessoes hidden>
            <p class="pf-sessoes-intro">
              é aqui que tua conta tá aberta agora. não reconheceu algum? encerra ele, e,
              por garantia, troca a senha depois.
            </p>
            <div data-sessoes-lista></div>
            <p class="hidden text-sm" data-sessoes-msg aria-live="polite"></p>
          </div>
          <button type="button" class="pf-link" data-acao="dados">
            <span>baixar meus dados</span><span class="arw" aria-hidden="true">→</span>
          </button>
          <button type="button" class="pf-link danger" data-acao="excluir">
            <span>excluir minha conta</span><span class="arw" aria-hidden="true">→</span>
          </button>
        </div>
        <p class="hidden text-sm" data-conta-msg aria-live="polite"></p>
      </section>

      <div class="pf-signout">
        <button type="button" data-signout class="btn ghost">
          <i data-lucide="log-out" class="h-4 w-4"></i>sair da conta
        </button>
        <p class="pf-script">até a próxima ☕</p>
      </div>
    </div>
    <div class="pf-toast" role="status" aria-live="polite" data-toast hidden></div>`;

  renderIcons();

  // ── "gerenciar assinatura" logo abaixo do resumo ──────────────────────────
  // No template ela nasce no fim da página; a gente sobe pra logo depois da
  // linha de resumo (teus pontos / teu plano / e-mail), que é onde ela conversa.
  {
    const gerenciar = root.querySelector('[data-gerenciar]');
    const stats = root.querySelector('.pf-stats');
    if (gerenciar && stats) stats.after(gerenciar);
  }

  // ── Resgatar presente (código dado por outra pessoa) ──────────────────────
  // Chama a Edge Function resgatar-presente (que valida na RPC atômica). Sucesso →
  // recarrega pra o plano do presente já aparecer no perfil.
  {
    const presenteInput = root.querySelector('[data-presente-codigo]');
    const presenteBtn = root.querySelector('[data-presente-btn]');
    const presenteMsg = root.querySelector('[data-presente-msg]');
    const presenteToggle = root.querySelector('[data-presente-toggle]');
    const presenteCorpo = root.querySelector('[data-presente-corpo]');
    // A seção começa fechada: só o "tem um presente?" aparece. Clicar revela o
    // campo do código (espelha o toggle das sessões — hidden + aria-expanded).
    presenteToggle?.addEventListener('click', () => {
      const abrindo = presenteCorpo.hidden;
      presenteCorpo.hidden = !abrindo;
      presenteToggle.setAttribute('aria-expanded', String(abrindo));
      if (abrindo) presenteInput?.focus();
    });
    const mostrarPresenteMsg = (txt, tom = 'neutro') => {
      if (!presenteMsg) return;
      presenteMsg.textContent = txt; // textContent → sem XSS
      presenteMsg.className =
        'mt-3 text-sm ' + (tom === 'erro' ? 'text-coral' : tom === 'ok' ? 'text-olive' : 'text-ink-2');
      presenteMsg.classList.remove('hidden');
    };
    presenteBtn?.addEventListener('click', async () => {
      const codigo = (presenteInput?.value || '').trim();
      if (!codigo) return mostrarPresenteMsg('digita o código do presente 💛', 'erro');
      if (!supabase) return mostrarPresenteMsg('resgate ainda não tá ligado por aqui (config pendente). 💛', 'erro');

      const original = presenteBtn.textContent;
      presenteBtn.disabled = true;
      presenteBtn.textContent = 'resgatando…';
      try {
        const { data, error } = await supabase.functions.invoke('resgatar-presente', { body: { codigo } });
        if (error || !data?.ok) {
          // Em HTTP não-2xx o functions-js devolve data=null e joga a resposta crua em
          // error.context — sem ler dali, o recado gentil da função vira genérico.
          let msg = data?.error || '';
          if (!msg && typeof error?.context?.json === 'function') {
            try {
              const corpo = await error.context.json();
              if (corpo?.error) msg = String(corpo.error);
            } catch {
              /* corpo não-JSON: segue pra mensagem genérica */
            }
          }
          if (!msg) msg = 'não deu pra resgatar agora. confere o código? 💛';
          mostrarPresenteMsg(msg, 'erro');
          return;
        }
        const nome = data.tier_nome ? ` ${data.tier_nome}` : '';
        mostrarPresenteMsg(`presente resgatado! teu plano${nome} já vale — recarregando… 💛`, 'ok');
        setTimeout(() => window.location.reload(), 1400);
      } catch {
        mostrarPresenteMsg('a gente não conseguiu falar com o servidor agora. confere tua conexão?', 'erro');
      } finally {
        presenteBtn.disabled = false;
        presenteBtn.textContent = original;
      }
    });
  }

  // ── Indica um amigo: convite + convidados que já entraram ─────────────────
  // Pega o código do PRÓPRIO usuário (RPC meu_codigo_indicacao, gera na 1ª vez),
  // monta o link de convite e liga o "copiar". Best-effort: se a RPC não existe
  // (migration 0021 pendente) ou falha, a seção continua escondida — sem ruído.
  {
    const indicaSec = root.querySelector('[data-indica]');
    if (indicaSec && supabase) {
      (async () => {
        const { data: codigo, error } = await supabase.rpc('meu_codigo_indicacao');
        if (error || !codigo) return; // migration pendente / erro → seção fica hidden
        const link = `${siteBase()}/cadastro?indica=${encodeURIComponent(codigo)}`;
        const linkEl = indicaSec.querySelector('[data-indica-link]');
        const copyEl = indicaSec.querySelector('[data-indica-copy]');
        const contaEl = indicaSec.querySelector('[data-indica-conta]');
        // O link é URL montada por nós (código validado no regex do banco) — texto puro.
        if (linkEl) linkEl.textContent = link;
        indicaSec.hidden = false;

        if (copyEl) {
          const labelEl = copyEl.querySelector('span');
          copyEl.addEventListener('click', async () => {
            let ok = false;
            try {
              await navigator.clipboard.writeText(link);
              ok = true;
            } catch {
              // Fallback pra navegador sem clipboard API (ou sem permissão): seleciona o texto.
              try {
                const range = document.createRange();
                range.selectNodeContents(linkEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                ok = document.execCommand?.('copy') || false;
                sel.removeAllRanges();
              } catch {
                ok = false;
              }
            }
            if (labelEl) {
              labelEl.textContent = ok ? 'copiado!' : 'copia o texto aí ☝️';
              copyEl.classList.toggle('ok', ok);
              setTimeout(() => {
                labelEl.textContent = 'copiar';
                copyEl.classList.remove('ok');
              }, 2200);
            }
          });
        }

        // Quantos já entraram pelo convite (premiados). Best-effort, silencioso.
        try {
          const { count } = await supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', session.user.id)
            .eq('status', 'premiado');
          if (contaEl && Number(count) > 0) {
            const n = Number(count);
            contaEl.textContent = n === 1 ? 'já entrou 1 amigo pelo teu convite 💛' : `já entraram ${n} amigos pelo teu convite 💛`;
            contaEl.hidden = false;
          }
        } catch {
          /* tabela ainda não existe: ignora */
        }
      })();
    }
  }

  // ── Meu cantinho: perfil público opt-in (/gente/{handle}) ─────────────────
  // Lê o estado atual (perfil_publico/handle) e liga o toggle → definir_perfil_publico.
  // Tolerante: sem a migration 0024, a seção fica escondida.
  {
    const cantinhoSec = root.querySelector('[data-cantinho]');
    if (cantinhoSec && supabase) {
      (async () => {
        let estado = null;
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('perfil_publico, handle')
            .eq('id', session.user.id)
            .maybeSingle();
          if (error) return; // colunas ainda não existem → seção fica hidden
          estado = data || {};
        } catch {
          return;
        }

        const check = cantinhoSec.querySelector('[data-cantinho-check]');
        const labelEl = cantinhoSec.querySelector('[data-cantinho-label]');
        const linkWrap = cantinhoSec.querySelector('[data-cantinho-linkwrap]');
        const linkEl = cantinhoSec.querySelector('[data-cantinho-link]');
        const copyEl = cantinhoSec.querySelector('[data-cantinho-copy]');
        const msgEl = cantinhoSec.querySelector('[data-cantinho-msg]');

        const mostrarMsgC = (txt, tom = 'neutro') => {
          if (!msgEl) return;
          msgEl.textContent = txt;
          msgEl.className = 'pf-indica-conta ' + (tom === 'erro' ? 'text-coral' : tom === 'ok' ? 'text-olive' : '');
          msgEl.hidden = !txt;
        };

        const pintarLink = (handle) => {
          if (!handle || !linkEl) {
            if (linkWrap) linkWrap.hidden = true;
            return;
          }
          const url = `${siteBase()}/gente/${encodeURIComponent(handle)}`;
          linkEl.textContent = url;
          linkEl.href = url;
          if (linkWrap) linkWrap.hidden = false;
        };

        const aplicarEstado = (ativo, handle) => {
          if (check) check.checked = Boolean(ativo);
          if (labelEl) labelEl.textContent = ativo ? 'teu cantinho está no ar' : 'mostrar meu cantinho';
          if (ativo) pintarLink(handle);
          else if (linkWrap) linkWrap.hidden = true;
        };

        aplicarEstado(estado.perfil_publico, estado.handle);
        cantinhoSec.hidden = false;

        check?.addEventListener('change', async () => {
          const ativar = check.checked;
          check.disabled = true;
          mostrarMsgC('');
          try {
            const { data, error } = await supabase.rpc('definir_perfil_publico', { p_ativar: ativar });
            if (error || !data?.ok) {
              check.checked = !ativar; // desfaz o toggle
              mostrarMsgC(data?.erro || 'não deu pra mudar agora. tenta de novo? 💛', 'erro');
              return;
            }
            aplicarEstado(data.ativo, data.handle);
            mostrarMsgC(
              data.ativo ? 'pronto, teu cantinho está no ar 💛' : 'teu cantinho voltou a ser só teu.',
              'ok',
            );
          } catch {
            check.checked = !ativar;
            mostrarMsgC('a gente não conseguiu falar com o servidor agora. confere tua conexão?', 'erro');
          } finally {
            check.disabled = false;
          }
        });

        copyEl?.addEventListener('click', async () => {
          const url = linkEl?.href || '';
          if (!url) return;
          const span = copyEl.querySelector('span');
          let ok = false;
          try {
            await navigator.clipboard.writeText(url);
            ok = true;
          } catch {
            ok = false;
          }
          if (span) {
            span.textContent = ok ? 'copiado!' : 'copia daí ☝️';
            copyEl.classList.toggle('ok', ok);
            setTimeout(() => {
              span.textContent = 'copiar';
              copyEl.classList.remove('ok');
            }, 2200);
          }
        });
      })();
    }
  }

  // ── Hoje o Casa é teu 🎂: brunch de aniversário ───────────────────────────
  // Lê o estado (RPC meu_brinde_aniversario) e desenha o card só quando importa:
  // é o mês do aniversário, ou existe um código ainda válido pra mostrar no balcão.
  // Tolerante: sem a migration 0025, a RPC falha e o card fica escondido.
  {
    const aniverSec = root.querySelector('[data-aniversario]');
    if (aniverSec && supabase) {
      (async () => {
        const { data: st, error } = await supabase.rpc('meu_brinde_aniversario');
        if (error || !st) return; // migration pendente / erro → card fica hidden

        const temCodigo = Boolean(st.codigo);
        const mostrar = st.eh_mes || (temCodigo && st.situacao === 'ativo');
        if (!mostrar) return; // fora do mês e sem código vivo → nem aparece

        const scriptEl = aniverSec.querySelector('[data-aniver-script]');
        const titEl = aniverSec.querySelector('[data-aniver-titulo]');
        const txtEl = aniverSec.querySelector('[data-aniver-txt]');
        const corpo = aniverSec.querySelector('[data-aniver-corpo]');

        if (scriptEl) scriptEl.textContent = st.eh_dia ? 'feliz aniversário' : 'é o teu mês';
        if (titEl) titEl.textContent = st.eh_dia ? 'hoje o Casa é teu' : 'este mês, o Casa é teu';

        // Desenha a caixa do código (reutilizada no resgate feito na hora).
        const pintarCodigo = (codigo, validoAte) => {
          txtEl.textContent = 'teu brunch de aniversário tá reservado — pra ti, por nossa conta. mostra esse código no balcão:';
          corpo.innerHTML =
            `<div class="pf-aniver-codebox"><span class="pf-aniver-code">${escapeHtml(codigo)}</span></div>` +
            `<p class="pf-aniver-val">vale até ${escapeHtml(dataDiaMes(validoAte))} · é só pra ti 💛</p>`;
        };

        if (temCodigo && st.situacao === 'usado') {
          txtEl.textContent = 'já comemoramos juntos esse ano 💛 até o teu próximo aniversário!';
          corpo.innerHTML = '';
        } else if (temCodigo && st.situacao === 'expirado') {
          txtEl.textContent = 'teu brunch desse ano acabou vencendo — fica pro próximo, e a gente comemora dobrado 💛';
          corpo.innerHTML = '';
        } else if (temCodigo && st.situacao === 'ativo') {
          pintarCodigo(st.codigo, st.valido_ate);
        } else if (!st.assinante) {
          txtEl.textContent = 'no teu mês, quem é do Casa (tem plano) ganha um brunch de aniversário por nossa conta. bora fazer parte?';
          corpo.innerHTML = `<a class="btn solid sm" href="/planos">conhecer os planos</a>`;
        } else {
          txtEl.textContent = 'tem um brunch de aniversário te esperando — pra ti, por nossa conta. quando quiser, é teu.';
          corpo.innerHTML =
            `<button type="button" class="btn solid sm" data-aniver-btn>quero meu brunch 🎂</button>` +
            `<p class="hidden text-sm" data-aniver-msg aria-live="polite"></p>`;
          const btn = corpo.querySelector('[data-aniver-btn]');
          const msg = corpo.querySelector('[data-aniver-msg]');
          const erroMsg = (txt) => {
            if (!msg) return;
            msg.textContent = txt;
            msg.className = 'text-sm text-coral';
            msg.hidden = false;
          };
          btn?.addEventListener('click', async () => {
            btn.disabled = true;
            if (msg) msg.hidden = true;
            try {
              const { data: r, error: e } = await supabase.rpc('resgatar_brinde_aniversario');
              if (e || !r?.ok) {
                erroMsg(r?.erro || 'não deu pra reservar agora. tenta de novo? 💛');
                btn.disabled = false;
                return;
              }
              pintarCodigo(r.codigo, r.valido_ate);
            } catch {
              erroMsg('a gente não conseguiu falar com o servidor agora. confere tua conexão?');
              btn.disabled = false;
            }
          });
        }

        aniverSec.hidden = false;
        renderIcons();
      })();
    }
  }

  // ── Gerenciar assinatura: pausar / retomar / upgrade ──────────────────────
  // A NOSSA tela (o Asaas não tem portal hospedado). Toda a lógica sensível (o
  // que pode pausar/retomar/quanto custa o upgrade) é refeita nas Edge Functions;
  // aqui o client só dispara e reflete o resultado.
  const assinaturaMsg = root.querySelector('[data-assinatura-msg]');
  const mostrarMsg = (txt, tom = 'neutro') => {
    if (!assinaturaMsg) return;
    assinaturaMsg.textContent = txt; // textContent → sem risco de XSS
    assinaturaMsg.className =
      'mt-3 text-sm ' +
      (tom === 'erro' ? 'text-coral' : tom === 'ok' ? 'text-olive' : 'text-ink-2');
  };

  // ── Modal (popup) reutilizável: confirmação + carregamento ────────────────
  // Passo 1 (só no pausar): confirmação. Passo 2 (pausar E retomar): carregando.
  // Fecha por Esc/backdrop/"deixa quieto" APENAS na confirmação; no carregando fica
  // travado (`modalTravado`), a pessoa aguarda a volta do back sem fechar sem querer.
  const modal = root.querySelector('[data-modal]');
  const modalConfirm = root.querySelector('[data-modal-confirm]');
  const modalLoading = root.querySelector('[data-modal-loading]');
  const modalTitulo = root.querySelector('[data-modal-titulo]');
  const modalTexto = root.querySelector('[data-modal-texto]');
  const modalSim = root.querySelector('[data-modal-sim]');
  const modalNao = root.querySelector('[data-modal-nao]');
  const modalLoadingTexto = root.querySelector('[data-modal-loading-texto]');
  const modalDowngrade = root.querySelector('[data-modal-downgrade]'); // desvio gentil (só no pausar)
  const modalDgConfirm = root.querySelector('[data-modal-downgrade-confirm]'); // passo de confirmar o downgrade
  const dgNome = root.querySelector('[data-dg-nome]');
  const dgTexto = root.querySelector('[data-dg-texto]');
  const dgVoltar = root.querySelector('[data-dg-voltar]');
  const dgSim = root.querySelector('[data-dg-sim]');
  let modalTravado = false;

  const abrirModal = () => {
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
    modal?.setAttribute('aria-hidden', 'false');
  };
  const fecharModal = () => {
    if (modalTravado) return; // no carregando, não deixa fechar
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
    modal?.setAttribute('aria-hidden', 'true');
  };
  // Passo 2: troca o conteúdo do modal pra o estado "carregando" e trava o fechamento.
  const modalParaCarregando = (txt) => {
    modalTravado = true;
    if (modalLoadingTexto) modalLoadingTexto.textContent = txt;
    modalConfirm?.classList.add('hidden');
    modalDgConfirm?.classList.add('hidden');
    modalLoading?.classList.remove('hidden');
    modalLoading?.classList.add('flex');
  };
  // Passo 1: abre o modal já no passo de confirmação, com handler fresco no "sim".
  const abrirConfirmacao = ({ titulo, texto, sim, onSim }) => {
    if (!modal) return;
    modalTravado = false;
    if (modalTitulo) modalTitulo.textContent = titulo;
    if (modalTexto) modalTexto.textContent = texto;
    if (modalSim) modalSim.textContent = sim;
    modalConfirm?.classList.remove('hidden');
    modalDgConfirm?.classList.add('hidden'); // reseta o passo de confirmar downgrade
    // Desvio gentil de retenção: a confirmação só é usada no fluxo de pausar, então
    // revelar aqui mantém o "plano mais leve" restrito a esse momento (nunca na tela).
    modalDowngrade?.classList.remove('hidden');
    modalLoading?.classList.add('hidden');
    modalLoading?.classList.remove('flex');
    if (modalSim) modalSim.onclick = onSim; // handler novo a cada abertura (sem empilhar)
    abrirModal();
    modalSim?.focus();
  };
  // Vai DIRETO pro carregando (usado no retomar, sem confirmação).
  const abrirCarregando = (txt) => {
    if (!modal) return;
    modalParaCarregando(txt);
    abrirModal();
  };
  modalNao?.addEventListener('click', fecharModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

  // Pausar (o antigo "cancelar" agora PAUSA até o fim do período pago).
  // Fluxo: clique → popup de confirmação → "sim, pausar" → estado de carregando → back.
  const cancelarBtn = root.querySelector('[data-cancelar-assinatura]');
  cancelarBtn?.addEventListener('click', () => {
    assinaturaMsg?.classList.add('hidden');
    abrirConfirmacao({
      titulo: 'pausar teu plano?',
      texto: `tu para de ser cobrado, mas mantém os benefícios até ${
        proximaCobranca || 'o fim do período'
      }. depois é só retomar, sem pagar de novo.`,
      sim: 'sim, pausar',
      onSim: async () => {
        if (!supabase) return;
        if (modalDowngrade) modalDowngrade.classList.add('hidden'); // some ao confirmar a pausa
        modalParaCarregando('pausando teu plano… 💛');
        try {
          const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: {} });
          if (error || !data?.ok) {
            modalTravado = false;
            fecharModal();
            mostrarMsg('não deu pra pausar agora. tenta de novo daqui a pouco? 💛', 'erro');
            return;
          }
          const ate = data?.ativo_ate ? new Date(data.ativo_ate) : null;
          const ateStr = ate && !Number.isNaN(ate.getTime()) ? ate.toLocaleDateString('pt-BR') : '';
          if (modalLoadingTexto) {
            modalLoadingTexto.textContent = data?.cancelada
              ? 'assinatura encerrada. a porta fica sempre aberta. 💛'
              : `plano pausado. teus benefícios seguem${ateStr ? ` até ${ateStr}` : ''}. 💛`;
          }
          setTimeout(() => window.location.reload(), 1800);
        } catch {
          modalTravado = false;
          fecharModal();
          mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
        }
      },
    });
  });

  // Retomar (reativa a MESMA assinatura pausada, sem cobrar do zero na graça).
  // Fluxo: clique → estado de carregando DIRETO (sem confirmação) → back.
  const retomarBtn = root.querySelector('[data-retomar]');
  retomarBtn?.addEventListener('click', async () => {
    if (!supabase) return;
    assinaturaMsg?.classList.add('hidden');
    abrirCarregando('retomando teu plano… 💛');
    try {
      const { data, error } = await supabase.functions.invoke('resume-subscription', { body: {} });
      if (error || !data?.ok) {
        // Lê o corpo do erro (supabase-js guarda a resposta não-2xx em error.context).
        let corpo = data || null;
        if (!corpo && error?.context?.json) {
          try { corpo = await error.context.json(); } catch { /* corpo não-JSON, tudo bem */ }
        }
        modalTravado = false;
        fecharModal();
        // 409: a assinatura pausada perdeu o vínculo com o gateway, não dá pra
        // "retomar", mas dá pra voltar pro mesmo plano numa assinatura nova.
        if (corpo?.precisa_reassinar) {
          mostrarMsg('essa assinatura perdeu o vínculo com o pagamento, então não dá pra retomar por aqui. atualiza a página pra voltar pro teu plano numa assinatura nova. 💛', 'erro');
        } else {
          mostrarMsg('não deu pra retomar agora. tenta de novo daqui a pouco? 💛', 'erro');
        }
        return;
      }
      // Vencido: a cobrança foi disparada mas ainda não confirmou, o benefício
      // volta quando o pagamento cair (o webhook reativa). No período pago, já valeu.
      if (modalLoadingTexto) {
        modalLoadingTexto.textContent = data.cobranca_em_processamento
          ? 'tô reativando teu plano, a cobrança tá sendo processada. assim que cair, teus benefícios voltam. 💛'
          : 'que bom te ver de volta, plano retomado. 💛';
      }
      setTimeout(() => window.location.reload(), 2200);
    } catch {
      modalTravado = false;
      fecharModal();
      mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
    }
  });

  // Voltar pro plano (assinatura cancelada de vez no Asaas → não dá pra "retomar",
  // então abre um checkout NOVO pro mesmo tier, assinatura nova, ciclo do zero).
  const reassinarBtn = root.querySelector('[data-reassinar]');
  reassinarBtn?.addEventListener('click', async () => {
    if (!supabase) return;
    const toTier = reassinarBtn.dataset.tier;
    if (!toTier) return;
    const txt = reassinarBtn.textContent;
    reassinarBtn.disabled = true;
    reassinarBtn.textContent = 'te levando pro pagamento…';
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier_slug: toTier },
      });
      if (error || !data?.url) {
        mostrarMsg('não deu pra abrir o pagamento agora. tenta de novo daqui a pouco? 💛', 'erro');
        reassinarBtn.disabled = false;
        reassinarBtn.textContent = txt;
        return;
      }
      window.location.href = data.url; // Checkout hospedado do Asaas (assinatura nova)
    } catch {
      mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
      reassinarBtn.disabled = false;
      reassinarBtn.textContent = txt;
    }
  });

  // Upgrade (só a diferença proporcional). A function decide: se a diferença for
  // menor que o mínimo cobrável, aplica na hora ({applied}); senão devolve o
  // {url} do checkout hospedado pra pagar a diferença.
  const upgradeAbrir = root.querySelector('[data-upgrade-abrir]');
  const upgradePainel = root.querySelector('[data-upgrade-painel]');
  upgradeAbrir?.addEventListener('click', () => upgradePainel?.classList.toggle('hidden'));

  const upgradeBtns = root.querySelectorAll('[data-upgrade-tier]');
  const travarUpgrade = (v) => upgradeBtns.forEach((b) => (b.disabled = v));
  upgradeBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!supabase) return;
      const toTier = btn.dataset.upgradeTier;
      if (!toTier) return;
      travarUpgrade(true);
      assinaturaMsg?.classList.add('hidden');
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { upgrade_to_tier: toTier },
        });
        if (error || (!data?.url && !data?.applied)) {
          mostrarMsg('não deu pra fazer o upgrade agora. tenta de novo daqui a pouco? 💛', 'erro');
          travarUpgrade(false);
          return;
        }
        if (data.url) {
          window.location.href = data.url; // paga só a diferença no checkout hospedado
          return;
        }
        // Diferença abaixo do mínimo cobrável → foi por nossa conta, já aplicado.
        mostrarMsg('pronto! teu plano já subiu, a diferença ficou por nossa conta. 💛', 'ok');
        setTimeout(() => window.location.reload(), 1800);
      } catch {
        mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
        travarUpgrade(false);
      }
    });
  });

  // Desvio de retenção (dentro do modal de pausar): em vez de pausar, AGENDA a descida
  // pro plano mais leve. A pessoa mantém o plano atual até o fim do período já pago; a
  // renovação vem no valor menor. A function refaz preço/validação server-side.
  //
  // Trava anti-missclick: clique no plano leve → passo de CONFIRMAÇÃO →
  // "sim, quero o mais leve" → carregando → back. "voltar" retorna pro passo de pausar.
  const planoNomeRaw = tiers.find((t) => t.slug === planoSlug)?.nome || planoSlug || 'teu plano';

  // Executa o downgrade de fato (só depois da confirmação).
  const executarDowngrade = async (toTier) => {
    if (!supabase) return;
    modalParaCarregando('ajustando teu plano… 💛');
    try {
      const { data, error } = await supabase.functions.invoke('downgrade-subscription', {
        body: { tier_slug: toTier },
      });
      if (error || !data?.ok) {
        modalTravado = false;
        fecharModal();
        mostrarMsg('não deu pra ajustar teu plano agora. tenta de novo daqui a pouco? 💛', 'erro');
        return;
      }
      const efet = data?.efetivo_em ? new Date(data.efetivo_em) : null;
      const efetStr = efet && !Number.isNaN(efet.getTime()) ? efet.toLocaleDateString('pt-BR') : '';
      if (modalLoadingTexto) {
        modalLoadingTexto.textContent = `pronto, segue tudo igual${
          efetStr ? ` até ${efetStr}` : ''
        }, e depois teu plano fica mais leve. dá pra voltar atrás quando quiser. 💛`;
      }
      setTimeout(() => window.location.reload(), 2200);
    } catch {
      modalTravado = false;
      fecharModal();
      mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
    }
  };

  // Passo intermediário: mostra a confirmação do downgrade com os dados do plano
  // escolhido (nome + preço), pra evitar missclick. textContent = sem risco de XSS.
  const abrirDowngradeConfirm = (toTier) => {
    const alvo = tiersDowngrade.find((t) => t.slug === toTier);
    if (!alvo) { executarDowngrade(toTier); return; } // sem dados do tier: segue direto
    if (dgNome) dgNome.textContent = alvo.nome;
    if (dgTexto) {
      dgTexto.textContent = `tu mantém o ${planoNomeRaw}${
        proximaCobranca ? ` até ${proximaCobranca}` : ''
      } e, a partir daí, renova no ${alvo.nome} por ${formatBRL(alvo.preco_centavos)}/mês, sem pagar do zero.`;
    }
    if (dgSim) dgSim.onclick = () => executarDowngrade(toTier); // handler fresco a cada abertura
    modalConfirm?.classList.add('hidden');
    modalDgConfirm?.classList.remove('hidden');
    dgSim?.focus();
  };

  // "voltar" no passo de confirmação → retorna pro passo de pausar (com o off-ramp).
  dgVoltar?.addEventListener('click', () => {
    modalDgConfirm?.classList.add('hidden');
    modalConfirm?.classList.remove('hidden');
    modalSim?.focus();
  });

  const downgradeBtns = root.querySelectorAll('[data-downgrade-tier]');
  downgradeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const toTier = btn.dataset.downgradeTier;
      if (!toTier) return;
      abrirDowngradeConfirm(toTier);
    });
  });

  // Manter o plano atual (desfaz um downgrade agendado). Volta a renovar no valor cheio
  // do tier atual. Sem confirmação, é a ação "positiva" (a pessoa está ficando).
  const manterBtn = root.querySelector('[data-manter-plano]');
  manterBtn?.addEventListener('click', async () => {
    if (!supabase) return;
    assinaturaMsg?.classList.add('hidden');
    abrirCarregando('voltando pro teu plano… 💛');
    try {
      const { data, error } = await supabase.functions.invoke('downgrade-subscription', {
        body: { acao: 'cancelar' },
      });
      if (error || !data?.ok) {
        modalTravado = false;
        fecharModal();
        mostrarMsg('não deu pra desfazer agora. tenta de novo daqui a pouco? 💛', 'erro');
        return;
      }
      if (modalLoadingTexto) modalLoadingTexto.textContent = 'que bom que ficou, teu plano segue igual. 💛';
      setTimeout(() => window.location.reload(), 1800);
    } catch {
      modalTravado = false;
      fecharModal();
      mostrarMsg('a gente não conseguiu falar com o servidor agora.', 'erro');
    }
  });

  // ── Toast (recado curto no rodapé, some sozinho) ──────────────────────────
  const toastEl = root.querySelector('[data-toast]');
  let toastTimer;
  function toast(texto) {
    if (!toastEl) return;
    toastEl.textContent = texto;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }

  // ── Foto de perfil ────────────────────────────────────────────────────────
  // Sobe pro bucket `avatares` num caminho fechado em `{user_id}/avatar` — a
  // policy do Storage só deixa escrever na pasta do próprio uuid, então nem
  // adianta o client tentar outro caminho. O arquivo é sempre o MESMO (upsert),
  // pra não acumular foto velha; como a URL não muda, a gente carimba `?v=`
  // pra furar o cache do CDN e do navegador.
  const avatarBox = root.querySelector('[data-avatar]');
  const avatarInput = root.querySelector('[data-avatar-input]');
  const avatarBtn = root.querySelector('[data-avatar-btn]');

  avatarBtn?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', async () => {
    const arquivo = avatarInput.files?.[0];
    if (!arquivo) return;
    // Deixa o input limpo já: se der erro e a pessoa escolher o MESMO arquivo de
    // novo, o `change` precisa disparar outra vez.
    avatarInput.value = '';

    if (!AVATAR_TIPOS.includes(arquivo.type)) {
      toast('essa a gente não abre. manda jpg, png ou webp?');
      return;
    }
    if (arquivo.size > AVATAR_MAX_BYTES) {
      const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace('.', ',');
      toast(`essa tem ${mb} MB e o limite é 3. dá uma diminuída?`);
      return;
    }
    if (!supabase) {
      toast('a conta ainda não tá ligada por aqui');
      return;
    }

    avatarBtn.disabled = true;
    avatarBox?.classList.add('enviando');
    try {
      const caminho = `${session.user.id}/avatar`;
      const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(caminho, arquivo, {
        upsert: true,
        contentType: arquivo.type,
        cacheControl: '3600',
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(caminho);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);
      if (dbErr) throw dbErr;

      // Troca as iniciais pela foto (ou só atualiza o src, se já era foto).
      let img = avatarBox?.querySelector('[data-avatar-img]');
      if (!img && avatarBox) {
        avatarBox.querySelector('[data-avatar-iniciais]')?.remove();
        img = document.createElement('img');
        img.setAttribute('data-avatar-img', '');
        img.alt = 'tua foto de perfil';
        avatarBox.prepend(img);
      }
      if (img) img.src = url;
      pintarAvatarHeader(url); // o avatar do topo troca junto, sem recarregar
      toast('pronto, tua foto tá no ar 💛');
    } catch {
      toast('não deu pra subir tua foto agora. tenta de novo daqui a pouco?');
    } finally {
      avatarBtn.disabled = false;
      avatarBox?.classList.remove('enviando');
    }
  });

  // ── Erros de campo ────────────────────────────────────────────────────────
  const campo = (id) => root.querySelector(`#${id}`);
  function limparErros(form) {
    form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    form.querySelectorAll('.field-err').forEach((e) => e.remove());
  }
  function marcarErro(input, texto) {
    const field = input?.closest('.field');
    if (!field) return;
    field.classList.add('invalid');
    const span = document.createElement('span');
    span.className = 'field-err';
    span.textContent = texto;
    field.appendChild(span);
    return false;
  }

  // ── Máscaras de digitação ─────────────────────────────────────────────────
  root.querySelectorAll('[data-mask]').forEach((input) => {
    input.addEventListener('input', () => {
      input.value = input.dataset.mask === 'cep' ? mascaraCep(input.value) : mascaraTelefone(input.value);
    });
  });
  const ufInput = root.querySelector('[data-uf]');
  ufInput?.addEventListener('input', () => {
    ufInput.value = ufInput.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
  });

  // Busca do CEP: preenche rua/bairro/cidade/uf pra pessoa não digitar de novo.
  // Serviço público (ViaCEP); se estiver fora do ar, a pessoa preenche na mão.
  const cepInput = campo('pf-cep');
  cepInput?.addEventListener('blur', async () => {
    const digitos = cepInput.value.replace(/\D/g, '');
    if (digitos.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const d = await r.json();
      if (!d || d.erro) return;
      const preencher = (id, valor) => {
        const el = campo(id);
        if (el && !el.value.trim() && valor) el.value = valor;
      };
      preencher('pf-rua', d.logradouro);
      preencher('pf-bairro', d.bairro);
      preencher('pf-cidade', d.localidade);
      preencher('pf-uf', d.uf);
      atualizarProgresso();
    } catch {
      /* sem internet ou serviço fora: segue com o que a pessoa digitar */
    }
  });

  // ── Chips (uma escolha por grupo; clicar no escolhido desmarca) ────────────
  root.querySelectorAll('[data-chip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const jaEstava = btn.getAttribute('aria-pressed') === 'true';
      root
        .querySelectorAll(`[data-chip="${btn.dataset.chip}"]`)
        .forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', jaEstava ? 'false' : 'true');
      atualizarProgresso();
    });
  });
  const chipEscolhido = (grupo) =>
    root.querySelector(`[data-chip="${grupo}"][aria-pressed="true"]`)?.dataset.value || null;

  // ── Barra "perfil completo" ───────────────────────────────────────────────
  // Sem CPF na conta: quem coleta é a página do Asaas, então ele não entra aqui.
  const CAMPOS_PROGRESSO = [
    'pf-nome', 'pf-apelido', 'pf-telefone', 'pf-nascimento', 'pf-cep', 'pf-rua',
    'pf-numero', 'pf-bairro', 'pf-cidade', 'pf-uf', 'pf-restricoes', 'pf-horario',
  ];
  const progPct = root.querySelector('[data-progress-pct]');
  const progBar = root.querySelector('[data-progress-bar]');
  function atualizarProgresso() {
    const preenchidos = CAMPOS_PROGRESSO.filter((id) => (campo(id)?.value || '').trim()).length;
    const chipsMarcados = root.querySelectorAll('[data-chip][aria-pressed="true"]').length;
    const total = CAMPOS_PROGRESSO.length + 3 + 1; // 3 grupos de chips + e-mail confirmado
    const pct = Math.round(((preenchidos + chipsMarcados + (emailVerificado ? 1 : 0)) / total) * 100);
    if (progPct) progPct.textContent = `${pct}%`;
    if (progBar) {
      progBar.style.width = `${pct}%`;
      progBar.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', String(pct));
    }
  }
  root
    .querySelectorAll('.field input, .field select')
    .forEach((el) => el.addEventListener('input', atualizarProgresso));
  atualizarProgresso();

  // ── Salvar por seção ──────────────────────────────────────────────────────
  // Cada form grava só as colunas da própria seção, na PRÓPRIA linha do profiles
  // (a RLS garante `id = auth.uid()`; o client nunca manda o id de outra pessoa).
  const RECADOS = {
    dados: 'pronto, teus dados tão salvos',
    cafe: 'anotado, o barista já sabe',
    entrega: 'endereço salvo',
  };

  function montarDados(form) {
    limparErros(form);
    const v = (id) => (campo(id)?.value || '').trim();
    let ok = true;

    if (form.dataset.section === 'dados') {
      const nomeNovo = v('pf-nome');
      const tel = v('pf-telefone');
      const nasc = v('pf-nascimento');
      if (!nomeNovo) {
        marcarErro(campo('pf-nome'), 'conta pra gente teu nome? 💛');
        ok = false;
      }
      const digitos = tel.replace(/\D/g, '');
      if (tel && (digitos.length < 10 || digitos.length > 11)) {
        marcarErro(campo('pf-telefone'), 'faltou um pedaço do número');
        ok = false;
      }
      if (nasc && new Date(nasc) >= new Date()) {
        marcarErro(campo('pf-nascimento'), 'essa data ainda não chegou');
        ok = false;
      }
      if (!ok) return null;
      return { full_name: nomeNovo, telefone: tel, apelido: v('pf-apelido') || null, nascimento: nasc || null };
    }

    if (form.dataset.section === 'cafe') {
      return {
        cafe_metodo: chipEscolhido('metodo'),
        cafe_torra: chipEscolhido('torra'),
        cafe_leite: chipEscolhido('leite'),
        cafe_restricoes: v('pf-restricoes') || null,
        cafe_horario: v('pf-horario') || null,
      };
    }

    // entrega: ou o endereço está inteiro, ou está vazio — meio endereço não entrega.
    const end = {
      end_cep: v('pf-cep'),
      end_rua: v('pf-rua'),
      end_numero: v('pf-numero'),
      end_complemento: v('pf-complemento'),
      end_bairro: v('pf-bairro'),
      end_cidade: v('pf-cidade'),
      end_uf: v('pf-uf'),
    };
    const algumPreenchido = Object.values(end).some(Boolean);
    if (algumPreenchido) {
      const obrigatorios = [
        ['pf-cep', end.end_cep, 'o cep ajuda a gente a chegar'],
        ['pf-rua', end.end_rua, 'falta a rua'],
        ['pf-numero', end.end_numero, 'falta o número'],
        ['pf-bairro', end.end_bairro, 'falta o bairro'],
        ['pf-cidade', end.end_cidade, 'falta a cidade'],
        ['pf-uf', end.end_uf, 'falta o estado'],
      ];
      obrigatorios.forEach(([id, valor, recado]) => {
        if (!valor) {
          marcarErro(campo(id), recado);
          ok = false;
        }
      });
      if (end.end_cep && end.end_cep.replace(/\D/g, '').length !== 8) {
        marcarErro(campo('pf-cep'), 'o cep tem 8 números');
        ok = false;
      }
      if (end.end_uf && end.end_uf.length !== 2) {
        marcarErro(campo('pf-uf'), 'são 2 letras, tipo RS');
        ok = false;
      }
      if (!ok) return null;
    }
    return Object.fromEntries(Object.entries(end).map(([coluna, valor]) => [coluna, valor || null]));
  }

  root.querySelectorAll('form[data-section]').forEach((form) => {
    const botao = form.querySelector('[type="submit"]');
    const secao = form.dataset.section;
    const msgSecao = form.querySelector('[data-perfil-msg]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msgSecao?.classList.add('hidden');
      const patch = montarDados(form);
      if (!patch) return;
      if (!supabase) {
        toast('a conta ainda não tá ligada por aqui');
        return;
      }
      const textoBtn = botao?.textContent;
      if (botao) {
        botao.disabled = true;
        botao.textContent = 'salvando…';
      }
      let sucesso = false;
      try {
        const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
        if (error) {
          if (msgSecao) {
            msgSecao.textContent = 'não deu pra salvar agora. tenta de novo daqui a pouco?';
            msgSecao.className = 'text-sm text-coral';
            msgSecao.classList.remove('hidden');
          } else {
            toast('não deu pra salvar agora');
          }
          return;
        }
        sucesso = true;
        if (secao === 'dados') {
          // Espelha no metadata do auth — é de lá que o header tira o nome.
          await supabase.auth.updateUser({
            data: { full_name: patch.full_name, telefone: patch.telefone },
          });
          updateAuthUI(await getSession());
          // Só o span das iniciais — escrever no .pf-avatar inteiro levaria
          // junto o botão de trocar foto e o input.
          const av = root.querySelector('[data-avatar-iniciais]');
          const h1 = root.querySelector('.pf-name');
          if (av) av.textContent = iniciaisDoNome(patch.full_name);
          if (h1) h1.textContent = `oi, ${patch.full_name}`;
        }
        toast(RECADOS[secao]);
      } finally {
        if (botao) {
          botao.disabled = false;
          botao.textContent = textoBtn;
        }
        // Endereço: depois de salvar, cadeia de novo — pra reeditar é só clicar
        // no "editar" outra vez. O "salvar" volta a nascer travado.
        if (secao === 'entrega' && sucesso) {
          form.querySelectorAll('[data-endereco-campo]').forEach((i) => {
            i.readOnly = true;
          });
          if (botao) botao.disabled = true;
          form.querySelector('[data-endereco-editar]')?.removeAttribute('disabled');
        }
      }
    });
  });

  // ── Endereço cadeado: "editar" libera os campos ───────────────────────────
  // Os campos nascem readonly (fundo apagado = cadeado). "editar" destrava tudo
  // e habilita o "salvar endereço"; o "editar" apaga porque a edição já está no ar.
  {
    const formEnd = root.querySelector('[data-endereco-form]');
    const editarBtn = root.querySelector('[data-endereco-editar]');
    const salvarBtn = root.querySelector('[data-endereco-salvar]');
    editarBtn?.addEventListener('click', () => {
      formEnd?.querySelectorAll('[data-endereco-campo]').forEach((i) => {
        i.readOnly = false;
      });
      if (salvarBtn) salvarBtn.disabled = false;
      editarBtn.disabled = true;
      formEnd?.querySelector('#pf-cep')?.focus();
    });
  }

  // ── Avisos (gravam no clique, sem botão) ──────────────────────────────────
  const avisosMsg = root.querySelector('[data-avisos-msg]');
  root.querySelectorAll('[data-aviso]').forEach((sw) => {
    sw.addEventListener('click', async () => {
      if (sw.disabled) return;
      const antes = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', antes ? 'false' : 'true');
      avisos[sw.dataset.aviso] = !antes;
      if (!supabase) return;
      sw.disabled = true;
      const { error } = await supabase.from('profiles').update({ avisos }).eq('id', session.user.id);
      sw.disabled = false;
      if (error) {
        // Volta o botão pro que era: o que vale é o que está no banco.
        sw.setAttribute('aria-checked', antes ? 'true' : 'false');
        avisos[sw.dataset.aviso] = antes;
        if (avisosMsg) {
          avisosMsg.textContent = 'não deu pra mudar esse aviso agora.';
          avisosMsg.className = 'text-sm text-coral';
          avisosMsg.classList.remove('hidden');
        }
        return;
      }
      avisosMsg?.classList.add('hidden');
      toast('combinado');
    });
  });

  // ── Trocar e-mail ─────────────────────────────────────────────────────────
  // O Supabase manda um link pro endereço novo; ele só passa a valer depois
  // que a pessoa confirmar por lá.
  const emailPainel = root.querySelector('[data-email-painel]');
  const emailMsg = root.querySelector('[data-email-msg]');
  root.querySelector('[data-trocar-email]')?.addEventListener('click', () => {
    emailPainel?.classList.toggle('hidden');
    if (!emailPainel?.classList.contains('hidden')) campo('pf-email-novo')?.focus();
  });
  root.querySelector('[data-email-cancelar]')?.addEventListener('click', () => {
    emailPainel?.classList.add('hidden');
    emailMsg?.classList.add('hidden');
  });
  root.querySelector('[data-email-enviar]')?.addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    const novo = (campo('pf-email-novo')?.value || '').trim();
    const dizer = (texto, cor) => {
      if (!emailMsg) return;
      emailMsg.textContent = texto;
      emailMsg.className = `text-sm ${cor}`;
      emailMsg.classList.remove('hidden');
    };
    if (!novo || !novo.includes('@')) {
      dizer('esse e-mail não parece certo.', 'text-coral');
      return;
    }
    if (!supabase) return;
    botao.disabled = true;
    const { error } = await supabase.auth.updateUser(
      { email: novo },
      { emailRedirectTo: `${siteBase()}/auth-confirmado` },
    );
    botao.disabled = false;
    if (error) dizer('não deu pra mandar o link agora. tenta de novo daqui a pouco?', 'text-coral');
    else dizer('te mandamos um link pro e-mail novo. confirma por lá que a gente troca. 💛', 'text-olive');
  });

  // ── Conta e privacidade ───────────────────────────────────────────────────
  const contaMsg = root.querySelector('[data-conta-msg]');
  function dizerConta(texto, cor = 'text-ink-2') {
    if (!contaMsg) return;
    contaMsg.textContent = texto;
    contaMsg.className = `text-sm ${cor}`;
    contaMsg.classList.remove('hidden');
  }

  // ── Aparelhos conectados ──────────────────────────────────────────────────
  // A lista vem da RPC `minhas_sessoes` (migration 0016): o schema `auth` não é
  // exposto pelo PostgREST, então quem lê `auth.sessions` é uma função SECURITY
  // DEFINER que filtra por `auth.uid()`. O client nunca diz de quem é a sessão —
  // nem qual é a atual (isso sai da claim `session_id` do JWT, no servidor).
  const sessoesPainel = root.querySelector('[data-sessoes]');
  const sessoesLista = root.querySelector('[data-sessoes-lista]');
  const sessoesMsg = root.querySelector('[data-sessoes-msg]');
  let sessoesCarregadas = false;

  function dizerSessoes(texto, cor = 'text-ink-2') {
    if (!sessoesMsg) return;
    sessoesMsg.textContent = texto;
    sessoesMsg.className = `text-sm ${cor}`;
    sessoesMsg.classList.toggle('hidden', !texto);
  }

  // Saída de emergência quando a lista não carrega (migration ainda não aplicada,
  // por exemplo): o botão tudo-ou-nada de antes, que só depende do supabase-js.
  function sairDeTodos() {
    if (!sessoesLista) return;
    sessoesLista.innerHTML = `
      <button type="button" class="pf-device-btn danger" data-sessoes-todos>
        sair de todos os aparelhos
      </button>`;
    sessoesLista.querySelector('[data-sessoes-todos]')?.addEventListener('click', async (ev) => {
      ev.currentTarget.disabled = true;
      saindoDeProposito = true;
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/login';
    });
  }

  function renderSessoes(linhas) {
    if (!sessoesLista) return;
    if (!linhas.length) {
      sessoesLista.innerHTML = '<p class="pf-device-vazio">só este aparelho por aqui.</p>';
      return;
    }
    const outras = linhas.filter((s) => !s.atual).length;
    sessoesLista.innerHTML = `
      <div class="pf-devices">
        ${linhas
          .map((s) => {
            const nome = escapeHtml(nomeDoAparelho(s.aparelho));
            const onde = s.endereco ? escapeHtml(s.endereco) : 'endereço não registrado';
            const quando = quandoCurto(s.vista_em);
            return `
              <div class="pf-device${s.atual ? ' atual' : ''}">
                <i data-lucide="${iconeDoAparelho(s.aparelho)}" class="pf-device-ico h-5 w-5"></i>
                <div class="pf-device-txt">
                  <p class="pf-device-nome">
                    ${nome}${s.atual ? '<span class="pf-device-tag">este aqui</span>' : ''}
                  </p>
                  <p class="pf-device-meta">${onde}${quando ? ` · visto ${escapeHtml(quando)}` : ''}</p>
                </div>
                ${
                  s.atual
                    ? ''
                    : `<button type="button" class="pf-device-btn" data-encerrar="${escapeHtml(s.id)}">encerrar</button>`
                }
              </div>`;
          })
          .join('')}
      </div>
      ${
        outras > 1
          ? `<button type="button" class="pf-device-btn danger" data-sessoes-outras>
               encerrar os outros ${outras} aparelhos
             </button>`
          : ''
      }`;
    renderIcons();

    sessoesLista.querySelectorAll('[data-encerrar]').forEach((b) => {
      b.addEventListener('click', async () => {
        b.disabled = true;
        dizerSessoes('');
        const { data, error } = await supabase.rpc('encerrar_sessao', {
          p_session_id: b.dataset.encerrar,
        });
        if (error || !data) {
          b.disabled = false;
          dizerSessoes('não deu pra encerrar esse agora. tenta de novo?', 'text-coral');
          return;
        }
        dizerSessoes('pronto, esse aparelho saiu da tua conta.', 'text-olive');
        await carregarSessoes();
      });
    });

    sessoesLista.querySelector('[data-sessoes-outras]')?.addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      b.disabled = true;
      dizerSessoes('');
      const { data, error } = await supabase.rpc('encerrar_outras_sessoes');
      if (error) {
        b.disabled = false;
        dizerSessoes('não deu pra encerrar agora. tenta de novo?', 'text-coral');
        return;
      }
      dizerSessoes(
        data ? 'pronto, só este aparelho continua conectado.' : 'nada pra encerrar por aqui.',
        'text-olive',
      );
      await carregarSessoes();
    });
  }

  async function carregarSessoes() {
    if (!sessoesLista) return;
    sessoesLista.innerHTML = '<p class="pf-device-vazio">buscando teus aparelhos…</p>';
    const { data, error } = await supabase.rpc('minhas_sessoes');
    if (error) {
      dizerSessoes('não deu pra listar teus aparelhos agora.', 'text-coral');
      sairDeTodos();
      return;
    }
    sessoesCarregadas = true;
    renderSessoes(Array.isArray(data) ? data : []);
  }

  // Recado de "encerra o plano primeiro" + leva a pessoa até onde se encerra.
  // O nome do tier vem cru (sem escapeHtml) porque aqui vira textContent.
  function avisarAssinaturaAtiva() {
    const nome = tiers.find((t) => t.slug === planoSlug)?.nome;
    dizerConta(
      `${nome ? `teu ${nome}` : 'tua assinatura'} ainda tá rodando. encerra ele ali em cima, em "gerenciar assinatura", aí a gente apaga tua conta com tudo em ordem, sem cobrança sobrando.`,
      'text-coral',
    );
    root.querySelector('[data-gerenciar]')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
  }

  let excluirArmado = false;
  let excluirTimer;
  root.querySelectorAll('[data-acao]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const acao = btn.dataset.acao;
      if (!supabase) {
        dizerConta('a conta ainda não tá ligada por aqui.');
        return;
      }

      if (acao === 'senha') {
        btn.disabled = true;
        const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
          redirectTo: `${siteBase()}/auth-confirmado`,
        });
        btn.disabled = false;
        dizerConta(
          error
            ? 'não deu pra mandar o e-mail agora. tenta de novo daqui a pouco?'
            : 'te mandamos um link pra criar a senha nova. dá uma olhada no e-mail. 💛',
          error ? 'text-coral' : 'text-olive',
        );
        return;
      }

      if (acao === 'sessoes') {
        if (!sessoesPainel) return;
        const abrindo = sessoesPainel.hidden;
        sessoesPainel.hidden = !abrindo;
        btn.setAttribute('aria-expanded', String(abrindo));
        if (abrindo && !sessoesCarregadas) await carregarSessoes();
        return;
      }

      if (acao === 'dados') {
        btn.disabled = true;
        try {
          // Só leituras que a pessoa já pode fazer (RLS: a própria linha).
          const [p, s, l] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            supabase.from('subscriptions').select('*').eq('user_id', session.user.id),
            supabase.from('points_ledger').select('*').eq('user_id', session.user.id),
          ]);
          const pacote = {
            exportado_em: new Date().toISOString(),
            conta: { id: session.user.id, email: session.user.email },
            perfil: p.data || null,
            assinaturas: s.data || [],
            pontos: l.data || [],
          };
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' }),
          );
          const a = document.createElement('a');
          a.href = url;
          a.download = 'casa-coffee-colab-meus-dados.json';
          a.click();
          URL.revokeObjectURL(url);
          toast('teus dados foram pro teu aparelho');
        } catch {
          dizerConta('não deu pra montar o arquivo agora.', 'text-coral');
        } finally {
          btn.disabled = false;
        }
        return;
      }

      if (acao === 'excluir') {
        // Com assinatura ATIVA a gente não apaga: primeiro encerra o plano, aí
        // sim a conta. Aqui é só cortesia pra não fazer a pessoa clicar duas
        // vezes à toa — quem trava de verdade é a Edge Function.
        if (ativa) {
          avisarAssinaturaAtiva();
          return;
        }

        // Dois toques de propósito: apagar a conta não tem volta.
        if (!excluirArmado) {
          excluirArmado = true;
          btn.querySelector('span').textContent = 'tem certeza? clica de novo pra apagar';
          dizerConta('isso apaga teus dados pra sempre, pontos, histórico e assinatura.', 'text-coral');
          clearTimeout(excluirTimer);
          excluirTimer = setTimeout(() => {
            excluirArmado = false;
            btn.querySelector('span').textContent = 'excluir minha conta';
            contaMsg?.classList.add('hidden');
          }, 8000);
          return;
        }
        clearTimeout(excluirTimer);
        excluirArmado = false;
        btn.disabled = true;
        btn.querySelector('span').textContent = 'apagando…';
        try {
          const { error } = await supabase.functions.invoke('delete-account');
          if (error) {
            // A function recusa (409) quando a assinatura ainda tá ativa — pode
            // acontecer se a pessoa assinou em outra aba depois desta carregar.
            const corpo = await error.context?.json?.().catch(() => null);
            if (corpo?.assinatura_ativa) {
              btn.disabled = false;
              btn.querySelector('span').textContent = 'excluir minha conta';
              avisarAssinaturaAtiva();
              return;
            }
            throw error;
          }
          saindoDeProposito = true;
          await supabase.auth.signOut();
          window.location.href = '/home';
        } catch {
          btn.disabled = false;
          btn.querySelector('span').textContent = 'excluir minha conta';
          dizerConta('não deu pra apagar agora. escreve pra gente que a gente resolve contigo. 💛', 'text-coral');
        }
      }
    });
  });

  root.querySelector('[data-signout]')?.addEventListener('click', doSignOut);

  // Espelho da lista de desejos ("ficou pra depois") e a tirinha "voltou pra
  // vitrine": a chamada do boot rodou antes deste HTML existir (o perfil é montado
  // pós-guard), então religa aqui, já com as seções no DOM. Tolerante às migrations.
  initLojaDesejos();
  initReposicao();
}

// --- Pontos + Recompensas (área logada) ----------------------------------------
// Saldo (cache profiles.points_balance, mantido em sincronia pelo ledger),
// multiplicador do tier, extrato do ledger e grid de recompensas pra resgatar.
// Todo cálculo de saldo é server-side; o resgate passa pela Edge Function
// redeem-reward. Tudo do banco é escapado antes de ir pro DOM (anti-XSS).
const REWARD_TIPO_LABEL = {
  produto_loja: 'produto da loja',
  cupom: 'cupom de desconto',
  produto_local: 'parceiro local',
};

function formatarDataCurta(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

async function initPontosPage() {
  const root = document.querySelector('[data-pontos-root]');
  if (!root) return;

  const session = await requireAuth();
  if (!session) return; // já redirecionou pro login

  // (Re)carrega tudo e renderiza. Chamado no início e após cada resgate.
  const carregar = async () => {
    const profile = await getProfile();
    const saldo = Number(profile?.points_balance || 0);

    // Multiplicador do tier atual (tiers é leitura pública).
    let mult = 1;
    let planoNome = null;
    if (profile?.tier_slug && supabase) {
      const { data: t } = await supabase
        .from('tiers')
        .select('nome, points_multiplier')
        .eq('slug', profile.tier_slug)
        .maybeSingle();
      mult = Number(t?.points_multiplier || 1);
      planoNome = t?.nome || profile.tier_slug;
    }
    const multTxt = String(mult).replace('.', ',');

    // Recompensas ativas (leitura pública) + extrato do ledger (RLS: só o próprio).
    const [{ data: rewards }, { data: ledger }] = await Promise.all([
      supabase
        .from('rewards_catalog')
        .select('id, nome, tipo, custo_em_pontos, estoque')
        .eq('ativo', true)
        .order('custo_em_pontos', { ascending: true }),
      supabase
        .from('points_ledger')
        .select('created_at, motivo, delta')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const cardsRewards = (rewards || [])
      .map((r) => {
        const nome = escapeHtml(r.nome);
        const custo = Number(r.custo_em_pontos);
        const tipo = escapeHtml(REWARD_TIPO_LABEL[r.tipo] || r.tipo || '');
        const esgotado = r.estoque !== null && r.estoque <= 0;
        const podeResgatar = !esgotado && saldo >= custo;
        const faltam = custo - saldo;

        let botao;
        if (esgotado) {
          botao = `<button type="button" disabled class="btn ghost mt-4 w-full cursor-not-allowed opacity-60">esgotado por ora</button>`;
        } else if (podeResgatar) {
          botao = `<button type="button" data-resgatar="${r.id}" data-nome="${nome}" data-custo="${custo}" class="btn solid mt-4 w-full">resgatar</button>`;
        } else {
          botao = `<button type="button" disabled class="btn ghost mt-4 w-full cursor-not-allowed opacity-70">faltam ${faltam.toLocaleString('pt-BR')} pontos</button>`;
        }

        return `
          <article class="flex flex-col card">
            <p class="lbl">${tipo}</p>
            <h3 class="mt-1 flex-1 font-titulo text-lg leading-tight">${nome}</h3>
            <p class="mt-3 font-titulo text-xl text-coral">${custo.toLocaleString('pt-BR')} <span class="text-sm font-normal text-muted">pontos</span></p>
            ${botao}
          </article>`;
      })
      .join('');

    const linhasExtrato = (ledger || []).length
      ? ledger
          .map((l) => {
            const delta = Number(l.delta);
            const positivo = delta >= 0;
            const sinal = positivo ? '+' : '−';
            const cor = positivo ? 'text-olive' : 'text-coral';
            return `
              <li class="flex items-center justify-between gap-3 border-b border-line py-3">
                <div class="min-w-0">
                  <p class="truncate text-sm text-ink">${escapeHtml(l.motivo)}</p>
                  <p class="text-xs text-muted">${formatarDataCurta(l.created_at)}</p>
                </div>
                <span class="shrink-0 font-medium ${cor}">${sinal}${Math.abs(delta).toLocaleString('pt-BR')}</span>
              </li>`;
          })
          .join('')
      : `<li class="py-6 text-center text-sm text-muted">teu extrato começa no teu primeiro café por aqui. 💛</li>`;

    root.innerHTML = `
      <div class="mx-auto max-w-4xl">
        <p class="decor text-2xl sm:text-3xl">teus pontos</p>
        <div class="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p class="font-titulo text-5xl text-coral">${saldo.toLocaleString('pt-BR')}</p>
          <p class="pb-1 text-ink-2">
            ${
              planoNome
                ? `teu plano <span class="font-medium">${escapeHtml(planoNome)}</span> rende <span class="font-medium">${multTxt}x</span> pontos`
                : `os pontos são um agrado de quem tem plano, <a href="/planos" class="font-medium text-coral underline decoration-coral/40 underline-offset-2 hover:decoration-coral">ativa um pra começar a pontuar</a>`
            }
          </p>
        </div>

        <!-- Resultado do resgate (preenchido pelo app.js) -->
        <div class="mt-6 hidden" data-resgate-resultado></div>

        <section class="mt-10">
          <h2 class="font-titulo text-2xl">o que dá pra resgatar</h2>
          <p class="mt-1 text-sm text-muted">pequenos agrados, no teu tempo. sem pressa, sem pegadinha.</p>
          <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            ${cardsRewards || '<p class="text-sm text-muted">as recompensas chegam já já.</p>'}
          </div>
        </section>

        <section class="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 class="font-titulo text-2xl">teu extrato</h2>
            <ul class="mt-4">${linhasExtrato}</ul>
          </div>
          <aside class="card flat">
            <h2 class="font-titulo text-xl">como funciona</h2>
            <ul class="mt-3 space-y-2 text-sm text-ink-2">
              <li>· os pontos são um mimo de quem tem plano ativo.</li>
              <li>· com plano, 1 ponto a cada R$1, e teu tier multiplica (Ouro rende 1,5x).</li>
              <li>· na loja, contam sobre o valor já com teu desconto.</li>
              <li>· é só juntar e trocar por um agrado quando quiser.</li>
            </ul>
          </aside>
        </section>

        <div class="mt-10 border-t border-line pt-6">
          <a href="/conta/perfil" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
        </div>
      </div>`;

    renderIcons();
    wireResgates();
  };

  // Mostra o resultado do resgate. Busca o elemento FRESCO no root (sobrevive ao
  // re-render do carregar(), que é chamado antes desta função no caso de sucesso).
  const mostrarResultado = (html, tom = 'ok') => {
    const resultado = root.querySelector('[data-resgate-resultado]');
    if (!resultado) return;
    resultado.className = `mt-6 notice ${tom}`;
    resultado.style.flexDirection = 'column';
    resultado.style.alignItems = 'flex-start';
    resultado.innerHTML = html; // conteúdo controlado (strings do banco já escapadas)
    resultado.classList.remove('hidden');
    resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderIcons();
  };

  // Liga os botões "resgatar": confirma, chama a Edge Function, mostra o resultado.
  function wireResgates() {
    root.querySelectorAll('[data-resgatar]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-resgatar');
        const nome = btn.getAttribute('data-nome') || 'essa recompensa';
        const custo = btn.getAttribute('data-custo');
        if (!window.confirm(`resgatar "${nome}" por ${custo} pontos?`)) return;
        if (!supabase) return;

        const texto = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'resgatando…';
        try {
          const { data, error } = await supabase.functions.invoke('redeem-reward', {
            body: { reward_id: id },
          });
          if (error || !data?.ok) {
            // Em HTTP não-2xx o functions-js devolve data=null e joga a resposta
            // crua em error.context — sem ler dali, o recado gentil da função
            // ("faltam X pontos", "essa já acabou") vira mensagem genérica.
            let msg = data?.error || '';
            if (!msg && typeof error?.context?.json === 'function') {
              try {
                const corpo = await error.context.json();
                if (corpo?.error) msg = String(corpo.error);
              } catch {
                /* corpo não-JSON: segue pra mensagem genérica */
              }
            }
            if (!msg) msg = 'não deu pra resgatar agora. tenta de novo daqui a pouco? 💛';
            mostrarResultado(`<p class="text-sm text-ink">${escapeHtml(msg)}</p>`, 'warn');
            btn.disabled = false;
            btn.textContent = texto;
            return;
          }

          // Sucesso: se veio código de cupom, monta o bloco com botão copiar.
          const codigo = data.codigo ? escapeHtml(data.codigo) : null;
          const cupomHtml = codigo
            ? `<div class="mt-3 flex flex-wrap items-center gap-3">
                 <code class="rounded-lg bg-card px-3 py-1.5 font-mono text-lg tracking-wider text-coral ring-1 ring-line">${codigo}</code>
                 <button type="button" data-copiar-cupom="${codigo}" class="btn ghost sm"><i data-lucide="copy" class="h-4 w-4"></i>copiar</button>
                 <span class="text-xs text-muted">vale por 30 dias</span>
               </div>`
            : '';

          // Recarrega saldo/extrato/recompensas PRIMEIRO (re-renderiza o root)…
          await carregar();
          // …e só então mostra o resultado (busca o elemento fresco → sobrevive).
          mostrarResultado(
            `<p class="font-titulo text-lg">resgatado com carinho 💛</p>
             <p class="mt-1 text-sm text-ink-2">${escapeHtml(String(data.reward || nome))}, teu novo saldo é <span class="font-medium">${Number(data.saldo || 0).toLocaleString('pt-BR')}</span> pontos.</p>
             ${cupomHtml}`
          );
        } catch {
          mostrarResultado(
            `<p class="text-sm text-ink">a gente não conseguiu falar com o servidor agora. confere tua conexão?</p>`,
            'warn'
          );
          btn.disabled = false;
          btn.textContent = texto;
        }
      })
    );

    // Copiar código do cupom.
    root.querySelectorAll('[data-copiar-cupom]').forEach((b) =>
      b.addEventListener('click', async () => {
        const codigo = b.getAttribute('data-copiar-cupom');
        try {
          await navigator.clipboard.writeText(codigo);
          b.innerHTML = '<i data-lucide="check" class="h-4 w-4"></i>copiado';
          renderIcons();
        } catch {
          /* clipboard indisponível, o código fica visível pra copiar à mão */
        }
      })
    );
  }

  await carregar();
}

// --- Conquistas (área logada) --------------------------------------------------
// Grid dos emblemas: desbloqueados coloridos com a data; bloqueados em silhueta
// (cadeado) com uma dica gentil (a própria descrição da conquista). A engine de
// desbloqueio é 100% server-side (check_achievements, chamada nos webhooks e no
// resgate), aqui a página só LÊ (RLS: achievements é público; user_achievements,
// só o próprio). Ícone e textos do banco são escapados antes de ir pro DOM.

// Só aceita nomes de ícone Lucide que a gente registrou (evita <i> vazio e não
// confia cegamente na string do banco). Fallback gentil pro 'award'.
const ICONES_CONQUISTA = new Set(['coffee', 'sunrise', 'heart', 'award', 'star', 'sparkles', 'gift']);
function iconeConquista(nome) {
  return ICONES_CONQUISTA.has(nome) ? nome : 'award';
}

async function initConquistasPage() {
  const root = document.querySelector('[data-conquistas-root]');
  if (!root) return;

  const session = await requireAuth();
  if (!session) return; // já redirecionou pro login

  if (!supabase) {
    root.innerHTML = `<p class="text-center text-muted">as conquistas ainda não estão ligadas por aqui (config pendente).</p>`;
    return;
  }

  // Catálogo (leitura pública) + as que ESTE usuário desbloqueou (RLS: só o
  // próprio). Uma leitura de cada, em paralelo.
  const [{ data: todas }, { data: minhas }] = await Promise.all([
    supabase
      .from('achievements')
      .select('slug, nome, descricao, dica, icone, ordem')
      .eq('ativo', true)
      .order('ordem', { ascending: true }),
    supabase
      .from('user_achievements')
      .select('achievement_slug, unlocked_at')
      .eq('user_id', session.user.id),
  ]);

  const desbloqueadas = new Map((minhas || []).map((u) => [u.achievement_slug, u.unlocked_at]));
  const total = (todas || []).length;
  const conquistadas = (todas || []).filter((a) => desbloqueadas.has(a.slug)).length;

  const cards = (todas || [])
    .map((a) => {
      const nome = escapeHtml(a.nome);
      const descricao = escapeHtml(a.descricao || '');
      const dica = escapeHtml(a.dica || '');
      const icone = iconeConquista(a.icone);
      const quando = desbloqueadas.get(a.slug);

      if (quando) {
        return `
          <article class="flex flex-col items-center card text-center">
            <span class="icon-badge lg coral">
              <i data-lucide="${icone}" class="h-7 w-7"></i>
            </span>
            <h3 class="mt-3 font-titulo text-lg leading-tight">${nome}</h3>
            <p class="mt-1 text-sm text-ink-2">${descricao}</p>
            <p class="mt-3 text-xs font-medium text-olive">desbloqueado em ${formatarDataCurta(quando)}</p>
          </article>`;
      }
      return `
        <article class="flex flex-col items-center card flat text-center">
          <span class="icon-badge lg relative">
            <i data-lucide="${icone}" class="h-7 w-7"></i>
            <span class="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-paper-2 text-muted ring-2 ring-paper">
              <i data-lucide="lock" class="h-3.5 w-3.5"></i>
            </span>
          </span>
          <h3 class="mt-3 font-titulo text-lg leading-tight text-muted">${nome}</h3>
          <p class="mt-1 text-sm text-muted">${descricao}</p>
          ${
            dica
              ? `<div class="mt-3 w-full rounded-lg bg-ink/5 px-3 py-2 text-left">
                   <p class="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gold">
                     <i data-lucide="key-round" class="h-3 w-3"></i>como desbloquear
                   </p>
                   <p class="mt-0.5 text-xs leading-snug text-ink-2">${dica}</p>
                 </div>`
              : `<p class="mt-3 text-xs text-muted">ainda por vir 💛</p>`
          }
        </article>`;
    })
    .join('');

  root.innerHTML = `
    <div class="mx-auto max-w-4xl">
      <p class="decor text-2xl sm:text-3xl">tuas conquistas</p>
      <div class="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p class="font-titulo text-5xl text-coral">${conquistadas}<span class="text-2xl text-muted">/${total}</span></p>
        <p class="pb-1 text-ink-2">emblemas desbloqueados, cada um do teu jeito, no teu tempo.</p>
      </div>

      <section class="mt-10">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          ${cards || '<p class="text-sm text-muted">as conquistas chegam já já.</p>'}
        </div>
      </section>

      <div class="mt-10 border-t border-line pt-6">
        <a href="/conta/perfil" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
      </div>
    </div>`;

  renderIcons();
}

// --- Meus pedidos (área logada) ------------------------------------------------
// Lista os pedidos do PRÓPRIO usuário (RLS: user_id = auth.uid()) com itens e
// status. order_items vem embutido pela FK (PostgREST). Tudo do banco é escapado.
const STATUS_PEDIDO_LABEL = {
  pendente: 'aguardando pagamento',
  pago: 'pago',
  preparando: 'preparando',
  pronto: 'pronto',
  entregue: 'entregue',
  cancelado: 'cancelado',
};

async function initPedidosPage() {
  const root = document.querySelector('[data-pedidos-root]');
  if (!root) return;

  const session = await requireAuth();
  if (!session) return; // já redirecionou pro login

  if (!supabase) {
    root.innerHTML = `<p class="text-center text-muted">os pedidos ainda não estão ligados por aqui (config pendente).</p>`;
    return;
  }

  const { data: pedidos } = await supabase
    .from('orders')
    .select('id, status, total_centavos, created_at, order_items ( nome_snapshot, variante_snapshot, qtd, preco_unit_centavos )')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const lista = (pedidos || []).length
    ? pedidos
        .map((p) => {
          const itens = (p.order_items || [])
            .map((it) => {
              const nome = escapeHtml(it.nome_snapshot || 'item');
              const variante = it.variante_snapshot ? ` · ${escapeHtml(it.variante_snapshot)}` : '';
              const qtd = Number(it.qtd || 1);
              return `<li class="flex justify-between gap-3 text-sm text-ink">
                  <span class="min-w-0 truncate">${nome}${variante} <span class="text-muted">×${qtd}</span></span>
                  <span class="shrink-0">${formatBRL(Number(it.preco_unit_centavos || 0) * qtd)}</span>
                </li>`;
            })
            .join('');
          const statusTxt = escapeHtml(STATUS_PEDIDO_LABEL[p.status] || p.status || '');
          const statusTag = { pendente: 'gold', pago: 'green', preparando: 'blue', pronto: 'green', entregue: 'olive', cancelado: 'coral' }[p.status] || '';
          return `
            <article class="card">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-muted">${formatarDataCurta(p.created_at)}</p>
                <span class="tag ${statusTag}">${statusTxt}</span>
              </div>
              <ul class="mt-3 space-y-1">${itens || '<li class="text-sm text-muted">—</li>'}</ul>
              <p class="mt-3 border-t border-line pt-3 text-right font-titulo text-lg text-coral">${formatBRL(Number(p.total_centavos || 0))}</p>
            </article>`;
        })
        .join('')
    : `<p class="py-8 text-center text-sm text-muted">teus pedidos aparecem aqui quando tu levar algo do Casa. 💛</p>`;

  root.innerHTML = `
    <div class="mx-auto max-w-3xl">
      <p class="decor text-2xl sm:text-3xl">teus pedidos</p>
      <h1 class="mt-1 font-titulo text-3xl sm:text-4xl">o que tu levou pra casa</h1>
      <div class="mt-8 grid gap-4">${lista}</div>
      <div class="mt-10 border-t border-line pt-6">
        <a href="/conta/perfil" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
      </div>
    </div>`;

  renderIcons();
}

// --- Toast de conquista nova ---------------------------------------------------
// Ao carregar (logado), compara user_achievements com o que já foi VISTO
// (localStorage). Conquista nova → toast discreto no canto, um por vez, 6s.
// 1ª vez sem baseline: marca tudo como visto SEM toastar retroativo.
const SEEN_ACHIEVEMENTS_KEY = 'casa_seen_achievements';

function toastContainer() {
  let c = document.querySelector('[data-toast-container]');
  if (!c) {
    c = document.createElement('div');
    c.setAttribute('data-toast-container', '');
    c.className = 'fixed bottom-4 right-4 z-[60] flex max-w-[90vw] flex-col gap-2';
    document.body.appendChild(c);
  }
  return c;
}

function mostrarToastConquista(meta) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className =
      'flex max-w-xs translate-y-2 items-center gap-3 rounded-lg bg-card p-4 opacity-0 shadow-xl ring-1 ring-line backdrop-blur-md transition duration-300';
    el.innerHTML = `
      <span class="icon-badge coral"><i data-lucide="${iconeConquista(meta.icone)}" class="h-5 w-5"></i></span>
      <div class="min-w-0">
        <p class="lbl">nova conquista</p>
        <p class="font-titulo text-sm leading-tight">${escapeHtml(meta.nome)}</p>
        <p class="text-xs text-ink-2">bem-vindo à mesa 💛</p>
      </div>`;
    toastContainer().appendChild(el);
    renderIcons();
    requestAnimationFrame(() => el.classList.remove('translate-y-2', 'opacity-0'));

    let fechado = false;
    const fechar = () => {
      if (fechado) return;
      fechado = true;
      el.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 300);
    };
    setTimeout(fechar, 6000);
    el.addEventListener('click', fechar);
  });
}

async function initAchievementToast() {
  if (!supabase) return;
  const session = await getSession();
  if (!session) return;

  const { data: uach } = await supabase
    .from('user_achievements')
    .select('achievement_slug, unlocked_at')
    .eq('user_id', session.user.id)
    .order('unlocked_at', { ascending: true });
  const atuais = (uach || []).map((u) => u.achievement_slug);
  if (!atuais.length) return;

  let vistos = null;
  try {
    vistos = JSON.parse(localStorage.getItem(SEEN_ACHIEVEMENTS_KEY) || 'null');
  } catch {
    vistos = null;
  }

  // Sem baseline (1ª vez): marca tudo como visto, sem toastar retroativo.
  if (!Array.isArray(vistos)) {
    localStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify(atuais));
    return;
  }

  const novas = atuais.filter((s) => !vistos.includes(s));
  if (!novas.length) return;

  const { data: metas } = await supabase.from('achievements').select('slug, nome, icone').in('slug', novas);
  const porSlug = new Map((metas || []).map((m) => [m.slug, m]));

  // Um toast por vez, na ordem de desbloqueio.
  for (const slug of novas) {
    await mostrarToastConquista(porSlug.get(slug) || { nome: slug, icone: 'award' });
  }
  localStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify(atuais));
}

// --- Volta do auth: e-mail confirmado ou Google --------------------------------
// O supabase-js detecta a sessão na URL (detectSessionInUrl é padrão). Esta página
// é a volta de todo caminho de auth: o link do e-mail e o "continuar com o Google".
// Quem veio do Google deixou um bilhete no sessionStorage (initGoogleAuth) — aí a
// página é só passagem e segue direto pro destino. Se logou pelo link, oferece ir
// pra conta; se não deu, manda pro login com carinho.
async function initAuthConfirmadoPage() {
  const root = document.querySelector('[data-auth-confirmado-root]');
  if (!root) return;

  // Bilhete do Google, consumido de uma vez só (recarregar cai no fluxo do e-mail).
  let veioDoGoogle = false;
  let proximo = '/conta/perfil';
  try {
    const guardado = sessionStorage.getItem(POS_LOGIN_KEY);
    if (guardado) {
      sessionStorage.removeItem(POS_LOGIN_KEY);
      veioDoGoogle = true;
      proximo = sanitizeRedirect(guardado) || proximo;
    }
  } catch {
    /* sem sessionStorage: segue como confirmação de e-mail normal */
  }

  // O provider avisa a recusa na query ou no hash (ex.: fechou a janela do Google).
  // Lê do snapshot, não de window.location: quando esta função roda, o
  // supabase-js já pode ter limpado a URL.
  const recusado =
    new URLSearchParams(QUERY_DE_ENTRADA).has('error') ||
    new URLSearchParams(HASH_DE_ENTRADA.replace(/^#/, '')).has('error');

  // Volta do "esqueci a senha". O Supabase carimba type=recovery no link, e é o
  // único jeito de separar esse retorno do link de confirmação de e-mail: os
  // dois chegam aqui já com sessão válida, mas só este precisa pedir a senha nova.
  let ehRecuperacao =
    new URLSearchParams(HASH_DE_ENTRADA.replace(/^#/, '')).get('type') === 'recovery' ||
    new URLSearchParams(QUERY_DE_ENTRADA).get('type') === 'recovery';

  const cartao = (cor, icone, titulo, texto, href, rotulo) => `
    <div class="mx-auto max-w-md card text-center">
      <span class="mx-auto icon-badge lg ${cor}">
        <i data-lucide="${icone}" class="h-8 w-8"></i>
      </span>
      <h1 class="mt-5 font-titulo text-3xl sm:text-4xl">${titulo}</h1>
      <p class="mt-3 text-ink-2">${texto}</p>
      <a href="${href}" class="btn solid mt-7">${rotulo}</a>
    </div>`;

  // Painel de criar a senha nova. O link do e-mail já deixou a pessoa logada,
  // então aqui é só updateUser({ password }) — sem pedir a senha antiga, que é
  // justamente a que ela não lembra.
  const painelSenha = () => `
    <div class="mx-auto max-w-md card text-center">
      <span class="mx-auto icon-badge lg coral">
        <i data-lucide="key-round" class="h-8 w-8"></i>
      </span>
      <h1 class="mt-5 font-titulo text-3xl sm:text-4xl">cria tua senha nova</h1>
      <p class="mt-3 text-ink-2">escolhe uma senha e a gente te leva pra dentro.</p>
      <form data-form-senha novalidate style="text-align: left; margin-top: 26px">
        <div class="field">
          <label for="nova-senha" class="lbl">senha nova</label>
          <div class="pw-wrap">
            <input
              id="nova-senha"
              name="senha"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="inp"
              placeholder="pelo menos 8 caracteres"
            />
            <button type="button" data-toggle-senha aria-label="mostrar senha" aria-pressed="false" class="pw-toggle">
              <i data-lucide="eye" class="h-5 w-5"></i>
            </button>
          </div>
        </div>
        <div class="field">
          <label for="nova-senha-2" class="lbl">repete a senha</label>
          <div class="pw-wrap">
            <input
              id="nova-senha-2"
              name="confirmacao"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="inp"
              placeholder="a mesma de cima"
            />
            <button type="button" data-toggle-senha aria-label="mostrar senha" aria-pressed="false" class="pw-toggle">
              <i data-lucide="eye" class="h-5 w-5"></i>
            </button>
          </div>
        </div>
        <p class="notice err hidden" data-form-erro aria-live="polite"></p>
        <button type="submit" class="btn solid block" style="margin-top: 18px">guardar a senha nova</button>
      </form>
    </div>`;

  const ligarFormSenha = () => {
    const form = root.querySelector('[data-form-senha]');
    if (!form) return;
    const erro = form.querySelector('[data-form-erro]');
    const dizer = (msg) => {
      if (!erro) return;
      erro.textContent = msg;
      erro.classList.remove('hidden');
    };

    setupPasswordToggles(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro?.classList.add('hidden');

      const nova = form.senha.value;
      if (nova.length < 8) return dizer('a senha precisa de pelo menos 8 caracteres.');
      if (nova !== form.confirmacao.value) return dizer('as duas senhas não bateram. confere pra mim?');

      const btn = form.querySelector('button[type="submit"]');
      const rotulo = btn?.textContent;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'guardando…';
      }

      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = rotulo;
        }
        return dizer(mensagemDeErroAuth(error));
      }

      // Trocou: some com o formulário (a sessão de recuperação já cumpriu o
      // papel) e oferece a conta.
      ehRecuperacao = false;
      root.innerHTML = cartao(
        'green', 'heart', 'senha trocada',
        'pronto, tá tudo certo de novo. bem-vindo de volta. 💛',
        '/conta/perfil', 'ir pra minha conta'
      );
      renderIcons();
    });
  };

  const render = (session) => {
    if (session && veioDoGoogle) {
      window.location.replace(proximo); // só passagem, nem chega a pintar
      return;
    }
    if (session && ehRecuperacao) {
      root.innerHTML = painelSenha();
      renderIcons();
      ligarFormSenha();
      return;
    }
    if (session) {
      root.innerHTML = cartao(
        'green', 'heart', 'teu e-mail tá confirmado',
        'bem-vindo ao Casa. 💛 tua conta já tá pronta, chega mais.',
        '/conta/perfil', 'ir pra minha conta'
      );
    } else if (recusado || veioDoGoogle) {
      root.innerHTML = cartao(
        'coral', 'coffee', 'não rolou dessa vez',
        'a entrada pelo Google não foi até o fim. tenta de novo, ou entra com teu e-mail e senha que a gente te recebe.',
        '/login', 'ir pro login'
      );
    } else {
      root.innerHTML = cartao(
        'coral', 'mail', 'quase lá',
        'esse link pode já ter sido usado ou expirado. entra com teu e-mail e senha que a gente te recebe.',
        '/login', 'ir pro login'
      );
    }
    renderIcons();
  };

  // Primeira leitura + fallback: a sessão pode chegar logo após o parse da URL.
  const session = await getSession();
  if (session || recusado || !supabase) {
    render(session);
    return;
  }

  // Sem sessão ainda. Vindo do Google, a troca do token pode estar acontecendo
  // agora — segura a mensagem de falha um instante em vez de acusar cedo demais.
  if (veioDoGoogle) {
    root.innerHTML =
      '<p class="decor text-3xl">só um instante</p>' +
      '<p class="mt-2" style="color: var(--muted)">te levando pra dentro…</p>';
  } else {
    render(null);
  }

  const desistir = veioDoGoogle ? setTimeout(() => render(null), 6000) : null;
  supabase.auth.onAuthStateChange((evento, s) => {
    // Segundo caminho pra reconhecer a recuperação, além do type=recovery da
    // URL: o supabase-js emite este evento ao trocar o token do link por sessão.
    if (evento === 'PASSWORD_RECOVERY') ehRecuperacao = true;
    if (!s) return;
    if (desistir) clearTimeout(desistir);
    render(s);
  });
}

// Configura os carrosséis do tipo "cards" (home e colab) + o hero (home).
function initCarousels() {
  // O hero da home NÃO usa setupCarousel — ele é o setupHeroCarousel (foto/vídeo
  // full-bleed por tempo), chamado no bootstrap. setupCarousel serve os tracks
  // scroll-snap com [data-carousel="cards"] (hoje só a colab: swipe/scroll/teclado,
  // sem dots nem autoplay).
  document
    .querySelectorAll('[data-carousel="cards"] [data-carousel-track]')
    .forEach((track) => setupCarousel(track, { dots: false, autoplay: false }));
}

// --- Bootstrap -----------------------------------------------------------------
export function initSite() {
  renderHeader();
  renderAvisoBar(); // tarja "recado da casa" no topo (só se houver um vigente)
  renderFooter();
  renderTabbar(); // barra inferior mobile (todas as páginas; CSS some >820px)
  initAuth(); // header reflete a sessão + reage a login/logout (todas as páginas)
  initIndicacao(); // capta ?indica= e registra o vínculo quando logado (todas as páginas)
  initCart(); // drawer + badge (todas as páginas)
  initCatalogPage(); // só age se houver [data-catalog-grid]
  initProductPage(); // só age se houver [data-product-root]
  initPlanosPage(); // só age se houver [data-assinar]
  initPresentearPage(); // só age se houver [data-presentear]
  initMuralPage(); // só age se houver [data-mural] (/o-casa)
  initCardapioFavoritos(); // corações no /cardapio (só age logado + [data-cardapio-favoritos])
  initLojaDesejos(); // "ficou pra depois" na loja/produto/perfil (só age logado + migration 0029)
  initReposicao(); // "me avisa quando voltar" + "voltou pra vitrine" (loja/produto/perfil; migration 0030)
  initAgenda(); // próximos encontros na home (só age se houver [data-agenda])
  initTrilha(); // playlists do Spotify na home (só age se houver [data-trilha])
  initGentePage(); // cartão público /gente/{handle} (só age se houver [data-gente-root])
  initCheckoutSucessoPage(); // só age na checkout-sucesso.html (limpa o carrinho)
  initCadastroPage(); // só age se houver [data-cadastro-form]
  initLoginPage(); // só age se houver [data-login-form]
  initGoogleAuth(); // injeta o "continuar com o Google" nos [data-google-slot]
  initPerfilPage(); // só age se houver [data-perfil-root] (protege a rota)
  initPontosPage(); // só age se houver [data-pontos-root] (protege a rota)
  initConquistasPage(); // só age se houver [data-conquistas-root] (protege a rota)
  initPedidosPage(); // só age se houver [data-pedidos-root] (protege a rota)
  initAchievementToast(); // toast de conquista nova (qualquer página, se logado)
  initAuthConfirmadoPage(); // só age se houver [data-auth-confirmado-root]
  initCarousels(); // só age se houver [data-carousel]
  setupHeroCarousel(); // fundo do hero em foto/vídeo (só age se houver [data-hero-carousel])
  setupVoltarAoTopo(); // botão flutuante "voltar ao topo" (todas as páginas)
  renderIcons(); // ícones do header/footer + conteúdo estático restante
  initReveal(); // revela .reveal ao rolar (respeita prefers-reduced-motion)
}

// Auto-inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}
