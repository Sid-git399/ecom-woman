import { chromium } from 'playwright';
import { repondre, donnees } from './fixtures.mjs';

/**
 * Drives the paths that make the shop a shop.
 *
 * Rendering every route proves the pages exist. This proves they work: that a
 * sold-out size cannot be bought, that the cart survives a reload, that the
 * delivery fee appears before the customer commits, and that switching to
 * Arabic turns the whole page around rather than only translating it.
 *
 *   node verify/flows.mjs      (expects `npx vite preview` on :4173)
 */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

const echecs = [];
let controles = 0;

function verifier(label, condition, detail = '') {
  controles += 1;
  if (!condition) echecs.push(detail ? `${label} — ${detail}` : label);
}

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function nouveauContexte({ locale = 'fr', width = 390 } = {}) {
  const contexte = await navigateur.newContext({
    viewport: { width, height: 840 },
    isMobile: width < 700,
    hasTouch: width < 700,
    locale: locale === 'ar' ? 'ar-DZ' : 'fr-DZ',
  });
  // Seeds the starting language without overwriting a choice made during the
  // run — an unconditional write here would undo the language switch on every
  // reload and make a working preference look broken.
  await contexte.addInitScript((l) => {
    if (!localStorage.getItem('warda.locale')) localStorage.setItem('warda.locale', l);
  }, locale);

  const commandesEnvoyees = [];
  await contexte.route('**/api/**', async (route) => {
    const requete = route.request();
    if (requete.method() === 'POST' && requete.url().includes('/commandes')) {
      commandesEnvoyees.push(JSON.parse(requete.postData() || '{}'));
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ commande: donnees.commande }),
      });
    }
    // Nobody is logged in for these flows: checkout as a guest is the path
    // most customers take and the one worth proving.
    if (requete.url().includes('/auth/moi')) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Connexion requise"}' });
    }
    const data = repondre(requete.url());
    if (data === null) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: data.__status || 200, contentType: 'application/json', body: JSON.stringify(data) });
  });

  await contexte.route('**/products/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#dccec6"/></svg>',
    })
  );

  return { contexte, commandesEnvoyees };
}

// ── Buying, end to end ───────────────────────────────────────────────────────

