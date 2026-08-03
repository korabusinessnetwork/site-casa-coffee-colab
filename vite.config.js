import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';

// Raiz do Vite = src/. As páginas moram AQUI (não mais numa subpasta pages/),
// porque o caminho do arquivo é a URL: src/o-casa.html vira /o-casa. Ver CLAUDE.md.
const root = resolve(__dirname, 'src');

// Em produção quem tira o ".html" da URL é a Vercel (cleanUrls no vercel.json).
// O dev server do Vite não faz isso sozinho, então este middleware anexa o .html
// quando o arquivo existe — assim /o-casa funciona igual em dev e em prod, e os
// links do site podem ser escritos limpos num lugar só.
function urlsLimpasNoDev() {
  return {
    name: 'casa-urls-limpas',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [caminho, query] = (req.url || '/').split('?');
        if (caminho !== '/' && !extname(caminho)) {
          const arquivo = resolve(root, '.' + caminho + '.html');
          if (existsSync(arquivo)) {
            req.url = caminho + '.html' + (query ? '?' + query : '');
          }
        }
        next();
      });
    },
  };
}

// Multi-página: cada .html em src/ (e em src/conta/) é uma URL. Página nova
// entra aqui em `input`.
export default defineConfig({
  root,
  plugins: [urlsLimpasNoDev()],
  // .env fica na RAIZ do projeto, mas o root do Vite é src/ — sem isto o Vite
  // procuraria .env dentro de src/ e as VITE_* nunca seriam carregadas.
  envDir: __dirname,
  publicDir: resolve(__dirname, 'src/assets'),
  server: {
    // host: true expõe na rede local (0.0.0.0) sem precisar de "-- --host".
    // Aí dá pra abrir no celular/outro PC via http://<IP-da-maquina>:5173/
    host: true,
    open: '/home',
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        home: resolve(root, 'home.html'),
        oCasa: resolve(root, 'o-casa.html'),
        cardapio: resolve(root, 'cardapio.html'),
        loja: resolve(root, 'loja.html'),
        produto: resolve(root, 'produto.html'),
        planos: resolve(root, 'planos.html'),
        presentear: resolve(root, 'presentear.html'),
        colab: resolve(root, 'colab.html'),
        cadastro: resolve(root, 'cadastro.html'),
        login: resolve(root, 'login.html'),
        authConfirmado: resolve(root, 'auth-confirmado.html'),
        checkoutSucesso: resolve(root, 'checkout-sucesso.html'),
        checkoutCancelado: resolve(root, 'checkout-cancelado.html'),
        perfil: resolve(root, 'conta/perfil.html'),
        pontos: resolve(root, 'conta/pontos.html'),
        conquistas: resolve(root, 'conta/conquistas.html'),
        pedidos: resolve(root, 'conta/pedidos.html'),
        // console da equipe: uma página com abas + a porta de entrada
        adminEntrar: resolve(root, 'admin/entrar.html'),
        admin: resolve(root, 'admin/index.html'),
      },
    },
  },
});
