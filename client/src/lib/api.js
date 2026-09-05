import { API_BASE_URL } from '../../api.js';

/**
 * The single way the app talks to the server.
 *
 * `credentials: 'include'` on every call, because the session is an httpOnly
 * cookie — omit it and the customer is anonymous on every request no matter
 * how many times she logs in.
 */

const BASE = import.meta.env.VITE_API_URL || API_BASE_URL;

export class ApiError extends Error {
  constructor(message, status, champs) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Field-level messages from the server's validation handler, so a form can
    // put the message under the input that caused it.
    this.champs = champs || null;
  }
}

async function request(path, { method = 'GET', body, signal, headers } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // An aborted request is the caller's own cleanup, not a failure to report.
    if (err.name === 'AbortError') throw err;
    // Anything else here is the network, not the server: a dropped mobile
    // connection is the common case for this audience and deserves its own
    // message rather than a generic error.
    throw new ApiError('Connexion impossible. Vérifiez votre connexion internet.', 0);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body means a proxy or platform error page, not the API.
    if (!response.ok) throw new ApiError('Une erreur est survenue. Réessayez dans un instant.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(data?.message || 'Une erreur est survenue.', response.status, data?.champs);
  }

  return data;
}

const qs = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const api = {
  // Catalogue
  produits: (params, signal) => request(`/produits${qs(params)}`, { signal }),
  facettes: (params, signal) => request(`/produits/facettes${qs(params)}`, { signal }),
  produit: (slug, signal) => request(`/produits/${encodeURIComponent(slug)}`, { signal }),
  categories: (signal) => request('/categories', { signal }),
  wilayas: (signal) => request('/wilayas', { signal }),
  parametres: (signal) => request('/parametres', { signal }),

  // Orders
  creerCommande: (body) => request('/commandes', { method: 'POST', body }),
  suivreCommande: (params, signal) => request(`/commandes/suivi${qs(params)}`, { signal }),
  mesCommandes: (signal) => request('/mes-commandes', { signal }),
  maCommande: (id, signal) => request(`/mes-commandes/${id}`, { signal }),

  // Contact
  contact: (body) => request('/contact', { method: 'POST', body }),

  // Account
  inscription: (body) => request('/auth/inscription', { method: 'POST', body }),
  connexion: (body) => request('/auth/connexion', { method: 'POST', body }),
  deconnexion: () => request('/auth/deconnexion', { method: 'POST' }),
  moi: (signal) => request('/auth/moi', { signal }),
  majProfil: (body) => request('/auth/profil', { method: 'PATCH', body }),
  motDePasse: (body) => request('/auth/mot-de-passe', { method: 'POST', body }),
  ajouterAdresse: (body) => request('/auth/adresses', { method: 'POST', body }),
  supprimerAdresse: (id) => request(`/auth/adresses/${id}`, { method: 'DELETE' }),
  favoris: (signal) => request('/favoris', { signal }),
  basculerFavori: (productId) => request(`/favoris/${productId}`, { method: 'POST' }),

  // Admin
  admin: {
    stats: (signal) => request('/admin/stats', { signal }),

    creerProduit: (body) => request('/admin/produits', { method: 'POST', body }),
    majProduit: (id, body) => request(`/admin/produits/${id}`, { method: 'PATCH', body }),
    majStock: (id, body) => request(`/admin/produits/${id}/stock`, { method: 'PATCH', body }),
    supprimerProduit: (id) => request(`/admin/produits/${id}`, { method: 'DELETE' }),

    creerCategorie: (body) => request('/admin/categories', { method: 'POST', body }),
    majCategorie: (id, body) => request(`/admin/categories/${id}`, { method: 'PATCH', body }),
    supprimerCategorie: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

    commandes: (params, signal) => request(`/admin/commandes${qs(params)}`, { signal }),
    commande: (id, signal) => request(`/admin/commandes/${id}`, { signal }),
    majCommande: (id, body) => request(`/admin/commandes/${id}`, { method: 'PATCH', body }),

    majWilaya: (id, body) => request(`/admin/wilayas/${id}`, { method: 'PATCH', body }),
    majWilayas: (wilayas) => request('/admin/wilayas', { method: 'PATCH', body: { wilayas } }),

    parametres: (signal) => request('/admin/parametres', { signal }),
    majParametres: (body) => request('/admin/parametres', { method: 'PATCH', body }),

    messages: (params, signal) => request(`/admin/messages${qs(params)}`, { signal }),
    majMessage: (id, body) => request(`/admin/messages/${id}`, { method: 'PATCH', body }),
    supprimerMessage: (id) => request(`/admin/messages/${id}`, { method: 'DELETE' }),

    // Images go as multipart, so this one bypasses the JSON helper.
    async televerser(files) {
      const form = new FormData();
      for (const file of files) form.append('images', file);
      const response = await fetch(`${BASE}/admin/images`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(data?.message || 'Envoi impossible', response.status);
      return data.urls;
    },
  },
};

export default api;
