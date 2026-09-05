import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Store, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Container, Button, Field, Hairline } from '../Components/UI/Primitives';
import { Empty } from '../Components/UI/States';

/**
 * Checkout. Cash on delivery, one page, no account required.
 *
 * The delivery fee is shown the moment a wilaya is picked, before anything is
 * confirmed. A total that changes after the customer commits is the fastest
 * way to lose her, and with cash on delivery there is no payment step to
 * discover it at.
 */

const estTelephoneValide = (v) => /^0(5|6|7)\d{8}$/.test(String(v || '').replace(/\D/g, ''));

export default function Checkout() {
  const t = useT();
  const { locale } = useI18n();
  const { items, sousTotal, vider } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wilayas, setWilayas] = useState([]);
  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    email: '',
    wilayaId: '',
    commune: '',
    adresse: '',
    mode: 'DOMICILE',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .wilayas(controller.signal)
      .then((d) => setWilayas(d.wilayas))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Prefill from the account, including the default address. Retyping an
  // address the shop already has is the main reason people abandon a form.
  useEffect(() => {
    if (!user) return;
    const defaut = user.adresses?.find((a) => a.isDefault) || user.adresses?.[0];
    setForm((f) => ({
      ...f,
      nom: f.nom || user.nom || '',
      telephone: f.telephone || user.telephone || '',
      email: f.email || user.email || '',
      wilayaId: f.wilayaId || defaut?.wilayaId || '',
      commune: f.commune || defaut?.commune || '',
      adresse: f.adresse || defaut?.adresse || '',
    }));
  }, [user]);

  const wilaya = useMemo(() => wilayas.find((w) => String(w._id) === String(form.wilayaId)), [wilayas, form.wilayaId]);
  const livrable = !wilaya || wilaya.isActive;
  const frais = wilaya ? (form.mode === 'STOP_DESK' ? wilaya.fraisStopDesk : wilaya.fraisDomicile) : null;
  const total = sousTotal + (frais || 0);

  const set = (cle) => (e) => {
    const valeur = e.target.value;
    setForm((f) => ({ ...f, [cle]: valeur }));
    setErrors((prev) => (prev[cle] ? { ...prev, [cle]: undefined } : prev));
  };

  function valider() {
    const next = {};
    if (!form.nom.trim()) next.nom = t.erreurs.nomRequis;
    if (!estTelephoneValide(form.telephone)) next.telephone = t.erreurs.telephoneInvalide;
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = t.erreurs.emailInvalide;
    if (!form.wilayaId) next.wilayaId = t.erreurs.wilayaRequise;
    if (!form.commune.trim()) next.commune = t.erreurs.communeRequise;
    // Only home delivery needs a street address; a pickup point does not.
    if (form.mode === 'DOMICILE' && !form.adresse.trim()) next.adresse = t.erreurs.adresseRequise;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Focus lands on the first bad field after React has re-rendered with the
  // new errors — querying for [aria-invalid] in the submit handler runs before
  // the attribute exists and silently finds nothing.
  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const premier = formRef.current?.querySelector('[aria-invalid="true"]');
    premier?.focus();
    premier?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [errors]);

  async function soumettre(e) {
    e.preventDefault();
    setErreurServeur(null);
    if (!valider() || !livrable) return;

    setEnvoi(true);
    try {
      const { commande } = await api.creerCommande({
        client: { nom: form.nom, telephone: form.telephone, email: form.email },
        livraison: {
          wilayaId: form.wilayaId,
          commune: form.commune,
          adresse: form.adresse,
          mode: form.mode,
        },
        items: items.map((i) => ({
          productId: i.productId,
          couleur: i.couleur,
          taille: i.taille,
          quantite: i.quantite,
        })),
        noteClient: form.note,
        locale,
      });

      // Navigate first, then clear. The cart is only ever cleared once the
      // order exists — clearing it before a failed request would lose
      // everything she chose — but clearing it *before* navigating re-renders
      // this page with an empty cart, so she sees "votre panier est vide"
      // flash between confirming and being thanked.
      navigate('/commande/confirmee', { state: { commande }, replace: true });
      vider();
    } catch (err) {
      setErreurServeur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnvoi(false);
    }
  }

  if (items.length === 0) {
    return <Empty titre={t.cart.vide} sub={t.checkout.panierVide} action={t.cart.videAction} to="/boutique" />;
  }

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.checkout.titre}</h1>
        <p className="mt-3 text-ink-soft">{t.checkout.sousTitre}</p>
        <Hairline className="mt-5" />
      </header>

      {erreurServeur ? (
        <p className="mt-6 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
          {erreurServeur}
        </p>
      ) : null}

      {!user ? (
        <p className="mt-6 text-sm text-ink-soft">
          {t.checkout.sansCompte}{' '}
          <Link to="/connexion" className="text-rose-deep underline-offset-4 hover:underline">
            {t.checkout.dejaCompte}
          </Link>
        </p>
      ) : null}

      <form ref={formRef} onSubmit={soumettre} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <h2 className="font-display text-2xl text-ink">{t.checkout.vosCoordonnees}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t.checkout.nom} required value={form.nom} onChange={set('nom')} error={errors.nom} autoComplete="name" />
              <Field
                label={t.checkout.telephone}
                required
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={form.telephone}
                onChange={set('telephone')}
                error={errors.telephone}
                aide={t.checkout.telephoneAide}
                autoComplete="tel"
                placeholder="0555 12 34 56"
              />
              <Field
                label={`${t.checkout.email} (${t.common.facultatif})`}
                type="email"
                dir="ltr"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                autoComplete="email"
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">{t.checkout.livraison}</h2>

            <fieldset className="mt-4">
              <legend className="text-sm text-ink-soft">{t.checkout.modeLivraison}</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <ModeCard
                  actif={form.mode === 'DOMICILE'}
                  onClick={() => setForm((f) => ({ ...f, mode: 'DOMICILE' }))}
                  icon={Truck}
                  titre={t.checkout.domicile}
                  sub={t.checkout.domicileSub}
                  prix={wilaya ? formatPrice(wilaya.fraisDomicile, locale) : null}
                />
                <ModeCard
                  actif={form.mode === 'STOP_DESK'}
                  onClick={() => setForm((f) => ({ ...f, mode: 'STOP_DESK' }))}
                  icon={Store}
                  titre={t.checkout.stopDesk}
                  sub={t.checkout.stopDeskSub}
                  prix={wilaya ? formatPrice(wilaya.fraisStopDesk, locale) : null}
                />
              </div>
            </fieldset>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                as="select"
                label={t.checkout.wilaya}
                required
                value={form.wilayaId}
                onChange={set('wilayaId')}
                error={errors.wilayaId}
              >
                <option value="">{t.checkout.choisirWilaya}</option>
                {wilayas.map((w) => (
                  // Undeliverable wilayas stay selectable. Disabling them means
                  // a customer there can neither pick her own wilaya nor find
                  // out why, and simply concludes the site is broken.
                  <option key={w._id} value={w._id}>
                    {String(w.code).padStart(2, '0')} — {locale === 'ar' ? w.nomAr : w.nom}
                  </option>
                ))}
              </Field>

              <Field
                label={t.checkout.commune}
                required
                value={form.commune}
                onChange={set('commune')}
                error={errors.commune}
                autoComplete="address-level2"
              />

              <Field
                label={form.mode === 'DOMICILE' ? t.checkout.adresse : `${t.checkout.adresse} (${t.common.facultatif})`}
                required={form.mode === 'DOMICILE'}
                value={form.adresse}
                onChange={set('adresse')}
                error={errors.adresse}
                aide={t.checkout.adresseAide}
                placeholder={t.checkout.adressePlaceholder}
                autoComplete="street-address"
                className="sm:col-span-2"
              />

              <Field
                as="textarea"
                label={`${t.checkout.note} (${t.common.facultatif})`}
                value={form.note}
                onChange={set('note')}
                placeholder={t.checkout.notePlaceholder}
                className="sm:col-span-2"
              />
            </div>

            {!livrable ? (
              <p className="mt-4 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
                {t.checkout.nonLivree(locale === 'ar' ? wilaya.nomAr : wilaya.nom)}{' '}
                <Link to="/contact" className="underline underline-offset-4">
                  {t.footer.nousJoindre}
                </Link>
              </p>
            ) : null}
          </section>
        </div>

        {/* ── Summary ────────────────────────────────────────────────────── */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-taupe bg-shell p-5">
            <h2 className="font-display text-2xl text-ink">{t.checkout.recapitulatif}</h2>

            <ul className="mt-4 flex flex-col gap-3">
              {items.map((i) => (
                <li key={`${i.productId}|${i.couleur}|${i.taille}`} className="flex min-w-0 items-start gap-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink">{i.nom?.[locale] || i.nom?.fr}</span>
                    <span className="text-xs text-ink-soft">
                      {i.couleur} · {i.taille} · ×{i.quantite}
                    </span>
                  </span>
                  <span className="shrink-0 text-ink">{formatPrice(i.prix * i.quantite, locale)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 flex flex-col gap-2 border-t border-taupe pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.cart.sousTotal}</dt>
                <dd className="text-ink">{formatPrice(sousTotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.cart.livraison}</dt>
                <dd className="text-ink">
                  {frais === null ? t.cart.livraisonSelonWilaya : formatPrice(frais, locale)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-taupe pt-3">
                <dt className="text-ink">{t.cart.total}</dt>
                <dd className="font-display text-2xl text-ink">{formatPrice(total, locale)}</dd>
              </div>
            </dl>

            <Button type="submit" size="lg" className="mt-5 w-full" disabled={envoi || !livrable}>
              {envoi ? t.checkout.envoi : t.checkout.confirmer}
            </Button>

            <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-rose-deep" aria-hidden="true" />
              {t.checkout.aPayer(formatPrice(total, locale))}
            </p>
          </div>
        </aside>
      </form>
    </Container>
  );
}

function ModeCard({ actif, onClick, icon: Icon, titre, sub, prix }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex min-h-20 min-w-0 flex-col items-start gap-1 rounded-md border p-3 text-start transition-colors ${
        actif ? 'border-plum bg-porcelain' : 'border-taupe bg-transparent hover:border-plum'
      }`}
    >
      <span className="flex items-center gap-2 text-sm text-ink">
        <Icon size={17} className="shrink-0 text-rose-deep" aria-hidden="true" />
        {titre}
      </span>
      <span className="text-xs text-ink-soft">{sub}</span>
      {prix ? <span className="mt-auto text-sm text-ink">{prix}</span> : null}
    </button>
  );
}
