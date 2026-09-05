import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { formatPriceShort, formatDate } from '../../lib/format';
import { Loading, ErrorState } from '../../Components/UI/States';
import { StatutBadge } from '../../Components/UI/StatutBadge';

/**
 * What the shop needs to see first thing in the morning: what came in, what
 * still needs a phone call, and what has run out.
 */
export default function Dashboard() {
  const { locale } = useI18n();
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .admin.stats(controller.signal)
      .then(setStats)
      .catch((err) => {
        if (err.name !== 'AbortError') setErreur(err.message);
      });
    return () => controller.abort();
  }, []);

  if (erreur) return <ErrorState message={erreur} className="min-h-60" />;
  if (!stats) return <Loading className="min-h-60" />;

  const cartes = [
    { label: 'À confirmer', valeur: stats.statuts.NOUVELLE, accent: true },
    { label: 'En préparation', valeur: stats.statuts.EN_PREPARATION },
    { label: 'Expédiées', valeur: stats.statuts.EXPEDIEE },
    { label: 'Articles épuisés', valeur: stats.articlesEnRupture },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartes.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border p-4 ${c.accent && c.valeur > 0 ? 'border-rose-deep bg-blush/30' : 'border-taupe bg-shell'}`}
          >
            <p className="text-sm text-ink-soft">{c.label}</p>
            <p className="mt-1 font-display text-4xl text-ink">{c.valeur}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-taupe p-4">
          <p className="text-sm text-ink-soft">Chiffre du mois (hors annulées)</p>
          <p className="mt-1 font-display text-3xl text-ink">{formatPriceShort(stats.moisChiffre, locale)}</p>
        </div>
        <div className="rounded-lg border border-taupe p-4">
          <p className="text-sm text-ink-soft">Commandes du mois</p>
          <p className="mt-1 font-display text-3xl text-ink">{stats.moisCommandes}</p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-ink">Dernières commandes</h2>
        {stats.recentes.length === 0 ? (
          <p className="mt-3 text-ink-soft">Aucune commande pour le moment.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {stats.recentes.map((c) => (
              <li key={c._id}>
                <Link
                  to="/admin/commandes"
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-taupe p-3 transition-colors hover:border-plum"
                >
                  <span className="text-ink" dir="ltr">
                    {c.numero}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {c.clientNom} — {c.wilayaNom}
                  </span>
                  <span className="text-sm text-ink">{formatPriceShort(c.total, locale)}</span>
                  <StatutBadge statut={c.statut} />
                  <span className="w-full text-xs text-ink-soft sm:w-auto">{formatDate(c.createdAt, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
