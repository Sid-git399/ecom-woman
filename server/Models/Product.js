import mongoose from 'mongoose';

export const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const COUPES = ['AJUSTEE', 'DROITE', 'AMPLE', 'OVERSIZE'];
export const TAILLE_CONSEIL = ['PETIT', 'NORMAL', 'GRAND'];

/**
 * Bilingual text. Every customer-facing string on a product carries both, so
 * switching language never falls back to the other one mid-page.
 */
const localisedSchema = new mongoose.Schema(
  {
    fr: { type: String, required: true, trim: true },
    ar: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

/**
 * One sellable combination: a colour in a size, with its own stock.
 *
 * This is the structural difference between clothing and furniture. A dress is
 * not one item with one stock number, it is a grid of colour x size, and a
 * customer who picks "Noir, M" is asking about exactly one cell of that grid.
 * Modelling it any other way means overselling the size everyone wants.
 */
const variantSchema = new mongoose.Schema(
  {
    couleur: { type: String, required: true, trim: true },
    // The colour name in Arabic. A swatch still needs a label — for screen
    // readers, and for the customer who cannot tell bordeaux from plum at
    // thumbnail size — and "Noir" in the middle of an Arabic page is the kind
    // of half-translation that makes the whole locale look like an afterthought.
    couleurAr: { type: String, trim: true, default: '' },
    hex: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
    taille: { type: String, required: true, enum: TAILLES },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: '' },
    // Which colour this photo shows, so picking a colour can jump the gallery
    // to it. Empty means the photo applies to every colour.
    couleur: { type: String, trim: true, default: '' },
    ordre: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    nom: { type: localisedSchema, required: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
    description: { type: localisedSchema, default: () => ({ fr: '', ar: '' }) },

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },

    prix: { type: Number, required: true, min: 0, index: true },
    ancienPrix: { type: Number, min: 0, default: null },

    variants: {
      type: [variantSchema],
      required: true,
      validate: [(v) => v.length > 0, 'Un article doit avoir au moins une variante'],
    },
    images: { type: [imageSchema], default: [] },

    // Garment detail. `composition` is the fabric ("95% viscose, 5% élasthanne"),
    // `entretien` the care line. Both are what a customer checks before buying
    // clothing and neither belongs in the free-text description.
    composition: { type: localisedSchema, default: () => ({ fr: '', ar: '' }) },
    entretien: { type: localisedSchema, default: () => ({ fr: '', ar: '' }) },
    coupe: { type: String, enum: COUPES, default: 'DROITE' },
    tailleConseil: { type: String, enum: TAILLE_CONSEIL, default: 'NORMAL' },

    // "Le mannequin mesure 175 cm et porte la taille S." Removes most of the
    // size questions before they are asked.
    mannequinTaille: { type: String, enum: TAILLES, default: null },
    mannequinHauteur: { type: Number, min: 100, max: 220, default: null },

    isFeatured: { type: Boolean, default: false, index: true },
    isNouveau: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.index({ categoryId: 1, prix: 1 });
productSchema.index({ 'nom.fr': 'text', 'nom.ar': 'text', ref: 'text' });
// Filtering the shop by size and colour hits these on every request.
productSchema.index({ 'variants.taille': 1 });
productSchema.index({ 'variants.couleur': 1 });

/** Total stock across every variant. */
productSchema.virtual('stockTotal').get(function stockTotal() {
  return (this.variants || []).reduce((sum, v) => sum + v.stock, 0);
});

/**
 * Derived rather than stored, so availability can never contradict stock. A
 * stored flag drifts the first time someone edits stock without remembering to
 * update it.
 */
productSchema.virtual('disponibilite').get(function disponibilite() {
  const total = (this.variants || []).reduce((sum, v) => sum + v.stock, 0);
  if (total > 0) return 'EN_STOCK';
  return 'EPUISE';
});

/** The distinct colours offered, in first-seen order. */
productSchema.virtual('couleurs').get(function couleurs() {
  const seen = new Map();
  for (const v of this.variants || []) {
    if (!seen.has(v.couleur)) seen.set(v.couleur, { nom: v.couleur, nomAr: v.couleurAr || v.couleur, hex: v.hex });
  }
  return [...seen.values()];
});

/** Sizes offered for a colour, each flagged with whether it is in stock. */
productSchema.methods.taillesPour = function taillesPour(couleur) {
  return TAILLES.filter((t) => this.variants.some((v) => v.taille === t && (!couleur || v.couleur === couleur))).map(
    (taille) => {
      const v = this.variants.find((x) => x.taille === taille && (!couleur || x.couleur === couleur));
      return { taille, stock: v ? v.stock : 0, disponible: Boolean(v && v.stock > 0) };
    }
  );
};

export default mongoose.model('Product', productSchema);
