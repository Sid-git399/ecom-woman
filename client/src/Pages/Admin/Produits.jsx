import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useI18n } from '../../i18n';
import { formatPriceShort } from '../../lib/format';
import { Button, Field } from '../../Components/UI/Primitives';
import { Loading, ErrorState } from '../../Components/UI/States';

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COUPES = ['AJUSTEE', 'DROITE', 'AMPLE', 'OVERSIZE'];
const CONSEILS = ['PETIT', 'NORMAL', 'GRAND'];

const vide = () => ({
  ref: '',
  nom: { fr: '', ar: '' },
  description: { fr: '', ar: '' },
  composition: { fr: '', ar: '' },
  entretien: { fr: '', ar: '' },
  categoryId: '',
  prix: '',
  ancienPrix: '',
  coupe: 'DROITE',
  tailleConseil: 'NORMAL',
  mannequinTaille: '',
  mannequinHauteur: '',
  isFeatured: false,
  isNouveau: false,
  images: [],
  couleurs: [{ nom: '', nomAr: '', hex: '#000000' }],
  tailles: ['S', 'M', 'L', 'XL'],
  stocks: {},
});

/** Articles: list, create, edit, and the colour × size grid. */
export default function Produits() {
  const { locale } = useI18n();
  const [produits, setProduits] = useState(null);
  const [categories, setCategories] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);

  const charger = useCallback((signal) => {
    return Promise.all([api.produits({ limit: 48 }, signal), api.categories(signal)])
      .then(([p, c]) => {
        setProduits(p.produits);
        setCategories(c.categories);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    charger(controller.signal);
    return () => controller.abort();
  }, [charger]);

  async function supprimer(produit) {
    // A destructive action on real stock: named, not "are you sure?".
    if (!window.confirm(`Supprimer définitivement « ${produit.nom.fr} » ?`)) return;
    await api.admin.supprimerProduit(produit._id);
    setProduits((list) => list.filter((p) => p._id !== produit._id));
  }

  if (erreur) return <ErrorState message={erreur} className="min-h-60" />;
  if (!produits) return <Loading className="min-h-60" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{produits.length} article(s)</p>
        <Button onClick={() => setEdition(vide())}>
          <Plus size={16} aria-hidden="true" />
          Nouvel article
        </Button>
      </div>

      <div className="relative mt-5 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-taupe">
              <th scope="col" className="py-2 text-start font-normal text-ink-soft">Article</th>
              <th scope="col" className="py-2 text-start font-normal text-ink-soft">Réf</th>
              <th scope="col" className="py-2 text-end font-normal text-ink-soft">Prix</th>
              <th scope="col" className="py-2 text-end font-normal text-ink-soft">Stock</th>
              <th scope="col" className="py-2 text-end font-normal text-ink-soft">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => (
              <tr key={p._id} className="border-b border-taupe/50">
                <td className="py-2 text-ink">{p.nom[locale] || p.nom.fr}</td>
                <td className="py-2 text-ink-soft" dir="ltr">{p.ref}</td>
                <td className="py-2 text-end text-ink">{formatPriceShort(p.prix, locale)}</td>
                <td className={`py-2 text-end ${p.stockTotal === 0 ? 'text-rose-deep' : 'text-ink'}`}>
                  {p.stockTotal}
                </td>
                <td className="py-2 text-end">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEdition(depuisProduit(p))}
                      aria-label={`Modifier ${p.nom.fr}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:text-plum"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => supprimer(p)}
                      aria-label={`Supprimer ${p.nom.fr}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edition ? (
        <Editeur
          valeur={edition}
          categories={categories}
          onClose={() => setEdition(null)}
          onSaved={() => {
            setEdition(null);
            charger();
          }}
        />
      ) : null}
    </div>
  );
}

/** Flattens a saved product back into the editor's colour/size/stock shape. */
function depuisProduit(p) {
  const couleurs = [];
  const stocks = {};
  const tailles = new Set();

  for (const v of p.variants || []) {
    if (!couleurs.some((c) => c.nom === v.couleur)) {
      couleurs.push({ nom: v.couleur, nomAr: v.couleurAr || '', hex: v.hex });
    }
    tailles.add(v.taille);
    stocks[`${v.couleur}|${v.taille}`] = v.stock;
  }

  return {
    _id: p._id,
    ref: p.ref,
    nom: { fr: p.nom?.fr || '', ar: p.nom?.ar || '' },
    description: { fr: p.description?.fr || '', ar: p.description?.ar || '' },
    composition: { fr: p.composition?.fr || '', ar: p.composition?.ar || '' },
    entretien: { fr: p.entretien?.fr || '', ar: p.entretien?.ar || '' },
    categoryId: p.categoryId?._id || p.categoryId || '',
    prix: String(p.prix ?? ''),
    ancienPrix: p.ancienPrix ? String(p.ancienPrix) : '',
    coupe: p.coupe || 'DROITE',
    tailleConseil: p.tailleConseil || 'NORMAL',
    mannequinTaille: p.mannequinTaille || '',
    mannequinHauteur: p.mannequinHauteur ? String(p.mannequinHauteur) : '',
    isFeatured: Boolean(p.isFeatured),
    isNouveau: Boolean(p.isNouveau),
    images: p.images || [],
    couleurs: couleurs.length ? couleurs : [{ nom: '', nomAr: '', hex: '#000000' }],
    tailles: TAILLES.filter((t) => tailles.has(t)),
    stocks,
  };
}

