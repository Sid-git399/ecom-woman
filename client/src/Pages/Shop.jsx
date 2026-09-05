import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { Container, Button, Hairline } from '../Components/UI/Primitives';
import { GridSkeleton, Empty, ErrorState } from '../Components/UI/States';
import { ProductCard } from '../Components/Shop/ProductCard';
import { Reveal, stagger } from '../Components/UI/Reveal';

/**
 * The shop.
 *
 * Every filter lives in the URL, so a filtered view can be shared, bookmarked
 * and reached by the back button. State kept only in React would make the back
 * button feel broken — the most common complaint about filtered catalogues.
 */

const TRIS = ['nouveau', 'prix-asc', 'prix-desc', 'nom'];

export default function Shop() {
  const t = useT();
  const { locale } = useI18n();
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [facettes, setFacettes] = useState({ couleurs: [], tailles: [] });
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [panneauOuvert, setPanneauOuvert] = useState(false);

  const query = useMemo(
    () => ({
      categorie: params.get('categorie') || '',
      taille: params.get('taille') || '',
      couleur: params.get('couleur') || '',
      q: params.get('q') || '',
      tri: params.get('tri') || 'nouveau',
      promo: params.get('promo') || '',
      page: params.get('page') || '1',
      limit: 24,
    }),
    [params]
  );

  const charger = useCallback(
    (signal) => {
      setChargement(true);
      setErreur(null);
      return api
        .produits(query, signal)
        .then(setData)
        .catch((err) => {
          if (err.name !== 'AbortError') setErreur(err.message);
        })
        .finally(() => {
          if (!signal?.aborted) setChargement(false);
        });
    },
    [query]
  );

  useEffect(() => {
    const controller = new AbortController();
    charger(controller.signal);
    return () => controller.abort();
  }, [charger]);

  // Facets follow the chosen category, not the other filters — narrowing them
  // by the current size would remove the very option you need to change it.
  useEffect(() => {
    const controller = new AbortController();
    api
      .facettes({ categorie: query.categorie }, controller.signal)
      .then(setFacettes)
      .catch(() => {});
    return () => controller.abort();
  }, [query.categorie]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .categories(controller.signal)
      .then((d) => setCategories(d.categories))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Scroll back to the top of the results when the page changes, or page 3
  // opens halfway down and looks like nothing happened.
  useEffect(() => {
    if (query.page !== '1') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [query.page]);

  const setParam = useCallback(
    (cle, valeur) => {
      const next = new URLSearchParams(params);
      if (!valeur) next.delete(cle);
      else next.set(cle, valeur);
      // Any filter change returns to page one. Staying on page 4 of a
      // narrower result set lands on an empty page.
      if (cle !== 'page') next.delete('page');
      setParams(next, { replace: false });
    },
    [params, setParams]
  );

  const reinitialiser = () => setParams(new URLSearchParams(), { replace: false });

  const nbFiltres = ['categorie', 'taille', 'couleur', 'promo'].filter((k) => params.get(k)).length;
  const produits = data?.produits || [];
  const total = data?.total || 0;

  const filtres = (
    <div className="flex flex-col gap-7">
      <FilterGroup titre={t.shop.titre}>
        <div className="flex flex-wrap gap-2">
          <Chip actif={!query.categorie} onClick={() => setParam('categorie', '')}>
            {t.shop.tout}
          </Chip>
          {categories.map((c) => (
            <Chip key={c.slug} actif={query.categorie === c.slug} onClick={() => setParam('categorie', c.slug)}>
              {c.nom[locale] || c.nom.fr}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      {facettes.tailles.length ? (
        <FilterGroup titre={t.shop.taille}>
          <div className="flex flex-wrap gap-2">
            {facettes.tailles.map((taille) => (
              <Chip
                key={taille}
                actif={query.taille === taille}
                onClick={() => setParam('taille', query.taille === taille ? '' : taille)}
              >
                {taille}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {facettes.couleurs.length ? (
        <FilterGroup titre={t.shop.couleur}>
          <div className="flex flex-wrap gap-2.5">
            {facettes.couleurs.map((c) => {
              const actif = query.couleur === c.nom;
              return (
                <button
                  key={c.nom}
                  type="button"
                  onClick={() => setParam('couleur', actif ? '' : c.nom)}
                  aria-pressed={actif}
                  // The swatch is a button with a real accessible name, not a
                  // coloured div. Colour alone is not a label.
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                    actif ? 'border-plum' : 'border-taupe'
                  }`}
                >
                  <span className="h-7 w-7 rounded-full border border-taupe/60" style={{ backgroundColor: c.hex }} />
                  {actif ? (
                    <Check size={14} className="absolute text-porcelain mix-blend-difference" aria-hidden="true" />
                  ) : null}
                  <span className="sr-only">{locale === 'ar' ? c.nomAr : c.nom}</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup titre={t.shop.prix}>
        <Chip actif={query.promo === 'true'} onClick={() => setParam('promo', query.promo === 'true' ? '' : 'true')}>
          {t.shop.promotions}
        </Chip>
      </FilterGroup>

      {nbFiltres > 0 ? (
        <button
          type="button"
          onClick={reinitialiser}
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-rose-deep underline-offset-4 hover:underline"
        >
          <X size={15} aria-hidden="true" />
          {t.shop.reinitialiser}
        </button>
      ) : null}
    </div>
  );

  return (
    <Container className="py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">
          {query.q ? `« ${query.q} »` : t.shop.titre}
        </h1>
        <Hairline />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-10">
        <aside className="hidden lg:block">{filtres}</aside>

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPanneauOuvert(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-taupe px-4 text-sm text-ink lg:hidden"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t.shop.filtrer}
              {nbFiltres ? <span className="rounded-full bg-rose px-1.5 text-xs text-plum-deep">{nbFiltres}</span> : null}
            </button>

            <label className="ms-auto flex items-center gap-2 text-sm text-ink-soft">
              <span className="sr-only sm:not-sr-only">{t.shop.trier}</span>
              <select
                value={query.tri}
                onChange={(e) => setParam('tri', e.target.value)}
                className="min-h-11 rounded-md border border-taupe bg-porcelain px-3 text-ink"
              >
                {TRIS.map((tri) => (
                  <option key={tri} value={tri}>
                    {t.shop.tris[tri === 'nouveau' ? 'recent' : tri]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {chargement ? (
            <GridSkeleton n={8} />
          ) : erreur ? (
            <ErrorState message={erreur} onRetry={() => charger()} className="min-h-80" />
          ) : produits.length === 0 ? (
            <Empty
              titre={t.shop.aucunResultat}
              sub={t.shop.aucunResultatSub}
              action={nbFiltres ? t.shop.reinitialiser : t.cart.videAction}
              onAction={nbFiltres ? reinitialiser : undefined}
              to={nbFiltres ? undefined : '/boutique'}
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
                {t.shop.resultats(total)}
              </p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
                {produits.map((p, i) => (
                  <Reveal key={p._id} delay={stagger(i)}>
                    <ProductCard produit={p} index={i} />
                  </Reveal>
                ))}
              </div>

              {data.pages > 1 ? (
                <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label={t.shop.titre}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => setParam('page', String(data.page - 1))}
                  >
                    {t.common.precedent}
                  </Button>
                  <span className="px-3 text-sm text-ink-soft">
                    {data.page} / {data.pages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.page >= data.pages}
                    onClick={() => setParam('page', String(data.page + 1))}
                  >
                    {t.common.suivant}
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>

      {panneauOuvert ? (
        <div className="fixed inset-0 z-[65] lg:hidden" role="dialog" aria-modal="true" aria-label={t.shop.filtrer}>
          <div className="absolute inset-0 bg-plum-deep/45" onClick={() => setPanneauOuvert(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg bg-porcelain p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl text-ink">{t.shop.filtrer}</h2>
              <button
                type="button"
                onClick={() => setPanneauOuvert(false)}
                aria-label={t.common.fermer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-shell"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {filtres}
            <Button onClick={() => setPanneauOuvert(false)} size="lg" className="mt-7 w-full">
              {t.shop.voirResultats(total)}
            </Button>
          </div>
        </div>
      ) : null}
    </Container>
  );
}

function FilterGroup({ titre, children }) {
  return (
    <div className="min-w-0">
      <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-soft">{titre}</h2>
      {children}
    </div>
  );
}

function Chip({ actif, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-sm transition-colors ${
        actif ? 'border-plum bg-plum text-blush' : 'border-taupe bg-transparent text-ink hover:border-plum'
      }`}
    >
      {children}
    </button>
  );
}
