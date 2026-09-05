import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Instagram, MapPin, Clock, Send } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useI18n, useT } from '../i18n';
import { formatPhone, toInternational } from '../lib/format';
import { Container, Button, Field, Hairline, SectionTitle } from '../Components/UI/Primitives';
import { GridSkeleton } from '../Components/UI/States';
import { ProductCard } from '../Components/Shop/ProductCard';
import { SizeTable } from '../Components/Shop/SizeGuide';
import { Reveal, stagger } from '../Components/UI/Reveal';

/** Contact, about, lookbook, size guide and the 404. */

export function Contact({ settings }) {
  const t = useT();
  const { locale } = useI18n();

  const [form, setForm] = useState({ nom: '', telephone: '', email: '', sujet: '', message: '' });
  const [errors, setErrors] = useState({});
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const set = (cle) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [cle]: v }));
    setErrors((prev) => (prev[cle] ? { ...prev, [cle]: undefined } : prev));
  };

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);

    const next = {};
    if (!form.nom.trim()) next.nom = t.erreurs.nomRequis;
    if (!/^0(5|6|7)\d{8}$/.test(form.telephone.replace(/\D/g, ''))) next.telephone = t.erreurs.telephoneInvalide;
    if (!form.message.trim()) next.message = t.erreurs.messageVide;
    setErrors(next);
    if (Object.keys(next).length) return;

    setEnvoi(true);
    try {
      await api.contact({ ...form, locale });
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t.erreurs.connexionImpossible);
    } finally {
      setEnvoi(false);
    }
  }

  const tel = settings?.telephone;
  const whatsapp = settings?.whatsapp || tel;

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.contact.titre}</h1>
        <p className="mt-3 text-ink-soft">{t.contact.sousTitre}</p>
        <Hairline className="mt-5" />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 max-w-xl">
          {envoye ? (
            <div className="rounded-lg border border-taupe bg-shell p-6" role="status">
              <h2 className="font-display text-2xl text-ink">{t.contact.envoye}</h2>
              <p className="mt-2 text-ink-soft">{t.contact.envoyeSub}</p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  setEnvoye(false);
                  setForm({ nom: '', telephone: '', email: '', sujet: '', message: '' });
                }}
              >
                {t.contact.autreMessage}
              </Button>
            </div>
          ) : (
            <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
              <h2 className="font-display text-2xl text-ink">{t.contact.nousEcrire}</h2>

              {erreur ? (
                <p className="rounded-md border border-rose-deep bg-blush/40 p-3 text-sm text-plum-deep" role="alert">
                  {erreur}
                </p>
              ) : null}

              <Field label={t.checkout.nom} required value={form.nom} onChange={set('nom')} error={errors.nom} autoComplete="name" />
              <Field
                label={t.contact.telephone}
                required
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={form.telephone}
                onChange={set('telephone')}
                error={errors.telephone}
                autoComplete="tel"
                placeholder="0555 12 34 56"
              />
              <Field
                label={`${t.checkout.email} (${t.common.facultatif})`}
                type="email"
                dir="ltr"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
              <Field label={`${t.contact.sujet} (${t.common.facultatif})`} value={form.sujet} onChange={set('sujet')} />
              <Field
                as="textarea"
                label={t.contact.message}
                required
                value={form.message}
                onChange={set('message')}
                error={errors.message}
              />

              <Button type="submit" size="lg" disabled={envoi} className="self-start">
                <Send size={16} aria-hidden="true" />
                {t.contact.envoyer}
              </Button>
            </form>
          )}
        </div>

        <aside className="min-w-0">
          <ul className="flex flex-col gap-4 rounded-lg border border-taupe bg-shell p-5 text-sm">
            {tel ? (
              <ContactRow icon={Phone} label={t.contact.telephone}>
                <a
                  href={`tel:${toInternational(tel)}`}
                  className="inline-flex min-h-11 items-center text-ink hover:text-rose-deep"
                  dir="ltr"
                >
                  {formatPhone(tel)}
                </a>
              </ContactRow>
            ) : null}
            {whatsapp ? (
              <ContactRow icon={MessageCircle} label={t.contact.whatsapp}>
                <a
                  href={`https://wa.me/${toInternational(whatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-ink hover:text-rose-deep"
                >
                  {t.contact.ecrireMessage}
                </a>
              </ContactRow>
            ) : null}
            {settings?.instagram ? (
              <ContactRow icon={Instagram} label={t.contact.instagram}>
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-ink hover:text-rose-deep"
                >
                  Instagram
                </a>
              </ContactRow>
            ) : null}
            {settings?.adresse?.[locale] || settings?.adresse?.fr ? (
              <ContactRow icon={MapPin} label={t.contact.adresse}>
                <span className="text-ink">{settings.adresse[locale] || settings.adresse.fr}</span>
              </ContactRow>
            ) : null}
            {settings?.horaires?.[locale] || settings?.horaires?.fr ? (
              <ContactRow icon={Clock} label={t.contact.titre}>
                <span className="text-ink">{settings.horaires[locale] || settings.horaires.fr}</span>
              </ContactRow>
            ) : null}
          </ul>
        </aside>
      </div>
    </Container>
  );
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <li className="flex items-start gap-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-rose-deep" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs text-ink-soft">{label}</span>
        {children}
      </span>
    </li>
  );
}

export function About() {
  const t = useT();

  const sections = [
    { id: 'livraison', titre: t.about.livraisonTitre, texte: t.about.livraisonTexte },
    { id: 'paiement', titre: t.about.paiementTitre, texte: t.about.paiementTexte },
    { id: 'echanges', titre: t.about.echangeTitre, texte: t.about.echangeTexte },
  ];

  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.about.titre}</h1>
        <Hairline className="mt-5" />

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((s) => (
            // The footer links to #livraison and #echanges, so these ids are
            // part of the contract rather than decoration.
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl text-ink">{s.titre}</h2>
              <p className="mt-3 text-ink-soft">{s.texte}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button to="/boutique" size="lg">
            {t.home.voirCollection}
          </Button>
          <Button to="/contact" variant="secondary" size="lg">
            {t.footer.nousJoindre}
          </Button>
        </div>
      </div>
    </Container>
  );
}

export function Lookbook() {
  const t = useT();
  const [produits, setProduits] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .produits({ featured: 'true', limit: 12 }, controller.signal)
      .then((d) => setProduits(d.produits))
      .catch(() => setProduits([]));
    return () => controller.abort();
  }, []);

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.lookbook.titre}</h1>
        <p className="mt-3 text-ink-soft">{t.lookbook.sousTitre}</p>
        <Hairline className="mt-5" />
      </header>

      <div className="mt-10">
        {!produits ? (
          <GridSkeleton n={6} />
        ) : (
          // Alternating spans, so the page reads as a lookbook rather than as
          // the shop grid with a different heading.
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6 lg:gap-6">
            {produits.map((p, i) => (
              <Reveal
                key={p._id}
                delay={stagger(i)}
                className={i % 5 === 0 ? 'col-span-2 lg:col-span-3' : 'lg:col-span-2'}
              >
                <ProductCard produit={p} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12">
        <Button to="/boutique" size="lg">
          {t.lookbook.voirPieces}
        </Button>
      </div>
    </Container>
  );
}

export function GuideTailles() {
  const t = useT();

  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{t.sizeGuide.titre}</h1>
        <p className="mt-3 text-ink-soft">{t.sizeGuide.intro}</p>
        <Hairline className="mt-5" />

        <div className="mt-10 flex flex-col gap-10">
          {[
            { type: 'HAUT', titre: t.sizeGuide.hauts },
            { type: 'BAS', titre: t.sizeGuide.bas },
            { type: 'ROBE', titre: t.sizeGuide.robes },
          ].map(({ type, titre }) => (
            <section key={type}>
              <h2 className="font-display text-2xl text-ink">{titre}</h2>
              <div className="mt-4">
                <SizeTable type={type} />
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <SectionTitle titre={t.sizeGuide.commentMesurer} />
          <ul className="mt-4 flex flex-col gap-2 text-ink-soft">
            <li>{t.sizeGuide.mesurerPoitrine}</li>
            <li>{t.sizeGuide.mesurerTaille}</li>
            <li>{t.sizeGuide.mesurerHanches}</li>
          </ul>
        </section>
      </div>
    </Container>
  );
}

export function NotFound() {
  const t = useT();
  return (
    <Container className="flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-5xl text-ink">404</h1>
      <p className="mt-4 font-display text-2xl text-ink">{t.notFound.titre}</p>
      <p className="mt-3 max-w-sm text-ink-soft">{t.notFound.sub}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/boutique" size="lg">
          {t.cart.videAction}
        </Button>
        <Link
          to="/"
          className="inline-flex min-h-12 items-center text-sm text-rose-deep underline-offset-4 hover:underline"
        >
          {t.common.retour}
        </Link>
      </div>
    </Container>
  );
}
