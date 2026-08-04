// =============================================================================
// Casa Coffee Colab, admin.js
// Console da equipe (/admin). Camada própria, separada do app.js de propósito:
// o app.js auto-inicializa header, carrossel, carrinho e drawer da loja no
// bootstrap — nada disso faz sentido no balcão de trás.
//
// Tudo que aparece aqui vem das funções `admin_*` do banco (migration 0017),
// SECURITY DEFINER, com a permissão conferida dentro do SQL. O client só
// desenha o que a RPC devolveu: esconder um botão aqui é gentileza de UI, a
// tranca de verdade está no banco.
// =============================================================================

import './styles.css';
import {
  createIcons,
  LayoutDashboard,
  ShoppingBag,
  Gift,
  Users,
  BarChart3,
  ShieldCheck,
  KeyRound,
  LogOut,
  Coffee,
  Truck,
  Store,
  Check,
  X,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  Megaphone,
  Music,
} from 'lucide';
import { createClient } from '@supabase/supabase-js';

const LUCIDE_ICONS = {
  LayoutDashboard,
  ShoppingBag,
  Gift,
  Users,
  BarChart3,
  ShieldCheck,
  KeyRound,
  LogOut,
  Coffee,
  Truck,
  Store,
  Check,
  X,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  Megaphone,
  Music,
};

function renderIcons() {
  createIcons({ icons: LUCIDE_ICONS });
}

// ===== SUPABASE =====================================================
// Só a anon key, como no resto do site. Quem protege os dados é a RLS + as
// funções do 0017.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseConfigurado =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && !/placeholder/i.test(SUPABASE_URL);
const supabase = supabaseConfigurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// O Supabase Auth só entende e-mail. O adm master entra digitando "casa", então
// a gente traduz login → e-mail interno aqui. Quem já digita um e-mail passa reto.
const DOMINIO_INTERNO = 'casacoffeecolab.com.br';
function loginParaEmail(valor) {
  const v = String(valor || '').trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${DOMINIO_INTERNO}`;
}

// ===== HELPERS ======================================================
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBRL(centavos) {
  const n = Number(centavos || 0) / 100;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumero(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function formatData(iso, comHora = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (!comHora) return data;
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

// Pedido é UUID; ninguém no balcão vai ler os 36 caracteres. Os 6 primeiros
// bastam pra conferir com o cliente.
function refCurta(id) {
  return String(id || '').slice(0, 6).toUpperCase();
}

let toastTimer;
function toast(mensagem, tom = 'ok') {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = mensagem;
  el.dataset.tom = tom;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3600);
}

// Toda chamada ao banco passa por aqui: erro vira Error com a mensagem em pt-BR
// que a própria função SQL levantou (as do 0017 falam a língua da casa).
async function rpc(nome, params) {
  if (!supabase) throw new Error('o banco ainda não está configurado por aqui');
  const { data, error } = await supabase.rpc(nome, params);
  if (error) throw new Error(error.message || 'não deu pra falar com o banco agora');
  return data;
}

// Modal de confirmação, pra ações que não dá pra desfazer (dar baixa, tirar
// alguém do console). Promise<boolean>.
function confirmar({ titulo, texto, ok = 'confirmar', tom = '' }) {
  return new Promise((resolve) => {
    const fundo = document.createElement('div');
    fundo.className = 'ad-modal';
    fundo.innerHTML = `
      <div class="ad-modal-caixa" role="dialog" aria-modal="true" aria-label="${escapeHtml(titulo)}">
        <h3 class="title sm">${escapeHtml(titulo)}</h3>
        <p class="ad-modal-texto">${escapeHtml(texto)}</p>
        <div class="ad-modal-acoes">
          <button type="button" class="btn ghost sm" data-nao>deixa pra lá</button>
          <button type="button" class="btn ${tom === 'perigo' ? 'ink' : 'solid'} sm" data-sim>${escapeHtml(ok)}</button>
        </div>
      </div>`;
    const fechar = (resposta) => {
      document.removeEventListener('keydown', aoTeclar);
      fundo.remove();
      resolve(resposta);
    };
    const aoTeclar = (e) => {
      if (e.key === 'Escape') fechar(false);
    };
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo) fechar(false);
    });
    $('[data-nao]', fundo).addEventListener('click', () => fechar(false));
    $('[data-sim]', fundo).addEventListener('click', () => fechar(true));
    document.addEventListener('keydown', aoTeclar);
    document.body.appendChild(fundo);
    $('[data-sim]', fundo).focus();
  });
}

// Botãozinho de olho nos campos de senha (mesmo comportamento do login do site).
function ligarOlhosDeSenha(escopo) {
  $$('[data-olho]', escopo).forEach((botao) => {
    botao.addEventListener('click', () => {
      const campo = $(`#${botao.dataset.olho}`, escopo);
      if (!campo) return;
      const mostrando = campo.type === 'text';
      campo.type = mostrando ? 'password' : 'text';
      botao.setAttribute('aria-label', mostrando ? 'mostrar a senha' : 'esconder a senha');
      botao.innerHTML = `<i data-lucide="${mostrando ? 'eye' : 'eye-off'}"></i>`;
      renderIcons();
    });
  });
}

// Um "carregando" honesto no lugar do conteúdo, pra tela nunca ficar em branco.
function carregando(alvo, texto = 'buscando…') {
  alvo.innerHTML = `<div class="ad-carregando">${escapeHtml(texto)}</div>`;
}

function vazio(titulo, texto) {
  return `<div class="empty"><p class="e-title">${escapeHtml(titulo)}</p><p>${escapeHtml(texto)}</p></div>`;
}

function erroNaTela(alvo, e) {
  alvo.innerHTML = `<div class="notice err"><p>${escapeHtml(e.message || 'algo não saiu como esperado')}</p></div>`;
}

// ===== ESTADO =======================================================
const estado = {
  sessao: null,
  perms: null, // { console, nome, papel, master, senha_trocada, permissoes[], tudo }
  aba: null,
};

function pode(slug) {
  if (!estado.perms) return false;
  if (estado.perms.tudo) return true;
  return Array.isArray(estado.perms.permissoes) && estado.perms.permissoes.includes(slug);
}

// ===== NAVEGAÇÃO ====================================================
// 'entregas' não vira aba: é a permissão de dar baixa, e o botão dela mora
// dentro de "pedidos".
const NAV = [
  { id: 'painel', rotulo: 'painel', icone: 'layout-dashboard', perm: 'dashboard' },
  { id: 'pedidos', rotulo: 'pedidos', icone: 'shopping-bag', perm: 'pedidos' },
  { id: 'resgates', rotulo: 'resgates', icone: 'gift', perm: 'resgates' },
  { id: 'pessoas', rotulo: 'pessoas', icone: 'users', perm: 'usuarios' },
  { id: 'relatorios', rotulo: 'relatórios', icone: 'bar-chart-3', perm: 'relatorios' },
  { id: 'equipe', rotulo: 'equipe', icone: 'shield-check', perm: 'equipe' },
  // Recado da casa: owner-only. O whitelist de permissões do console é fechado por
  // CHECK no banco (0017), então NÃO entra em PERMISSOES como grantável — quem tem
  // 'tudo' (adm do Casa) vê; ninguém mais recebe. Abrir pra delegar pediria migration.
  { id: 'recados', rotulo: 'recados', icone: 'megaphone', perm: 'avisos' },
  // Trilha do Casa (playlists): owner-only, mesma lógica do 'avisos' (não grantável).
  { id: 'trilha', rotulo: 'trilha', icone: 'music', perm: 'trilha' },
  { id: 'conta', rotulo: 'tua conta', icone: 'key-round', perm: null },
];

const PERMISSOES = [
  { slug: 'dashboard', rotulo: 'ver o painel', descricao: 'os números do dia' },
  { slug: 'pedidos', rotulo: 'ver os pedidos', descricao: 'a lista de compras da loja' },
  { slug: 'entregas', rotulo: 'dar baixa em pedido', descricao: 'confirmar entregue ou retirado' },
  { slug: 'resgates', rotulo: 'cuidar dos resgates', descricao: 'ver e entregar recompensas' },
  { slug: 'usuarios', rotulo: 'ver as pessoas', descricao: 'quem já passou por aqui' },
  { slug: 'relatorios', rotulo: 'ver relatórios', descricao: 'o que vendeu e o que saiu por pontos' },
  { slug: 'equipe', rotulo: 'cuidar da equipe', descricao: 'dar e tirar permissões' },
];

const ROTULO_PAPEL = {
  owner: 'adm do Casa',
  gerente: 'gerência',
  staff: 'equipe',
  cliente: 'cliente',
};