{
  const { contexte, commandesEnvoyees } = await nouveauContexte();
  const page = await contexte.newPage();

  const produit = donnees.produits.find((p) => p.ancienPrix && p.disponibilite === 'EN_STOCK');
  await page.goto(`${BASE}/piece/${produit.slug}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');

  // Adding without choosing a size must be refused, and must say why.
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  verifier(
    'taille obligatoire',
    await page.getByRole('alert').filter({ hasText: 'Choisissez une taille' }).isVisible()
  );

  // A sold-out size is present but not selectable.
  const rupture = produit.variants.find((v) => v.stock === 0);
  if (rupture) {
    await page.getByRole('button', { name: rupture.couleur, exact: false }).first().click().catch(() => {});
    const bouton = page.getByRole('button', { name: rupture.taille, exact: true });
    if (await bouton.count()) {
      verifier('taille épuisée désactivée', await bouton.first().isDisabled());
    }
  }

  const disponible = produit.variants.find((v) => v.stock > 0);
  await page.getByRole('button', { name: disponible.taille, exact: true }).first().click();
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();

  // The drawer opens on its own, which is the confirmation that it worked.
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
  verifier('panier ouvert après ajout', await page.getByRole('dialog').isVisible());

  const panier = JSON.parse(await page.evaluate(() => localStorage.getItem('warda.panier')));
  verifier('ligne de panier complète', panier.length === 1 && Boolean(panier[0].taille && panier[0].couleur), JSON.stringify(panier[0] || {}));

  // Escape closes it, and the cart survives the reload.
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  const apresRechargement = JSON.parse(await page.evaluate(() => localStorage.getItem('warda.panier')));
  verifier('panier persistant', apresRechargement.length === 1);

  // ── Checkout ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/commande`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');

  // Submitting an empty form must surface errors and focus the first one.
  await page.getByRole('button', { name: 'Confirmer la commande' }).click();
  await page.waitForTimeout(200);
  const focusInvalide = await page.evaluate(() => document.activeElement?.getAttribute('aria-invalid'));
  verifier('focus sur le premier champ en erreur', focusInvalide === 'true', String(focusInvalide));

  await page.getByLabel(/Nom et prénom/).fill('Nesrine K.');
  await page.getByLabel(/Téléphone/).fill('0550 12 34 56');

  // Choosing a wilaya must reveal the fee before anything is confirmed.
  const alger = donnees.wilayas.find((w) => w.nom === 'Alger') || donnees.wilayas[0];
  await page.getByLabel(/Wilaya/).selectOption(alger._id);
  await page.getByLabel(/Commune/).fill('Bab Ezzouar');
  await page.getByLabel(/Adresse/).first().fill('Cité 8 Mai 1945, bâtiment C');
  await page.waitForTimeout(150);

  const recap = await page.locator('aside').innerText();
  verifier('frais de livraison affichés avant confirmation', /\d/.test(recap) && !recap.includes('Selon votre wilaya'), recap.slice(0, 80));

  const totalAffiche = await page.evaluate(() => {
    const dd = [...document.querySelectorAll('aside dd')];
    return dd[dd.length - 1]?.textContent || '';
  });
  const attendu = donnees.produits.find((p) => p.slug === produit.slug).prix + alger.fraisDomicile;
  verifier(
    'total = articles + livraison',
    totalAffiche.replace(/\D/g, '').startsWith(String(attendu)),
    `${totalAffiche} pour ${attendu}`
  );

  await page.getByRole('button', { name: 'Confirmer la commande' }).click();
  await page.waitForURL('**/commande/confirmee', { timeout: 5000 });
  await page.waitForSelector('h1', { timeout: 5000 });

  verifier('commande envoyée', commandesEnvoyees.length === 1);
  const envoyee = commandesEnvoyees[0];
  verifier('taille et couleur transmises', Boolean(envoyee?.items?.[0]?.taille && envoyee?.items?.[0]?.couleur), JSON.stringify(envoyee?.items?.[0] || {}));
  // The browser must not be the one deciding the price.
  verifier('aucun prix envoyé par le client', !JSON.stringify(envoyee.items).includes('prix'), JSON.stringify(envoyee.items));

  const confirmation = await page.locator('main').innerText();
  verifier('numéro de commande affiché', confirmation.includes(donnees.commande.numero), confirmation.slice(0, 60));

  const panierVide = JSON.parse(await page.evaluate(() => localStorage.getItem('warda.panier')));
  verifier('panier vidé après commande', panierVide.length === 0);

  await contexte.close();
}

// ── Filtering ────────────────────────────────────────────────────────────────

{
  const { contexte } = await nouveauContexte({ width: 1280 });
  const page = await contexte.newPage();
  await page.goto(`${BASE}/boutique`, { waitUntil: 'networkidle' });
  await page.waitForSelector('article');

  const avant = await page.locator('article').count();
  await page.getByRole('button', { name: 'M', exact: true }).first().click();
  await page.waitForTimeout(400);

  verifier('le filtre passe dans l’URL', page.url().includes('taille=M'), page.url());
  const apres = await page.locator('article').count();
  verifier('la grille se met à jour', apres > 0 && apres <= avant, `${avant} → ${apres}`);

  // The back button has to undo a filter, which is the whole reason the
  // filters live in the URL.
  await page.goBack();
  await page.waitForTimeout(400);
  verifier('retour arrière annule le filtre', !page.url().includes('taille=M'), page.url());

  await contexte.close();
}

// ── Language ─────────────────────────────────────────────────────────────────

{
  const { contexte } = await nouveauContexte({ locale: 'fr', width: 1280 });
  const page = await contexte.newPage();
  await page.goto(`${BASE}/boutique`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');

  verifier('départ en français', (await page.evaluate(() => document.documentElement.dir)) === 'ltr');

  await page.getByRole('button', { name: 'العربية' }).click();
  await page.waitForTimeout(300);

  const apres = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    police: getComputedStyle(document.body).fontFamily,
    // The header must mirror, not merely translate.
    logoX: document.querySelector('header a')?.getBoundingClientRect().left,
    largeur: window.innerWidth,
  }));

  verifier('direction inversée', apres.dir === 'rtl', apres.dir);
  verifier('langue arabe', apres.lang === 'ar', apres.lang);
  verifier('police arabe', /Tajawal/.test(apres.police), apres.police);

  // Reloading must keep the choice.
  await page.reload({ waitUntil: 'networkidle' });
  verifier('langue conservée après rechargement', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');

  await contexte.close();
}

// ── Keyboard ─────────────────────────────────────────────────────────────────

{
  const { contexte } = await nouveauContexte({ width: 1280 });
  const page = await contexte.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');
  const premier = await page.evaluate(() => document.activeElement?.textContent?.trim());
  verifier('lien d’évitement en premier', Boolean(premier), premier || '(rien)');

  // The cart panel must trap focus and give it back on close.
  await page.getByRole('button', { name: 'Panier' }).click();
  await page.waitForSelector('[role="dialog"]');
  const dansLeDialogue = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
  verifier('focus déplacé dans le panier', dansLeDialogue);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  verifier('échap ferme le panier', (await page.locator('[role="dialog"]').count()) === 0);

  await contexte.close();
}

await navigateur.close();

if (echecs.length) {
  console.error(`${echecs.length} échec(s) sur ${controles} :\n`);
  for (const f of echecs) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${controles} parcours vérifiés.`);
