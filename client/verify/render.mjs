import { chromium } from 'playwright';
import { repondre, donnees } from './fixtures.mjs';

/**
 * Renders every route in both languages at phone and desktop width and checks
 * the things that actually break: horizontal overflow, direction, tap target
 * size, and console errors.
 *
 * The API is stubbed from the real seed catalogue rather than left to fail, so
 * the pages under test render with content — an empty state has no grid to
 * overflow and would pass every check while proving nothing.
 *
 *   node verify/render.mjs        (expects `npx vite preview` on :4173)
 */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

const ROUTES = [
  ['/', 'accueil'],
  ['/boutique', 'boutique'],
  ['/boutique?categorie=robes&taille=M', 'boutique filtrée'],
  [`/piece/${donnees.produits[0].slug}`, 'fiche produit'],
  [`/piece/${donnees.produits.find((p) => p.disponibilite === 'EPUISE').slug}`, 'fiche épuisée'],
  ['/panier', 'panier'],
  ['/commande', 'commande'],
  ['/suivi', 'suivi'],
  ['/connexion', 'connexion'],
  ['/inscription', 'inscription'],
  ['/compte', 'compte'],
  ['/compte/commandes', 'compte commandes'],
  ['/compte/favoris', 'compte favoris'],
  ['/compte/adresses', 'compte adresses'],
  ['/favoris', 'favoris'],
  ['/lookbook', 'lookbook'],
  ['/la-maison', 'la maison'],
  ['/guide-des-tailles', 'guide des tailles'],
  ['/contact', 'contact'],
  ['/admin', 'admin'],
  ['/admin/commandes', 'admin commandes'],
  ['/admin/produits', 'admin articles'],
  ['/admin/categories', 'admin catégories'],
  ['/admin/livraison', 'admin livraison'],
  ['/admin/messages', 'admin messages'],
  ['/admin/parametres', 'admin paramètres'],
  ['/cette-page-nexiste-pas', '404'],
];

const VUES = [
  { nom: '360', width: 360, height: 780, mobile: true },
  { nom: '1280', width: 1280, height: 900, mobile: false },
];

const echecs = [];
let controles = 0;

function verifier(label, condition, detail = '') {
  controles += 1;
  if (!condition) echecs.push(detail ? `${label} — ${detail}` : label);
}

// The environment ships a Chromium build that predates this Playwright
// version, so the bundled download is bypassed rather than re-fetched.
const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