// ===== TELA DE ENTRADA (/admin/entrar) ==============================
async function initEntrar() {
  const alvo = $('[data-entrar-form]');
  if (!alvo) return;

  if (!supabase) {
    alvo.innerHTML = `<div class="notice warn"><p>o banco ainda não está configurado neste ambiente. preenche o .env e volta aqui.</p></div>`;
    return;
  }

  // Quem já tem sessão de equipe não precisa digitar de novo.
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    try {
      const perms = await rpc('admin_minhas_permissoes');
      if (perms?.console) {
        window.location.replace('/admin/');
        return;
      }
    } catch {
      /* segue pro formulário */
    }
  }

  alvo.innerHTML = `
    <form class="ad-entrar-form" novalidate>
      <div class="field">
        <label for="quem">teu login ou e-mail</label>
        <input id="quem" name="quem" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="casa" required />
      </div>
      <div class="field">
        <label for="senha">tua senha</label>
        <div class="ad-senha">
          <input id="senha" name="senha" type="password" autocomplete="current-password" required />
          <button type="button" class="ad-olho" data-olho="senha" aria-label="mostrar a senha"><i data-lucide="eye"></i></button>
        </div>
      </div>
      <div data-aviso></div>
      <button type="submit" class="btn solid block">entrar</button>
    </form>`;

  ligarOlhosDeSenha(alvo);
  renderIcons();

  const form = $('form', alvo);
  const aviso = $('[data-aviso]', alvo);
  const botao = $('button[type="submit"]', alvo);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const quem = $('#quem', form).value.trim();
    const senha = $('#senha', form).value;
    aviso.innerHTML = '';
    if (!quem || !senha) {
      aviso.innerHTML = `<div class="notice warn"><p>falta preencher os dois campos.</p></div>`;
      return;
    }
    botao.disabled = true;
    botao.textContent = 'abrindo…';
    const { error } = await supabase.auth.signInWithPassword({
      email: loginParaEmail(quem),
      password: senha,
    });
    if (error) {
      botao.disabled = false;
      botao.textContent = 'entrar';
      aviso.innerHTML = `<div class="notice err"><p>login ou senha não conferem. tenta de novo?</p></div>`;
      return;
    }
    // Sessão criada: quem decide se essa pessoa entra no console é o banco.
    try {
      const perms = await rpc('admin_minhas_permissoes');
      if (!perms?.console) {
        await supabase.auth.signOut();
        botao.disabled = false;
        botao.textContent = 'entrar';
        aviso.innerHTML = `<div class="notice warn"><p>essa conta não tem acesso ao console. se tu é cliente, entra por <a class="form-link" href="/login">aqui</a>.</p></div>`;
        return;
      }
    } catch (err) {
      botao.disabled = false;
      botao.textContent = 'entrar';
      aviso.innerHTML = `<div class="notice err"><p>${escapeHtml(err.message)}</p></div>`;
      return;
    }
    window.location.replace('/admin/');
  });
}

// ===== CONSOLE (/admin/) ============================================
async function initConsole() {
  const raiz = $('[data-console-root]');
  if (!raiz) return;

  if (!supabase) {
    raiz.innerHTML = `<div class="ad-aviso-cheio"><div class="notice warn"><p>o banco ainda não está configurado neste ambiente.</p></div></div>`;
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    window.location.replace('/admin/entrar');
    return;
  }
  estado.sessao = data.session;

  try {
    estado.perms = await rpc('admin_minhas_permissoes');
  } catch (e) {
    raiz.innerHTML = `<div class="ad-aviso-cheio"><div class="notice err"><p>${escapeHtml(e.message)}</p></div></div>`;
    return;
  }

  if (!estado.perms?.console) {
    raiz.innerHTML = `
      <div class="ad-aviso-cheio">
        <div class="ad-entrar-card">
          <p class="eyebrow coral">console do Casa</p>
          <h1 class="title md">esse balcão não é teu</h1>
          <p class="ad-entrar-sub">essa conta não tem acesso ao console. se tu é cliente, teu lugar é na <a class="form-link" href="/conta/perfil">tua conta</a>.</p>
          <div class="ad-modal-acoes" style="justify-content:flex-start">
            <button type="button" class="btn ghost sm" data-sair>sair</button>
            <a class="btn solid sm" href="/home">voltar pro site</a>
          </div>
        </div>
      </div>`;
    $('[data-sair]', raiz).addEventListener('click', sair);
    return;
  }

  // Primeiro acesso do adm master: a senha inicial é combinada, então não vale
  // deixar entrar em nada antes de trocar. SÓ vale pro master: `senha_alterada_em`
  // nasce null pra todo mundo (o handle_new_user não preenche), então sem o gate de
  // `master` qualquer funcionário adicionado a partir de conta de cliente já
  // existente cairia aqui e seria forçado a rotacionar a própria senha real.
  if (estado.perms.master && estado.perms.senha_trocada === false) {
    telaTrocaObrigatoria(raiz);
    return;
  }

  montarShell(raiz);
}

async function sair() {
  try {
    await supabase.auth.signOut();
  } finally {
    window.location.replace('/admin/entrar');
  }
}

// ===== TROCA DE SENHA ===============================================
// Um formulário só, usado no primeiro acesso (obrigatório) e na aba "tua conta".
function formSenhaHTML() {
  return `
    <form class="ad-form-senha" novalidate>
      <div class="field">
        <label for="senha-atual">a senha de agora</label>
        <div class="ad-senha">
          <input id="senha-atual" type="password" autocomplete="current-password" required />
          <button type="button" class="ad-olho" data-olho="senha-atual" aria-label="mostrar a senha"><i data-lucide="eye"></i></button>
        </div>
      </div>
      <div class="field">
        <label for="senha-nova">a senha nova</label>
        <div class="ad-senha">
          <input id="senha-nova" type="password" autocomplete="new-password" minlength="8" required />
          <button type="button" class="ad-olho" data-olho="senha-nova" aria-label="mostrar a senha"><i data-lucide="eye"></i></button>
        </div>
        <p class="ad-dica">pelo menos 8 caracteres.</p>
      </div>
      <div class="field">
        <label for="senha-nova-2">de novo, pra conferir</label>
        <div class="ad-senha">
          <input id="senha-nova-2" type="password" autocomplete="new-password" minlength="8" required />
          <button type="button" class="ad-olho" data-olho="senha-nova-2" aria-label="mostrar a senha"><i data-lucide="eye"></i></button>
        </div>
      </div>
      <div data-aviso-senha></div>
      <button type="submit" class="btn solid">guardar a senha nova</button>
    </form>`;
}

function ligarFormSenha(escopo, aoTrocar) {
  ligarOlhosDeSenha(escopo);
  renderIcons();
  const form = $('form', escopo);
  const aviso = $('[data-aviso-senha]', escopo);
  const botao = $('button[type="submit"]', escopo);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const atual = $('#senha-atual', form).value;
    const nova = $('#senha-nova', form).value;
    const nova2 = $('#senha-nova-2', form).value;
    aviso.innerHTML = '';

    if (nova.length < 8) {
      aviso.innerHTML = `<div class="notice warn"><p>a senha nova precisa de pelo menos 8 caracteres.</p></div>`;
      return;
    }
    if (nova !== nova2) {
      aviso.innerHTML = `<div class="notice warn"><p>as duas senhas novas não bateram.</p></div>`;
      return;
    }
    if (nova === atual) {
      aviso.innerHTML = `<div class="notice warn"><p>essa é a mesma senha de agora. escolhe outra?</p></div>`;
      return;
    }

    botao.disabled = true;
    botao.textContent = 'guardando…';

    // Confere a senha antiga entrando de novo com ela — é o jeito honesto de
    // provar que quem está no teclado sabe a senha atual.
    const email = estado.sessao?.user?.email;
    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email,
      password: atual,
    });
    if (erroLogin) {
      botao.disabled = false;
      botao.textContent = 'guardar a senha nova';
      aviso.innerHTML = `<div class="notice err"><p>a senha de agora não confere.</p></div>`;
      return;
    }

    const { error: erroUpdate } = await supabase.auth.updateUser({ password: nova });
    if (erroUpdate) {
      botao.disabled = false;
      botao.textContent = 'guardar a senha nova';
      aviso.innerHTML = `<div class="notice err"><p>${escapeHtml(erroUpdate.message)}</p></div>`;
      return;
    }

    try {
      await rpc('admin_senha_alterada');
    } catch {
      // A senha já trocou; se o carimbo falhar, o console só vai pedir de novo.
    }

    const { data } = await supabase.auth.getSession();
    estado.sessao = data?.session || estado.sessao;
    if (typeof aoTrocar === 'function') aoTrocar();
  });
}

