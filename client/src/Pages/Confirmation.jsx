import { Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useI18n, useT } from '../i18n';
import { formatPrice, formatPhone, toInternational } from '../lib/format';
import { Container, Button, Hairline } from '../Components/UI/Primitives';

/**
 * Order confirmed.
 *
 * The order number is the largest thing on the page and the customer is told
 * to write it down, because with cash on delivery and no account required it
 * is the only handle she has on her own order.
 */
export default function Confirmation({ settings }) {
  const t = useT();
  const { locale } = useI18n();
  const { state } = useLocation();
  const commande = state?.commande;

  // Reached directly, or reloaded. There is nothing to show and no way to
  // recover it here, so the tracking page is the honest destination.
  if (!commande) return <Navigate to="/suivi" replace />;

  const tel = settings?.telephone;

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 size={44} className="text-rose-deep" aria-hidden="true" />
          <h1 className="mt-5 font-display text-3xl text-ink sm:text-4xl">{t.confirmation.merci}</h1>
          <p className="mt-3 text-ink-soft">{t.confirmation.merciSub}</p>
        </div>

        <div className="mt-10 rounded-lg border border-taupe bg-shell p-6 text-center">
          <p className="text-sm text-ink-soft">{t.confirmation.numero}</p>
          <p className="mt-1 font-display text-3xl tracking-wide text-ink sm:text-4xl" dir="ltr">
            {commande.numero}
          </p>
          <p className="mt-2 text-xs text-ink-soft">{t.confirmation.numeroAide}</p>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">{t.confirmation.detail}</h2>
          <Hairline className="mt-3" />

          <ul className="mt-5 flex flex-col gap-3">
            {commande.items.map((i, index) => (
              <li key={`${i.ref}-${i.taille}-${i.couleur}-${index}`} className="flex min-w-0 items-start gap-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block text-ink">{i.nom}</span>
                  <span className="text-xs text-ink-soft">
                    {i.couleur} · {i.taille} · ×{i.quantite}
                  </span>
                </span>
                <span className="shrink-0 text-ink">{formatPrice(i.prix * i.quantite, locale)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2 border-t border-taupe pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.cart.sousTotal}</dt>
              <dd className="text-ink">{formatPrice(commande.sousTotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.cart.livraison}</dt>
              <dd className="text-ink">{formatPrice(commande.fraisLivraison, locale)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-taupe pt-3">
              <dt className="text-ink">{t.confirmation.aPayerLivraison}</dt>
              <dd className="font-display text-2xl text-ink">{formatPrice(commande.total, locale)}</dd>
            </div>
          </dl>

          <p className="mt-5 text-sm text-ink-soft">
            <span className="text-ink">{t.confirmation.livraisonVers} : </span>
            {commande.commune}, {commande.wilayaNom} —{' '}
            {commande.modeLivraison === 'STOP_DESK' ? t.checkout.stopDesk : t.checkout.domicile}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button to="/boutique" size="lg">
            {t.cart.continuer}
          </Button>
          {tel ? (
            <a
              href={`tel:${toInternational(tel)}`}
              className="inline-flex min-h-12 items-center text-sm text-rose-deep underline-offset-4 hover:underline"
            >
              {t.confirmation.question} <span className="ms-2" dir="ltr">{formatPhone(tel)}</span>
            </a>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
