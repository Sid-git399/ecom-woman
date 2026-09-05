import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { LazyMotion } from 'framer-motion';
import { api } from './lib/api';
import { Header } from './Components/Layout/Header';
import { Footer } from './Components/Layout/Footer';
import { CartDrawer } from './Components/Layout/CartDrawer';
import { Loading } from './Components/UI/States';
import { useT } from './i18n';

import Home from './Pages/Home';
import Shop from './Pages/Shop';
import Product from './Pages/Product';

// Everything behind a click, split out. The customer who only browses never
// downloads the checkout, the account or the admin.
const Cart = lazy(() => import('./Pages/Cart'));
const Checkout = lazy(() => import('./Pages/Checkout'));
const Confirmation = lazy(() => import('./Pages/Confirmation'));
const Suivi = lazy(() => import('./Pages/Suivi'));
const Account = lazy(() => import('./Pages/Account'));
const FavorisPage = lazy(() => import('./Pages/Account').then((m) => ({ default: m.FavorisPage })));
const Connexion = lazy(() => import('./Pages/Auth').then((m) => ({ default: m.Connexion })));
const Inscription = lazy(() => import('./Pages/Auth').then((m) => ({ default: m.Inscription })));
const Contact = lazy(() => import('./Pages/Static').then((m) => ({ default: m.Contact })));
const About = lazy(() => import('./Pages/Static').then((m) => ({ default: m.About })));
const Lookbook = lazy(() => import('./Pages/Static').then((m) => ({ default: m.Lookbook })));
const GuideTailles = lazy(() => import('./Pages/Static').then((m) => ({ default: m.GuideTailles })));
const NotFound = lazy(() => import('./Pages/Static').then((m) => ({ default: m.NotFound })));
const Admin = lazy(() => import('./Pages/Admin/Admin'));

/**
 * The shell.
 *
 * `main` carries `[&>*]:w-full [&>*]:min-w-0`. That is not decoration: a page
 * using `mx-auto` inside a flex column cancels `align-items: stretch` and lets
 * a wide child push the document sideways. The previous build of this shop
 * overflowed by 739px at 360px width for exactly that reason.
 */
/**
 * The animation feature bundle, fetched on its own.
 *
 * Paired with the `m` components in Reveal and CartDrawer: the full `motion`
 * component pulls every feature Framer has into the initial payload, which for
 * two effects — a fade-up and a sliding panel — is most of a mobile budget
 * spent before anything renders.
 */
const chargerAnimations = () => import('framer-motion').then((mod) => mod.domAnimation);

export default function App() {
  const [settings, setSettings] = useState(null);
  const t = useT();

  useEffect(() => {
    const controller = new AbortController();
    api
      .parametres(controller.signal)
      .then((d) => setSettings(d.settings))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <LazyMotion features={chargerAnimations} strict>
    <div className="flex min-h-dvh min-w-0 flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-plum focus:px-4 focus:py-2 focus:text-blush"
      >
        {t.nav.menu}
      </a>

      <Header />
      <ScrollToTop />

      <main id="contenu" className="flex min-w-0 flex-1 flex-col [&>*]:w-full [&>*]:min-w-0">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home settings={settings} />} />
            <Route path="/boutique" element={<Shop />} />
            <Route path="/piece/:slug" element={<Product settings={settings} />} />

            <Route path="/panier" element={<Cart />} />
            <Route path="/commande" element={<Checkout />} />
            <Route path="/commande/confirmee" element={<Confirmation settings={settings} />} />
            <Route path="/suivi" element={<Suivi />} />

            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
            {/* Nested routes inside the account, so the tabs are real URLs. */}
            <Route path="/compte/*" element={<Account />} />
            <Route path="/favoris" element={<FavorisPage />} />

            <Route path="/lookbook" element={<Lookbook />} />
            <Route path="/la-maison" element={<About />} />
            <Route path="/guide-des-tailles" element={<GuideTailles />} />
            <Route path="/contact" element={<Contact settings={settings} />} />

            <Route path="/admin/*" element={<Admin />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer settings={settings} />
      <CartDrawer />
    </div>
    </LazyMotion>
  );
}

/**
 * A new page starts at the top.
 *
 * Anchors are left alone — the footer links to /la-maison#livraison, and
 * scrolling that to the top would defeat the link.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}