function telaTrocaObrigatoria(raiz) {
  raiz.innerHTML = `
    <div class="ad-aviso-cheio">
      <div class="ad-entrar-card">
        <p class="eyebrow coral">primeiro acesso</p>
        <h1 class="title md">escolhe uma senha tua</h1>
        <p class="ad-entrar-sub">a senha que tu usou pra entrar é a combinada de fábrica. antes de abrir o console, guarda uma que só tu sabe.</p>
        <div data-troca></div>
      </div>
    </div>`;
  const caixa = $('[data-troca]', raiz);
  caixa.innerHTML = formSenhaHTML();
  ligarFormSenha(caixa, async () => {
    estado.perms = await rpc('admin_minhas_permissoes');
    toast('senha trocada, bem-vindo ao balcão');
    montarShell(raiz);
  });
}

// ===== CASCA DO CONSOLE =============================================
function montarShell(raiz) {
  const abas = NAV.filter((item) => item.perm === null || pode(item.perm));
  const nome = estado.perms.nome || 'equipe';
  const papel = ROTULO_PAPEL[estado.perms.papel] || estado.perms.papel || '';

  raiz.innerHTML = `
    <div class="ad-shell">
      <aside class="ad-lado">
        <a class="ad-marca" href="/home">
          <i data-lucide="coffee"></i>
          <span>Casa <em>console</em></span>
        </a>
        <nav class="ad-nav" aria-label="seções do console">
          ${abas
            .map(
              (item) => `
            <button type="button" class="ad-nav-item" data-aba="${item.id}">
              <i data-lucide="${item.icone}"></i><span>${escapeHtml(item.rotulo)}</span>
            </button>`,
            )
            .join('')}
        </nav>
        <div class="ad-quem">
          <p class="ad-quem-nome">${escapeHtml(nome)}</p>
          <p class="ad-quem-papel">${escapeHtml(papel)}${estado.perms.master ? ' · conta do Casa' : ''}</p>
          <button type="button" class="ad-sair" data-sair><i data-lucide="log-out"></i><span>sair</span></button>
        </div>
      </aside>
      <main class="ad-conteudo" data-view></main>
    </div>`;

  $('[data-sair]', raiz).addEventListener('click', sair);
  $$('[data-aba]', raiz).forEach((botao) => {
    botao.addEventListener('click', () => {
      window.location.hash = botao.dataset.aba;
    });
  });
  renderIcons();

  window.addEventListener('hashchange', abrirDoHash);
  abrirDoHash();
}

function abrirDoHash() {
  const pedida = (window.location.hash || '').replace('#', '');
  const abas = NAV.filter((item) => item.perm === null || pode(item.perm));
  const item = abas.find((a) => a.id === pedida) || abas[0];
  if (!item) return;
  estado.aba = item.id;

  $$('[data-aba]').forEach((botao) => {
    const ativo = botao.dataset.aba === item.id;
    botao.classList.toggle('is-active', ativo);
    if (ativo) botao.setAttribute('aria-current', 'page');
    else botao.removeAttribute('aria-current');
  });

  const view = $('[data-view]');
  if (!view) return;
  view.scrollTop = 0;
  const telas = {
    painel: viewPainel,
    pedidos: viewPedidos,
    resgates: viewResgates,
    pessoas: viewPessoas,
    relatorios: viewRelatorios,
    equipe: viewEquipe,
    recados: viewRecados,
    trilha: viewTrilha,
    conta: viewConta,
  };
  (telas[item.id] || viewPainel)(view);
}

function cabecalho(titulo, texto, extra = '') {
  return `
    <header class="ad-head">
      <div>
        <h1 class="title md">${escapeHtml(titulo)}</h1>
        <p class="ad-head-sub">${escapeHtml(texto)}</p>
      </div>
      <div class="ad-head-acoes">${extra}</div>
    </header>`;
}

// ===== PAINEL =======================================================
async function viewPainel(view) {
  view.innerHTML = cabecalho('o dia no Casa', 'como está a casa agora.') + '<div data-corpo></div>';
  const corpo = $('[data-corpo]', view);
  carregando(corpo, 'contando…');
  try {
    const d = await rpc('admin_dashboard');
    const numeros = [
      { n: formatNumero(d.pedidos_hoje), l: 'pedidos hoje' },
      { n: formatBRL(d.receita_hoje_centavos), l: 'entrou hoje' },
      { n: formatBRL(d.receita_mes_centavos), l: 'entrou no mês' },
      { n: formatNumero(d.a_entregar), l: 'pra entregar' },
      { n: formatNumero(d.a_retirar), l: 'pra retirar' },
      { n: formatNumero(d.resgates_abertos), l: 'resgates abertos' },
      { n: formatNumero(d.pessoas), l: 'pessoas cadastradas' },
      { n: formatNumero(d.assinantes_ativos), l: 'assinantes ativos' },
      { n: formatNumero(d.pontos_em_circulacao), l: 'pontos em circulação' },
    ];
    corpo.innerHTML = `
      <div class="ad-stats">
        ${numeros
          .map(
            (item) => `
          <div class="stat card">
            <p class="n">${escapeHtml(item.n)}</p>
            <p class="l">${escapeHtml(item.l)}</p>
          </div>`,
          )
          .join('')}
      </div>
      ${
        Number(d.a_entregar) + Number(d.a_retirar) > 0 && pode('pedidos')
          ? `<div class="notice info"><p>tem gente esperando: <a class="form-link" href="#pedidos">ver os pedidos abertos</a>.</p></div>`
          : ''
      }`;
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

// ===== PEDIDOS ======================================================
const filtrosPedidos = { status: 'abertos', modo: null };

async function viewPedidos(view) {
  view.innerHTML =
    cabecalho(
      'pedidos da loja',
      'o que a galera comprou pelo site.',
      `<button type="button" class="btn ghost sm" data-recarregar><i data-lucide="refresh-cw"></i>atualizar</button>`,
    ) +
    `<div class="ad-filtros" role="group" aria-label="filtrar pedidos">
      <button type="button" class="filtro" data-f-status="abertos">abertos</button>
      <button type="button" class="filtro" data-f-status="entregue">entregues</button>
      <button type="button" class="filtro" data-f-status="cancelado">cancelados</button>
      <button type="button" class="filtro" data-f-status="">todos</button>
      <span class="ad-filtros-divisor" aria-hidden="true"></span>
      <button type="button" class="filtro" data-f-modo="">entrega e retirada</button>
      <button type="button" class="filtro" data-f-modo="entrega">só entrega</button>
      <button type="button" class="filtro" data-f-modo="retirada">só retirada</button>
    </div>
    <div data-corpo></div>`;

  const corpo = $('[data-corpo]', view);
  const marcar = () => {
    $$('[data-f-status]', view).forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.fStatus || null) === filtrosPedidos.status)),
    );
    $$('[data-f-modo]', view).forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.fModo || null) === filtrosPedidos.modo)),
    );
  };
  $$('[data-f-status]', view).forEach((b) =>
    b.addEventListener('click', () => {
      filtrosPedidos.status = b.dataset.fStatus || null;
      marcar();
      carregarPedidos(corpo);
    }),
  );
  $$('[data-f-modo]', view).forEach((b) =>
    b.addEventListener('click', () => {
      filtrosPedidos.modo = b.dataset.fModo || null;
      marcar();
      carregarPedidos(corpo);
    }),
  );
  $('[data-recarregar]', view).addEventListener('click', () => carregarPedidos(corpo));
  marcar();
  renderIcons();
  carregarPedidos(corpo);
}

