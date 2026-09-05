import { useEffect, useState } from 'react';
import { Trash2, Phone } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { formatDateTime, formatPhone, toInternational } from '../../lib/format';
import { Loading, ErrorState } from '../../Components/UI/States';

const STATUTS = { NOUVEAU: 'Nouveau', LU: 'Lu', TRAITE: 'Traité' };

/** Contact form submissions. */
export default function Messages() {
  const { locale } = useI18n();
  const [messages, setMessages] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .admin.messages({}, controller.signal)
      .then((d) => setMessages(d.messages))
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
    return () => controller.abort();
  }, []);

  async function changerStatut(message, statut) {
    const { contact } = await api.admin.majMessage(message._id, { statut });
    setMessages((list) => list.map((m) => (m._id === contact._id ? contact : m)));
  }

  async function supprimer(message) {
    if (!window.confirm(`Supprimer le message de ${message.nom} ?`)) return;
    await api.admin.supprimerMessage(message._id);
    setMessages((list) => list.filter((m) => m._id !== message._id));
  }

  if (erreur) return <ErrorState message={erreur} className="min-h-60" />;
  if (!messages) return <Loading className="min-h-60" />;
  if (!messages.length) return <p className="text-ink-soft">Aucun message.</p>;

  return (
    <ul className="flex max-w-3xl flex-col gap-3">
      {messages.map((m) => (
        <li
          key={m._id}
          className={`rounded-lg border p-4 ${m.statut === 'NOUVEAU' ? 'border-rose-deep bg-blush/20' : 'border-taupe'}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-ink">{m.nom}</span>
            <a
              href={`tel:${toInternational(m.telephone)}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-rose-deep"
              dir="ltr"
            >
              <Phone size={14} aria-hidden="true" />
              {formatPhone(m.telephone)}
            </a>
            {m.email ? (
              <a href={`mailto:${m.email}`} className="text-sm text-ink-soft" dir="ltr">
                {m.email}
              </a>
            ) : null}
            <span className="ms-auto text-xs text-ink-soft">{formatDateTime(m.createdAt, locale)}</span>
          </div>

          {m.sujet ? <p className="mt-2 text-sm text-ink-soft">{m.sujet}</p> : null}
          <p className="mt-2 whitespace-pre-line text-ink">{m.message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {Object.entries(STATUTS).map(([cle, label]) => (
              <button
                key={cle}
                type="button"
                onClick={() => changerStatut(m, cle)}
                aria-pressed={m.statut === cle}
                className={`inline-flex min-h-11 items-center rounded-pill border px-3 text-sm ${
                  m.statut === cle ? 'border-plum bg-plum text-blush' : 'border-taupe text-ink'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ms-auto text-xs text-ink-soft">
              {/* Which language she wrote in, so the shop calls back in it. */}
              {m.locale === 'ar' ? 'العربية' : 'Français'}
            </span>
            <button
              type="button"
              onClick={() => supprimer(m)}
              aria-label={`Supprimer le message de ${m.nom}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:text-rose-deep"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
