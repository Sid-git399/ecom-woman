import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Field } from '../../Components/UI/Primitives';
import { Loading, ErrorState } from '../../Components/UI/States';

/** Everything the shop can change without calling anyone. */
export default function Parametres() {
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .admin.parametres(controller.signal)
      .then((d) => setForm(normaliser(d.settings)))
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
    return () => controller.abort();
  }, []);

  const set = (chemin) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      if (!chemin.includes('.')) return { ...f, [chemin]: v };
      const [a, b] = chemin.split('.');
      return { ...f, [a]: { ...f[a], [b]: v } };
    });
  };

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      await api.admin.majParametres(form);
      setMessage('Paramètres enregistrés.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setEnvoi(false);
    }
  }

  if (!form) return erreur ? <ErrorState message={erreur} className="min-h-60" /> : <Loading className="min-h-60" />;

  return (
    <form onSubmit={enregistrer} className="max-w-3xl">
      {message ? (
        <p className="mb-4 rounded-md border border-taupe bg-shell p-3 text-sm text-ink" role="status">
          {message}
        </p>
      ) : null}
      {erreur ? (
        <p className="mb-4 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
          {erreur}
        </p>
      ) : null}

      <section>
        <h2 className="font-display text-2xl text-ink">Contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone" dir="ltr" value={form.telephone} onChange={set('telephone')} placeholder="0555 12 34 56" />
          <Field label="Second téléphone" dir="ltr" value={form.telephone2} onChange={set('telephone2')} />
          <Field label="WhatsApp" dir="ltr" value={form.whatsapp} onChange={set('whatsapp')} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">Adresse et horaires</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Adresse (français)" value={form.adresse.fr} onChange={set('adresse.fr')} />
          <Field label="Adresse (arabe)" dir="rtl" lang="ar" value={form.adresse.ar} onChange={set('adresse.ar')} />
          <Field label="Horaires (français)" value={form.horaires.fr} onChange={set('horaires.fr')} />
          <Field label="Horaires (arabe)" dir="rtl" lang="ar" value={form.horaires.ar} onChange={set('horaires.ar')} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">Page d’accueil</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Laissez vide pour garder le texte par défaut du site.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Titre (français)" value={form.heroTitle.fr} onChange={set('heroTitle.fr')} />
          <Field label="Titre (arabe)" dir="rtl" lang="ar" value={form.heroTitle.ar} onChange={set('heroTitle.ar')} />
          <Field as="textarea" label="Sous-titre (français)" value={form.heroSubtitle.fr} onChange={set('heroSubtitle.fr')} />
          <Field
            as="textarea"
            label="Sous-titre (arabe)"
            dir="rtl"
            lang="ar"
            value={form.heroSubtitle.ar}
            onChange={set('heroSubtitle.ar')}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">Réseaux</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" dir="ltr" value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" />
          <Field label="Facebook" dir="ltr" value={form.facebook} onChange={set('facebook')} />
          <Field label="TikTok" dir="ltr" value={form.tiktok} onChange={set('tiktok')} />
        </div>
      </section>

      <Button type="submit" size="lg" className="mt-10" disabled={envoi}>
        <Save size={16} aria-hidden="true" />
        {envoi ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}

/**
 * Every field becomes a controlled input, so an absent value has to be '' and
 * not undefined — React logs a warning and the input silently switches from
 * uncontrolled to controlled the first time it is typed into.
 */
function normaliser(s = {}) {
  const paire = (v) => ({ fr: v?.fr || '', ar: v?.ar || '' });
  return {
    telephone: s.telephone || '',
    telephone2: s.telephone2 || '',
    whatsapp: s.whatsapp || '',
    adresse: paire(s.adresse),
    horaires: paire(s.horaires),
    heroTitle: paire(s.heroTitle),
    heroSubtitle: paire(s.heroSubtitle),
    instagram: s.instagram || '',
    facebook: s.facebook || '',
    tiktok: s.tiktok || '',
  };
}