async function carregarPedidos(corpo) {
  carregando(corpo);
  try {
    const linhas = await rpc('admin_pedidos', {
      p_status: filtrosPedidos.status,
      p_modo: filtrosPedidos.modo,
      p_limite: 200,
    });
    if (!linhas || !linhas.length) {
      corpo.innerHTML = vazio('nenhum pedido por aqui', 'quando alguém comprar, aparece nesta lista.');
      return;
    }
    corpo.innerHTML = `<div class="ad-lista">${linhas.map(cardPedido).join('')}</div>`;
    renderIcons();
    $$('[data-baixa]', corpo).forEach((botao) => {
      botao.addEventListener('click', () => darBaixaPedido(botao, corpo));
    });
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

function tagStatusPedido(status) {
  const mapa = {
    pendente: ['gold', 'esperando pagamento'],
    pago: ['green', 'pago'],
    preparando: ['blue', 'preparando'],
    pronto: ['olive', 'pronto'],
    entregue: ['', 'entregue'],
    cancelado: ['coral', 'cancelado'],
  };
  const [cor, rotulo] = mapa[status] || ['', status || '—'];
  return `<span class="tag ${cor}">${escapeHtml(rotulo)}</span>`;
}

function enderecoDoPedido(p) {
  const linha1 = [p.entrega_rua, p.entrega_numero].filter(Boolean).join(', ');
  const linha2 = [p.entrega_bairro, p.entrega_cidade, p.entrega_uf].filter(Boolean).join(' · ');
  const partes = [linha1, p.entrega_complemento, linha2, p.entrega_cep].filter(Boolean);
  return partes.length ? partes.map((t) => escapeHtml(t)).join('<br />') : '';
}

function cardPedido(p) {
  const modo = p.modo_entrega === 'retirada' ? 'retirada' : 'entrega';
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const aberto = ['pago', 'preparando', 'pronto'].includes(p.status);
  const podeBaixar = aberto && pode('entregas');
  const endereco = modo === 'entrega' ? enderecoDoPedido(p) : '';

  return `
    <article class="card ad-card">
      <div class="ad-card-topo">
        <div>
          <p class="ad-ref">#${escapeHtml(refCurta(p.id))}</p>
          <p class="ad-card-nome">${escapeHtml(p.cliente_nome || 'sem nome')}</p>
          <p class="ad-card-meta">${escapeHtml(p.cliente_email || '')}${p.cliente_telefone ? ' · ' + escapeHtml(p.cliente_telefone) : ''}</p>
        </div>
        <div class="ad-card-tags">
          ${tagStatusPedido(p.status)}
          <span class="tag ${modo === 'retirada' ? 'olive' : 'blue'}"><i data-lucide="${modo === 'retirada' ? 'store' : 'truck'}"></i>${modo}</span>
        </div>
      </div>

      <div class="rows">
        ${itens
          .map(
            (i) => `
          <div class="row">
            <div class="row-main">
              <span>${escapeHtml(i.nome || 'item')}</span>
              ${i.variante ? `<span class="row-meta">${escapeHtml(i.variante)}</span>` : ''}
            </div>
            <span class="row-meta">${formatNumero(i.qtd)}×</span>
            <span class="row-val">${formatBRL(i.preco_centavos)}</span>
          </div>`,
          )
          .join('')}
      </div>

      <div class="ad-card-rodape">
        <div class="ad-card-info">
          <p class="ad-card-meta">${escapeHtml(formatData(p.criado_em))}</p>
          ${
            Number(p.desconto_centavos) > 0
              ? `<p class="ad-card-meta">desconto do plano ${escapeHtml(p.tier_slug || '')}: −${formatBRL(p.desconto_centavos)}</p>`
              : ''
          }
          ${endereco ? `<p class="ad-endereco">${endereco}</p>` : ''}
          ${
            p.entregue_em
              ? `<p class="ad-card-meta ok"><i data-lucide="check"></i> ${modo === 'retirada' ? 'retirado' : 'entregue'} em ${escapeHtml(formatData(p.entregue_em))}${p.entregue_por_nome ? ' por ' + escapeHtml(p.entregue_por_nome) : ''}</p>`
              : ''
          }
        </div>
        <div class="ad-card-acao">
          <p class="ad-total">${formatBRL(p.total_centavos)}</p>
          ${
            podeBaixar
              ? `<button type="button" class="btn solid sm" data-baixa="${escapeHtml(p.id)}" data-modo="${modo}">
                   <i data-lucide="check"></i>${modo === 'retirada' ? 'confirmar retirada' : 'confirmar entrega'}
                 </button>`
              : ''
          }
        </div>
      </div>
    </article>`;
}

async function darBaixaPedido(botao, corpo) {
  const id = botao.dataset.baixa;
  const modo = botao.dataset.modo;
  const ok = await confirmar({
    titulo: modo === 'retirada' ? 'a pessoa levou o pedido?' : 'o pedido saiu pra entrega?',
    texto:
      modo === 'retirada'
        ? 'isso marca o pedido como retirado no balcão. não dá pra desfazer por aqui.'
        : 'isso marca o pedido como entregue. não dá pra desfazer por aqui.',
    ok: 'sim, confirmar',
  });
  if (!ok) return;

  botao.disabled = true;
  try {
    const r = await rpc('admin_marcar_entregue', { p_order_id: id });
    if (r?.ok === false) {
      toast(r.erro || 'não deu pra dar baixa nesse pedido', 'erro');
      botao.disabled = false;
      return;
    }
    toast(r?.ja_estava ? 'esse já estava dado como entregue' : 'pronto, baixa confirmada 💛');
    carregarPedidos(corpo);
  } catch (e) {
    toast(e.message, 'erro');
    botao.disabled = false;
  }
}

// ===== RESGATES =====================================================
const filtrosResgates = { status: 'abertos' };

async function viewResgates(view) {
  view.innerHTML =
    cabecalho(
      'recompensas resgatadas',
      'o que saiu por pontos e ainda precisa chegar na mão de alguém.',
      `<button type="button" class="btn ghost sm" data-recarregar><i data-lucide="refresh-cw"></i>atualizar</button>`,
    ) +
    `<div class="ad-filtros" role="group" aria-label="filtrar resgates">
      <button type="button" class="filtro" data-f-status="abertos">a entregar</button>
      <button type="button" class="filtro" data-f-status="usado">já entregues</button>
      <button type="button" class="filtro" data-f-status="">todos</button>
    </div>
    <div data-corpo></div>`;

  const corpo = $('[data-corpo]', view);
  const marcar = () =>
    $$('[data-f-status]', view).forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.fStatus || null) === filtrosResgates.status)),
    );
  $$('[data-f-status]', view).forEach((b) =>
    b.addEventListener('click', () => {
      filtrosResgates.status = b.dataset.fStatus || null;
      marcar();
      carregarResgates(corpo);
    }),
  );
  $('[data-recarregar]', view).addEventListener('click', () => carregarResgates(corpo));
  marcar();
  renderIcons();
  carregarResgates(corpo);
}

async function carregarResgates(corpo) {
  carregando(corpo);
  try {
    const linhas = await rpc('admin_resgates', {
      p_status: filtrosResgates.status,
      p_limite: 200,
    });
    if (!linhas || !linhas.length) {
      corpo.innerHTML = vazio('nada resgatado por aqui', 'quando alguém trocar pontos por algo, aparece nesta lista.');
      return;
    }
    corpo.innerHTML = `<div class="ad-lista">${linhas.map(cardResgate).join('')}</div>`;
    renderIcons();
    $$('[data-usado]', corpo).forEach((botao) => {
      botao.addEventListener('click', () => darBaixaResgate(botao, corpo));
    });
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

function cardResgate(r) {
  const aberto = ['solicitado', 'aprovado'].includes(r.status);
  const podeBaixar = aberto && pode('resgates');
  return `
    <article class="card ad-card">
      <div class="ad-card-topo">
        <div>
          <p class="ad-ref">#${escapeHtml(refCurta(r.id))}</p>
          <p class="ad-card-nome">${escapeHtml(r.recompensa || 'recompensa')}</p>
          <p class="ad-card-meta">${escapeHtml(r.cliente_nome || 'sem nome')}${r.cliente_email ? ' · ' + escapeHtml(r.cliente_email) : ''}</p>
        </div>
        <div class="ad-card-tags">
          <span class="tag ${aberto ? 'gold' : ''}">${escapeHtml(aberto ? 'a entregar' : r.status || '—')}</span>
          ${r.tipo ? `<span class="tag olive">${escapeHtml(r.tipo)}</span>` : ''}
        </div>
      </div>
      <div class="ad-card-rodape">
        <div class="ad-card-info">
          <p class="ad-card-meta">pedido em ${escapeHtml(formatData(r.criado_em))}</p>
          ${r.codigo ? `<p class="ad-codigo">${escapeHtml(r.codigo)}</p>` : ''}
          ${
            r.usado_em
              ? `<p class="ad-card-meta ok"><i data-lucide="check"></i> entregue em ${escapeHtml(formatData(r.usado_em))}${r.usado_por_nome ? ' por ' + escapeHtml(r.usado_por_nome) : ''}</p>`
              : ''
          }
        </div>
        <div class="ad-card-acao">
          <p class="ad-total">${formatNumero(r.pontos_gastos)} pts</p>
          ${
            podeBaixar
              ? `<button type="button" class="btn solid sm" data-usado="${escapeHtml(r.id)}"><i data-lucide="check"></i>entreguei</button>`
              : ''
          }
        </div>
      </div>
    </article>`;
}

async function darBaixaResgate(botao, corpo) {
  const ok = await confirmar({
    titulo: 'a recompensa foi pra mão da pessoa?',
    texto: 'isso marca o resgate como entregue. não dá pra desfazer por aqui.',
    ok: 'sim, entreguei',
  });
  if (!ok) return;
  botao.disabled = true;
  try {
    const r = await rpc('admin_marcar_resgate_usado', { p_redemption_id: botao.dataset.usado });
    if (r?.ok === false) {
      toast(r.erro || 'não deu pra dar baixa nesse resgate', 'erro');
      botao.disabled = false;
      return;
    }
    toast(r?.ja_estava ? 'esse já estava entregue' : 'pronto, resgate entregue 💛');
    carregarResgates(corpo);
  } catch (e) {
    toast(e.message, 'erro');
    botao.disabled = false;
  }
}

// ===== PESSOAS ======================================================
async function viewPessoas(view) {
  view.innerHTML =
    cabecalho('gente do Casa', 'quem já criou conta no site.') +
    `<form class="ad-busca" data-busca>
      <div class="field">
        <label for="busca-pessoa" class="sr-only">buscar por nome, e-mail ou telefone</label>
        <input id="busca-pessoa" type="search" placeholder="buscar por nome, e-mail ou telefone" autocomplete="off" />
      </div>
      <button type="submit" class="btn ghost sm"><i data-lucide="search"></i>buscar</button>
    </form>
    <div data-corpo></div>`;

  const corpo = $('[data-corpo]', view);
  const form = $('[data-busca]', view);
  renderIcons();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    carregarPessoas(corpo, $('#busca-pessoa', form).value.trim());
  });
  carregarPessoas(corpo, '');
}

