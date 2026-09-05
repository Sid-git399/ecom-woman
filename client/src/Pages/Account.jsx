import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { LogOut, Trash2, Plus } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { formatPrice, formatDate, formatPhone } from '../lib/format';
import { Container, Button, Field, Hairline } from '../Components/UI/Primitives';
import { Loading, Empty } from '../Components/UI/States';
import { StatutBadge } from '../Components/UI/StatutBadge';
import { ProductCard } from '../Components/Shop/ProductCard';

/** The customer's account: profile, orders, wishlist, addresses. */
export default function Account() {
  const t = useT();
  const { user, pret, estConnectee, estAdmin, deconnexion } = useAuth();

  // `pret` is why this is not just `if (!user)`. Before the session has been
  // checked, redirecting would bounce a logged-in customer to the login page
  // on every reload.
  if (!pret) return <Loading />;
  if (!estConnectee) return <Navigate to="/connexion" state={{ from: '/compte' }} replace />;

  const onglets = [
    { to: '', label: t.account.profil, end: true },
    { to: 'commandes', label: t.account.commandes },
    { to: 'favoris', label: t.account.favoris },
    { to: 'adresses', label: t.account.adresses },
  ];

  return (
    <Container className="py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.account.titre}</h1>
          <p className="mt-2 text-ink-soft">{user.nom}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {estAdmin ? (
            <Button to="/admin" variant="secondary" size="sm">
              {t.nav.admin}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={deconnexion}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft hover:text-rose-deep"
          >
            <LogOut size={16} aria-hidden="true" />
            {t.account.deconnexion}
          </button>
        </div>
      </header>

      <Hairline className="mt-5" />

      <nav className="mt-8 flex flex-wrap gap-2" aria-label={t.account.titre}>
        {onglets.map((o) => (
          <NavLink
            key={o.to}
            to={o.to}
            end={o.end}
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center rounded-pill border px-4 text-sm transition-colors ${
                isActive ? 'border-plum bg-plum text-blush' : 'border-taupe text-ink hover:border-plum'
              }`
            }
          >
            {o.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <Routes>
          <Route index element={<Profil />} />
          <Route path="commandes" element={<Commandes />} />
          <Route path="favoris" element={<Favoris />} />
          <Route path="adresses" element={<Adresses />} />
        </Routes>
      </div>
    </Container>
  );
}

function Profil() {
  const t = useT();
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({ nom: user.nom, email: user.email || '' });
  const [motsDePasse, setMotsDePasse] = useState({ ancien: '', nouveau: '' });
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    try {
      const data = await api.majProfil(form);
      setUser(data.user);
      setMessage(t.account.profilEnregistre);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    }
  }

  async function changerMotDePasse(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    if (motsDePasse.nouveau.length < 8) {
      setErreur(t.erreurs.motDePasseCourt);
      return;
    }
    try {
      await api.motDePasse(motsDePasse);
      setMotsDePasse({ ancien: '', nouveau: '' });
      setMessage(t.account.motDePasseModifie);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    }
  }

  return (
    <div className="grid max-w-3xl gap-10 sm:grid-cols-2">
      {message ? (
        <p className="rounded-md border border-taupe bg-shell p-3 text-sm text-ink sm:col-span-2" role="status">
          {message}
        </p>
      ) : null}
      {erreur ? (
        <p className="rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep sm:col-span-2" role="alert">
          {erreur}
        </p>
      ) : null}

      <form onSubmit={enregistrer} className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink">{t.account.vosInformations}</h2>
        <Field label={t.checkout.nom} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        <Field
          label={t.checkout.email}
          type="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <div>
          <p className="text-sm text-ink-soft">{t.checkout.telephone}</p>
          <p className="text-ink" dir="ltr">
            {formatPhone(user.telephone)}
          </p>
          <p className="text-xs text-ink-soft">{t.account.identifiantConnexion}</p>
        </div>
        <Button type="submit" className="self-start">
          {t.common.enregistrer}
        </Button>
      </form>

      <form onSubmit={changerMotDePasse} className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink">{t.account.modifierMotDePasse}</h2>
        <Field
          label={t.account.motDePasseActuel}
          type="password"
          autoComplete="current-password"
          value={motsDePasse.ancien}
          onChange={(e) => setMotsDePasse({ ...motsDePasse, ancien: e.target.value })}
        />
        <Field
          label={t.account.nouveauMotDePasse}
          type="password"
          autoComplete="new-password"
          aide={t.account.motDePasseAide}
          value={motsDePasse.nouveau}
          onChange={(e) => setMotsDePasse({ ...motsDePasse, nouveau: e.target.value })}
        />
        <Button type="submit" variant="secondary" className="self-start">
          {t.common.enregistrer}
        </Button>
      </form>
    </div>
  );
}

function Commandes() {
  const t = useT();
  const { locale } = useI18n();
  const [commandes, setCommandes] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .mesCommandes(controller.signal)
      .then((d) => setCommandes(d.commandes))
      .catch(() => setCommandes([]));
    return () => controller.abort();
  }, []);

  if (!commandes) return <Loading className="min-h-60" />;
  if (!commandes.length) {
    return <Empty titre={t.account.aucuneCommande} sub={t.account.aucuneCommandeSub} action={t.cart.videAction} to="/boutique" />;
  }

  return (
    <ul className="flex max-w-3xl flex-col gap-4">
      {commandes.map((c) => (
        <li key={c._id} className="rounded-lg border border-taupe p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-display text-xl text-ink" dir="ltr">
              {c.numero}
            </span>
            <StatutBadge statut={c.statut} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">{formatDate(c.createdAt, locale)}</p>

          <ul className="mt-3 flex flex-col gap-1 text-sm text-ink-soft">
            {c.items.map((i, index) => (
              <li key={`${i.ref}-${i.taille}-${index}`}>
                {i.nom} — {i.couleur} · {i.taille} · ×{i.quantite}
              </li>
            ))}
          </ul>

          <p className="mt-3 flex justify-between border-t border-taupe pt-3">
            <span className="text-sm text-ink-soft">{t.cart.total}</span>
            <span className="text-ink">{formatPrice(c.total, locale)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function Favoris() {
  const t = useT();
  const [produits, setProduits] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .favoris(controller.signal)
      .then((d) => setProduits(d.produits))
      .catch(() => setProduits([]));
    return () => controller.abort();
  }, []);

  if (!produits) return <Loading className="min-h-60" />;
  if (!produits.length) {
    return <Empty titre={t.account.aucunFavori} sub={t.account.aucunFavoriSub} action={t.cart.videAction} to="/boutique" />;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
      {produits.map((p, i) => (
        <ProductCard key={p._id} produit={p} index={i} />
      ))}
    </div>
  );
}

function Adresses() {
  const t = useT();
  const { locale } = useI18n();
  const { user, setUser } = useAuth();

  const [wilayas, setWilayas] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState({ libelle: '', wilayaId: '', commune: '', adresse: '', isDefault: false });
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .wilayas(controller.signal)
      .then((d) => setWilayas(d.wilayas))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const nomWilaya = (id) => {
    const w = wilayas.find((x) => String(x._id) === String(id));
    return w ? (locale === 'ar' ? w.nomAr : w.nom) : '';
  };

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await api.ajouterAdresse(form);
      setUser(data.user);
      setForm({ libelle: '', wilayaId: '', commune: '', adresse: '', isDefault: false });
      setOuvert(false);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    }
  }

  async function supprimer(id) {
    const data = await api.supprimerAdresse(id);
    setUser(data.user);
  }

  return (
    <div className="max-w-3xl">
      {erreur ? (
        <p className="mb-4 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
          {erreur}
        </p>
      ) : null}

      {user.adresses?.length ? (
        <ul className="flex flex-col gap-3">
          {user.adresses.map((a) => (
            <li key={a._id} className="flex items-start gap-4 rounded-lg border border-taupe p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-ink">
                  {a.libelle}
                  {a.isDefault ? (
                    <span className="rounded-pill bg-shell px-2 py-0.5 text-xs text-ink-soft">{t.account.parDefaut}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {a.adresse ? `${a.adresse}, ` : ''}
                  {a.commune}, {nomWilaya(a.wilayaId)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => supprimer(a._id)}
                aria-label={`${t.common.supprimer} — ${a.libelle}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft">{t.account.aucuneAdresse}</p>
      )}

      {ouvert ? (
        <form onSubmit={ajouter} className="mt-6 grid gap-4 rounded-lg border border-taupe p-4 sm:grid-cols-2">
          <Field
            label={t.account.libelle}
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            placeholder={t.account.libellePlaceholder}
          />
          <Field
            as="select"
            label={t.checkout.wilaya}
            required
            value={form.wilayaId}
            onChange={(e) => setForm({ ...form, wilayaId: e.target.value })}
          >
            <option value="">{t.checkout.choisirWilaya}</option>
            {wilayas.map((w) => (
              <option key={w._id} value={w._id}>
                {String(w.code).padStart(2, '0')} — {locale === 'ar' ? w.nomAr : w.nom}
              </option>
            ))}
          </Field>
          <Field
            label={t.checkout.commune}
            required
            value={form.commune}
            onChange={(e) => setForm({ ...form, commune: e.target.value })}
          />
          <Field
            label={t.checkout.adresse}
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
          />
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 accent-plum"
            />
            {t.account.parDefaut}
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit">{t.common.enregistrer}</Button>
            <Button type="button" variant="ghost" onClick={() => setOuvert(false)}>
              {t.common.annuler}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="mt-6" onClick={() => setOuvert(true)}>
          <Plus size={16} aria-hidden="true" />
          {t.account.ajouterAdresse}
        </Button>
      )}
    </div>
  );
}

/** The wishlist as its own route, reachable from the mobile menu. */
export function FavorisPage() {
  const t = useT();
  const { pret, estConnectee } = useAuth();

  if (!pret) return <Loading />;
  if (!estConnectee) return <Navigate to="/connexion" state={{ from: '/favoris' }} replace />;

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.account.favoris}</h1>
      <Hairline className="mt-5 mb-8" />
      <Favoris />
      <p className="mt-8 text-sm text-ink-soft">
        <Link to="/compte" className="inline-flex min-h-11 items-center text-rose-deep underline-offset-4 hover:underline">
          {t.account.titre}
        </Link>
      </p>
    </Container>
  );
}
