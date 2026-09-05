import { lazy, Suspense } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Layers, Truck, Settings as SettingsIcon, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { Container } from '../../Components/UI/Primitives';
import { Loading } from '../../Components/UI/States';

const Dashboard = lazy(() => import('./Dashboard'));
const Produits = lazy(() => import('./Produits'));
const Commandes = lazy(() => import('./Commandes'));
const Categories = lazy(() => import('./Categories'));
const Livraison = lazy(() => import('./Livraison'));
const Parametres = lazy(() => import('./Parametres'));
const Messages = lazy(() => import('./Messages'));

/**
 * The admin.
 *
 * Rendered only for an ADMIN session — and the guard here is a convenience,
 * not the security boundary. Every /api/admin route re-reads the user from the
 * database and checks the role, so hiding the interface is about not showing
 * someone a screen full of buttons that would all fail.
 */
export default function Admin() {
  const { pret, estConnectee, estAdmin } = useAuth();
  const t = useT();

  if (!pret) return <Loading />;
  if (!estConnectee) return <Navigate to="/connexion" state={{ from: '/admin' }} replace />;
  if (!estAdmin) return <Navigate to="/" replace />;

  const onglets = [
    { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
    { to: '/admin/produits', label: 'Articles', icon: Package },
    { to: '/admin/categories', label: 'Catégories', icon: Layers },
    { to: '/admin/livraison', label: 'Livraison', icon: Truck },
    { to: '/admin/messages', label: 'Messages', icon: Mail },
    { to: '/admin/parametres', label: 'Paramètres', icon: SettingsIcon },
  ];

  return (
    <Container className="py-8">
      <h1 className="font-display text-3xl text-ink">{t.nav.admin}</h1>

      {/* The tab row scrolls rather than wrapping into three lines on a phone,
          which is what the shop will actually be using between customers. */}
      <nav className="relative -mx-4 mt-6 overflow-x-auto px-4 pb-1" aria-label={t.nav.admin}>
        <div className="flex w-max gap-2">
          {onglets.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm transition-colors ${
                  isActive ? 'border-plum bg-plum text-blush' : 'border-taupe text-ink hover:border-plum'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mt-8">
        <Suspense fallback={<Loading className="min-h-80" />}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="commandes" element={<Commandes />} />
            <Route path="commandes/:id" element={<Commandes />} />
            <Route path="produits" element={<Produits />} />
            <Route path="categories" element={<Categories />} />
            <Route path="livraison" element={<Livraison />} />
            <Route path="messages" element={<Messages />} />
            <Route path="parametres" element={<Parametres />} />
          </Routes>
        </Suspense>
      </div>
    </Container>
  );
}
