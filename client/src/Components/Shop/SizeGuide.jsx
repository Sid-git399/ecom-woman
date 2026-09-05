import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../i18n';
import { TABLES } from '../../lib/sizeGuide';

/**
 * The size table, as a dialog on the product page and as a page of its own.
 *
 * Numbers stay in Western digits and the table keeps LTR even in Arabic —
 * a measurement range reads "84 – 88" in both languages, and mirroring it
 * turns the range around.
 */
export function SizeTable({ type = 'HAUT', tailleMannequin }) {
  const t = useT();
  const table = TABLES[type] || TABLES.HAUT;

  return (
    // Wide tables scroll inside their own box. Letting one widen the page is
    // what puts a horizontal scrollbar on a 360px phone.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <caption className="sr-only">{t.sizeGuide.titre}</caption>
        <thead>
          <tr className="border-b border-taupe text-start">
            <th scope="col" className="py-3 pe-3 text-start font-normal text-ink-soft">
              {t.sizeGuide.taille}
            </th>
            {table.colonnes.map((c) => (
              <th key={c} scope="col" className="py-3 pe-3 text-start font-normal text-ink-soft">
                {t.sizeGuide[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.lignes.map((ligne) => (
            <tr
              key={ligne.taille}
              className={`border-b border-taupe/50 ${ligne.taille === tailleMannequin ? 'bg-shell' : ''}`}
            >
              <th scope="row" className="py-3 pe-3 text-start font-normal text-ink">
                {ligne.taille}
              </th>
              {table.colonnes.map((c) => (
                <td key={c} className="py-3 pe-3 text-ink-soft" dir="ltr">
                  {ligne[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SizeGuideModal({ ouvert, onClose, type, tailleMannequin }) {
  const t = useT();
  const ref = useRef(null);
  const fermerRef = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    fermerRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const focusables = ref.current?.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusables?.length) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [ouvert, onClose]);

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t.sizeGuide.titre}>
      <div className="absolute inset-0 bg-plum-deep/45" onClick={onClose} />
      <div
        ref={ref}
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-porcelain p-5 shadow-lift sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">{t.sizeGuide.titre}</h2>
          <button
            ref={fermerRef}
            type="button"
            onClick={onClose}
            aria-label={t.common.fermer}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-shell"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2 text-sm text-ink-soft">{t.sizeGuide.intro}</p>

        <div className="mt-4">
          <SizeTable type={type} tailleMannequin={tailleMannequin} />
        </div>

        <h3 className="mt-6 text-sm text-ink">{t.sizeGuide.commentMesurer}</h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-soft">
          <li>{t.sizeGuide.mesurerPoitrine}</li>
          <li>{t.sizeGuide.mesurerTaille}</li>
          <li>{t.sizeGuide.mesurerHanches}</li>
        </ul>
      </div>
    </div>
  );
}

export default SizeGuideModal;
