import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useI18n, useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { Container, Button, Hairline } from '../Components/UI/Primitives';
import { Empty } from '../Components/UI/States';

/** The cart as a full page, for anyone who prefers it to the drawer. */
export default function Cart() {
  const t = useT();
  const { locale } = useI18n();
  const { items, cleFor, sousTotal, nbArticles, changerQuantite, retirer } = useCart();

  if (items.length === 0) {
    return <Empty titre={t.cart.vide} sub={t.cart.videSub} action={t.cart.videAction} to="/boutique" />;
  }

  return (
    <Container className="py-10 sm:py-14">
      <header>
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.cart.titre}</h1>
        <p className="mt-2 text-ink-soft">{t.cart.articles(nbArticles)}</p>
        <Hairline className="mt-5" />
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <ul className="min-w-0">
          {items.map((item) => {
            const cle = cleFor(item);
            const max = Math.min(item.stock ?? 10, 10);
            return (
              <li key={cle} className="flex min-w-0 gap-4 border-b border-taupe py-5 first:border-t">
                <Link to={`/piece/${item.slug}`} className="shrink-0">
                  <div className="h-32 w-24 overflow-hidden rounded-md bg-shell sm:h-40 sm:w-30">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        width="120"
                        height="160"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/piece/${item.slug}`} className="inline-flex min-h-11 items-center text-ink hover:text-rose-deep">
                    {item.nom?.[locale] || item.nom?.fr}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {item.couleur} · {item.taille}
                  </p>
                  <p className="mt-1 text-sm text-ink">{formatPrice(item.prix, locale)}</p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changerQuantite(cle, item.quantite - 1)}
                        disabled={item.quantite <= 1}
                        aria-label={t.cart.diminuer}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-taupe text-ink disabled:opacity-40"
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span className="min-w-10 text-center" aria-live="polite">
                        {item.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => changerQuantite(cle, item.quantite + 1)}
                        disabled={item.quantite >= max}
                        aria-label={t.cart.augmenter}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-taupe text-ink disabled:opacity-40"
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => retirer(cle)}
                      className="ms-auto inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft hover:text-rose-deep"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {t.cart.retirer}
                    </button>
                  </div>
                </div>

                <p className="hidden shrink-0 text-ink sm:block">{formatPrice(item.prix * item.quantite, locale)}</p>
              </li>
            );
          })}
        </ul>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-taupe bg-shell p-5">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.cart.sousTotal}</dt>
                <dd className="text-ink">{formatPrice(sousTotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.cart.livraison}</dt>
                <dd className="text-ink">{t.cart.livraisonSelonWilaya}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-ink-soft">{t.cart.livraisonCalculee}</p>

            <Button to="/commande" size="lg" className="mt-5 w-full">
              {t.cart.commander}
            </Button>
            <Link
              to="/boutique"
              className="mt-3 flex min-h-11 items-center justify-center text-sm text-ink-soft underline-offset-4 hover:underline"
            >
              {t.cart.continuer}
            </Link>
            <p className="mt-3 text-center text-xs text-ink-soft">{t.cart.sansCompte}</p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
