import { useState } from 'react';
import { Search } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { formatPrice, formatDate } from '../lib/format';
import { Container, Button, Field, Hairline } from '../Components/UI/Primitives';
import { StatutBadge } from '../Components/UI/StatutBadge';

/**
 * Order tracking for guests.
 *
 * Both the order number and the phone number are required. The numbers are
 * sequential, so the number alone would let anyone read the next customer's
 * name and address by incrementing it.
 */
export default function Suivi() {
  const t = useT();
  const { locale } = useI18n();

  const [numero, setNumero] = useState('');
  const [telephone, setTelephone] = useState('');
  const [commande, setCommande] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState(false);

  async function chercher(e) {
    e.preventDefault();
    setErreur(null);
    setCommande(null);
    setRecherche(true);
    try {
      const data = await api.suivreCommande({ numero, telephone });
      setCommande(data.commande);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    } finally {
      setRecherche(false);
    }
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.confirmation.suivre}</h1>
        <p className="mt-3 text-ink-soft">{t.confirmation.suivreSub}</p>
        <Hairline className="mt-5" />

        <form onSubmit={chercher} className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field
            label={t.confirmation.numero}
            required
            dir="ltr"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="WRD-2026-0001"
          />
          <Field
            label={t.checkout.telephone}
            required
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="0555 12 34 56"
          />
          <Button type="submit" size="lg" disabled={recherche} className="sm:col-span-2 sm:justify-self-start">
            <Search size={17} aria-hidden="true" />
            {recherche ? t.confirmation.recherche : t.confirmation.retrouver}
          </Button>
        </form>

        {erreur ? (
          <p className="mt-6 rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
            {erreur}
          </p>
        ) : null}

        {commande ? (
          <section className="mt-10 rounded-lg border border-taupe bg-shell p-5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-2xl text-ink" dir="ltr">
                {commande.numero}
              </span>
              <StatutBadge statut={commande.statut} />
            </div>

            <p className="mt-1 text-sm text-ink-soft">{formatDate(commande.createdAt, locale)}</p>

            <ul className="mt-5 flex flex-col gap-3 border-t border-taupe pt-4">
              {commande.items.map((i, index) => (
                <li key={`${i.ref}-${i.taille}-${index}`} className="flex min-w-0 items-start gap-3 text-sm">
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

            <div className="mt-4 flex justify-between border-t border-taupe pt-4">
              <span className="text-ink">{t.confirmation.aPayerLivraison}</span>
              <span className="font-display text-2xl text-ink">{formatPrice(commande.total, locale)}</span>
            </div>

            <p className="mt-4 text-sm text-ink-soft">
              {commande.commune}, {commande.wilayaNom} —{' '}
              {commande.modeLivraison === 'STOP_DESK' ? t.checkout.stopDesk : t.checkout.domicile}
            </p>
          </section>
        ) : null}
      </div>
    </Container>
  );
}