async function carregarPessoas(corpo, busca) {
  carregando(corpo);
  try {
    const linhas = await rpc('admin_usuarios', { p_busca: busca || null, p_limite: 200 });
    if (!linhas || !linhas.length) {
      corpo.innerHTML = vazio('ninguém por aqui', busca ? 'não achei ninguém com esse jeito de escrever.' : 'quando alguém criar conta, aparece aqui.');
      return;
    }
    corpo.innerHTML = `
      <div class="ad-tabela-wrap">
        <table class="ad-tabela">
          <thead>
            <tr>
              <th>pessoa</th><th>contato</th><th>plano</th>
              <th class="num">pontos</th><th class="num">pedidos</th><th class="num">gastou</th>
              <th>entrou</th><th>última vez</th>
            </tr>
          </thead>
          <tbody>
            ${linhas
              .map(
                (u) => `
              <tr>
                <td>
                  <span class="ad-td-forte">${escapeHtml(u.nome || 'sem nome')}</span>
                  ${u.master ? '<span class="tag gold">Casa</span>' : ''}
                  ${u.papel && u.papel !== 'cliente' ? `<span class="tag olive">${escapeHtml(ROTULO_PAPEL[u.papel] || u.papel)}</span>` : ''}
                </td>
                <td>
                  <span class="ad-td-meta">${escapeHtml(u.email || '')}</span>
                  ${u.telefone ? `<span class="ad-td-meta">${escapeHtml(u.telefone)}</span>` : ''}
                </td>
                <td>${u.plano ? `${escapeHtml(u.plano)}<span class="ad-td-meta">${escapeHtml(u.plano_status || '')}</span>` : '<span class="ad-td-meta">sem plano</span>'}</td>
                <td class="num">${formatNumero(u.pontos)}</td>
                <td class="num">${formatNumero(u.pedidos)}</td>
                <td class="num">${formatBRL(u.gasto_centavos)}</td>
                <td><span class="ad-td-meta">${escapeHtml(formatData(u.cadastrado_em, false))}</span></td>
                <td><span class="ad-td-meta">${escapeHtml(formatData(u.ultimo_acesso))}</span></td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="ad-rodape-nota">${formatNumero(linhas.length)} ${linhas.length === 1 ? 'pessoa' : 'pessoas'} nesta lista.</p>`;
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

// ===== RELATÓRIOS ===================================================
function isoInicio(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
// O SQL compara com `<`, então "até" é a virada do dia seguinte.
function isoFim(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}
function dataInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function viewRelatorios(view) {
  const hoje = new Date();
  const trintaDias = new Date();
  trintaDias.setDate(trintaDias.getDate() - 29);

  view.innerHTML =
    cabecalho('relatórios', 'o que vendeu e o que saiu por pontos, no período que tu escolher.') +
    `<form class="ad-periodo" data-periodo>
      <div class="field">
        <label for="desde">de</label>
        <input id="desde" type="date" value="${dataInput(trintaDias)}" />
      </div>
      <div class="field">
        <label for="ate">até</label>
        <input id="ate" type="date" value="${dataInput(hoje)}" />
      </div>
      <button type="submit" class="btn ghost sm"><i data-lucide="refresh-cw"></i>atualizar</button>
    </form>
    <div data-corpo></div>`;

  const corpo = $('[data-corpo]', view);
  renderIcons();
  $('[data-periodo]', view).addEventListener('submit', (e) => {
    e.preventDefault();
    carregarRelatorios(corpo, $('#desde', view).value, $('#ate', view).value);
  });
  carregarRelatorios(corpo, dataInput(trintaDias), dataInput(hoje));
}

async function carregarRelatorios(corpo, desde, ate) {
  carregando(corpo, 'somando…');
  try {
    const params = { p_desde: isoInicio(desde), p_ate: isoFim(ate) };
    const [itens, resgates] = await Promise.all([
      rpc('admin_relatorio_itens', params),
      rpc('admin_relatorio_resgates', params),
    ]);

    const totalVendido = (itens || []).reduce((s, i) => s + Number(i.total_centavos || 0), 0);
    const totalPontos = (resgates || []).reduce((s, r) => s + Number(r.pontos || 0), 0);

    corpo.innerHTML = `
      <section class="ad-bloco">
        <div class="ad-bloco-head">
          <h2 class="title sm">o que vendeu</h2>
          <p class="ad-head-sub">${formatBRL(totalVendido)} no período</p>
        </div>
        ${
          itens && itens.length
            ? `<div class="ad-tabela-wrap">
                 <table class="ad-tabela">
                   <thead><tr><th>item</th><th>variante</th><th class="num">unidades</th><th class="num">pedidos</th><th class="num">total</th></tr></thead>
                   <tbody>
                     ${itens
                       .map(
                         (i) => `
                       <tr>
                         <td><span class="ad-td-forte">${escapeHtml(i.item || '—')}</span></td>
                         <td><span class="ad-td-meta">${escapeHtml(i.variante || '—')}</span></td>
                         <td class="num">${formatNumero(i.qtd)}</td>
                         <td class="num">${formatNumero(i.pedidos)}</td>
                         <td class="num">${formatBRL(i.total_centavos)}</td>
                       </tr>`,
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
            : vazio('nada vendido nesse período', 'tenta esticar as datas.')
        }
      </section>

      <section class="ad-bloco">
        <div class="ad-bloco-head">
          <h2 class="title sm">o que saiu por pontos</h2>
          <p class="ad-head-sub">${formatNumero(totalPontos)} pontos trocados no período</p>
        </div>
        ${
          resgates && resgates.length
            ? `<div class="ad-tabela-wrap">
                 <table class="ad-tabela">
                   <thead><tr><th>recompensa</th><th>tipo</th><th class="num">vezes</th><th class="num">pontos</th><th class="num">entregues</th></tr></thead>
                   <tbody>
                     ${resgates
                       .map(
                         (r) => `
                       <tr>
                         <td><span class="ad-td-forte">${escapeHtml(r.recompensa || '—')}</span></td>
                         <td><span class="ad-td-meta">${escapeHtml(r.tipo || '—')}</span></td>
                         <td class="num">${formatNumero(r.vezes)}</td>
                         <td class="num">${formatNumero(r.pontos)}</td>
                         <td class="num">${formatNumero(r.entregues)}</td>
                       </tr>`,
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
            : vazio('nenhum resgate nesse período', 'tenta esticar as datas.')
        }
      </section>`;
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

// ===== EQUIPE =======================================================
async function viewEquipe(view) {
  view.innerHTML =
    cabecalho(
      'quem cuida do quê',
      'cada pessoa vê só o que precisa. marca o que faz sentido e salva.',
    ) +
    `<form class="ad-busca" data-busca-pessoa>
      <div class="field">
        <label for="busca-equipe" class="sr-only">buscar alguém pra dar acesso</label>
        <input id="busca-equipe" type="search" placeholder="buscar alguém pelo nome ou e-mail" autocomplete="off" />
      </div>
      <button type="submit" class="btn ghost sm"><i data-lucide="search"></i>buscar</button>
    </form>
    <div data-achados></div>
    <div data-corpo></div>`;

  const corpo = $('[data-corpo]', view);
  const achados = $('[data-achados]', view);
  renderIcons();

  $('[data-busca-pessoa]', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const termo = $('#busca-equipe', view).value.trim();
    if (termo.length < 3) {
      achados.innerHTML = `<div class="notice warn"><p>escreve pelo menos 3 letras pra eu procurar.</p></div>`;
      return;
    }
    carregando(achados, 'procurando…');
    try {
      const pessoas = await rpc('admin_buscar_pessoa', { p_busca: termo });
      if (!pessoas || !pessoas.length) {
        achados.innerHTML = vazio('não achei ninguém', 'confere o nome ou o e-mail.');
        return;
      }
      achados.innerHTML = `
        <div class="card ad-achados">
          <p class="lbl">quem eu achei</p>
          <div class="rows">
            ${pessoas
              .map(
                (p) => `
              <div class="row">
                <div class="row-main">
                  <span>${escapeHtml(p.nome || 'sem nome')}</span>
                  <span class="row-meta">${escapeHtml(p.email || '')}</span>
                </div>
                <button type="button" class="btn ghost sm" data-add="${escapeHtml(p.id)}" data-nome="${escapeHtml(p.nome || 'sem nome')}" data-email="${escapeHtml(p.email || '')}">dar acesso</button>
              </div>`,
              )
              .join('')}
          </div>
        </div>`;
      $$('[data-add]', achados).forEach((botao) => {
        botao.addEventListener('click', () => {
          const nova = {
            id: botao.dataset.add,
            nome: botao.dataset.nome,
            email: botao.dataset.email,
            papel: 'cliente',
            master: false,
            permissoes: [],
            novo: true,
          };
          achados.innerHTML = '';
          $('#busca-equipe', view).value = '';
          const lista = $('.ad-lista', corpo);
          if (!lista) {
            // carregarEquipe falhou (corpo só tem o aviso de erro, sem .ad-lista) —
            // não dá pra inserir o card; avisa em vez de mentir "já está na lista".
            toast('a lista da equipe não carregou; recarrega a página pra adicionar');
          } else if (!$(`[data-pessoa="${nova.id}"]`, corpo)) {
            lista.insertAdjacentHTML('afterbegin', cardEquipe(nova));
            ligarCardsEquipe(corpo);
            renderIcons();
          } else {
            toast('essa pessoa já está na lista abaixo');
          }
        });
      });
    } catch (err) {
      erroNaTela(achados, err);
    }
  });

  carregarEquipe(corpo);
}

async function carregarEquipe(corpo) {
  carregando(corpo);
  try {
    const linhas = await rpc('admin_equipe');
    corpo.innerHTML = `<div class="ad-lista">${(linhas || []).map((p) => cardEquipe(p)).join('')}</div>`;
    ligarCardsEquipe(corpo);
    renderIcons();
  } catch (e) {
    erroNaTela(corpo, e);
  }
}

function cardEquipe(p) {
  const permissoes = Array.isArray(p.permissoes) ? p.permissoes : [];
  const euMesmo = p.id === estado.sessao?.user?.id;
  const intocavel = p.master || p.papel === 'owner';
  const souOwner = Boolean(estado.perms?.tudo);

  if (intocavel) {
    return `
      <article class="card ad-card" data-pessoa="${escapeHtml(p.id)}">
        <div class="ad-card-topo">
          <div>
            <p class="ad-card-nome">${escapeHtml(p.nome || 'sem nome')}</p>
            <p class="ad-card-meta">${escapeHtml(p.email || '')}</p>
          </div>
          <div class="ad-card-tags"><span class="tag gold">adm do Casa</span></div>
        </div>
        <p class="ad-card-meta">essa conta cuida da casa inteira e não some daqui. não há o que ajustar.</p>
      </article>`;
  }

  return `
    <article class="card ad-card" data-pessoa="${escapeHtml(p.id)}">
      <div class="ad-card-topo">
        <div>
          <p class="ad-card-nome">${escapeHtml(p.nome || 'sem nome')}</p>
          <p class="ad-card-meta">${escapeHtml(p.email || '')}</p>
        </div>
        <div class="ad-card-tags">
          ${p.papel && p.papel !== 'cliente' ? `<span class="tag olive">${escapeHtml(ROTULO_PAPEL[p.papel] || p.papel)}</span>` : ''}
          ${p.novo ? '<span class="tag gold">ainda sem acesso</span>' : ''}
        </div>
      </div>

      ${euMesmo ? '<div class="notice info"><p>essas são as tuas permissões. quem muda as tuas é outra pessoa do time.</p></div>' : ''}

      <div class="ad-perms">
        ${PERMISSOES.map((perm) => {
          const marcado = permissoes.includes(perm.slug);
          const soOwner = perm.slug === 'equipe' && !souOwner;
          const travado = euMesmo || soOwner;
          return `
          <label class="ad-perm${travado ? ' is-travado' : ''}">
            <input type="checkbox" value="${perm.slug}" ${marcado ? 'checked' : ''} ${travado ? 'disabled' : ''} />
            <span>
              <strong>${escapeHtml(perm.rotulo)}</strong>
              <em>${escapeHtml(soOwner ? 'só o adm do Casa delega isso' : perm.descricao)}</em>
            </span>
          </label>`;
        }).join('')}
      </div>

      ${
        euMesmo
          ? ''
          : `<div class="ad-card-acoes">
               <button type="button" class="btn solid sm" data-salvar="${escapeHtml(p.id)}">salvar</button>
               ${p.novo ? '' : `<button type="button" class="btn ghost sm" data-tirar="${escapeHtml(p.id)}" data-nome="${escapeHtml(p.nome || 'essa pessoa')}">tirar do console</button>`}
             </div>`
      }
    </article>`;
}

function ligarCardsEquipe(corpo) {
  $$('[data-salvar]', corpo).forEach((botao) => {
    if (botao.dataset.ligado) return;
    botao.dataset.ligado = '1';
    botao.addEventListener('click', async () => {
      const card = botao.closest('[data-pessoa]');
      const marcadas = $$('input[type="checkbox"]', card)
        .filter((c) => c.checked)
        .map((c) => c.value);
      botao.disabled = true;
      try {
        const r = await rpc('admin_definir_permissoes', {
          p_user_id: botao.dataset.salvar,
          p_permissoes: marcadas,
        });
        if (r?.ok === false) {
          toast(r.erro || 'não deu pra salvar', 'erro');
          botao.disabled = false;
          return;
        }
        toast('pronto, permissões salvas 💛');
        carregarEquipe(corpo);
      } catch (e) {
        toast(e.message, 'erro');
        botao.disabled = false;
      }
    });
  });

  $$('[data-tirar]', corpo).forEach((botao) => {
    if (botao.dataset.ligado) return;
    botao.dataset.ligado = '1';
    botao.addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: `tirar ${botao.dataset.nome} do console?`,
        texto: 'a conta continua existindo como cliente; só o acesso ao balcão sai.',
        ok: 'sim, tirar',
        tom: 'perigo',
      });
      if (!ok) return;
      botao.disabled = true;
      try {
        const r = await rpc('admin_definir_permissoes', {
          p_user_id: botao.dataset.tirar,
          p_permissoes: [],
        });
        if (r?.ok === false) {
          toast(r.erro || 'não deu pra tirar', 'erro');
          botao.disabled = false;
          return;
        }
        toast('acesso removido');
        carregarEquipe(corpo);
      } catch (e) {
        toast(e.message, 'erro');
        botao.disabled = false;
      }
    });
  });
}

// ===== RECADOS DA CASA ==============================================
// Owner-only. A tarja de aviso que acende no topo do site. As RPCs admin_aviso_*
// (0022) trancam por is_owner() no banco; aqui é só a tela.
let recadoEditando = null; // id em edição, ou null (criando um novo)

// ISO ↔ valor de <input type="datetime-local"> (hora local do navegador).
function isoDeDtLocal(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function dtLocalDeIso(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function statusDoRecado(a) {
  if (!a.ativo) return { txt: 'desligado', tom: 'off' };
  const agora = Date.now();
  const ini = a.inicio_em ? Date.parse(a.inicio_em) : null;
  const fim = a.fim_em ? Date.parse(a.fim_em) : null;
  if (ini && ini > agora) return { txt: `agendado pra ${formatData(a.inicio_em)}`, tom: 'wait' };
  if (fim && fim < agora) return { txt: `expirou em ${formatData(a.fim_em)}`, tom: 'off' };
  return { txt: 'no ar agora', tom: 'on' };
}

async function viewRecados(view) {
  view.innerHTML =
    cabecalho(
      'recados da casa',
      'a tarjinha que acende no topo do site. escreve curto, dá um prazo, e ela some sozinha quando vence.',
    ) +
    `<form class="card ad-form-recado" data-form-recado novalidate>
       <input type="hidden" data-r-id />
       <div class="field">
         <label for="r-texto">o recado</label>
         <textarea id="r-texto" data-r-texto rows="2" maxlength="160" placeholder="hoje tem fornada de brioche a partir das 15h 🥐" required></textarea>
         <p class="ad-dica">curtinho, até 160 caracteres. o tom é o de sempre: acolhedor, sem pressa.</p>
       </div>
       <div class="ad-recado-linha">
         <div class="field ad-recado-emoji">
           <label for="r-emoji">emoji (opcional)</label>
           <input id="r-emoji" data-r-emoji maxlength="8" placeholder="🥐" />
         </div>
         <div class="field ad-recado-prio">
           <label for="r-prio">prioridade</label>
           <input id="r-prio" data-r-prio type="number" value="0" step="1" />
           <p class="ad-dica">maior aparece primeiro se houver mais de um.</p>
         </div>
       </div>
       <div class="ad-recado-linha">
         <div class="field">
           <label for="r-inicio">começa a aparecer</label>
           <input id="r-inicio" data-r-inicio type="datetime-local" />
           <p class="ad-dica">vazio = já vale agora.</p>
         </div>
         <div class="field">
           <label for="r-fim">para de aparecer</label>
           <input id="r-fim" data-r-fim type="datetime-local" />
           <p class="ad-dica">vazio = fica até tu desligar.</p>
         </div>
       </div>
       <div class="ad-recado-linha">
         <div class="field">
           <label for="r-link">link (opcional)</label>
           <input id="r-link" data-r-link placeholder="/planos ou https://…" />
         </div>
         <div class="field">
           <label for="r-link-label">texto do link</label>
           <input id="r-link-label" data-r-link-label maxlength="40" placeholder="ver os planos" />
         </div>
       </div>
       <label class="ad-recado-ativo"><input type="checkbox" data-r-ativo checked /> <span>ligado (aparece no site)</span></label>
       <div data-r-aviso></div>
       <div class="ad-card-acoes">
         <button type="submit" class="btn solid" data-r-salvar>publicar recado</button>
         <button type="button" class="btn ghost" data-r-cancelar hidden>cancelar edição</button>
       </div>
     </form>
     <div class="ad-recado-lista" data-recado-lista></div>`;

  renderIcons();
  const form = $('[data-form-recado]', view);
  const lista = $('[data-recado-lista]', view);
  const avisoForm = $('[data-r-aviso]', form);

  const limparForm = () => {
    recadoEditando = null;
    form.reset();
    $('[data-r-id]', form).value = '';
    $('[data-r-ativo]', form).checked = true;
    $('[data-r-salvar]', form).textContent = 'publicar recado';
    $('[data-r-cancelar]', form).hidden = true;
    avisoForm.innerHTML = '';
  };

  const preencherForm = (a) => {
    recadoEditando = a.id;
    $('[data-r-id]', form).value = a.id;
    $('[data-r-texto]', form).value = a.texto || '';
    $('[data-r-emoji]', form).value = a.emoji || '';
    $('[data-r-prio]', form).value = Number(a.prioridade) || 0;
    $('[data-r-inicio]', form).value = dtLocalDeIso(a.inicio_em);
    $('[data-r-fim]', form).value = dtLocalDeIso(a.fim_em);
    $('[data-r-link]', form).value = a.link_url || '';
    $('[data-r-link-label]', form).value = a.link_label || '';
    $('[data-r-ativo]', form).checked = Boolean(a.ativo);
    $('[data-r-salvar]', form).textContent = 'salvar recado';
    $('[data-r-cancelar]', form).hidden = false;
    view.scrollTop = 0;
    $('[data-r-texto]', form).focus();
  };

  async function carregarRecados() {
    carregando(lista, 'buscando os recados…');
    try {
      const dados = await rpc('admin_avisos_listar');
      const avisos = Array.isArray(dados) ? dados : [];
      if (!avisos.length) {
        lista.innerHTML = vazio('nenhum recado ainda', 'escreve o primeiro aí em cima — ele acende no topo do site.');
        return;
      }
      lista.innerHTML = avisos.map(cardRecado).join('');
      renderIcons();
      ligarCardsRecado();
    } catch (e) {
      erroNaTela(lista, e);
    }
  }

  function cardRecado(a) {
    const st = statusDoRecado(a);
    const janela = [];
    if (a.inicio_em) janela.push(`de ${formatData(a.inicio_em)}`);
    if (a.fim_em) janela.push(`até ${formatData(a.fim_em)}`);
    const linkTxt = a.link_url ? ` · link: ${escapeHtml(a.link_label || a.link_url)}` : '';
    return `
      <article class="card ad-card" data-recado="${escapeHtml(a.id)}">
        <div class="ad-card-topo">
          <div>
            <p class="ad-card-nome">${a.emoji ? escapeHtml(a.emoji) + ' ' : ''}${escapeHtml(a.texto || '')}</p>
            <p class="ad-card-meta">${janela.length ? escapeHtml(janela.join(' ')) : 'sem prazo'} · prioridade ${Number(a.prioridade) || 0}${linkTxt}</p>
          </div>
          <div class="ad-card-tags"><span class="tag ${st.tom === 'on' ? 'olive' : 'gold'}">${escapeHtml(st.txt)}</span></div>
        </div>
        <div class="ad-card-acoes">
          <button type="button" class="btn ghost sm" data-r-editar="${escapeHtml(a.id)}">editar</button>
          <button type="button" class="btn ghost sm" data-r-remover="${escapeHtml(a.id)}" data-r-resumo="${escapeHtml((a.texto || '').slice(0, 40))}">remover</button>
        </div>
      </article>`;
  }

  function ligarCardsRecado() {
    $$('[data-r-editar]', lista).forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          const dados = await rpc('admin_avisos_listar');
          const a = (Array.isArray(dados) ? dados : []).find((x) => x.id === b.dataset.rEditar);
          if (a) preencherForm(a);
        } catch (e) {
          toast(e.message, 'erro');
        }
      });
    });
    $$('[data-r-remover]', lista).forEach((b) => {
      b.addEventListener('click', async () => {
        const ok = await confirmar({
          titulo: 'remover este recado?',
          texto: `"${b.dataset.rResumo}…" — some do site na hora e não dá pra desfazer.`,
          ok: 'sim, remover',
          tom: 'perigo',
        });
        if (!ok) return;
        b.disabled = true;
        try {
          await rpc('admin_aviso_remover', { p_id: b.dataset.rRemover });
          toast('recado removido');
          if (recadoEditando === b.dataset.rRemover) limparForm();
          carregarRecados();
        } catch (e) {
          toast(e.message, 'erro');
          b.disabled = false;
        }
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    avisoForm.innerHTML = '';
    const texto = $('[data-r-texto]', form).value.trim();
    if (!texto) {
      avisoForm.innerHTML = '<div class="notice erro"><p>escreve o recado 💛</p></div>';
      return;
    }
    const inicio = isoDeDtLocal($('[data-r-inicio]', form).value);
    const fim = isoDeDtLocal($('[data-r-fim]', form).value);
    if (inicio && fim && Date.parse(fim) <= Date.parse(inicio)) {
      avisoForm.innerHTML = '<div class="notice erro"><p>o fim tem que ser depois do começo.</p></div>';
      return;
    }
    const botao = $('[data-r-salvar]', form);
    botao.disabled = true;
    try {
      await rpc('admin_aviso_salvar', {
        p_id: recadoEditando || null,
        p_texto: texto,
        p_emoji: $('[data-r-emoji]', form).value.trim() || null,
        p_link_url: $('[data-r-link]', form).value.trim() || null,
        p_link_label: $('[data-r-link-label]', form).value.trim() || null,
        p_inicio: inicio,
        p_fim: fim,
        p_prioridade: Number($('[data-r-prio]', form).value) || 0,
        p_ativo: $('[data-r-ativo]', form).checked,
      });
      toast(recadoEditando ? 'recado salvo 💛' : 'recado publicado 💛');
      limparForm();
      carregarRecados();
    } catch (e2) {
      toast(e2.message, 'erro');
    } finally {
      botao.disabled = false;
    }
  });

  $('[data-r-cancelar]', form).addEventListener('click', limparForm);

  carregarRecados();
}

// ===== TRILHA DO CASA ===============================================
// Owner-only. As playlists do Spotify que aparecem na home. RPCs admin_trilha_*
// (0023) trancam por is_owner() no banco.
let trilhaEditando = null;

// Cheiro de link do Spotify (bloqueio gentil no submit; a home revalida antes do embed).
function pareceSpotify(url) {
  const s = String(url || '').trim();
  if (/^spotify:(playlist|album|track|artist|show|episode):[A-Za-z0-9]+$/i.test(s)) return true;
  try {
    return new URL(s).hostname === 'open.spotify.com';
  } catch {
    return false;
  }
}

async function viewTrilha(view) {
  view.innerHTML =
    cabecalho(
      'a trilha do Casa',
      'as playlists do Spotify que tocam na home. cola o link, dá um clima, e marca qual está tocando agora.',
    ) +
    `<form class="card ad-form-recado" data-form-trilha novalidate>
       <input type="hidden" data-t-id />
       <div class="ad-recado-linha">
         <div class="field">
           <label for="t-nome">nome da playlist</label>
           <input id="t-nome" data-t-nome maxlength="80" placeholder="tarde de trabalho" required />
         </div>
         <div class="field">
           <label for="t-clima">clima (opcional)</label>
           <input id="t-clima" data-t-clima maxlength="40" placeholder="pra focar" />
         </div>
       </div>
       <div class="field">
         <label for="t-url">link do Spotify</label>
         <input id="t-url" data-t-url placeholder="https://open.spotify.com/playlist/…" required />
         <p class="ad-dica">abre a playlist no Spotify → compartilhar → copiar link. cola aqui.</p>
       </div>
       <div class="ad-recado-linha">
         <div class="field ad-recado-prio">
           <label for="t-ordem">ordem</label>
           <input id="t-ordem" data-t-ordem type="number" value="0" step="1" />
           <p class="ad-dica">menor aparece primeiro.</p>
         </div>
         <div class="ad-trilha-flags">
           <label class="ad-recado-ativo"><input type="checkbox" data-t-ativo checked /> <span>na home</span></label>
           <label class="ad-recado-ativo"><input type="checkbox" data-t-tocando /> <span>tocando agora 🎧</span></label>
         </div>
       </div>
       <div data-t-aviso></div>
       <div class="ad-card-acoes">
         <button type="submit" class="btn solid" data-t-salvar>adicionar playlist</button>
         <button type="button" class="btn ghost" data-t-cancelar hidden>cancelar edição</button>
       </div>
     </form>
     <div class="ad-recado-lista" data-trilha-lista></div>`;

  renderIcons();
  const form = $('[data-form-trilha]', view);
  const lista = $('[data-trilha-lista]', view);
  const avisoForm = $('[data-t-aviso]', form);

  const limparForm = () => {
    trilhaEditando = null;
    form.reset();
    $('[data-t-id]', form).value = '';
    $('[data-t-ativo]', form).checked = true;
    $('[data-t-tocando]', form).checked = false;
    $('[data-t-salvar]', form).textContent = 'adicionar playlist';
    $('[data-t-cancelar]', form).hidden = true;
    avisoForm.innerHTML = '';
  };

  const preencherForm = (p) => {
    trilhaEditando = p.id;
    $('[data-t-id]', form).value = p.id;
    $('[data-t-nome]', form).value = p.nome || '';
    $('[data-t-clima]', form).value = p.clima || '';
    $('[data-t-url]', form).value = p.spotify_url || '';
    $('[data-t-ordem]', form).value = Number(p.ordem) || 0;
    $('[data-t-ativo]', form).checked = Boolean(p.ativo);
    $('[data-t-tocando]', form).checked = Boolean(p.tocando);
    $('[data-t-salvar]', form).textContent = 'salvar playlist';
    $('[data-t-cancelar]', form).hidden = false;
    view.scrollTop = 0;
    $('[data-t-nome]', form).focus();
  };

  async function carregarTrilha() {
    carregando(lista, 'buscando as playlists…');
    try {
      const dados = await rpc('admin_trilha_listar');
      const pls = Array.isArray(dados) ? dados : [];
      if (!pls.length) {
        lista.innerHTML = vazio('nenhuma playlist ainda', 'cola a primeira aí em cima — ela aparece na home.');
        return;
      }
      lista.innerHTML = pls.map(cardTrilha).join('');
      renderIcons();
      ligarCardsTrilha();
    } catch (e) {
      erroNaTela(lista, e);
    }
  }

  function cardTrilha(p) {
    const tags = [];
    if (p.tocando) tags.push('<span class="tag olive">tocando agora</span>');
    if (!p.ativo) tags.push('<span class="tag gold">fora da home</span>');
    return `
      <article class="card ad-card" data-trilha-item="${escapeHtml(p.id)}">
        <div class="ad-card-topo">
          <div>
            <p class="ad-card-nome">${p.clima ? escapeHtml(p.clima) + ' · ' : ''}${escapeHtml(p.nome || '')}</p>
            <p class="ad-card-meta">ordem ${Number(p.ordem) || 0} · ${escapeHtml(p.spotify_url || '')}</p>
          </div>
          <div class="ad-card-tags">${tags.join('')}</div>
        </div>
        <div class="ad-card-acoes">
          <button type="button" class="btn ghost sm" data-t-editar="${escapeHtml(p.id)}">editar</button>
          <button type="button" class="btn ghost sm" data-t-remover="${escapeHtml(p.id)}" data-t-nome="${escapeHtml(p.nome || 'essa playlist')}">remover</button>
        </div>
      </article>`;
  }

  function ligarCardsTrilha() {
    $$('[data-t-editar]', lista).forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          const dados = await rpc('admin_trilha_listar');
          const p = (Array.isArray(dados) ? dados : []).find((x) => x.id === b.dataset.tEditar);
          if (p) preencherForm(p);
        } catch (e) {
          toast(e.message, 'erro');
        }
      });
    });
    $$('[data-t-remover]', lista).forEach((b) => {
      b.addEventListener('click', async () => {
        const ok = await confirmar({
          titulo: `remover "${b.dataset.tNome}"?`,
          texto: 'some da home na hora e não dá pra desfazer.',
          ok: 'sim, remover',
          tom: 'perigo',
        });
        if (!ok) return;
        b.disabled = true;
        try {
          await rpc('admin_trilha_remover', { p_id: b.dataset.tRemover });
          toast('playlist removida');
          if (trilhaEditando === b.dataset.tRemover) limparForm();
          carregarTrilha();
        } catch (e) {
          toast(e.message, 'erro');
          b.disabled = false;
        }
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    avisoForm.innerHTML = '';
    const nome = $('[data-t-nome]', form).value.trim();
    const url = $('[data-t-url]', form).value.trim();
    if (!nome) {
      avisoForm.innerHTML = '<div class="notice erro"><p>dá um nome pra playlist 💛</p></div>';
      return;
    }
    if (!pareceSpotify(url)) {
      avisoForm.innerHTML = '<div class="notice erro"><p>cola um link do Spotify (open.spotify.com/…).</p></div>';
      return;
    }
    const botao = $('[data-t-salvar]', form);
    botao.disabled = true;
    try {
      await rpc('admin_trilha_salvar', {
        p_id: trilhaEditando || null,
        p_nome: nome,
        p_clima: $('[data-t-clima]', form).value.trim() || null,
        p_url: url,
        p_ordem: Number($('[data-t-ordem]', form).value) || 0,
        p_ativo: $('[data-t-ativo]', form).checked,
        p_tocando: $('[data-t-tocando]', form).checked,
      });
      toast(trilhaEditando ? 'playlist salva 💛' : 'playlist adicionada 💛');
      limparForm();
      carregarTrilha();
    } catch (e2) {
      toast(e2.message, 'erro');
    } finally {
      botao.disabled = false;
    }
  });

  $('[data-t-cancelar]', form).addEventListener('click', limparForm);

  carregarTrilha();
}

// ===== TUA CONTA ====================================================
function viewConta(view) {
  const nome = estado.perms.nome || 'equipe';
  const papel = ROTULO_PAPEL[estado.perms.papel] || estado.perms.papel || '';
  const minhas = estado.perms.tudo
    ? PERMISSOES.map((p) => p.rotulo)
    : PERMISSOES.filter((p) => (estado.perms.permissoes || []).includes(p.slug)).map((p) => p.rotulo);

  view.innerHTML =
    cabecalho('tua conta', 'a senha é tua; ninguém aqui consegue ver.') +
    `<div class="ad-duas">
      <section class="card ad-card">
        <p class="lbl">quem tu é por aqui</p>
        <p class="ad-card-nome">${escapeHtml(nome)}</p>
        <p class="ad-card-meta">${escapeHtml(estado.sessao?.user?.email || '')}</p>
        <p class="ad-card-meta">${escapeHtml(papel)}${estado.perms.master ? ' · conta do Casa, essa não some' : ''}</p>
        <div class="divider"></div>
        <p class="lbl">o que tu enxerga</p>
        <ul class="ad-lista-simples">
          ${minhas.map((m) => `<li><i data-lucide="check"></i>${escapeHtml(m)}</li>`).join('')}
        </ul>
      </section>

      <section class="card ad-card">
        <p class="lbl">trocar a senha</p>
        <div data-troca-senha></div>
      </section>
    </div>`;

  const caixa = $('[data-troca-senha]', view);
  caixa.innerHTML = formSenhaHTML();
  ligarFormSenha(caixa, () => {
    toast('senha trocada 💛');
    viewConta(view);
  });
  renderIcons();
}

// ===== BOOTSTRAP ====================================================
// Uma camada, duas páginas: a de entrada e o console. O pathname decide.
function bootstrap() {
  const caminho = window.location.pathname.replace(/\.html$/, '');
  if (caminho.endsWith('/admin/entrar') || caminho.endsWith('/admin/entrar/')) {
    initEntrar();
  } else {
    initConsole();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
