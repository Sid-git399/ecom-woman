/**
 * API responses for the verification run, built from the real seed catalogue.
 *
 * Not invented data: the same `expand.js` the seed uses builds the variants,
 * so the pages under test see exactly the shape the server would send —
 * including the sold-out cells, which is where the interesting rendering is.
 */
import { CATEGORIES, PRODUITS } from '../../server/seed/catalogue.js';
import { WILAYAS } from '../../server/seed/wilayas.js';
import { toProductDoc, toCategoryDoc } from '../../server/seed/expand.js';

const oid = (n) => String(n).padStart(24, '0');

const categories = CATEGORIES.map((c, i) => ({ ...toCategoryDoc(c), _id: oid(i + 1), nbArticles: 0 }));
const parSlug = new Map(categories.map((c) => [c.slug, c]));

const produits = PRODUITS.map((p, i) => {
  const cat = parSlug.get(p.categorie);
  cat.nbArticles += 1;
  const doc = toProductDoc(p, cat._id);
  const stockTotal = doc.variants.reduce((s, v) => s + v.stock, 0);
  const couleurs = [];
  for (const v of doc.variants) {
    if (!couleurs.some((c) => c.nom === v.couleur)) {
      couleurs.push({ nom: v.couleur, nomAr: v.couleurAr, hex: v.hex });
    }
  }
  return {
    ...doc,
    _id: oid(100 + i),
    categoryId: { _id: cat._id, nom: cat.nom, slug: cat.slug, guideTailles: cat.guideTailles },
    stockTotal,
    disponibilite: stockTotal > 0 ? 'EN_STOCK' : 'EPUISE',
    couleurs,
  };
});

const wilayas = WILAYAS.map((w, i) => ({ ...w, _id: oid(200 + i), isActive: w.isActive !== false }));

const settings = {
  telephone: '0550 00 00 00',
  whatsapp: '0550 00 00 00',
  adresse: { fr: 'Alger, Algérie', ar: 'الجزائر العاصمة، الجزائر' },
  horaires: { fr: 'Samedi — Jeudi, 9h à 18h', ar: 'السبت — الخميس، من 9 إلى 18' },
  heroTitle: { fr: '', ar: '' },
  heroSubtitle: { fr: '', ar: '' },
  instagram: 'https://instagram.com/warda',
  facebook: '',
  tiktok: '',
};

const commande = {
  _id: oid(999),
  numero: 'WRD-2026-0007',
  clientNom: 'Cliente Test',
  clientTelephone: '0550000000',
  wilayaNom: 'Alger',
  commune: 'Bab Ezzouar',
  adresse: 'Cité 8 Mai 1945, bâtiment C',
  modeLivraison: 'DOMICILE',
  statut: 'CONFIRMEE',
  locale: 'fr',
  createdAt: new Date('2026-08-01T10:30:00Z').toISOString(),
  items: produits.slice(0, 2).map((p) => ({
    productId: p._id,
    ref: p.ref,
    nom: p.nom.fr,
    taille: p.variants[0].taille,
    couleur: p.variants[0].couleur,
    prix: p.prix,
    quantite: 1,
    image: p.images[0]?.url || '',
  })),
  sousTotal: produits[0].prix + produits[1].prix,
  fraisLivraison: 400,
  total: produits[0].prix + produits[1].prix + 400,
};

const facettes = (slug) => {
  const pool = slug ? produits.filter((p) => p.categoryId.slug === slug) : produits;
  const couleurs = [];
  const tailles = new Set();
  for (const p of pool) {
    for (const v of p.variants) {
      if (!couleurs.some((c) => c.nom === v.couleur)) couleurs.push({ nom: v.couleur, nomAr: v.couleurAr, hex: v.hex });
      tailles.add(v.taille);
    }
  }
  return {
    couleurs,
    tailles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].filter((t) => tailles.has(t)),
    prixMin: Math.min(...pool.map((p) => p.prix)),
    prixMax: Math.max(...pool.map((p) => p.prix)),
  };
};

const utilisateur = {
  id: oid(500),
  nom: 'Cliente Test',
  telephone: '0550000000',
  email: 'test@example.com',
  role: 'ADMIN',
  adresses: [{ _id: oid(501), libelle: 'Domicile', wilayaId: wilayas[0]._id, commune: 'Bab Ezzouar', adresse: 'Cité 8 Mai 1945', isDefault: true }],
  favoris: [produits[0]._id],
};

const stats = {
  statuts: { NOUVELLE: 3, CONFIRMEE: 5, EN_PREPARATION: 1, EXPEDIEE: 2, LIVREE: 14, ANNULEE: 1 },
  moisChiffre: 184500,
  moisCommandes: 12,
  recentes: [commande],
  articlesEnRupture: 1,
};

const messages = [
  {
    _id: oid(600),
    nom: 'Amina B.',
    telephone: '0661234567',
    email: '',
    sujet: 'Taille',
    message: 'Bonjour, la robe Amira taille-t-elle normalement ?',
    locale: 'fr',
    statut: 'NOUVEAU',
    createdAt: new Date('2026-08-10T09:12:00Z').toISOString(),
  },
];

/** Answers a request URL with the matching fixture, or null if unhandled. */
export function repondre(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/^.*\/api/, '');

  if (p === '/categories') return { categories };
  if (p === '/wilayas') return { wilayas };
  if (p === '/parametres' || p === '/admin/parametres') return { settings };

  if (p === '/produits/facettes') return facettes(u.searchParams.get('categorie'));

  if (p === '/produits') {
    let liste = produits;
    const cat = u.searchParams.get('categorie');
    const taille = u.searchParams.get('taille');
    const couleur = u.searchParams.get('couleur');
    if (cat) liste = liste.filter((x) => x.categoryId.slug === cat);
    if (taille) liste = liste.filter((x) => x.variants.some((v) => v.taille === taille));
    if (couleur) liste = liste.filter((x) => x.variants.some((v) => v.couleur === couleur));
    if (u.searchParams.get('featured') === 'true') liste = liste.filter((x) => x.isFeatured);
    if (u.searchParams.get('nouveau') === 'true') liste = liste.filter((x) => x.isNouveau);
    if (u.searchParams.get('promo') === 'true') liste = liste.filter((x) => x.ancienPrix);
    const limit = Number(u.searchParams.get('limit')) || 24;
    return { produits: liste.slice(0, limit), total: liste.length, page: 1, pages: Math.ceil(liste.length / limit), limit };
  }

  if (p.startsWith('/produits/')) {
    const slug = decodeURIComponent(p.slice('/produits/'.length));
    const produit = produits.find((x) => x.slug === slug);
    if (!produit) return { __status: 404, message: 'Article introuvable' };
    return { produit, similaires: produits.filter((x) => x.categoryId.slug === produit.categoryId.slug && x._id !== produit._id).slice(0, 4) };
  }

  if (p === '/auth/moi') return { user: utilisateur };
  if (p === '/mes-commandes') return { commandes: [commande] };
  if (p === '/favoris') return { produits: produits.slice(0, 3) };
  if (p === '/commandes/suivi') return { commande };

  if (p === '/admin/stats') return stats;
  if (p === '/admin/commandes') return { commandes: [commande], total: 1, page: 1, pages: 1 };
  if (p === '/admin/messages') return { messages, nouveaux: 1 };

  return null;
}

export const donnees = { produits, categories, wilayas, settings, commande };