for (const locale of ['fr', 'ar']) {
  for (const vue of VUES) {
    const contexte = await navigateur.newContext({
      viewport: { width: vue.width, height: vue.height },
      deviceScaleFactor: 1,
      isMobile: vue.mobile,
      hasTouch: vue.mobile,
      locale: locale === 'ar' ? 'ar-DZ' : 'fr-DZ',
    });

    // The locale is a localStorage choice, set before any script runs.
    await contexte.addInitScript((l) => {
      localStorage.setItem('warda.locale', l);
      localStorage.setItem(
        'warda.panier',
        JSON.stringify([
          {
            productId: '000000000000000000000100',
            slug: 'robe-longue-amira',
            nom: { fr: 'Robe longue Amira', ar: 'فستان طويل أميرة' },
            ref: 'AMIRA',
            prix: 7800,
            image: '',
            couleur: 'Noir',
            hex: '#1E1A1C',
            taille: 'M',
            quantite: 2,
            stock: 6,
          },
        ])
      );
    }, locale);

    await contexte.route('**/api/**', async (route) => {
      const data = repondre(route.request().url());
      if (data === null) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"non géré"}' });
      const status = data.__status || 200;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });

    // Placeholder photos do not exist in this environment. Served as a real
    // image so the layout is measured with images present, which is the state
    // that overflows.
    await contexte.route('**/products/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#dccec6"/></svg>',
      })
    );

    const page = await contexte.newPage();

    for (const [chemin, nom] of ROUTES) {
      const etiquette = `${locale} ${vue.nom} ${nom}`;
      const erreursConsole = [];
      page.on('pageerror', (e) => erreursConsole.push(e.message));

      await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle' });

      // Wait for the page itself, not just the network. Routes behind the
      // session check render a spinner until `pret` flips, and measuring in
      // that window reports a page with no heading — a flake, not a fault.
      await page.waitForFunction(() => document.querySelector('h1') !== null, null, { timeout: 5000 }).catch(() => {});
      // Then let the reveal animations settle.
      await page.waitForTimeout(350);

      const mesures = await page.evaluate(() => {
        const doc = document.documentElement;

        // Which elements actually stick out. An element inside a horizontal
        // scroll container is supposed to extend past it, so those are skipped
        // — but `body` is excluded from that exemption, because its
        // `overflow-x: hidden` hides the symptom rather than fixing the cause
        // and would otherwise exempt the entire page.
        const dansUnScroll = (el) => {
          for (let a = el.parentElement; a && a !== doc && a !== document.body; a = a.parentElement) {
            const ox = getComputedStyle(a).overflowX;
            if (ox === 'auto' || ox === 'hidden' || ox === 'scroll') return true;
          }
          return false;
        };

        const coupables = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (dansUnScroll(el)) continue;
          const depasse = Math.round(Math.max(r.right - doc.clientWidth, -r.left));
          if (depasse > 1) {
            coupables.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} +${depasse}px`);
          }
        }

        // Interactive targets that are too small to hit reliably.
        //
        // Two exemptions, both principled rather than convenient. A visually
        // hidden control (the skip link) is 1x1 by definition and is reached
        // by keyboard, never by thumb. And a checkbox wrapped in a label is
        // hit by tapping the label, so the label's box is the real target.
        const petits = [];
        for (const el of document.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.closest('.sr-only')) continue;
          if (el.classList.contains('sr-only')) continue;

          const etiquette = el.closest('label');
          const boite = etiquette ? etiquette.getBoundingClientRect() : r;
          if (boite.height < 40 || boite.width < 24) {
            petits.push(`${el.tagName.toLowerCase()} ${Math.round(boite.width)}x${Math.round(boite.height)}`);
          }
        }

        // Any image that failed to load leaves a broken glyph on the page.
        const imagesCassees = [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.getAttribute('src'));

        return {
          dir: doc.getAttribute('dir'),
          lang: doc.getAttribute('lang'),
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          titres: document.querySelectorAll('h1').length,
          coupables: coupables.slice(0, 4),
          petits: petits.slice(0, 4),
          imagesCassees: imagesCassees.slice(0, 3),
          texte: document.body.innerText.trim().length,
        };
      });

      verifier(
        `${etiquette} : pas de débordement`,
        mesures.scrollWidth <= mesures.clientWidth + 1,
        `+${mesures.scrollWidth - mesures.clientWidth}px — ${mesures.coupables.join(', ')}`
      );
      verifier(`${etiquette} : direction`, mesures.dir === (locale === 'ar' ? 'rtl' : 'ltr'), mesures.dir);
      verifier(`${etiquette} : langue`, mesures.lang === locale, mesures.lang);
      verifier(`${etiquette} : un seul h1`, mesures.titres === 1, String(mesures.titres));
      verifier(`${etiquette} : contenu rendu`, mesures.texte > 120, `${mesures.texte} caractères`);
      verifier(`${etiquette} : cibles tactiles`, mesures.petits.length === 0, mesures.petits.join(', '));
      verifier(`${etiquette} : images chargées`, mesures.imagesCassees.length === 0, mesures.imagesCassees.join(', '));
      verifier(`${etiquette} : aucune erreur JS`, erreursConsole.length === 0, erreursConsole[0] || '');

      page.removeAllListeners('pageerror');
    }

    await contexte.close();
  }
}

await navigateur.close();

if (echecs.length) {
  console.error(`${echecs.length} échec(s) sur ${controles} contrôles :\n`);
  for (const f of echecs) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${controles} contrôles passés — ${ROUTES.length} routes × 2 langues × 2 largeurs.`);
