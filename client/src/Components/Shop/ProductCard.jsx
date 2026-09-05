import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';

/**
 * One garment in the grid.
 *
 * The image sits in a fixed 3:4 frame with an explicit width and height, so
 * the grid holds its shape from first paint and nothing shifts when the photos
 * arrive. Below 1024px the grid is two columns — one column wastes the screen
 * on a phone and makes browsing a catalogue feel endless.
 */
export function ProductCard({ produit, index = 0, priority = false }) {
  const { locale } = useI18n();
  const t = useT();
  const [erreurImage, setErreurImage] = useState(false);

  const nom = produit.nom?.[locale] || produit.nom?.fr || '';
  const image = produit.images?.[0]?.url;
  const epuise = produit.disponibilite === 'EPUISE';
  const enPromo = produit.ancienPrix > 0 && produit.ancienPrix > produit.prix;
  const couleurs = produit.couleurs || [];

  return (
    <article className="group flex min-w-0 flex-col">
      <Link to={`/piece/${produit.slug}`} className="flex min-w-0 flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-shell">
          {image && !erreurImage ? (
            <img
              src={image}
              alt={produit.images?.[0]?.alt || nom}
              width="600"
              height="800"
              // The first row is above the fold on every screen size and is the
              // largest paint; the rest can wait.
              loading={priority || index < 2 ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onError={() => setErreurImage(true)}
              className={`h-full w-full object-cover transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] ${
                epuise ? 'opacity-70' : ''
              }`}
            />
          ) : (
            // A plain field, not a broken-image glyph and not a logo repeated
            // across the grid.
            <div className="h-full w-full bg-taupe/40" aria-hidden="true" />
          )}

          {epuise ? (
            <span className="absolute bottom-0 start-0 end-0 bg-plum/85 py-2 text-center text-xs tracking-wide text-blush">
              {t.product.rupture}
            </span>
          ) : null}

          {enPromo && !epuise ? (
            <span className="absolute top-3 start-3 rounded-pill bg-rose-deep px-2.5 py-1 text-xs text-porcelain">
              -{Math.round(((produit.ancienPrix - produit.prix) / produit.ancienPrix) * 100)}%
            </span>
          ) : null}

          {produit.isNouveau && !enPromo && !epuise ? (
            <span className="absolute top-3 start-3 rounded-pill bg-porcelain/95 px-2.5 py-1 text-xs text-plum">
              {t.home.nouveautes}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 min-w-0 text-sm text-ink sm:text-base">{nom}</h3>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className={enPromo ? 'text-rose-deep' : 'text-ink'}>{formatPrice(produit.prix, locale)}</span>
          {enPromo ? (
            <span className="text-xs text-ink-soft line-through">{formatPrice(produit.ancienPrix, locale)}</span>
          ) : null}
        </p>
      </Link>

      {couleurs.length > 1 ? (
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          {couleurs.slice(0, 5).map((c) => (
            <li
              key={c.nom}
              // The colour name is the accessible label; a bare swatch is
              // invisible to a screen reader and ambiguous to everyone else.
              title={locale === 'ar' ? c.nomAr : c.nom}
              className="h-3.5 w-3.5 rounded-full border border-taupe"
              style={{ backgroundColor: c.hex }}
            >
              <span className="sr-only">{locale === 'ar' ? c.nomAr : c.nom}</span>
            </li>
          ))}
          {couleurs.length > 5 ? <li className="text-xs text-ink-soft">+{couleurs.length - 5}</li> : null}
        </ul>
      ) : null}
    </article>
  );
}

export default ProductCard;
