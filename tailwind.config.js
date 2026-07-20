/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.html',
    './src/**/*.js',
  ],
  theme: {
    // Breakpoints: mobile-first, de ~320px (Galaxy Pocket) a ultrawide (2560px+).
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      '4xl': '2560px',
    },
    extend: {
      colors: {
        // Paleta da marca — ver CLAUDE.md
        terracota: '#8c3a2a',
        verde: '#305429',
        cafe: '#5b3c34',
        caramelo: '#a56a3a',
        bege: '#ead8c1',
        preto: '#000000',
        branco: '#ffffff',
      },
      fontFamily: {
        // Sora = texto/UI. titulo/decor usam placeholders (Fraunces/Caveat)
        // até termos as fontes reais (Rexton/Mayonice). Ver TODO no CLAUDE.md.
        sora: ['Sora', 'system-ui', 'sans-serif'],
        titulo: ['Fraunces', 'Georgia', 'serif'],
        decor: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
