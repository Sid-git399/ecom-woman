import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, BadgeCheck, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { Container, Button, SectionTitle, Hairline } from '../Components/UI/Primitives';
import { GridSkeleton } from '../Components/UI/States';
import { ProductCard } from '../Components/Shop/ProductCard';
import { Reveal, stagger } from '../Components/UI/Reveal';
import WardaRose from '../Components/Brand/WardaRose';

/**
 * The home page.
 *
 * Its job is to say what the shop sells, that delivery reaches the whole
 * country, and that nothing is paid up front — in that order, above the fold.
 * Everything below is the catalogue doing the talking.
 */
export default function Home({ settings }) {
  const t = useT();
  const { locale } = useI18n();

  const [categories, setCategories] = useState([]);
  const [nouveautes, setNouveautes] = useState([]);
  const [selection, setSelection] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.categories(controller.signal),
      api.produits({ nouveau: 'true', limit: 8 }, controller.signal),
      api.produits({ featured: 'true', limit: 4 }, controller.signal),
    ])
      .then(([cats, neuf, choix]) => {
        setCategories(cats.categories.filter((c) => c.nbArticles > 0));
        setNouveautes(neuf.produits);
        setSelection(choix.produits);
      })
      .catch(() => {
        /* The page still renders its static sections; the grids simply stay empty. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });
    return () => controller.abort();
  }, []);

  const heroTitle = settings?.heroTitle?.[locale] || t.home.heroTitle;
  const heroSub = settings?.heroSubtitle?.[locale] || t.home.heroSubtitle;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-plum text-blush">
        <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="min-w-0">
            <Reveal>
              <span className="text-xs uppercase tracking-[0.2em] text-rose-light">{t.home.heroEyebrow}</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">{heroTitle}</h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-md text-blush/85">{heroSub}</p>
            </Reveal>
            <Reveal delay={0.18}>
              <Button to="/boutique" variant="onPlum" size="lg" className="mt-8">
                {t.home.voirCollection}
                <ArrowRight size={18} aria-hidden="true" className="rtl:-scale-x-100" />
              </Button>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="min-w-0">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg bg-plum-deep">
              <img
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
                alt="Modèle portant une tenue élégante de la collection Warda"
                width="600"
                height="800"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Reassurance ──────────────────────────────────────────────────── */}
      <section className="border-b border-taupe bg-shell">
        <Container className="grid gap-6 py-8 sm:grid-cols-3">
          {[
            { icon: Truck, titre: t.home.rassurance.livraison },
            { icon: BadgeCheck, titre: t.home.rassurance.paiement },
            { icon: RefreshCw, titre: t.home.rassurance.echange },
          ].map(({ icon: Icon, titre }) => (
            <div key={titre} className="flex min-w-0 items-start gap-3">
              <Icon size={20} className="mt-0.5 shrink-0 text-rose-deep" aria-hidden="true" />
              <p className="text-sm text-ink">{titre}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section>
        <Container className="py-16 sm:py-20">
          <Reveal>
            <SectionTitle titre={t.home.nosCategories} align="center" className="mx-auto" />
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {categories.slice(0, 8).map((cat, i) => (
              <Reveal key={cat.slug} delay={stagger(i)}>
                <Link
                  to={`/boutique?categorie=${cat.slug}`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-lg"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-shell">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt=""
                        width="400"
                        height="533"
                        loading={i < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                      />
                    ) : null}
                    {/* A solid band rather than a gradient. Over a gradient
                        the label's contrast depends on whatever photo the shop
                        uploads, which is not something that can be verified;
                        over plum it is 12.4:1 whatever the picture. */}
                    <span className="absolute inset-x-0 bottom-0 bg-plum/95 p-3">
                      <span className="font-display text-lg text-porcelain">{cat.nom[locale] || cat.nom.fr}</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── New in ───────────────────────────────────────────────────────── */}
      <section className="bg-shell">
        <Container className="py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <SectionTitle eyebrow={t.home.heroEyebrow} titre={t.home.nouveautes} sub={t.home.nouveautesSub} />
            </Reveal>
            <Link
              to="/boutique?tri=nouveau"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-rose-deep underline-offset-4 hover:underline"
            >
              {t.common.voirTout}
              <ArrowRight size={16} aria-hidden="true" className="rtl:-scale-x-100" />
            </Link>
          </div>

          <div className="mt-10">
            {chargement ? (
              <GridSkeleton n={8} />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                {nouveautes.map((p, i) => (
                  <Reveal key={p._id} delay={stagger(i)}>
                    <ProductCard produit={p} index={i} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* The rose as a section divider — one of its four sanctioned uses. */}
      <div className="flex items-center justify-center gap-4 py-12">
        <Hairline />
        <WardaRose size={28} className="text-rose" aria-hidden="true" />
        <Hairline />
      </div>

      {/* ── Selection ────────────────────────────────────────────────────── */}
      <section>
        <Container className="pb-16 sm:pb-20">
          <Reveal>
            <SectionTitle titre={t.home.selection} sub={t.home.selectionSub} align="center" className="mx-auto" />
          </Reveal>

          <div className="mt-10">
            {chargement ? (
              <GridSkeleton n={4} />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                {selection.map((p, i) => (
                  <Reveal key={p._id} delay={stagger(i)}>
                    <ProductCard produit={p} index={i} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ── How ordering works ───────────────────────────────────────────── */}
      <section className="bg-plum text-blush">
        <Container className="py-16 sm:py-20">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl">{t.home.livraisonTitre}</h2>
            <p className="mt-3 max-w-lg text-blush/85">{t.home.livraisonSub}</p>
          </Reveal>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[t.about.livraisonTexte, t.about.paiementTexte, t.about.echangeTexte].map((texte, i) => (
              <Reveal key={i} delay={stagger(i, 0.08)} as="li" className="min-w-0">
                <span className="font-display text-3xl text-rose">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-sm text-blush/85">{texte}</p>
              </Reveal>
            ))}
          </ol>

          <Button to="/boutique" variant="onPlum" size="lg" className="mt-10">
            {t.home.voirCollection}
          </Button>
        </Container>
      </section>
    </>
  );
}
