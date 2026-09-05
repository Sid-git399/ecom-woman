import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Ruler, Truck, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { formatPrice, toInternational } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Container, Button, Hairline, SectionTitle } from '../Components/UI/Primitives';
import { Loading, ErrorState, Empty } from '../Components/UI/States';
import { ProductCard } from '../Components/Shop/ProductCard';
import { SizeGuideModal } from '../Components/Shop/SizeGuide';

const TAILLES_ORDRE = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/**
 * One garment.
 *
 * The whole page turns on one idea: a colour and a size together identify what
 * is actually for sale. Sizes are shown per selected colour, sold-out ones stay
 * visible and struck through rather than disappearing, and nothing can be added
 * to the cart until a real, in-stock combination is chosen.
 */
export default function Product({ settings }) {
  const { slug } = useParams();
  const t = useT();
  const { locale } = useI18n();
  const { ajouter } = useCart();
  const { estConnectee, favoris, basculerFavori } = useAuth();

  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [couleur, setCouleur] = useState(null);
  const [taille, setTaille] = useState(null);
  const [imageActive, setImageActive] = useState(0);
  const [guideOuvert, setGuideOuvert] = useState(false);
  const [erreurTaille, setErreurTaille] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setChargement(true);
    setErreur(null);
    // Reset on navigation between products, or the previous garment's chosen
    // size carries over onto a new one that may not even offer it.
    setCouleur(null);
    setTaille(null);
    setImageActive(0);

    api
      .produit(slug, controller.signal)
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });
    return () => controller.abort();
  }, [slug]);

  const produit = data?.produit;

  const couleurs = useMemo(() => {
    if (!produit) return [];
    const seen = new Map();
    for (const v of produit.variants || []) {
      if (!seen.has(v.couleur)) seen.set(v.couleur, { nom: v.couleur, nomAr: v.couleurAr, hex: v.hex });
    }
    return [...seen.values()];
  }, [produit]);

  // Defaults to the first colour that has anything in stock, so a customer
  // does not land on a fully sold-out colour and conclude the piece is gone.
  useEffect(() => {
    if (!produit || couleur) return;
    const dispo = couleurs.find((c) => produit.variants.some((v) => v.couleur === c.nom && v.stock > 0));
    setCouleur((dispo || couleurs[0])?.nom || null);
  }, [produit, couleur, couleurs]);

  const tailles = useMemo(() => {
    if (!produit || !couleur) return [];
    return TAILLES_ORDRE.map((taille_) => {
      const v = produit.variants.find((x) => x.couleur === couleur && x.taille === taille_);
      return v ? { taille: taille_, stock: v.stock } : null;
    }).filter(Boolean);
  }, [produit, couleur]);

  // The chosen size is dropped when it does not exist in the newly chosen
  // colour. Keeping it would let the cart receive a combination that is not sold.
  useEffect(() => {
    if (taille && !tailles.some((x) => x.taille === taille && x.stock > 0)) setTaille(null);
  }, [taille, tailles]);

  const variantChoisi = produit?.variants?.find((v) => v.couleur === couleur && v.taille === taille);
  const epuise = produit && (produit.variants || []).every((v) => v.stock === 0);
  const enPromo = produit?.ancienPrix > 0 && produit.ancienPrix > produit.prix;
  const estFavori = produit && favoris?.some((id) => String(id) === String(produit._id));

  const images = produit?.images?.length ? produit.images : [];

  function ajouterAuPanier() {
    if (!taille) {
      setErreurTaille(true);
      return;
    }
    setErreurTaille(false);
    ajouter(produit, {
      couleur,
      hex: couleurs.find((c) => c.nom === couleur)?.hex || '#000000',
      taille,
      stock: variantChoisi?.stock ?? 1,
    });
  }

  if (chargement) return <Loading />;
  if (erreur?.status === 404) {
    return (
      <Empty titre={t.product.introuvable} sub={t.product.introuvableSub} action={t.cart.videAction} to="/boutique" />
    );
  }
  if (erreur) return <ErrorState message={erreur.message} />;
  if (!produit) return null;

  const nom = produit.nom[locale] || produit.nom.fr;
  const whatsapp = settings?.whatsapp || settings?.telephone;

  return (
    <Container className="py-8 sm:py-12">
      <nav className="mb-6 text-sm text-ink-soft">
        <Link to="/boutique" className="inline-flex min-h-11 items-center hover:text-rose-deep">
          {t.shop.titre}
        </Link>
        {produit.categoryId?.slug ? (
          <>
            <span className="mx-2">/</span>
            <Link
              to={`/boutique?categorie=${produit.categoryId.slug}`}
              className="inline-flex min-h-11 items-center hover:text-rose-deep"
            >
              {produit.categoryId.nom?.[locale] || produit.categoryId.nom?.fr}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* ── Gallery ─────────────────────────────────────────────────────
            One <img> that re-keys inside a fixed frame. Rendering every photo
            and hiding all but one downloads the whole gallery on a phone plan. */}
        <div className="min-w-0">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-shell">
            {images[imageActive] ? (
              <img
                key={images[imageActive].url}
                src={images[imageActive].url}
                alt={images[imageActive].alt || nom}
                width="800"
                height="1067"
                fetchPriority="high"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
                className="h-full w-full object-cover"
              />
            ) : null}

            {images.length > 1 ? (
              <>
                <GalleryNav
                  cote="start"
                  label={t.common.precedent}
                  onClick={() => setImageActive((i) => (i - 1 + images.length) % images.length)}
                />
                <GalleryNav
                  cote="end"
                  label={t.common.suivant}
                  onClick={() => setImageActive((i) => (i + 1) % images.length)}
                />
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <ul className="relative mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <li key={img.url}>
                  <button
                    type="button"
                    onClick={() => setImageActive(i)}
                    aria-label={`${nom} — ${i + 1}`}
                    aria-current={i === imageActive}
                    className={`block h-20 w-15 shrink-0 overflow-hidden rounded-md border-2 ${
                      i === imageActive ? 'border-plum' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      width="60"
                      height="80"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ── Details ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
            {t.product.ref} {produit.ref}
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{nom}</h1>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <span className={`text-2xl ${enPromo ? 'text-rose-deep' : 'text-ink'}`}>
              {formatPrice(produit.prix, locale)}
            </span>
            {enPromo ? (
              <span className="text-base text-ink-soft line-through">{formatPrice(produit.ancienPrix, locale)}</span>
            ) : null}
          </p>

          {produit.description?.[locale] || produit.description?.fr ? (
            <p className="mt-5 text-ink-soft">{produit.description[locale] || produit.description.fr}</p>
          ) : null}

          <Hairline className="mt-7" />

          {/* Colours */}
          {couleurs.length ? (
            <fieldset className="mt-7">
              <legend className="text-sm text-ink-soft">
                {t.product.couleur}
                <span className="ms-2 text-ink">{locale === 'ar' ? couleurs.find((c) => c.nom === couleur)?.nomAr : couleur}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {couleurs.map((c) => {
                  const dispoCouleur = produit.variants.some((v) => v.couleur === c.nom && v.stock > 0);
                  return (
                    <button
                      key={c.nom}
                      type="button"
                      onClick={() => setCouleur(c.nom)}
                      aria-pressed={couleur === c.nom}
                      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                        couleur === c.nom ? 'border-plum' : 'border-taupe'
                      } ${dispoCouleur ? '' : 'opacity-45'}`}
                    >
                      <span className="h-7 w-7 rounded-full border border-taupe/60" style={{ backgroundColor: c.hex }} />
                      <span className="sr-only">
                        {locale === 'ar' ? c.nomAr : c.nom}
                        {dispoCouleur ? '' : ` — ${t.product.rupture}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {/* Sizes */}
          <fieldset className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <legend className="text-sm text-ink-soft">{t.product.choisirTaille}</legend>
              <button
                type="button"
                onClick={() => setGuideOuvert(true)}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-rose-deep underline-offset-4 hover:underline"
              >
                <Ruler size={15} aria-hidden="true" />
                {t.product.guideTailles}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {tailles.map(({ taille: taille_, stock }) => {
                const dispo = stock > 0;
                return (
                  <button
                    key={taille_}
                    type="button"
                    onClick={() => {
                      if (!dispo) return;
                      setTaille(taille_);
                      setErreurTaille(false);
                    }}
                    disabled={!dispo}
                    aria-pressed={taille === taille_}
                    // Sold-out sizes stay on the page, struck through. Removing
                    // them makes "we never made your size" and "your size has
                    // gone" look identical, and they are not the same news.
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm transition-colors ${
                      taille === taille_
                        ? 'border-plum bg-plum text-blush'
                        : 'border-taupe bg-transparent text-ink hover:border-plum'
                    } ${dispo ? '' : 'cursor-not-allowed text-ink-soft line-through opacity-60 hover:border-taupe'}`}
                  >
                    {taille_}
                    <span className="sr-only">{dispo ? '' : ` — ${t.product.ruptureTaille}`}</span>
                  </button>
                );
              })}
            </div>

            {erreurTaille ? (
              <p className="mt-2 text-sm text-rose-deep" role="alert">
                {t.erreurs.tailleRequise}
              </p>
            ) : null}

            {produit.tailleConseil ? (
              <p className="mt-3 text-sm text-ink-soft">{t.product.tailleConseil[produit.tailleConseil]}</p>
            ) : null}

            {variantChoisi && variantChoisi.stock > 0 && variantChoisi.stock <= 3 ? (
              <p className="mt-2 text-sm text-rose-deep">{t.product.derniersExemplaires(variantChoisi.stock)}</p>
            ) : null}
          </fieldset>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={ajouterAuPanier} disabled={epuise} className="flex-1 min-w-48">
              {epuise ? t.product.rupture : t.product.ajouterPanier}
            </Button>

            {estConnectee ? (
              <button
                type="button"
                onClick={() => basculerFavori(produit._id)}
                aria-pressed={estFavori}
                aria-label={estFavori ? t.product.retirerFavoris : t.product.ajouterFavoris}
                className="inline-flex h-13 w-13 items-center justify-center rounded-full border border-taupe text-ink transition-colors hover:border-plum"
              >
                <Heart size={19} className={estFavori ? 'fill-rose text-rose-deep' : ''} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {whatsapp ? (
            <a
              href={`https://wa.me/${toInternational(whatsapp)}?text=${encodeURIComponent(
                `${nom} (${produit.ref})${taille ? ` — ${taille}` : ''}${couleur ? ` — ${couleur}` : ''}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-rose-deep underline-offset-4 hover:underline"
            >
              <MessageCircle size={16} aria-hidden="true" />
              {t.product.commanderWhatsapp}
            </a>
          ) : null}

          <p className="mt-6 flex items-start gap-2.5 rounded-md bg-shell p-3 text-sm text-ink-soft">
            <Truck size={17} className="mt-0.5 shrink-0 text-rose-deep" aria-hidden="true" />
            {t.product.livraisonNote}
          </p>

          {/* Garment detail */}
          <dl className="mt-8 flex flex-col gap-3 border-t border-taupe pt-6 text-sm">
            {produit.composition?.[locale] || produit.composition?.fr ? (
              <Detail terme={t.product.composition}>{produit.composition[locale] || produit.composition.fr}</Detail>
            ) : null}
            {produit.entretien?.[locale] || produit.entretien?.fr ? (
              <Detail terme={t.product.entretien}>{produit.entretien[locale] || produit.entretien.fr}</Detail>
            ) : null}
            {produit.coupe ? <Detail terme={t.product.coupe}>{t.product.coupes[produit.coupe]}</Detail> : null}
            {produit.mannequinTaille && produit.mannequinHauteur ? (
              <Detail terme={t.product.mensurations}>
                {t.product.mannequinPorte(produit.mannequinTaille, produit.mannequinHauteur)}
              </Detail>
            ) : null}
          </dl>
        </div>
      </div>

      {data.similaires?.length ? (
        <section className="mt-20">
          <SectionTitle titre={t.product.memeCollection} />
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {data.similaires.map((p, i) => (
              <ProductCard key={p._id} produit={p} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <SizeGuideModal
        ouvert={guideOuvert}
        onClose={() => setGuideOuvert(false)}
        type={produit.categoryId?.guideTailles || 'HAUT'}
        tailleMannequin={produit.mannequinTaille}
      />
    </Container>
  );
}

function Detail({ terme, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-ink-soft sm:w-40">{terme}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

function GalleryNav({ cote, label, onClick }) {
  const Icon = cote === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 ${
        cote === 'start' ? 'start-2' : 'end-2'
      } inline-flex h-11 w-11 items-center justify-center rounded-full bg-porcelain/85 text-ink shadow-soft`}
    >
      {/* The chevrons point outward in whichever direction the page runs. */}
      <Icon size={19} aria-hidden="true" className="rtl:-scale-x-100" />
    </button>
  );
}
