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
  PlayCircle,
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
  PlayCircle,
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
    telefoneHref: '+5551993605262',
    horario: 'Seg a sáb 8h–19h · dom 15h–19h',
  },
  redes: [
    { nome: 'Instagram', href: '#' },
    { nome: 'Facebook', href: '#' },
    { nome: 'Spotify', href: '#' },
  ],
};

// Navegação principal. Aponta pras páginas reais (cada uma é uma URL).
const NAV = [
  { rotulo: 'Home', href: '/pages/home.html' },
  { rotulo: 'O Casa', href: '/pages/o-casa.html' },
  { rotulo: 'Cardápio', href: '/pages/cardapio.html' },
  { rotulo: 'Loja', href: '/pages/loja.html' },
  { rotulo: 'Planos', href: '/pages/planos.html' },
  { rotulo: 'Colab', href: '/pages/colab.html' },
];

// Qual item da NAV corresponde à página atual (pra marcar como ativo).
// produto.html conta como "Loja"; a raiz "/" conta como "Home".
function activeNavHref() {
  const path = window.location.pathname;
  const base = path.substring(path.lastIndexOf('/') + 1) || 'home.html';
  if (base === '' || base === 'index.html') return '/pages/home.html';
  if (base === 'produto.html') return '/pages/loja.html';
  const found = NAV.find((item) => item.href.endsWith('/' + base));
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
    .select('full_name, telefone, role, points_balance, tier_slug')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

async function signOut() {
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
    return this.getCart().reduce((n, it) => n + it.qtd, 0);
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

// --- Header --------------------------------------------------------------------
function renderHeader() {
  const slot = document.getElementById('site-header');
  if (!slot) return;

  const ativo = activeNavHref();

  // Nav editorial (uppercase/letter-spacing vêm do CSS .mainnav a). aria-current
  // marca a página atual; o CSS pinta em dourado.
  const linksDesktop = NAV.map((item) => {
    const on = item.href === ativo;
    return `<a href="${item.href}"${on ? ' aria-current="page"' : ''}>${item.rotulo}</a>`;
  }).join('');

  const linksMobile = NAV.map((item) => {
    const on = item.href === ativo;
    return `<a href="${item.href}"${on ? ' aria-current="page"' : ''} data-menu-link>${item.rotulo}</a>`;
  }).join('');

  slot.innerHTML = `
    <header id="topo" class="site-header" data-site-header>
      <div class="wrap">
        <!-- Marca (logo oficial; o texto acessível vive no aria-label do link) -->
        <a href="/pages/home.html" class="brand" aria-label="Casa Coffee Colab, início">
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
          <a href="/pages/o-casa.html" class="btn-visit">Visite-nos</a>

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
          <div class="menu-cta">
            <a href="/pages/o-casa.html" class="btn-visit" data-menu-link>Visite-nos</a>
          </div>
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

// --- Footer --------------------------------------------------------------------
function renderFooter() {
  const slot = document.getElementById('site-footer');
  if (!slot) return;

  const { contato, redes } = MARCA;

  const linksNav = NAV.map(
    (item) => `<a href="${item.href}">${item.rotulo}</a>`
  ).join('');

  const linksRedes = redes
    .map((r) => `<a href="${r.href}" aria-label="${r.nome}">${r.nome}</a>`)
    .join('');

  slot.innerHTML = `
    <footer class="foot">
      <div class="wrap">
        <!-- Marca + bio -->
        <div>
          <a href="/pages/home.html" class="brand" aria-label="Casa Coffee Colab, início">
            <span class="big">CASA</span>
            <span class="small">COFFEE COLAB</span>
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
            <a href="tel:${contato.telefoneHref}">${contato.telefone}</a>
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
  const HOME = '/pages/home.html';
  const on = (href) => (href === ativo ? ' aria-current="page"' : '');

  const el = document.createElement('nav');
  el.className = 'tabbar';
  el.setAttribute('data-tabbar', '');
  el.setAttribute('aria-label', 'Navegação rápida');
  el.innerHTML = `
    <a href="/pages/cardapio.html"${on('/pages/cardapio.html')}>
      <i data-lucide="utensils"></i><span>Cardápio</span>
    </a>
    <a href="/pages/loja.html"${on('/pages/loja.html')}>
      <i data-lucide="shopping-bag"></i><span>Loja</span>
    </a>
    <a href="${HOME}" class="center" aria-label="Início"${on(HOME)}>C</a>
    <a href="/pages/planos.html"${on('/pages/planos.html')}>
      <i data-lucide="sparkles"></i><span>Clube</span>
    </a>
    <a href="/pages/colab.html"${on('/pages/colab.html')}>
      <i data-lucide="users"></i><span>Colab</span>
    </a>
  `;
  document.body.appendChild(el);
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

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  alvos.forEach((el) => obs.observe(el));
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
  if (items.length === 0) {
    wrap.innerHTML = `
      <div class="empty">
        <p class="e-title">teu carrinho tá vazio</p>
        <p class="mx-auto max-w-[16rem]">passa na loja e leva junto o que te agradar, no teu ritmo.</p>
        <a href="/pages/loja.html" class="btn solid">ver a loja</a>
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
          <p class="truncate font-medium text-ink">${p.nome}</p>
          ${it.variante ? `<p class="text-xs text-muted">${it.variante}</p>` : ''}
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

  footer.classList.remove('hidden');
  renderIcons();
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
        window.location.href = `/pages/login.html?redirect=${destino}`;
        return;
      }

      const texto = checkoutBtn.textContent;
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'te levando pro pagamento…';
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { items: itens },
        });
        if (error || !data?.url) {
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

// Busca o desconto do tier ATIVO do usuário e mostra o aviso gentil no drawer.
// É só informativo, o desconto REAL é aplicado server-side no checkout.
let cartDiscountPct = 0;
async function loadCartDiscount() {
  if (!supabase) return;
  const profile = await getProfile();
  const slug = profile?.tier_slug;
  if (!slug) return;
  const { data: tier } = await supabase
    .from('tiers')
    .select('discount_percent')
    .eq('slug', slug)
    .maybeSingle();
  cartDiscountPct = Number(tier?.discount_percent || 0);
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
  const acao = p.variantes
    ? `<a href="/pages/produto.html?slug=${p.slug}" class="btn solid sm" style="flex:1">escolher</a>`
    : `<button type="button" data-add="${p.id}" class="btn solid sm" style="flex:1">adicionar</button>`;
  return `
    <article class="prod" data-produto data-categoria="${p.categoria}">
      <a href="/pages/produto.html?slug=${p.slug}" class="block" aria-label="${p.nome}">
        <div class="ph ${p.imagemPlaceholder}"></div>
      </a>
      <div class="prod-body">
        <p class="prod-cat">${CATEGORIAS[p.categoria]}</p>
        <h3 class="leading-tight">
          <a href="/pages/produto.html?slug=${p.slug}" class="hover:text-coral">${p.nome}</a>
        </h3>
        <p class="price">${formatBRL(p.preco_centavos)}</p>
        <div class="mt-2 flex gap-2">
          <a href="/pages/produto.html?slug=${p.slug}" class="btn ghost sm" style="flex:1">ver</a>
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
        <a href="/pages/loja.html" class="btn solid">voltar pra loja</a>
      </div>`;
    renderIcons();
    return;
  }

  document.title = `${p.nome}, Casa Coffee Colab`;

  let variante = p.variantes ? p.variantes.opcoes[0] : null;
  let qtd = 1;

  const variantesHTML = p.variantes
    ? `
      <div class="mt-6">
        <span class="lbl">${p.variantes.rotulo}</span>
        <div class="mt-2 flex flex-wrap gap-2" data-variantes>
          ${p.variantes.opcoes
            .map(
              (o, i) =>
                `<button type="button" data-variante="${o}" aria-pressed="${i === 0}" class="rounded-full border px-4 py-2 text-sm transition-colors ${
                  i === 0 ? 'border-coral bg-coral/10 text-coral' : 'border-line text-ink hover:border-coral'
                }">${o}</button>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  rootEl.innerHTML = `
    <div class="grid gap-8 lg:grid-cols-2">
      <div class="ph ${p.imagemPlaceholder} aspect-square w-full"></div>
      <div>
        <a href="/pages/loja.html" class="inline-flex items-center gap-1 text-sm text-muted hover:text-coral">
          <i data-lucide="chevron-left" class="h-4 w-4"></i> voltar pra loja
        </a>
        <p class="mt-4 prod-cat">${CATEGORIAS[p.categoria]}</p>
        <h1 class="title md mt-1">${p.nome}</h1>
        <p class="mt-3 title sm" style="color:var(--coral)">${formatBRL(p.preco_centavos)}</p>
        <p class="mt-4 max-w-prose text-ink-2">${p.descricao}</p>
        ${variantesHTML}
        <div class="mt-6">
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
          </div>
        </div>
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
    window.location.href = `/pages/login.html?redirect=${destino}`;
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
  Cart.clearCart();

  const params = new URLSearchParams(window.location.search);

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
  window.location.href = '/pages/home.html';
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
      : `<a href="/pages/login.html" class="hdr-auth-link">entrar</a>`;
  }

  const slotM = document.querySelector('[data-auth-slot-mobile]');
  if (slotM) {
    slotM.innerHTML = session
      ? authMobileLogado(nome)
      : `<a href="/pages/login.html" data-menu-link>entrar</a>`;
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
    hydrateAuthSaldo();    // preenche o saldo no drawer mobile
  }
  renderIcons();
}

// Markup do usuário logado no header desktop: botão-gatilho (avatar+nome) + painel.
function authDesktopLogado(nome, inicial) {
  return `
    <div class="relative" data-user-panel-wrap>
      <button type="button" data-user-panel-trigger aria-haspopup="true" aria-expanded="false" class="hdr-user-trigger">
        <span class="hdr-user-avatar">${inicial}</span>
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
      <span class="grid h-8 w-8 place-items-center rounded-full bg-coral/10 text-coral"><i data-lucide="user" class="h-4 w-4"></i></span>
      <span class="truncate">${nome}</span>
    </div>
    <p class="pb-1 pl-10 text-sm text-muted"><span data-auth-saldo>—</span> pontos</p>
    <a href="/pages/conta/perfil.html" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="user" class="h-5 w-5 text-coral"></i>meu perfil</a>
    <a href="/pages/conta/pontos.html" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="gift" class="h-5 w-5 text-coral"></i>meus pontos</a>
    <a href="/pages/conta/conquistas.html" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="award" class="h-5 w-5 text-coral"></i>minhas conquistas</a>
    <a href="/pages/conta/pedidos.html" class="flex items-center gap-2 py-2 text-base text-ink" data-menu-link><i data-lucide="shopping-bag" class="h-5 w-5 text-coral"></i>meus pedidos</a>
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
      <a href="/pages/conta/perfil.html" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="user" class="h-4 w-4 text-coral"></i>meu perfil</a>
      <a href="/pages/conta/pontos.html" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="gift" class="h-4 w-4 text-coral"></i>meus pontos</a>
      <a href="/pages/conta/conquistas.html" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="award" class="h-4 w-4 text-coral"></i>minhas conquistas</a>
      <a href="/pages/conta/pedidos.html" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="shopping-bag" class="h-4 w-4 text-coral"></i>meus pedidos</a>
      ${
        planoNome
          ? `<button type="button" data-panel-assinatura class="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-ink transition-colors hover:bg-ink/5"><i data-lucide="credit-card" class="h-4 w-4 text-coral"></i>minha assinatura</button>`
          : `<a href="/pages/planos.html" class="flex items-center gap-2 rounded-lg px-2 py-2 text-ink transition-colors hover:bg-ink/5"><i data-lucide="credit-card" class="h-4 w-4 text-coral"></i>conhecer os planos</a>`
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
  window.location.href = '/pages/conta/perfil.html';
}

// Preenche o saldo nos slots [data-auth-saldo] (drawer mobile). Uma leitura leve.
async function hydrateAuthSaldo() {
  const els = document.querySelectorAll('[data-auth-saldo]');
  if (!els.length || !supabase) return;
  const profile = await getProfile();
  const saldo = Number(profile?.points_balance || 0).toLocaleString('pt-BR');
  els.forEach((el) => (el.textContent = saldo));
}

// Header reflete o estado de auth e reage a login/logout (inclusive entre abas).
async function initAuth() {
  updateAuthUI(await getSession());
  if (supabase) {
    supabase.auth.onAuthStateChange((_evento, session) => updateAuthUI(session));
  }
}

// Guard: exige sessão. Sem sessão → manda pro login guardando o destino.
// NUNCA confia em role do client, quem precisar de papel lê do profiles (banco).
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/pages/login.html?redirect=${destino}`);
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
          emailRedirectTo: `${siteBase()}/pages/auth-confirmado.html`,
        },
      });
      if (error) return mostrarErro(mensagemDeErroAuth(error));

      if (data.session) {
        // "Confirm email" desligado → já entrou. Vai pro perfil.
        window.location.href = '/pages/conta/perfil.html';
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
      window.location.href = redirect || '/pages/conta/perfil.html';
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
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteBase()}/pages/login.html`,
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

// --- Perfil (área logada) ------------------------------------------------------
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
  let tiers = []; // [{ slug, nome, preco_centavos, ordem, ativo }]

  if (supabase) {
    const [subRes, tiersRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('tier_slug, status, current_period_end, scheduled_downgrade_to')
        .eq('user_id', session.user.id)
        .in('status', ['ativa', 'pausada', 'cancelada'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('tiers').select('slug, nome, preco_centavos, ordem, ativo').order('ordem'),
    ]);
    tiers = Array.isArray(tiersRes.data) ? tiersRes.data : [];
    const sub = subRes.data;
    if (sub) {
      subStatus = sub.status;
      planoSlug = sub.tier_slug || planoSlug;
      agendadoSlug = sub.scheduled_downgrade_to || null;
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
  const temGerenciar = ativa || pausada || reassinavel; // tem assinatura pra gerenciar
  const temPlano = temGerenciar || Boolean(profile?.tier_slug);
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

  root.innerHTML = `
    <div class="mx-auto max-w-2xl">
      <p class="decor text-2xl sm:text-3xl">que bom te ver</p>
      <h1 class="mt-1 font-titulo text-3xl sm:text-4xl">oi, ${nome}</h1>

      <dl class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="card">
          <dt class="lbl">teus pontos</dt>
          <dd class="mt-1 font-titulo text-2xl text-coral">${pontos}</dd>
          <a href="/pages/conta/pontos.html" class="mt-1 inline-block text-xs font-medium text-coral hover:underline">ver extrato e resgatar</a>
        </div>
        <div class="card">
          <dt class="lbl">teu plano</dt>
          <dd class="mt-1 font-titulo text-lg">${plano}</dd>
          ${
            ativa
              ? `<p class="status mt-1"><span class="dot green"></span>ativo</p>`
              : emGraca
                ? `<p class="status mt-1"><span class="dot gold"></span>pausado · ativo até ${ativoAte}</p>`
                : pausada
                  ? `<p class="status mt-1"><span class="dot muted"></span>pausado</p>`
                  : reassinavel
                    ? `<p class="status mt-1"><span class="dot muted"></span>encerrado</p>`
                    : `<a href="/pages/planos.html" class="mt-2 inline-block text-xs font-medium text-coral hover:underline">ver os planos</a>`
          }
        </div>
        <div class="card">
          <dt class="lbl">e-mail</dt>
          <dd class="mt-1 break-all text-sm text-ink">${email}</dd>
        </div>
      </dl>

      ${
        temGerenciar
          ? `<section class="mt-8 card" data-gerenciar>
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

      <div class="mt-4">
        <a href="/pages/conta/conquistas.html" class="inline-flex items-center gap-2 text-sm font-medium text-coral hover:underline">
          <i data-lucide="award" class="h-4 w-4"></i>minhas conquistas
        </a>
      </div>

      <form class="form mt-10" data-perfil-form novalidate>
        <div>
          <h2 class="font-titulo text-xl">teus dados</h2>
          <p class="mt-1 text-sm text-muted">atualiza quando quiser, é só teu.</p>
        </div>

        <div class="field">
          <label for="perfil-nome">nome</label>
          <input id="perfil-nome" name="nome" type="text" value="${nome}" autocomplete="name" class="inp" />
        </div>

        <div class="field">
          <label for="perfil-telefone">telefone</label>
          <input id="perfil-telefone" name="telefone" type="tel" value="${telefone}" autocomplete="tel" class="inp" />
        </div>

        <p class="hidden text-sm" data-perfil-msg aria-live="polite"></p>
        <button type="submit" class="btn solid mt-5">salvar</button>
      </form>

      <div class="mt-10 border-t border-line pt-6">
        <button type="button" data-signout class="btn ghost">
          <i data-lucide="log-out" class="h-4 w-4"></i>sair da conta
        </button>
      </div>
    </div>`;

  renderIcons();

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

  // Editar nome/telefone, update na PRÓPRIA linha (RLS garante id = auth.uid()).
  const perfilForm = root.querySelector('[data-perfil-form]');
  const msg = root.querySelector('[data-perfil-msg]');
  const salvarBtn = perfilForm?.querySelector('[type="submit"]');
  perfilForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.classList.add('hidden');
    const novoNome = perfilForm.nome.value.trim();
    const novoTel = perfilForm.telefone.value.trim();
    if (!novoNome) {
      if (msg) {
        msg.textContent = 'conta pra gente teu nome? 💛';
        msg.className = 'mt-3 text-sm text-coral';
        msg.classList.remove('hidden');
      }
      return;
    }
    const textoBtn = salvarBtn?.textContent;
    if (salvarBtn) {
      salvarBtn.disabled = true;
      salvarBtn.textContent = 'salvando…';
    }
    try {
      // Fonte da verdade dos dados: profiles (RLS: só a própria linha).
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: novoNome, telefone: novoTel })
        .eq('id', session.user.id);
      if (!error) {
        // Espelha no metadata do auth (é o que o header usa pra mostrar o nome).
        await supabase.auth.updateUser({ data: { full_name: novoNome, telefone: novoTel } });
      }
      if (msg) {
        if (error) {
          msg.textContent = 'não deu pra salvar agora. tenta de novo daqui a pouco?';
          msg.className = 'mt-3 text-sm text-coral';
        } else {
          msg.textContent = 'prontinho, teus dados foram salvos. 💛';
          msg.className = 'mt-3 text-sm text-olive';
          updateAuthUI(await getSession()); // reflete o nome novo no header
        }
        msg.classList.remove('hidden');
      }
    } finally {
      if (salvarBtn) {
        salvarBtn.disabled = false;
        salvarBtn.textContent = textoBtn;
      }
    }
  });

  root.querySelector('[data-signout]')?.addEventListener('click', doSignOut);
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
                : `os pontos são um agrado de quem tem plano, <a href="/pages/planos.html" class="font-medium text-coral underline decoration-coral/40 underline-offset-2 hover:decoration-coral">ativa um pra começar a pontuar</a>`
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
          <a href="/pages/conta/perfil.html" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
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
            const msg = data?.error || 'não deu pra resgatar agora. tenta de novo daqui a pouco? 💛';
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
        <a href="/pages/conta/perfil.html" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
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
        <a href="/pages/conta/perfil.html" class="btn ghost"><i data-lucide="arrow-left" class="h-4 w-4"></i>voltar pra conta</a>
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

