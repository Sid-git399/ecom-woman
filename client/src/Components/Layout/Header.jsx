import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, User, Search, Heart } from 'lucide-react';
import { useI18n, useT } from '../../i18n';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

/**
 * The header.
 *
 * Everything positional uses logical properties (start/end, ps/pe), so the
 * whole bar mirrors in Arabic without a single `isRtl ?` in the markup. The
 * one thing that must not mirror is the cart count badge relative to its icon,
 * and that is handled by placing it with the same logical properties rather
 * than by exception.
 */

const liens = (t) => [
  { to: '/boutique?tri=nouveau', label: t.nav.nouveautes },
  { to: '/boutique', label: t.nav.boutique, end: true },
  { to: '/lookbook', label: t.nav.lookbook },
  { to: '/la-maison', label: t.nav.maison },
  { to: '/contact', label: t.nav.contact },
];

export function Header() {
  const t = useT();
  const { setLocale, other } = useI18n();
  const { nbArticles, ouvrirDrawer } = useCart();
  const { estConnectee, estAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [terme, setTerme] = useState('');
  const rechercheRef = useRef(null);

  // Any navigation closes the menu. Without this, tapping a link on a phone
  // leaves the overlay covering the page you just asked for.
  useEffect(() => {
    setMenuOuvert(false);
    setRechercheOuverte(false);
  }, [location.pathname, location.search]);

  // The page behind a full-screen menu must not scroll under it.
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [menuOuvert]);

  useEffect(() => {
    if (rechercheOuverte) rechercheRef.current?.focus();
  }, [rechercheOuverte]);

  useEffect(() => {
    if (!menuOuvert && !rechercheOuverte) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOuvert(false);
      setRechercheOuverte(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOuvert, rechercheOuverte]);

  function rechercher(e) {
    e.preventDefault();
    const q = terme.trim();
    if (!q) return;
    navigate(`/boutique?q=${encodeURIComponent(q)}`);
    setTerme('');
    setRechercheOuverte(false);
  }

  const iconBtn =
    'inline-flex h-11 w-11 items-center justify-center rounded-full text-blush transition-colors hover:bg-plum-deep';

  return (
    <header className="sticky top-0 z-50 bg-plum text-blush">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          className={`${iconBtn} lg:hidden`}
          onClick={() => setMenuOuvert(true)}
          aria-label={t.nav.ouvrirMenu}
          aria-expanded={menuOuvert}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Wordmark only. The rose has four sanctioned placements and the
            navbar is deliberately not one of them — a mark repeated in the
            header, the cards and the buttons stops reading as art direction
            and starts reading as a template. */}
        <Link to="/" className="flex min-h-11 min-w-0 shrink-0 items-center ps-1 lg:ps-0">
          <span className="font-display text-2xl tracking-wide">Warda</span>
        </Link>

        <nav className="ms-6 hidden min-w-0 flex-1 items-center gap-6 lg:flex" aria-label={t.nav.menu}>
          {liens(t).map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center text-sm transition-colors hover:text-porcelain ${
                  isActive ? 'text-porcelain' : 'text-blush/85'
                }`
              }
            >
              {lien.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-0.5">
          <button
            type="button"
            className={`${iconBtn} hidden sm:inline-flex`}
            onClick={() => setRechercheOuverte((v) => !v)}
            aria-label={t.nav.recherche}
            aria-expanded={rechercheOuverte}
          >
            <Search size={19} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setLocale(other.code)}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-sm text-blush transition-colors hover:bg-plum-deep"
            // The label names the language you would switch to, in that
            // language, so it reads correctly whichever one you are in.
            lang={other.code}
          >
            {other.code === 'ar' ? 'العربية' : 'FR'}
          </button>

          <Link to={estConnectee ? '/compte' : '/connexion'} className={iconBtn} aria-label={t.nav.compte}>
            <User size={19} aria-hidden="true" />
          </Link>

          <button type="button" onClick={ouvrirDrawer} className={`${iconBtn} relative`} aria-label={t.nav.panier}>
            <ShoppingBag size={19} aria-hidden="true" />
            {nbArticles > 0 ? (
              <span className="absolute top-1.5 end-1.5 min-w-4 rounded-full bg-rose px-1 text-[10px] font-medium leading-4 text-plum-deep">
                {nbArticles}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {rechercheOuverte ? (
        <form onSubmit={rechercher} className="border-t border-blush/15 bg-plum-deep" role="search">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <Search size={18} className="shrink-0 text-blush/70" aria-hidden="true" />
            <input
              ref={rechercheRef}
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              placeholder={t.nav.recherche}
              aria-label={t.nav.recherche}
              className="min-h-11 w-full min-w-0 bg-transparent text-blush placeholder:text-blush/50 focus:outline-none"
            />
            <button type="button" onClick={() => setRechercheOuverte(false)} className={iconBtn} aria-label={t.common.fermer}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      {menuOuvert ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-plum lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-display text-2xl">Warda</span>
            <button type="button" className={iconBtn} onClick={() => setMenuOuvert(false)} aria-label={t.nav.fermerMenu}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 overflow-y-auto px-4 pb-8" aria-label={t.nav.menu}>
            {liens(t).map((lien) => (
              <NavLink
                key={lien.to}
                to={lien.to}
                end={lien.end}
                className="flex min-h-13 items-center border-b border-blush/10 font-display text-2xl text-blush"
              >
                {lien.label}
              </NavLink>
            ))}

            <Link to="/favoris" className="mt-4 flex min-h-12 items-center gap-3 text-blush/85">
              <Heart size={18} aria-hidden="true" />
              {t.account.favoris}
            </Link>
            <Link to={estConnectee ? '/compte' : '/connexion'} className="flex min-h-12 items-center gap-3 text-blush/85">
              <User size={18} aria-hidden="true" />
              {estConnectee ? t.nav.compte : t.nav.connexion}
            </Link>
            {estAdmin ? (
              <Link to="/admin" className="flex min-h-12 items-center gap-3 text-blush/85">
                {t.nav.admin}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default Header;