function Editeur({ valeur, categories, onClose, onSaved }) {
  const [form, setForm] = useState(valeur);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [televersement, setTeleversement] = useState(false);

  const set = (chemin) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      if (!chemin.includes('.')) return { ...f, [chemin]: v };
      const [a, b] = chemin.split('.');
      return { ...f, [a]: { ...f[a], [b]: v } };
    });
  };

  // The grid the shop actually edits: one cell per colour × size.
  const cellules = useMemo(
    () => form.couleurs.filter((c) => c.nom.trim()).flatMap((c) => form.tailles.map((t) => ({ couleur: c, taille: t }))),
    [form.couleurs, form.tailles]
  );

  function setStock(couleur, taille, valeurStock) {
    setForm((f) => ({ ...f, stocks: { ...f.stocks, [`${couleur}|${taille}`]: valeurStock } }));
  }

  async function televerser(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    setTeleversement(true);
    setErreur(null);
    try {
      const urls = await api.admin.televerser(files);
      setForm((f) => ({
        ...f,
        images: [...f.images, ...urls.map((url, i) => ({ url, alt: f.nom.fr, couleur: '', ordre: f.images.length + i }))],
      }));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Envoi impossible");
    } finally {
      setTeleversement(false);
      e.target.value = '';
    }
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);

    const variants = cellules.map(({ couleur, taille }) => ({
      couleur: couleur.nom.trim(),
      couleurAr: couleur.nomAr.trim(),
      hex: couleur.hex,
      taille,
      stock: Number(form.stocks[`${couleur.nom}|${taille}`] ?? 0),
      sku: `${form.ref}-${couleur.nom.trim().toUpperCase()}-${taille}`,
    }));

    if (!variants.length) {
      setErreur('Ajoutez au moins une couleur et une taille.');
      return;
    }

    const payload = {
      ref: form.ref.trim().toUpperCase(),
      nom: form.nom,
      description: form.description,
      composition: form.composition,
      entretien: form.entretien,
      categoryId: form.categoryId,
      prix: Number(form.prix) || 0,
      // Empty means no strike-through price, and that must be null rather
      // than 0 — 0 would render as a "was 0 DA" discount.
      ancienPrix: form.ancienPrix ? Number(form.ancienPrix) : null,
      coupe: form.coupe,
      tailleConseil: form.tailleConseil,
      mannequinTaille: form.mannequinTaille || null,
      mannequinHauteur: form.mannequinHauteur ? Number(form.mannequinHauteur) : null,
      isFeatured: form.isFeatured,
      isNouveau: form.isNouveau,
      images: form.images,
      variants,
    };

    setEnvoi(true);
    try {
      if (form._id) await api.admin.majProduit(form._id, payload);
      else await api.admin.creerProduit(payload);
      onSaved();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-plum-deep/45" onClick={onClose} />

      <form
        onSubmit={enregistrer}
        className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-lg bg-porcelain p-5 shadow-lift sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">{form._id ? 'Modifier' : 'Nouvel article'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-shell"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {erreur ? (
          <p className="mt-4 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
            {erreur}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Référence" required value={form.ref} onChange={set('ref')} dir="ltr" />
          <Field as="select" label="Catégorie" required value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Choisir</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nom.fr}
              </option>
            ))}
          </Field>

          <Field label="Nom (français)" required value={form.nom.fr} onChange={set('nom.fr')} />
          <Field label="Nom (arabe)" value={form.nom.ar} onChange={set('nom.ar')} dir="rtl" lang="ar" />

          <Field as="textarea" label="Description (français)" value={form.description.fr} onChange={set('description.fr')} />
          <Field
            as="textarea"
            label="Description (arabe)"
            value={form.description.ar}
            onChange={set('description.ar')}
            dir="rtl"
            lang="ar"
          />

          <Field label="Composition (français)" value={form.composition.fr} onChange={set('composition.fr')} />
          <Field label="Composition (arabe)" value={form.composition.ar} onChange={set('composition.ar')} dir="rtl" lang="ar" />

          <Field label="Entretien (français)" value={form.entretien.fr} onChange={set('entretien.fr')} />
          <Field label="Entretien (arabe)" value={form.entretien.ar} onChange={set('entretien.ar')} dir="rtl" lang="ar" />

          <Field label="Prix (DA)" required type="number" min="0" value={form.prix} onChange={set('prix')} />
          <Field
            label="Ancien prix (DA)"
            type="number"
            min="0"
            value={form.ancienPrix}
            onChange={set('ancienPrix')}
            aide="Laissez vide s’il n’y a pas de promotion."
          />

          <Field as="select" label="Coupe" value={form.coupe} onChange={set('coupe')}>
            {COUPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Field>
          <Field as="select" label="Conseil de taille" value={form.tailleConseil} onChange={set('tailleConseil')}>
            {CONSEILS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Field>

          <Field as="select" label="Taille portée par le mannequin" value={form.mannequinTaille} onChange={set('mannequinTaille')}>
            <option value="">—</option>
            {TAILLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Field>
          <Field
            label="Taille du mannequin (cm)"
            type="number"
            min="100"
            max="220"
            value={form.mannequinHauteur}
            onChange={set('mannequinHauteur')}
          />

          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isNouveau} onChange={set('isNouveau')} className="h-4 w-4 accent-plum" />
            Nouveauté
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} className="h-4 w-4 accent-plum" />
            En vedette
          </label>
        </div>

        {/* ── Images ────────────────────────────────────────────────────── */}
        <section className="mt-8">
          <h3 className="font-display text-xl text-ink">Photos</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {form.images.map((img, i) => (
              <div key={img.url} className="relative">
                <img src={img.url} alt="" width="72" height="96" className="h-24 w-18 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                  aria-label={`Retirer la photo ${i + 1}`}
                  className="absolute -top-2 -end-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-plum text-blush"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ))}

            <label className="inline-flex h-24 w-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-taupe text-xs text-ink-soft hover:border-plum">
              <Upload size={16} aria-hidden="true" />
              {televersement ? '…' : 'Ajouter'}
              <input type="file" accept="image/*" multiple onChange={televerser} className="sr-only" />
            </label>
          </div>
        </section>

        {/* ── Colours ───────────────────────────────────────────────────── */}
        <section className="mt-8">
          <h3 className="font-display text-xl text-ink">Couleurs</h3>
          <div className="mt-3 flex flex-col gap-3">
            {form.couleurs.map((c, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="min-w-36 flex-1">
                  <Field
                    label="Nom (français)"
                    value={c.nom}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        couleurs: f.couleurs.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)),
                      }))
                    }
                  />
                </div>
                <div className="min-w-36 flex-1">
                  <Field
                    label="Nom (arabe)"
                    dir="rtl"
                    lang="ar"
                    value={c.nomAr}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        couleurs: f.couleurs.map((x, j) => (j === i ? { ...x, nomAr: e.target.value } : x)),
                      }))
                    }
                  />
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-ink-soft">Teinte</span>
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        couleurs: f.couleurs.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)),
                      }))
                    }
                    className="h-12 w-16 rounded-md border border-taupe bg-porcelain"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, couleurs: f.couleurs.filter((_, j) => j !== i) }))}
                  aria-label={`Retirer la couleur ${c.nom || i + 1}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setForm((f) => ({ ...f, couleurs: [...f.couleurs, { nom: '', nomAr: '', hex: '#000000' }] }))}
          >
            <Plus size={15} aria-hidden="true" />
            Ajouter une couleur
          </Button>
        </section>

        {/* ── Sizes and the stock grid ──────────────────────────────────── */}
        <section className="mt-8">
          <h3 className="font-display text-xl text-ink">Tailles et stock</h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {TAILLES.map((t) => {
              const actif = form.tailles.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tailles: actif ? f.tailles.filter((x) => x !== t) : TAILLES.filter((x) => f.tailles.includes(x) || x === t),
                    }))
                  }
                  aria-pressed={actif}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm ${
                    actif ? 'border-plum bg-plum text-blush' : 'border-taupe text-ink'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {cellules.length ? (
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-taupe">
                    <th scope="col" className="py-2 text-start font-normal text-ink-soft">Couleur</th>
                    {form.tailles.map((t) => (
                      <th key={t} scope="col" className="py-2 text-center font-normal text-ink-soft">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.couleurs
                    .filter((c) => c.nom.trim())
                    .map((c) => (
                      <tr key={c.nom} className="border-b border-taupe/50">
                        <th scope="row" className="py-2 text-start font-normal text-ink">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-taupe"
                              style={{ backgroundColor: c.hex }}
                              aria-hidden="true"
                            />
                            {c.nom}
                          </span>
                        </th>
                        {form.tailles.map((t) => (
                          <td key={t} className="py-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={form.stocks[`${c.nom}|${t}`] ?? 0}
                              onChange={(e) => setStock(c.nom, t, e.target.value)}
                              aria-label={`Stock ${c.nom} taille ${t}`}
                              className="h-11 w-16 rounded-md border border-taupe bg-porcelain text-center text-ink"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-soft">
                Mettez 0 pour une taille épuisée : elle reste visible sur la fiche, barrée.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">Nommez au moins une couleur pour renseigner le stock.</p>
          )}
        </section>

        <div className="sticky bottom-0 mt-8 flex flex-wrap gap-3 border-t border-taupe bg-porcelain py-4">
          <Button type="submit" size="lg" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