// --- Confirmação de e-mail (retorno do link) -----------------------------------
// O supabase-js detecta a sessão na URL (detectSessionInUrl é padrão). Se logou,
// oferece ir pra conta; se não (link velho/expirado), manda pro login com carinho.
async function initAuthConfirmadoPage() {
  const root = document.querySelector('[data-auth-confirmado-root]');
  if (!root) return;

  const render = (session) => {
    root.innerHTML = session
      ? `<div class="mx-auto max-w-md card text-center">
           <span class="mx-auto icon-badge lg green">
             <i data-lucide="heart" class="h-8 w-8"></i>
           </span>
           <h1 class="mt-5 font-titulo text-3xl sm:text-4xl">teu e-mail tá confirmado</h1>
           <p class="mt-3 text-ink-2">bem-vindo ao Casa. 💛 tua conta já tá pronta, chega mais.</p>
           <a href="/pages/conta/perfil.html" class="btn solid mt-7">ir pra minha conta</a>
         </div>`
      : `<div class="mx-auto max-w-md card text-center">
           <span class="mx-auto icon-badge lg coral">
             <i data-lucide="mail" class="h-8 w-8"></i>
           </span>
           <h1 class="mt-5 font-titulo text-3xl sm:text-4xl">quase lá</h1>
           <p class="mt-3 text-ink-2">esse link pode já ter sido usado ou expirado. entra com teu e-mail e senha que a gente te recebe.</p>
           <a href="/pages/login.html" class="btn solid mt-7">ir pro login</a>
         </div>`;
    renderIcons();
  };

  // Primeira leitura + fallback: a sessão pode chegar logo após o parse da URL.
  const session = await getSession();
  render(session);
  if (supabase && !session) {
    supabase.auth.onAuthStateChange((_evento, s) => {
      if (s) render(s);
    });
  }
}

