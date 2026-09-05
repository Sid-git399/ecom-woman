import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Upload, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Field } from '../../Components/UI/Primitives';
import { Loading, ErrorState } from '../../Components/UI/States';

const GUIDES = ['HAUT', 'BAS', 'ROBE'];

/** Departments. `guideTailles` decides which measurement table a product shows. */
export default function Categories() {
  const [categories, setCategories] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [nouvelle, setNouvelle] = useState(null);
  const [televersement, setTeleversement] = useState(null);

  async function televerser(e, cible) {
    const [file] = e.target.files;
    e.target.value = '';
    if (!file) return;
    setTeleversement(cible);
    setErreur(null);
    try {
      const [url] = await api.admin.televerser([file]);
      if (cible === 'nouvelle') {
        setNouvelle((n) => ({ ...n, image: url }));
      } else {
        setCategories((l) => l.map((c, j) => (j === cible ? { ...c, image: url } : c)));
      }
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Envoi impossible');
    } finally {
      setTeleversement(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    api
      .categories(controller.signal)
      .then((d) => setCategories(d.categories))
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
    return () => controller.abort();
  }, []);

  async function enregistrer(cat) {
    setErreur(null);
    setMessage(null);
    try {
      await api.admin.majCategorie(cat._id, {
        nom: cat.nom,
        description: cat.description,
        image: cat.image || '',
        guideTailles: cat.guideTailles,
        ordre: Number(cat.ordre) || 0,
        isActive: cat.isActive,
      });
      setMessage(`« ${cat.nom.fr} » enregistrée.`);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    }
  }

  async function supprimer(cat) {
    setErreur(null);
    if (!window.confirm(`Supprimer la catégorie « ${cat.nom.fr} » ?`)) return;
    try {
      await api.admin.supprimerCategorie(cat._id);
      setCategories((list) => list.filter((c) => c._id !== cat._id));
    } catch (err) {
      // The server refuses while articles still point at it, and says how
      // many. That message is more useful than anything invented here.
      setErreur(err instanceof ApiError ? err.message : 'Suppression impossible');
    }
  }

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    try {
      const { categorie } = await api.admin.creerCategorie(nouvelle);
      setCategories((list) => [...list, { ...categorie, nbArticles: 0 }]);
      setNouvelle(null);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Création impossible');
    }
  }

  if (!categories) return erreur ? <ErrorState message={erreur} className="min-h-60" /> : <Loading className="min-h-60" />;

  return (
    <div className="max-w-3xl">
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

      <ul className="flex flex-col gap-4">
        {categories.map((cat, i) => (
          <li key={cat._id} className="rounded-lg border border-taupe p-4">
            <div className="mb-4 flex items-center gap-3">
              {cat.image ? (
                <div className="relative">
                  <img src={cat.image} alt="" width="72" height="72" className="h-18 w-18 rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => setCategories((l) => l.map((c, j) => (j === i ? { ...c, image: '' } : c)))}
                    aria-label={`Retirer l'image de ${cat.nom.fr}`}
                    className="absolute -top-2 -end-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-plum text-blush"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex h-18 w-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-taupe text-xs text-ink-soft hover:border-plum">
                  <Upload size={16} aria-hidden="true" />
                  {televersement === i ? '…' : 'Ajouter'}
                  <input type="file" accept="image/*" onChange={(e) => televerser(e, i)} className="sr-only" />
                </label>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nom (français)"
                value={cat.nom.fr}
                onChange={(e) =>
                  setCategories((l) => l.map((c, j) => (j === i ? { ...c, nom: { ...c.nom, fr: e.target.value } } : c)))
                }
              />
              <Field
                label="Nom (arabe)"
                dir="rtl"
                lang="ar"
                value={cat.nom.ar || ''}
                onChange={(e) =>
                  setCategories((l) => l.map((c, j) => (j === i ? { ...c, nom: { ...c.nom, ar: e.target.value } } : c)))
                }
              />
              <Field
                as="select"
                label="Guide des tailles"
                value={cat.guideTailles}
                onChange={(e) => setCategories((l) => l.map((c, j) => (j === i ? { ...c, guideTailles: e.target.value } : c)))}
              >
                {GUIDES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Field>
              <Field
                label="Ordre"
                type="number"
                value={cat.ordre}
                onChange={(e) => setCategories((l) => l.map((c, j) => (j === i ? { ...c, ordre: e.target.value } : c)))}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={cat.isActive}
                  onChange={(e) => setCategories((l) => l.map((c, j) => (j === i ? { ...c, isActive: e.target.checked } : c)))}
                  className="h-4 w-4 accent-plum"
                />
                Visible
              </label>
              <span className="text-sm text-ink-soft">{cat.nbArticles} article(s)</span>

              <Button size="sm" className="ms-auto" onClick={() => enregistrer(cat)}>
                <Save size={15} aria-hidden="true" />
                Enregistrer
              </Button>
              <button
                type="button"
                onClick={() => supprimer(cat)}
                aria-label={`Supprimer ${cat.nom.fr}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {nouvelle ? (
        <form onSubmit={creer} className="mt-6 grid gap-3 rounded-lg border border-taupe p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {nouvelle.image ? (
              <div className="relative w-fit">
                <img src={nouvelle.image} alt="" width="72" height="72" className="h-18 w-18 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setNouvelle((n) => ({ ...n, image: '' }))}
                  aria-label="Retirer l'image"
                  className="absolute -top-2 -end-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-plum text-blush"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="inline-flex h-18 w-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-taupe text-xs text-ink-soft hover:border-plum">
                <Upload size={16} aria-hidden="true" />
                {televersement === 'nouvelle' ? '…' : 'Ajouter'}
                <input type="file" accept="image/*" onChange={(e) => televerser(e, 'nouvelle')} className="sr-only" />
              </label>
            )}
          </div>
          <Field
            label="Nom (français)"
            required
            value={nouvelle.nom.fr}
            onChange={(e) => setNouvelle({ ...nouvelle, nom: { ...nouvelle.nom, fr: e.target.value } })}
          />
          <Field
            label="Nom (arabe)"
            dir="rtl"
            lang="ar"
            value={nouvelle.nom.ar}
            onChange={(e) => setNouvelle({ ...nouvelle, nom: { ...nouvelle.nom, ar: e.target.value } })}
          />
          <Field
            as="select"
            label="Guide des tailles"
            value={nouvelle.guideTailles}
            onChange={(e) => setNouvelle({ ...nouvelle, guideTailles: e.target.value })}
          >
            {GUIDES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Field>
          <Field
            label="Ordre"
            type="number"
            value={nouvelle.ordre}
            onChange={(e) => setNouvelle({ ...nouvelle, ordre: e.target.value })}
          />
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit">Créer</Button>
            <Button type="button" variant="ghost" onClick={() => setNouvelle(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() =>
            setNouvelle({ nom: { fr: '', ar: '' }, description: { fr: '', ar: '' }, image: '', guideTailles: 'HAUT', ordre: categories.length + 1 })
          }
        >
          <Plus size={16} aria-hidden="true" />
          Nouvelle catégorie
        </Button>
      )}
    </div>
  );
}
