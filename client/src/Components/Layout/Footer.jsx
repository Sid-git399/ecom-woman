import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Instagram, MapPin } from 'lucide-react';
import { useI18n, useT } from '../../i18n';
import { formatPhone, toInternational } from '../../lib/format';
import WardaRose from '../Brand/WardaRose';

/**
 * The footer.
 *
 * Carries the fourth and last sanctioned use of the rose: an oversized, very
 * low opacity watermark. It is decorative, so it is hidden from assistive
 * technology and clipped by the section rather than allowed to widen the page.
 */
export function Footer({ settings }) {
  const t = useT();
  const { locale } = useI18n();
  const annee = new Date().getFullYear();

  const tel = settings?.telephone;
  const whatsapp = settings?.whatsapp || tel;

  return (
    <footer className="relative mt-24 overflow-hidden bg-plum text-blush">
      <WardaRose
        size={520}
        className="pointer-events-none absolute -bottom-40 -end-32 text-blush/[0.04]"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <span className="font-display text-3xl">Warda</span>
            <p className="mt-3 max-w-xs text-sm text-blush/80">{t.footer.paiementLivraison}</p>

            <ul className="mt-5 flex flex-col gap-2.5 text-sm">
              {tel ? (
                <li>
                  <a href={`tel:${toInternational(tel)}`} className="inline-flex min-h-11 items-center gap-2.5 hover:text-porcelain">
                    <Phone size={16} aria-hidden="true" />
                    {/* Rendered in the readable local form, dialled in the
                        international one — a tel: link with spaces in it does
                        not reliably open the dialler. */}
                    <span dir="ltr">{formatPhone(tel)}</span>
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    href={`https://wa.me/${toInternational(whatsapp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2.5 hover:text-porcelain"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    {t.contact.whatsapp}
                  </a>
                </li>
              ) : null}
              {settings?.instagram ? (
                <li>
                  <a
                    href={settings.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2.5 hover:text-porcelain"
                  >
                    <Instagram size={16} aria-hidden="true" />
                    {t.contact.instagram}
                  </a>
                </li>
              ) : null}
              {settings?.adresse?.[locale] || settings?.adresse?.fr ? (
                <li className="flex items-start gap-2.5 text-blush/80">
                  <MapPin size={16} className="mt-1 shrink-0" aria-hidden="true" />
                  <span>{settings.adresse[locale] || settings.adresse.fr}</span>
                </li>
              ) : null}
            </ul>
          </div>

          <FooterCol titre={t.footer.boutique}>
            <FooterLink to="/boutique">{t.nav.boutique}</FooterLink>
            <FooterLink to="/boutique?tri=nouveau">{t.nav.nouveautes}</FooterLink>
            <FooterLink to="/boutique?promo=true">{t.shop.promotions}</FooterLink>
            <FooterLink to="/lookbook">{t.nav.lookbook}</FooterLink>
          </FooterCol>

          <FooterCol titre={t.footer.aide}>
            <FooterLink to="/suivi">{t.footer.suivreCommande}</FooterLink>
            <FooterLink to="/guide-des-tailles">{t.footer.guideTailles}</FooterLink>
            <FooterLink to="/la-maison#livraison">{t.footer.livraisonPaiement}</FooterLink>
            <FooterLink to="/la-maison#echanges">{t.footer.echanges}</FooterLink>
          </FooterCol>

          <FooterCol titre={t.footer.maison}>
            <FooterLink to="/la-maison">{t.about.titre}</FooterLink>
            <FooterLink to="/contact">{t.footer.nousJoindre}</FooterLink>
            <FooterLink to="/compte">{t.account.titre}</FooterLink>
          </FooterCol>
        </div>

        <p className="mt-12 border-t border-blush/15 pt-6 text-sm text-blush/70">{t.footer.droits(annee)}</p>
      </div>
    </footer>
  );
}

function FooterCol({ titre, children }) {
  return (
    <div className="min-w-0">
      <h2 className="text-xs uppercase tracking-[0.18em] text-blush/60">{titre}</h2>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="inline-flex min-h-11 items-center text-blush/85 hover:text-porcelain">
        {children}
      </Link>
    </li>
  );
}

export default Footer;