// Configura os carrosséis do tipo "cards" (home e colab) + o hero (home).
function initCarousels() {
  const hero = document.querySelector('[data-carousel="hero"] [data-carousel-track]');
  if (hero) setupCarousel(hero, { dots: true, autoplay: true, interval: 5500 });

  document
    .querySelectorAll('[data-carousel="cards"] [data-carousel-track]')
    .forEach((track) => setupCarousel(track, { dots: false, autoplay: false }));
}

// --- Bootstrap -----------------------------------------------------------------
export function initSite() {
  renderHeader();
  renderFooter();
  renderTabbar(); // barra inferior mobile (todas as páginas; CSS some >820px)
  initAuth(); // header reflete a sessão + reage a login/logout (todas as páginas)
  initCart(); // drawer + badge (todas as páginas)
  initCatalogPage(); // só age se houver [data-catalog-grid]
  initProductPage(); // só age se houver [data-product-root]
  initPlanosPage(); // só age se houver [data-assinar]
  initCheckoutSucessoPage(); // só age na checkout-sucesso.html (limpa o carrinho)
  initCadastroPage(); // só age se houver [data-cadastro-form]
  initLoginPage(); // só age se houver [data-login-form]
  initPerfilPage(); // só age se houver [data-perfil-root] (protege a rota)
  initPontosPage(); // só age se houver [data-pontos-root] (protege a rota)
  initConquistasPage(); // só age se houver [data-conquistas-root] (protege a rota)
  initPedidosPage(); // só age se houver [data-pedidos-root] (protege a rota)
  initAchievementToast(); // toast de conquista nova (qualquer página, se logado)
  initAuthConfirmadoPage(); // só age se houver [data-auth-confirmado-root]
  initCarousels(); // só age se houver [data-carousel]
  renderIcons(); // ícones do header/footer + conteúdo estático restante
  initReveal(); // revela .reveal ao rolar (respeita prefers-reduced-motion)
}

// Auto-inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}
