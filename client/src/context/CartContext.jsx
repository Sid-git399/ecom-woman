import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * The cart, kept in localStorage.
 *
 * A cart line is identified by product + colour + size, not by product. Two
 * sizes of the same dress are two different things to buy and to pack, and
 * merging them on product id alone is how a customer ends up receiving two of
 * the wrong size.
 */

const STORAGE_KEY = 'warda.panier';
const MAX_QUANTITE = 10;

const CartContext = createContext(null);

const cleFor = (item) => `${item.productId}|${item.couleur}|${item.taille}`;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Anything malformed is discarded rather than allowed to crash the app on
    // every render. A stale cart is worth less than a working shop.
    return Array.isArray(parsed) ? parsed.filter((i) => i?.productId && i?.taille && i?.couleur) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [drawerOuvert, setDrawerOuvert] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* Private browsing, or the quota is full. The cart still works in memory. */
    }
  }, [items]);

  const ajouter = useCallback((produit, { couleur, hex, taille, quantite = 1, stock = 99 }) => {
    setItems((current) => {
      const ligne = {
        productId: produit._id || produit.id,
        slug: produit.slug,
        nom: produit.nom,
        ref: produit.ref,
        prix: produit.prix,
        image: produit.images?.[0]?.url || '',
        couleur,
        hex,
        taille,
        quantite,
        // Carried so the cart can cap the stepper without refetching. The
        // server checks stock again at checkout regardless.
        stock,
      };

      const cle = cleFor(ligne);
      const index = current.findIndex((i) => cleFor(i) === cle);
      if (index === -1) return [...current, ligne];

      const copie = [...current];
      copie[index] = {
        ...copie[index],
        prix: produit.prix,
        stock,
        quantite: Math.min(copie[index].quantite + quantite, stock, MAX_QUANTITE),
      };
      return copie;
    });
    setDrawerOuvert(true);
  }, []);

  const changerQuantite = useCallback((cle, quantite) => {
    setItems((current) =>
      current.map((i) =>
        cleFor(i) === cle ? { ...i, quantite: Math.max(1, Math.min(quantite, i.stock ?? MAX_QUANTITE, MAX_QUANTITE)) } : i
      )
    );
  }, []);

  const retirer = useCallback((cle) => {
    setItems((current) => current.filter((i) => cleFor(i) !== cle));
  }, []);

  const vider = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const nbArticles = items.reduce((n, i) => n + i.quantite, 0);
    const sousTotal = items.reduce((n, i) => n + i.prix * i.quantite, 0);
    return {
      items,
      cleFor,
      nbArticles,
      sousTotal,
      ajouter,
      changerQuantite,
      retirer,
      vider,
      drawerOuvert,
      ouvrirDrawer: () => setDrawerOuvert(true),
      fermerDrawer: () => setDrawerOuvert(false),
    };
  }, [items, ajouter, changerQuantite, retirer, vider, drawerOuvert]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider');
  return ctx;
}
