import Product, { TAILLES } from '../Models/Product.js';
import Category from '../Models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';

/**
 * Catalogue reads and admin writes.
 *
 * The shop list is the page that decides whether someone stays, so it is
 * paginated, filtered and sorted in the database rather than in the browser.
 * Shipping 200 garments to a phone on 3G to filter them client-side is the
 * mistake this avoids.
 */

/**
 * `lean()` returns plain objects, which skips virtuals — and `disponibilite`,
 * `stockTotal` and `couleurs` are all virtuals the shop page needs to render a
 * sold-out badge or a colour swatch. Passing `{ virtuals: true }` to `lean()`
 * is not a real Mongoose option (it belongs to a plugin) and fails silently,
 * so the virtuals are applied explicitly instead.
 */
const withVirtuals = (doc) =>
  Array.isArray(doc) ? doc.map((d) => Product.applyVirtuals(d)) : Product.applyVirtuals(doc);

const PAR_PAGE = 12;
const MAX_PAR_PAGE = 48;

const TRIS = {
  nouveau: { createdAt: -1 },
  'prix-asc': { prix: 1 },
  'prix-desc': { prix: -1 },
  nom: { 'nom.fr': 1 },
};

export const listProducts = asyncHandler(async (req, res) => {
  const { categorie, taille, couleur, q, tri, promo, nouveau, featured } = req.query;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAR_PAGE, Math.max(1, parseInt(req.query.limit, 10) || PAR_PAGE));

  const filter = {};

  if (categorie) {
    const cat = await Category.findOne({ slug: categorie });
    // An unknown category returns an empty page rather than every product.
    // Silently ignoring the filter would show her jeans when she asked for
    // dresses, which reads as a broken shop.
    if (!cat) return res.json({ produits: [], total: 0, page, pages: 0, limit });
    filter.categoryId = cat._id;
  }

  // Size and colour filter the variant array. `$elemMatch` matters when both
  // are given: without it, Mongo accepts a product that has the size in one
  // variant and the colour in another, and offers her a combination that does
  // not exist.
  if (taille && couleur) filter.variants = { $elemMatch: { taille, couleur } };
  else if (taille) filter['variants.taille'] = taille;
  else if (couleur) filter['variants.couleur'] = couleur;

  if (promo === 'true') filter.ancienPrix = { $ne: null, $gt: 0 };
  if (nouveau === 'true') filter.isNouveau = true;
  if (featured === 'true') filter.isFeatured = true;

  const prixMin = Number(req.query.prixMin);
  const prixMax = Number(req.query.prixMax);
  if (Number.isFinite(prixMin) || Number.isFinite(prixMax)) {
    filter.prix = {};
    if (Number.isFinite(prixMin)) filter.prix.$gte = prixMin;
    if (Number.isFinite(prixMax)) filter.prix.$lte = prixMax;
  }

  if (q?.trim()) {
    // Regex rather than $text, so a partial word matches. Someone typing
    // "robe lo" expects "Robe longue Amira"; a text index would not match
    // until the word is complete. Escaped so a stray "(" is not a bad regex.
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ 'nom.fr': rx }, { 'nom.ar': rx }, { ref: rx }];
  }

  const sort = TRIS[tri] || TRIS.nouveau;

  const [produits, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('categoryId', 'nom slug guideTailles')
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ produits: withVirtuals(produits), total, page, pages: Math.ceil(total / limit) || 0, limit });
});

/**
 * The filter options the shop page offers.
 *
 * Built from what is actually in the catalogue, so a colour nobody stocks is
 * never offered — an empty result set from a filter the site itself suggested
 * is the most annoying kind of dead end.
 */
