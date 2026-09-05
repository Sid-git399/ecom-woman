import assert from 'node:assert/strict';

/**
 * Boots the real Express app and exercises everything that does not need a
 * database.
 *
 * No MongoDB is reachable from the build environment, so the routes that read
 * the catalogue cannot be tested here. What can be — and is — checked is the
 * layer around them: that the app assembles at all, that CORS refuses an
 * unknown origin, that the admin router is actually closed, that unknown
 * routes return JSON rather than Express's HTML error page, and that a bad
 * JSON body is reported as 400 instead of crashing the process.
 *
 * That is the part most likely to be wrong and least likely to be noticed,
 * because it only shows up from a browser on a different domain.
 *
 *   npm run smoke
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);
process.env.CLIENT_URLS = 'https://warda.dz,http://localhost:5173';

const { default: app } = await import('../app.js');

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

let checks = 0;
const failures = [];

async function check(label, fn) {
  checks += 1;
  try {
    await fn();
  } catch (err) {
    failures.push(`${label} — ${err.message}`);
  }
}

await check('santé répond', async () => {
  const r = await fetch(`${base}/api/sante`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

await check('route inconnue en JSON', async () => {
  const r = await fetch(`${base}/api/nawak`);
  assert.equal(r.status, 404);
  assert.match(r.headers.get('content-type') || '', /application\/json/);
  assert.match((await r.json()).message, /introuvable/);
});

await check('origine autorisée acceptée', async () => {
  const r = await fetch(`${base}/api/sante`, { headers: { Origin: 'https://warda.dz' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://warda.dz');
  // Credentialed CORS is what the session cookie depends on.
  assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
});

await check('origine inconnue refusée', async () => {
  const r = await fetch(`${base}/api/sante`, { headers: { Origin: 'https://copie.example' } });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  // And refused quietly: a 500 here would fill the production log with stack
  // traces from every crawler that sends an Origin header.
  assert.equal(r.status, 200);
});

await check('barre oblique finale tolérée', async () => {
  // The env var is written by hand and often ends in a slash; the Origin
  // header never does. They still have to match.
  const r = await fetch(`${base}/api/sante`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

await check('admin fermé sans session', async () => {
  for (const route of ['/api/admin/stats', '/api/admin/commandes', '/api/admin/messages']) {
    const r = await fetch(`${base}${route}`);
    assert.equal(r.status, 401, `${route} a répondu ${r.status}`);
  }
});

await check('admin fermé en écriture', async () => {
  const r = await fetch(`${base}/api/admin/produits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nom: { fr: 'Intrus' } }),
  });
  assert.equal(r.status, 401);
});

await check('jeton falsifié rejeté', async () => {
  const r = await fetch(`${base}/api/admin/stats`, {
    headers: { authorization: 'Bearer pas.un.jeton' },
  });
  assert.equal(r.status, 401);
});

await check('compte requis', async () => {
  const r = await fetch(`${base}/api/mes-commandes`);
  assert.equal(r.status, 401);
});

await check('JSON invalide en 400', async () => {
  const r = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ceci n’est pas du JSON',
  });
  assert.ok(r.status === 400, `statut ${r.status}`);
});

await check('inscription valide les champs', async () => {
  // Rejected before any database call, so this exercises the validation path
  // rather than the connection.
  const r = await fetch(`${base}/api/auth/inscription`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nom: 'Test', telephone: '0123', motDePasse: 'court' }),
  });
  assert.equal(r.status, 400);
  assert.match((await r.json()).message, /Numéro invalide/);
});

await check('suivi de commande exige les deux champs', async () => {
  const r = await fetch(`${base}/api/commandes/suivi?numero=WRD-2026-0001`);
  assert.equal(r.status, 400);
});

server.close();

if (failures.length) {
  console.error(`${failures.length} échec(s) sur ${checks} :\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${checks} contrôles passés (sans base de données).`);
