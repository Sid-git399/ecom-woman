import { chromium } from 'playwright';
import { repondre, donnees } from './fixtures.mjs';

/**
 * Text contrast, measured on the rendered page.
 *
 * Computed from the composited colours rather than sampled from pixels: text
 * is antialiased, so sampling a glyph reads a blend of ink and background and
 * reports a failure that is not there — a thin serif at 300 weight measured
 * 1.53:1 that way when its real ratio was 5.17:1.
 *
 * Alpha is composited explicitly, because most of this palette is used at
 * partial opacity (text-blush/85 on bg-plum) and treating those as opaque
 * would report a ratio the customer never sees.
 *
 *   node verify/contraste.mjs
 */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

const ROUTES = [
  '/',
  '/boutique',
  `/piece/${donnees.produits[0].slug}`,
  '/panier',
  '/commande',
  '/la-maison',
  '/contact',
  '/guide-des-tailles',
];

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const echecs = [];
let controles = 0;

for (const locale of ['fr', 'ar']) {
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript((l) => localStorage.setItem('warda.locale', l), locale);
  await contexte.route('**/api/**', (route) => {
    const d = repondre(route.request().url());
    return route.fulfill({
      status: d?.__status || (d ? 200 : 404),
      contentType: 'application/json',
      body: JSON.stringify(d || {}),
    });
  });
  await contexte.route('**/products/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#dccec6"/></svg>',
    })
  );

  const page = await contexte.newPage();

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1').catch(() => {});
    await page.waitForTimeout(300);

    const resultats = await page.evaluate(() => {
      /**
       * Any CSS colour string to {r,g,b,a}, using the browser's own conversion.
       *
       * Tailwind v4 emits `oklab(... / 0.85)` for alpha-modified colours, so a
       * regex over `rgba()` silently returns null for exactly the semi
       * transparent layers that decide contrast. Painting the colour over
       * black and over white and solving the two composites recovers both the
       * colour and its alpha, whatever notation the engine used.
       */
      const toile = document.createElement('canvas');
      toile.width = toile.height = 1;
      const ctx = toile.getContext('2d', { willReadFrequently: true });

      const peindre = (couleur, fondCss) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = fondCss;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = couleur;
        ctx.fillRect(0, 0, 1, 1);
        return ctx.getImageData(0, 0, 1, 1).data;
      };

      const lire = (s) => {
        if (!s || s === 'none' || s === 'transparent') return null;
        // An unparseable string leaves fillStyle at its previous value, which
        // would silently measure the wrong colour.
        ctx.fillStyle = '#000000';
        ctx.fillStyle = s;
        if (ctx.fillStyle === '#000000' && !/^(#000000|black|rgba?\(0, ?0, ?0)/.test(s)) return null;

        const surNoir = peindre(s, '#000000');
        const surBlanc = peindre(s, '#ffffff');
        const a = 1 - (surBlanc[0] - surNoir[0]) / 255;
        if (a <= 0.004) return { r: 0, g: 0, b: 0, a: 0 };
        return { r: surNoir[0] / a, g: surNoir[1] / a, b: surNoir[2] / a, a };
      };

      const sur = (avant, arriere) => ({
        r: avant.r * avant.a + arriere.r * (1 - avant.a),
        g: avant.g * avant.a + arriere.g * (1 - avant.a),
        b: avant.b * avant.a + arriere.b * (1 - avant.a),
        a: 1,
      });

      const luminance = ({ r, g, b }) => {
        const f = (c) => {
          const x = c / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };

      const ratio = (a, b) => {
        const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      };

      /** The first opaque background behind an element, composited downward. */
      const fond = (el) => {
        const couches = [];
        for (let a = el; a; a = a.parentElement) {
          const bg = lire(getComputedStyle(a).backgroundColor);
          if (!bg || bg.a === 0) continue;
          couches.push(bg);
          if (bg.a === 1) break;
        }
        if (!couches.length) return { r: 255, g: 255, b: 255, a: 1 };
        let base = couches[couches.length - 1];
        for (let i = couches.length - 2; i >= 0; i -= 1) base = sur(couches[i], base);
        return base;
      };

      const sorties = [];
      for (const el of document.querySelectorAll('p, h1, h2, h3, span, a, button, li, td, th, label, legend, dt, dd')) {
        // Only elements that actually render their own text.
        const texte = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
        if (!texte) continue;

        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
        if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
        // Struck-through sold-out labels are deliberately dimmed; they are
        // status, not content, and the strike carries the meaning.
        if (cs.textDecorationLine.includes('line-through')) continue;

        const avant = lire(cs.color);
        if (!avant) continue;
        const arriere = fond(el);
        const compose = avant.a < 1 ? sur(avant, arriere) : avant;

        const px = parseFloat(cs.fontSize);
        const poids = parseInt(cs.fontWeight, 10) || 400;
        // WCAG "large text": 24px, or 18.66px at 700+.
        const grand = px >= 24 || (px >= 18.66 && poids >= 700);
        const seuil = grand ? 3 : 4.5;

        sorties.push({
          ratio: Math.round(ratio(compose, arriere) * 100) / 100,
          seuil,
          px: Math.round(px),
          texte: texte.slice(0, 40),
          cls: (el.className || '').toString().split(' ').slice(0, 3).join(' '),
        });
      }
      return sorties;
    });

    for (const r of resultats) {
      controles += 1;
      if (r.ratio < r.seuil) {
        echecs.push(`${locale} ${route} — ${r.ratio}:1 (min ${r.seuil}) ${r.px}px « ${r.texte} » [${r.cls}]`);
      }
    }
  }

  await contexte.close();
}

await navigateur.close();

// Duplicates across pages say the same thing; one line each is enough to fix.
const uniques = [...new Set(echecs.map((e) => e.split(' — ')[1]))];

if (uniques.length) {
  console.error(`${echecs.length} occurrence(s) sous le seuil sur ${controles} textes mesurés :\n`);
  for (const f of uniques) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${controles} textes mesurés, tous au-dessus du seuil WCAG AA.`);
