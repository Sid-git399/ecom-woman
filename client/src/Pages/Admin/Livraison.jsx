import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../Components/UI/Primitives';
import { Loading, ErrorState } from '../../Components/UI/States';

/**
 * Delivery fees, one row per wilaya.
 *
 * Edited locally and saved in one request. Fifty-eight rows saving themselves
 * on every keystroke would be fifty-eight requests from a shop on a phone
 * connection, and a half-finished edit would already be live.
 */
export default function Livraison() {
  const [wilayas, setWilayas] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [modifie, setModifie] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .wilayas(controller.signal)
      .then((d) => setWilayas(d.wilayas))
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
    return () => controller.abort();
  }, []);

  // A page of unsaved fee changes is worth a browser warning; navigating away
  // by reflex is easy and the work is invisible until it is gone.
  useEffect(() => {
    if (!modifie) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifie]);

  function set(index, champ, valeur) {
    setModifie(true);
    setWilayas((list) => list.map((w, i) => (i === index ? { ...w, [champ]: valeur } : w)));
  }

  async function enregistrer() {
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      const { wilayas: maj } = await api.admin.majWilayas(
        wilayas.map((w) => ({
          id: w._id,
          fraisDomicile: Number(w.fraisDomicile) || 0,
          fraisStopDesk: Number(w.fraisStopDesk) || 0,
          isActive: w.isActive,
        }))
      );
      setWilayas(maj);
      setModifie(false);
      setMessage('Tarifs enregistrés.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setEnvoi(false);
    }
  }

  if (!wilayas) return erreur ? <ErrorState message={erreur} className="min-h-60" /> : <Loading className="min-h-60" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-ink-soft">
          Décochez « Livrée » pour une wilaya que vous ne desservez pas : elle reste visible au moment de la commande,
          avec un message invitant la cliente à vous appeler.
        </p>
        <Button onClick={enregistrer} disabled={envoi || !modifie}>
          <Save size={16} aria-hidden="true" />
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-taupe bg-shell p-3 text-sm text-ink" role="status">
          {message}
        </p>
      ) : null}
      {erreur ? (
        <p className="mt-4 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
          {erreur}
        </p>
      ) : null}

      <div className="relative mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-taupe">
              <th scope="col" className="py-2 text-start font-normal text-ink-soft">Wilaya</th>
              <th scope="col" className="py-2 text-end font-normal text-ink-soft">Domicile (DA)</th>
              <th scope="col" className="py-2 text-end font-normal text-ink-soft">Point de retrait (DA)</th>
              <th scope="col" className="py-2 text-center font-normal text-ink-soft">Livrée</th>
            </tr>
          </thead>
          <tbody>
            {wilayas.map((w, i) => (
              <tr key={w._id} className={`border-b border-taupe/50 ${w.isActive ? '' : 'opacity-60'}`}>
                <th scope="row" className="py-1.5 text-start font-normal text-ink">
                  <span className="text-ink-soft" dir="ltr">
                    {String(w.code).padStart(2, '0')}
                  </span>{' '}
                  {w.nom}
                </th>
                <td className="py-1.5 text-end">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={w.fraisDomicile}
                    onChange={(e) => set(i, 'fraisDomicile', e.target.value)}
                    aria-label={`Frais à domicile, ${w.nom}`}
                    className="h-11 w-24 rounded-md border border-taupe bg-porcelain px-2 text-end text-ink"
                  />
                </td>
                <td className="py-1.5 text-end">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={w.fraisStopDesk}
                    onChange={(e) => set(i, 'fraisStopDesk', e.target.value)}
                    aria-label={`Frais point de retrait, ${w.nom}`}
                    className="h-11 w-24 rounded-md border border-taupe bg-porcelain px-2 text-end text-ink"
                  />
                </td>
                <td className="py-1.5 text-center">
                  {/* Wrapped in a label so the tap target is 44px, not the
                      16px box itself — this table is edited on a phone. */}
                  <label className="inline-flex min-h-11 w-11 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={w.isActive}
                      onChange={(e) => set(i, 'isActive', e.target.checked)}
                      aria-label={`Livraison activée pour ${w.nom}`}
                      className="h-4 w-4 accent-plum"
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
