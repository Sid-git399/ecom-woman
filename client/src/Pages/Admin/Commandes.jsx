import { useCallback, useEffect, useState } from 'react';
import { Search, Printer, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n, useT } from '../../i18n';
import { formatPrice, formatPriceShort, formatDateTime, formatPhone, toInternational } from '../../lib/format';
import { Button, Field } from '../../Components/UI/Primitives';
import { Loading, ErrorState } from '../../Components/UI/States';
import { StatutBadge } from '../../Components/UI/StatutBadge';

const STATUTS = ['NOUVELLE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'];

/**
 * Orders.
 *
 * Built around the actual job: open the order, phone the customer, set the
 * status, print the slip for the driver. The phone number is a tel: link
 * because the shop is doing this on a phone, not a desk.
 */
export default function Commandes() {
  const t = useT();
  const { locale } = useI18n();

  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [statut, setStatut] = useState('');
  const [q, setQ] = useState('');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [ouverte, setOuverte] = useState(null);

  const charger = useCallback(
    (signal) =>
      api.admin
        .commandes({ statut, q: recherche, page, limit: 25 }, signal)
        .then(setData)
        .catch((err) => {
          if (err.name !== 'AbortError') setErreur(err.message);
        }),
    [statut, recherche, page]
  );

  useEffect(() => {
    const controller = new AbortController();
    charger(controller.signal);
    return () => controller.abort();
  }, [charger]);

  async function changerStatut(commande, nouveau) {
    const { commande: maj } = await api.admin.majCommande(commande._id, { statut: nouveau });
    setOuverte((c) => (c && c._id === maj._id ? maj : c));
    setData((d) => ({ ...d, commandes: d.commandes.map((c) => (c._id === maj._id ? maj : c)) }));
  }

  if (erreur) return <ErrorState message={erreur} className="min-h-60" />;
  if (!data) return <Loading className="min-h-60" />;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setRecherche(q);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-52 flex-1">
          <Field
            label="Rechercher"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Numéro, nom ou téléphone"
          />
        </div>
        <div className="min-w-40">
          <Field
            as="select"
            label="Statut"
            value={statut}
            onChange={(e) => {
              setPage(1);
              setStatut(e.target.value);
            }}
          >
            <option value="">Tous</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {t.statuts[s]}
              </option>
            ))}
          </Field>
        </div>
        <Button type="submit" className="mb-0.5">
          <Search size={16} aria-hidden="true" />
          Chercher
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-soft">{data.total} commande(s)</p>

      {data.commandes.length === 0 ? (
        <p className="mt-8 text-ink-soft">Aucune commande ne correspond.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {data.commandes.map((c) => (
            <li key={c._id}>
              <button
                type="button"
                onClick={() => setOuverte(c)}
                className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-taupe p-3 text-start transition-colors hover:border-plum"
              >
                <span className="text-ink" dir="ltr">
                  {c.numero}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                  {c.clientNom} — {c.commune}, {c.wilayaNom}
                </span>
                <span className="text-sm text-ink">{formatPriceShort(c.total, locale)}</span>
                <StatutBadge statut={c.statut} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {data.pages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t.common.precedent}
          </Button>
          <span className="text-sm text-ink-soft">
            {page} / {data.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            {t.common.suivant}
          </Button>
        </nav>
      ) : null}

      {ouverte ? <Detail commande={ouverte} onClose={() => setOuverte(null)} onStatut={changerStatut} /> : null}
    </div>
  );
}

function Detail({ commande, onClose, onStatut }) {
  const t = useT();
  const { locale } = useI18n();
  const [note, setNote] = useState(commande.noteInterne || '');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-plum-deep/45 print:hidden" onClick={onClose} />

      <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-porcelain p-5 shadow-lift sm:rounded-lg print:max-h-none print:overflow-visible print:shadow-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <h2 className="font-display text-2xl text-ink" dir="ltr">
            {commande.numero}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.fermer}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-shell"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* ── The slip. This subtree is what @media print reveals. ──────── */}
        <div id="bon-livraison" className="mt-4 print:mt-0">
          <p className="hidden font-display text-2xl print:block" dir="ltr">
            Warda — {commande.numero}
          </p>

          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row terme="Client">{commande.clientNom}</Row>
            <Row terme="Téléphone">
              <a href={`tel:${toInternational(commande.clientTelephone)}`} className="text-rose-deep" dir="ltr">
                {formatPhone(commande.clientTelephone)}
              </a>
            </Row>
            <Row terme="Wilaya">
              {commande.wilayaNom} — {commande.commune}
            </Row>
            <Row terme="Livraison">
              {commande.modeLivraison === 'STOP_DESK' ? t.checkout.stopDesk : t.checkout.domicile}
            </Row>
            {commande.adresse ? <Row terme="Adresse">{commande.adresse}</Row> : null}
            <Row terme="Passée le">{formatDateTime(commande.createdAt, locale)}</Row>
            <Row terme="Langue">{commande.locale === 'ar' ? 'العربية' : 'Français'}</Row>
          </dl>

          {commande.noteClient ? (
            <p className="mt-4 rounded-md bg-shell p-3 text-sm text-ink">
              <span className="text-ink-soft">Note de la cliente : </span>
              {commande.noteClient}
            </p>
          ) : null}

          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-taupe">
                <th scope="col" className="py-2 text-start font-normal text-ink-soft">Article</th>
                <th scope="col" className="py-2 text-start font-normal text-ink-soft">Taille</th>
                <th scope="col" className="py-2 text-start font-normal text-ink-soft">Couleur</th>
                <th scope="col" className="py-2 text-end font-normal text-ink-soft">Qté</th>
                <th scope="col" className="py-2 text-end font-normal text-ink-soft">Total</th>
              </tr>
            </thead>
            <tbody>
              {commande.items.map((i, index) => (
                <tr key={`${i.ref}-${i.taille}-${i.couleur}-${index}`} className="border-b border-taupe/50">
                  <td className="py-2 text-ink">
                    {i.nom}
                    <span className="block text-xs text-ink-soft" dir="ltr">
                      {i.ref}
                    </span>
                  </td>
                  <td className="py-2 text-ink">{i.taille}</td>
                  <td className="py-2 text-ink">{i.couleur}</td>
                  <td className="py-2 text-end text-ink">{i.quantite}</td>
                  <td className="py-2 text-end text-ink">{formatPrice(i.prix * i.quantite, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.cart.sousTotal}</dt>
              <dd className="text-ink">{formatPrice(commande.sousTotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.cart.livraison}</dt>
              <dd className="text-ink">{formatPrice(commande.fraisLivraison, locale)}</dd>
            </div>
            <div className="flex justify-between border-t border-taupe pt-2">
              <dt className="text-ink">À encaisser</dt>
              <dd className="font-display text-2xl text-ink">{formatPrice(commande.total, locale)}</dd>
            </div>
          </dl>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col gap-4 border-t border-taupe pt-5 print:hidden">
          <div>
            <p className="text-sm text-ink-soft">Statut</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatut(commande, s)}
                  aria-pressed={commande.statut === s}
                  className={`inline-flex min-h-11 items-center rounded-pill border px-3 text-sm transition-colors ${
                    commande.statut === s ? 'border-plum bg-plum text-blush' : 'border-taupe text-ink hover:border-plum'
                  }`}
                >
                  {t.statuts[s]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Annuler une commande remet automatiquement les articles en stock.
            </p>
          </div>

          <Field
            as="textarea"
            label="Note interne"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => api.admin.majCommande(commande._id, { noteInterne: note }).catch(() => {})}
          />

          <Button variant="secondary" onClick={() => window.print()} className="self-start">
            <Printer size={16} aria-hidden="true" />
            Imprimer le bon
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ terme, children }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-soft">{terme} :</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
