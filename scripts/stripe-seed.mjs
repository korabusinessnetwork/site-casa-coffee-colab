#!/usr/bin/env node
// =============================================================================
// Casa Coffee Colab — scripts/stripe-seed.mjs
// Cria no Stripe (SÓ TEST MODE) os 4 produtos + preços recorrentes mensais dos
// tiers e imprime os price_id de cada, pra colar na migration 0006_stripe.sql.
//
// SEGURANÇA:
//   • Usa a sk_test da env STRIPE_SECRET_KEY (ou pergunta, com input mascarado).
//   • RECUSA chaves que não sejam sk_test_ (nada de live aqui — zero dinheiro real).
//   • NÃO grava/commita nenhuma chave. Só imprime price_id (públicos, ok versionar).
//   • Idempotente: cada preço tem um lookup_key; se já existir, é reutilizado
//     (rodar de novo não duplica).
//
// Uso:
//   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-seed.mjs
//   (ou só `node scripts/stripe-seed.mjs` e cole a chave quando pedir)
// =============================================================================
import readline from 'node:readline';

const API = 'https://api.stripe.com/v1';

// Os 4 tiers — slug/nome/preço iguais ao seed do banco (0003). Preço em centavos.
const TIERS = [
  { slug: 'bronze',   nome: 'Vizinho de Sempre', centavos: 2990 },
  { slug: 'prata',    nome: 'Frequentador',      centavos: 4990 },
  { slug: 'ouro',     nome: 'Gente do Casa',     centavos: 7990 },
  { slug: 'diamante', nome: 'Alma do Casa',      centavos: 12990 },
];

const lookupKey = (slug) => `casa_${slug}_mensal`;

// --- Pergunta a chave com echo mascarado (se não veio pela env) ---------------
function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (str) => {
      // Escreve a pergunta, mas mascara o que o usuário digita.
      if (str.includes(query)) rl.output.write(str);
      else rl.output.write('*');
    };
    rl.question(query, (ans) => {
      rl.output.write('\n');
      rl.close();
      resolve(ans.trim());
    });
  });
}

// --- Flatten no formato do Stripe (chaves com colchetes) ----------------------
function toPairs(obj, prefix = '', pairs = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item) => pairs.push([`${key}[]`, String(item)]));
    } else if (typeof v === 'object') {
      toPairs(v, key, pairs);
    } else {
      pairs.push([key, String(v)]);
    }
  }
  return pairs;
}

async function stripeReq(method, path, params = {}, secret) {
  const pairs = toPairs(params);
  const qs = new URLSearchParams(pairs);
  const isGet = method === 'GET';
  const url = isGet && pairs.length ? `${API}${path}?${qs}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: isGet ? undefined : qs,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe ${res.status} em ${method} ${path}`);
  }
  return json;
}

async function main() {
  let secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    secret = await promptHidden('Cole a sk_test do Stripe (test mode): ');
  }

  if (!secret) {
    console.error('✗ nenhuma chave informada.');
    process.exit(1);
  }
  if (secret.startsWith('sk_live_') || secret.startsWith('rk_live_')) {
    console.error('✗ chave LIVE detectada. Este script é SÓ test mode. Aborta.');
    process.exit(1);
  }
  if (!secret.startsWith('sk_test_') && !secret.startsWith('rk_test_')) {
    console.error('✗ a chave não parece uma sk_test_/rk_test_ do Stripe. Aborta.');
    process.exit(1);
  }

  console.log('\nCriando produtos + preços mensais no Stripe (TEST)…\n');
  const resultados = [];

  for (const tier of TIERS) {
    const key = lookupKey(tier.slug);

    // Idempotência: já existe um preço com esse lookup_key? Reutiliza.
    const existentes = await stripeReq(
      'GET',
      '/prices',
      { lookup_keys: [key], active: 'true', limit: 1, expand: ['data.product'] },
      secret,
    );
    let price = existentes.data?.[0];

    if (price) {
      console.log(`  ↺ ${tier.slug.padEnd(9)} já existia → ${price.id}`);
    } else {
      const product = await stripeReq(
        'POST',
        '/products',
        {
          name: `Casa Coffee Colab — ${tier.nome}`,
          metadata: { tier_slug: tier.slug },
        },
        secret,
      );
      price = await stripeReq(
        'POST',
        '/prices',
        {
          product: product.id,
          unit_amount: tier.centavos,
          currency: 'brl',
          nickname: `${tier.nome} (mensal)`,
          lookup_key: key,
          recurring: { interval: 'month', interval_count: 1 },
          metadata: { tier_slug: tier.slug },
        },
        secret,
      );
      console.log(`  ✓ ${tier.slug.padEnd(9)} criado    → ${price.id}`);
    }

    resultados.push({ slug: tier.slug, price_id: price.id });
  }

  // --- SQL pronto pra colar na 0006 -----------------------------------------
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('Cole estes UPDATEs na supabase/migrations/0006_stripe.sql e rode');
  console.log('no SQL Editor (ou rode direto no SQL Editor):\n');
  for (const r of resultados) {
    console.log(`  update public.tiers set stripe_price_id = '${r.price_id}' where slug = '${r.slug}';`);
  }
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('Pronto. Nenhuma chave foi gravada. price_id são públicos (ok versionar).');
}

main().catch((err) => {
  console.error('\n✗ erro:', err.message);
  process.exit(1);
});
