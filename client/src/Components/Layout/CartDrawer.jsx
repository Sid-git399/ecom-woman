import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useI18n, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { Button } from '../UI/Primitives';

/**
 * The cart, as a side panel.
 *
 * It slides from the inline end, so it comes from the right in French and from
 * the left in Arabic — a panel that always arrives from the right feels like it
 * comes from behind the page in a mirrored layout.
 */
export function CartDrawer() {
  const { items, cleFor, sousTotal, nbArticles, changerQuantite, retirer, drawerOuvert, fermerDrawer } = useCart();
  const { locale, isRtl } = useI18n();
  const t = useT();
  const reduit = useReducedMotion();
  const panneauRef = useRef(null);
  const fermerRef = useRef(null);

  useEffect(() => {
    if (!drawerOuvert) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Focus moves into the panel, so the keyboard is where the eye is.
    fermerRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') fermerDrawer();
      if (e.key !== 'Tab') return;

      // A dialog that lets Tab wander back to the page behind it is a dialog
      // a keyboard user cannot get out of predictably.
      const focusables = panneauRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOuvert, fermerDrawer]);

  const depart = isRtl ? -1 : 1;

  return (
    <AnimatePresence>
      {drawerOuvert ? (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t.cart.titre}>
          <m.div
            className="absolute inset-0 bg-plum-deep/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduit ? 0 : 0.2 }}
            onClick={fermerDrawer}
          />

          <m.aside
            ref={panneauRef}
            className="absolute inset-y-0 end-0 flex w-full max-w-sm flex-col bg-porcelain shadow-lift"
            initial={{ x: reduit ? 0 : `${100 * depart}%` }}
            animate={{ x: 0 }}
            exit={{ x: reduit ? 0 : `${100 * depart}%` }}
            transition={{ duration: reduit ? 0 : 0.32, ease: [0.32, 0.72, 0, 1] }}
          >
            <header className="flex items-center justify-between border-b border-taupe px-4 py-4">
              <h2 className="font-display text-2xl text-ink">
                {t.cart.titre}
                {nbArticles > 0 ? <span className="ms-2 text-base text-ink-soft">({nbArticles})</span> : null}
              </h2>
              <button
                ref={fermerRef}
                type="button"
                onClick={fermerDrawer}
                aria-label={t.common.fermer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-shell"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="font-display text-xl text-ink">{t.cart.vide}</p>
                <p className="mt-2 text-sm text-ink-soft">{t.cart.videSub}</p>
                <Button to="/boutique" onClick={fermerDrawer} className="mt-6">
                  {t.cart.videAction}
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-4 py-4">
                  {items.map((item) => {
                    const cle = cleFor(item);
                    return (
                      <li key={cle} className="flex min-w-0 gap-3 border-b border-taupe/60 py-4 last:border-b-0">
                        <Link to={`/piece/${item.slug}`} onClick={fermerDrawer} className="shrink-0">
                          <div className="h-24 w-18 overflow-hidden rounded-md bg-shell">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt=""
                                width="72"
                                height="96"
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <Link to={`/piece/${item.slug}`} onClick={fermerDrawer} className="text-sm text-ink">
                            {item.nom?.[locale] || item.nom?.fr}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {item.couleur} · {item.taille}
                          </p>
                          <p className="mt-1 text-sm text-ink">{formatPrice(item.prix, locale)}</p>

                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => changerQuantite(cle, item.quantite - 1)}
                              disabled={item.quantite <= 1}
                              aria-label={t.cart.diminuer}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-taupe text-ink disabled:opacity-40"
                            >
                              <Minus size={14} aria-hidden="true" />
                            </button>
                            <span className="min-w-8 text-center text-sm" aria-live="polite">
                              {item.quantite}
                            </span>
                            <button
                              type="button"
                              onClick={() => changerQuantite(cle, item.quantite + 1)}
                              disabled={item.quantite >= Math.min(item.stock ?? 10, 10)}
                              aria-label={t.cart.augmenter}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-taupe text-ink disabled:opacity-40"
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={() => retirer(cle)}
                              className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
                              aria-label={`${t.cart.retirer} — ${item.nom?.[locale] || item.nom?.fr}`}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <footer className="border-t border-taupe px-4 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-soft">{t.cart.sousTotal}</span>
                    <span className="font-display text-2xl text-ink">{formatPrice(sousTotal, locale)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{t.cart.livraisonCalculee}</p>

                  <Button to="/commande" onClick={fermerDrawer} size="lg" className="mt-4 w-full">
                    {t.cart.commander}
                  </Button>
                  <button
                    type="button"
                    onClick={fermerDrawer}
                    className="mt-2 min-h-11 w-full text-sm text-ink-soft underline-offset-4 hover:underline"
                  >
                    {t.cart.continuer}
                  </button>
                </footer>
              </>
            )}
          </m.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default CartDrawer;