export const listFacets = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.categorie) {
    const cat = await Category.findOne({ slug: req.query.categorie });
    if (cat) filter.categoryId = cat._id;
  }

  const [couleurs, tailles, prix] = await Promise.all([
    Product.aggregate([
      { $match: filter },
      { $unwind: '$variants' },
      {
        $group: {
          _id: '$variants.couleur',
          hex: { $first: '$variants.hex' },
          nomAr: { $first: '$variants.couleurAr' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Product.distinct('variants.taille', filter),
    Product.aggregate([{ $match: filter }, { $group: { _id: null, min: { $min: '$prix' }, max: { $max: '$prix' } } }]),
  ]);

  res.json({
    couleurs: couleurs.map((c) => ({ nom: c._id, nomAr: c.nomAr || c._id, hex: c.hex })),
    // Sorted XS→XXL, not alphabetically. An alphabetical size list reads
    // L, M, S, XL, XS which is nonsense to a shopper.
    tailles: TAILLES.filter((t) => tailles.includes(t)),
    prixMin: prix[0]?.min ?? 0,
    prixMax: prix[0]?.max ?? 0,
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const produit = await Product.findOne({ slug })
    .populate('categoryId', 'nom slug guideTailles')
    .lean();

  if (!produit) return res.status(404).json({ message: 'Article introuvable' });

  // Four more from the same department. Excluding the current one matters:
  // "vous aimerez aussi" listing the page you are already on looks broken.
  const similaires = await Product.find({ categoryId: produit.categoryId?._id, _id: { $ne: produit._id } })
    .limit(4)
    .lean();

  res.json({ produit: withVirtuals(produit), similaires: withVirtuals(similaires) });
});

// ── Admin ────────────────────────────────────────────────────────────────────

function cleanVariants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v?.couleur && v?.taille)
    .map((v) => ({
      couleur: String(v.couleur).trim(),
      couleurAr: String(v.couleurAr || '').trim(),
      hex: String(v.hex || '#000000').trim(),
      taille: String(v.taille).trim(),
      stock: Math.max(0, parseInt(v.stock, 10) || 0),
      sku: String(v.sku || '').trim(),
    }));
}

async function uniqueSlug(base, ignoreId = null) {
  let slug = base;
  let n = 2;
  // Two articles genuinely can share a name across seasons. Suffixing keeps
  // both reachable instead of failing the save on the unique index.
  while (await Product.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export const createProduct = asyncHandler(async (req, res) => {
  const body = req.body;
  const variants = cleanVariants(body.variants);
  if (!variants.length) return res.status(400).json({ message: 'Ajoutez au moins une couleur et une taille' });

  const slug = await uniqueSlug(slugify(body.slug || body.nom?.fr || ''));
  const produit = await Product.create({ ...body, slug, variants });
  res.status(201).json({ produit });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const produit = await Product.findById(req.params.id);
  if (!produit) return res.status(404).json({ message: 'Article introuvable' });

  const body = req.body;
  const champs = [
    'ref', 'nom', 'description', 'categoryId', 'prix', 'ancienPrix', 'images',
    'composition', 'entretien', 'coupe', 'tailleConseil',
    'mannequinTaille', 'mannequinHauteur', 'isFeatured', 'isNouveau',
  ];
  for (const champ of champs) if (body[champ] !== undefined) produit[champ] = body[champ];

  if (body.variants !== undefined) {
    const variants = cleanVariants(body.variants);
    if (!variants.length) return res.status(400).json({ message: 'Ajoutez au moins une couleur et une taille' });
    produit.variants = variants;
  }

  // Only re-slug when the name actually changed, so an existing link shared on
  // Instagram keeps working through unrelated edits.
  if (body.nom?.fr && slugify(body.nom.fr) !== produit.slug) {
    produit.slug = await uniqueSlug(slugify(body.nom.fr), produit._id);
  }

  await produit.save();
  res.json({ produit });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const produit = await Product.findByIdAndDelete(req.params.id);
  if (!produit) return res.status(404).json({ message: 'Article introuvable' });
  res.json({ message: 'Article supprimé' });
});

/** Stock edits from the admin table, without loading the whole form. */
export const updateStock = asyncHandler(async (req, res) => {
  const { couleur, taille, stock } = req.body;
  const produit = await Product.findById(req.params.id);
  if (!produit) return res.status(404).json({ message: 'Article introuvable' });

  const variant = produit.variants.find((v) => v.couleur === couleur && v.taille === taille);
  if (!variant) return res.status(404).json({ message: 'Variante introuvable' });

  variant.stock = Math.max(0, parseInt(stock, 10) || 0);
  await produit.save();
  res.json({ produit });
});
