import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useT } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { Container, Button, Field, Hairline } from '../Components/UI/Primitives';

/**
 * Sign in and sign up.
 *
 * Both make the same point in the same place: an account is optional. This
 * audience buys without one and asking her to create one before she can order
 * is the single easiest way to lose the sale.
 */

export function Connexion() {
  const t = useT();
  const { connexion, estConnectee } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  if (estConnectee) return <Navigate to={state?.from || '/compte'} replace />;

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await connexion(identifiant, motDePasse);
      navigate(state?.from || '/compte', { replace: true });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AuthShell titre={t.account.connexion} sub={t.account.connexionSub}>
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
        {erreur ? (
          <p className="rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
            {erreur}
          </p>
        ) : null}

        <Field
          label={t.account.identifiant}
          required
          dir="ltr"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          autoComplete="username"
          placeholder="0555 12 34 56"
        />
        <Field
          label={t.account.motDePasse}
          required
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
        />

        <Button type="submit" size="lg" disabled={envoi} className="mt-2 w-full">
          {t.account.connexion}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {t.account.pasDeCompte}{' '}
        <Link to="/inscription" className="text-rose-deep underline-offset-4 hover:underline">
          {t.account.inscription}
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink-soft">{t.account.pasBesoinCompte}</p>
    </AuthShell>
  );
}

export function Inscription() {
  const t = useT();
  const { inscription, estConnectee } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nom: '', telephone: '', email: '', motDePasse: '' });
  const [errors, setErrors] = useState({});
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  if (estConnectee) return <Navigate to="/compte" replace />;

  const set = (cle) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [cle]: v }));
    setErrors((prev) => (prev[cle] ? { ...prev, [cle]: undefined } : prev));
  };

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);

    const next = {};
    if (!form.nom.trim()) next.nom = t.erreurs.nomRequis;
    if (!/^0(5|6|7)\d{8}$/.test(form.telephone.replace(/\D/g, ''))) next.telephone = t.erreurs.telephoneInvalide;
    // Matches the server's minimum exactly. A client rule that is looser lets
    // the form accept a password the server then rejects.
    if (form.motDePasse.length < 8) next.motDePasse = t.erreurs.motDePasseCourt;
    setErrors(next);
    if (Object.keys(next).length) return;

    setEnvoi(true);
    try {
      await inscription(form);
      navigate('/compte', { replace: true });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AuthShell titre={t.account.inscription} sub={t.account.inscriptionSub}>
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
        {erreur ? (
          <p className="rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
            {erreur}
          </p>
        ) : null}

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
          autoComplete="tel"
          placeholder="0555 12 34 56"
        />
        <Field
          label={`${t.checkout.email} (${t.common.facultatif})`}
          type="email"
          dir="ltr"
          value={form.email}
          onChange={set('email')}
          autoComplete="email"
        />
        <Field
          label={t.account.motDePasse}
          required
          type="password"
          value={form.motDePasse}
          onChange={set('motDePasse')}
          error={errors.motDePasse}
          aide={t.account.motDePasseAide}
          autoComplete="new-password"
        />

        <Button type="submit" size="lg" disabled={envoi} className="mt-2 w-full">
          {t.account.inscription}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {t.account.dejaCompte}{' '}
        <Link to="/connexion" className="text-rose-deep underline-offset-4 hover:underline">
          {t.account.connexion}
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ titre, sub, children }) {
  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-4xl text-ink">{titre}</h1>
        <p className="mt-3 text-ink-soft">{sub}</p>
        <Hairline className="mt-5 mb-8" />
        {children}
      </div>
    </Container>
  );
}
