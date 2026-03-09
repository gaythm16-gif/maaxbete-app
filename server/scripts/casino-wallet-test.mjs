/**
 * Tests A→Z : liaison site ↔ API casino (balance, callback, launch).
 * Usage:
 *   node server/scripts/casino-wallet-test.mjs
 *   BASE_URL=https://maaxbete-backend.onrender.com TEST_USER=master@maaxbete.com node server/scripts/casino-wallet-test.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:3001';
const TEST_USER = process.env.TEST_USER || 'master@maaxbete.com';

const log = (step, ok, msg, data) => {
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${step}: ${msg}`);
  if (data != null) console.log('  ', typeof data === 'object' ? JSON.stringify(data) : data);
};

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { method: 'GET', ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { ok: res.ok, status: res.status, json, text };
}

async function post(path, body, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: typeof body === 'object' ? JSON.stringify(body) : body,
    ...opts,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { ok: res.ok, status: res.status, json, text };
}

async function run() {
  console.log('--- Tests casino wallet (A→Z) ---');
  console.log('BASE_URL:', BASE);
  console.log('TEST_USER:', TEST_USER);
  console.log('');

  let failed = 0;

  // A. Health
  const health = await get('/api/health');
  if (!health.ok || !health.json?.ok) {
    log('A. Health', false, `HTTP ${health.status}`, health.json || health.text);
    failed++;
  } else {
    log('A. Health', true, 'OK', health.json);
  }

  // B. GET balance (site)
  const getBal = await get(`/api/casino/balance?user=${encodeURIComponent(TEST_USER)}`);
  if (!getBal.ok) {
    log('B. GET /api/casino/balance', false, `HTTP ${getBal.status}`, getBal.json || getBal.text);
    failed++;
  } else {
    const hasBalance = getBal.json?.balance != null;
    log('B. GET /api/casino/balance', true, `balance=${getBal.json?.balance} ${getBal.json?.currency || ''}`, getBal.json);
    if (!hasBalance) console.log('   (warning: pas de solde enregistré pour ce user)');
  }

  // C. POST balance (sync)
  const postBal = await post('/api/casino/balance', {
    user: TEST_USER,
    balance: 100,
    currency: 'TND',
  });
  if (!postBal.ok) {
    log('C. POST /api/casino/balance (sync)', false, `HTTP ${postBal.status}`, postBal.json || postBal.text);
    failed++;
  } else {
    log('C. POST /api/casino/balance (sync)', true, 'OK', postBal.json);
  }

  // D. GET callback (user_code)
  const cbGet = await get(`/api/casino/callback?user_code=${encodeURIComponent(TEST_USER)}`);
  if (!cbGet.ok) {
    log('D. GET /api/casino/callback?user_code=...', false, `HTTP ${cbGet.status}`, cbGet.json || cbGet.text);
    failed++;
  } else {
    const valid = cbGet.json?.status === 1 && (cbGet.json?.balance != null);
    log('D. GET /api/casino/callback?user_code=...', valid, valid ? `balance=${cbGet.json.balance}` : 'format invalide', cbGet.json);
    if (!valid) failed++;
  }

  // E. GET callback (user_id)
  const cbGet2 = await get(`/api/casino/callback?user_id=${encodeURIComponent(TEST_USER)}`);
  if (!cbGet2.ok) {
    log('E. GET /api/casino/callback?user_id=...', false, `HTTP ${cbGet2.status}`, cbGet2.json);
    failed++;
  } else {
    const valid = cbGet2.json?.status === 1 && (cbGet2.json?.balance != null);
    log('E. GET /api/casino/callback?user_id=...', valid, valid ? `balance=${cbGet2.json.balance}` : 'format invalide', cbGet2.json);
    if (!valid) failed++;
  }

  // F. POST callback (get_balance)
  const cbPost = await post('/api/casino/callback', {
    type: 'get_balance',
    user_code: TEST_USER,
  });
  if (!cbPost.ok) {
    log('F. POST /api/casino/callback (get_balance)', false, `HTTP ${cbPost.status}`, cbPost.json || cbPost.text);
    failed++;
  } else {
    const valid = cbPost.json?.status === 1 && (cbPost.json?.balance != null);
    log('F. POST /api/casino/callback (get_balance)', valid, valid ? `balance=${cbPost.json.balance}` : 'format invalide', cbPost.json);
    if (!valid) failed++;
  }

  // G. POST callback (method GetBalance)
  const cbPost2 = await post('/api/casino/callback', {
    method: 'GetBalance',
    user_code: TEST_USER,
  });
  if (!cbPost2.ok) {
    log('G. POST /api/casino/callback (method=GetBalance)', false, `HTTP ${cbPost2.status}`, cbPost2.json);
    failed++;
  } else {
    const valid = cbPost2.json?.status === 1 && (cbPost2.json?.balance != null);
    log('G. POST /api/casino/callback (method=GetBalance)', valid, valid ? `balance=${cbPost2.json.balance}` : 'format invalide', cbPost2.json);
    if (!valid) failed++;
  }

  // H. GET callback/balance
  const cbBalance = await get(`/api/casino/callback/balance?user_code=${encodeURIComponent(TEST_USER)}`);
  if (!cbBalance.ok) {
    log('H. GET /api/casino/callback/balance', false, `HTTP ${cbBalance.status}`, cbBalance.json);
    failed++;
  } else {
    const valid = cbBalance.json?.status === 1 && (cbBalance.json?.balance != null);
    log('H. GET /api/casino/callback/balance', valid, valid ? `balance=${cbBalance.json.balance}` : 'format invalide', cbBalance.json);
    if (!valid) failed++;
  }

  // I. POST launch (structure only; may 400/502 without real credentials)
  const launch = await post('/api/casino/launch', {
    provider_code: 'PRAGMATIC',
    game_code: 'vs20olympgate',
    user_code: TEST_USER,
    balance: 100,
    currency: 'TND',
  });
  if (launch.ok && launch.json?.launch_url) {
    const hasUserInUrl = launch.json.launch_url.includes('user_code=') || launch.json.launch_url.includes('user_id=');
    log('I. POST /api/casino/launch', true, `launch_url reçue, user dans URL: ${hasUserInUrl}`, {
      ok: launch.json.ok,
      hasLaunchUrl: true,
      userInUrl: hasUserInUrl,
    });
  } else if (launch.status === 400 || launch.json?.error) {
    log('I. POST /api/casino/launch', false, 'Paramètres invalides ou credentials manquants', launch.json?.error || launch.json);
    failed++;
  } else {
    log('I. POST /api/casino/launch', false, `HTTP ${launch.status} (vérifier CASINO_TOKEN/CASINO_SECRET)`, launch.json || launch.text);
    // Ne pas compter en échec si c'est juste credentials manquants
  }

  // J. Callback sans user (doit 400)
  const noUser = await get('/api/casino/callback');
  if (noUser.status === 400 && noUser.json?.error) {
    log('J. GET /api/casino/callback sans user', true, '400 attendu', noUser.json);
  } else {
    log('J. GET /api/casino/callback sans user', false, `attendu 400, reçu ${noUser.status}`, noUser.json);
    failed++;
  }

  console.log('');
  if (failed === 0) {
    console.log('--- Tous les tests sont passés. ---');
  } else {
    console.log(`--- ${failed} test(s) en échec. ---`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Erreur:', err.message || err);
  process.exit(1);
});
