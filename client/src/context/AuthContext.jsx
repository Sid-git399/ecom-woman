import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

/**
 * Who is logged in.
 *
 * The session itself lives in an httpOnly cookie the app cannot read, so the
 * user is fetched once at startup. `pret` distinguishes "not logged in" from
 * "we do not know yet" — without it, protected pages flash their logged-out
 * state for a moment on every reload.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .moi(controller.signal)
      .then((data) => setUser(data.user))
      .catch(() => setUser(null)) // 401 is the normal case for a visitor.
      .finally(() => {
        if (!controller.signal.aborted) setPret(true);
      });
    return () => controller.abort();
  }, []);

  const connexion = useCallback(async (identifiant, motDePasse) => {
    const data = await api.connexion({ identifiant, motDePasse });
    setUser(data.user);
    return data.user;
  }, []);

  const inscription = useCallback(async (payload) => {
    const data = await api.inscription(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const deconnexion = useCallback(async () => {
    // Cleared locally whatever the server says. If the request fails the
    // customer must still end up logged out on the device in front of her.
    try {
      await api.deconnexion();
    } finally {
      setUser(null);
    }
  }, []);

  const basculerFavori = useCallback(async (productId) => {
    const data = await api.basculerFavori(productId);
    setUser((current) => (current ? { ...current, favoris: data.favoris } : current));
    return data.ajoute;
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      pret,
      estConnectee: Boolean(user),
      estAdmin: user?.role === 'ADMIN',
      favoris: user?.favoris || [],
      connexion,
      inscription,
      deconnexion,
      basculerFavori,
    }),
    [user, pret, connexion, inscription, deconnexion, basculerFavori]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
