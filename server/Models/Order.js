import mongoose from 'mongoose';

export const MODES_LIVRAISON = ['DOMICILE', 'STOP_DESK'];
export const STATUTS = ['NOUVELLE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'];

/**
 * Line items copy the reference, name, size, colour and price as they were at
 * the time of ordering.
 *
 * Deliberate denormalisation. Prices and stock change constantly in clothing,
 * and an order that silently re-prices itself, or loses which size was bought,
 * is useless when someone is packing the parcel.
 */
const itemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    ref: { type: String, required: true, trim: true },
    nom: { type: String, required: true, trim: true },
    taille: { type: String, required: true, trim: true },
    couleur: { type: String, required: true, trim: true },
    prix: { type: Number, required: true, min: 0 },
    quantite: { type: Number, required: true, min: 1 },
    image: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true, index: true },

    clientNom: { type: String, required: true, trim: true },
    clientTelephone: { type: String, required: true, trim: true, index: true },
    clientEmail: { type: String, trim: true, lowercase: true, default: '' },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    wilayaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wilaya', required: true },
    wilayaNom: { type: String, required: true, trim: true },
    commune: { type: String, required: true, trim: true },
    adresse: { type: String, trim: true, default: '' },

    items: {
      type: [itemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'Une commande doit contenir au moins un article'],
    },

    sousTotal: { type: Number, required: true, min: 0 },
    fraisLivraison: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    modeLivraison: { type: String, enum: MODES_LIVRAISON, required: true },
    statut: { type: String, enum: STATUTS, default: 'NOUVELLE', index: true },

    // The language the customer ordered in, so the shop knows which to call in.
    locale: { type: String, enum: ['fr', 'ar'], default: 'fr' },

    noteClient: { type: String, trim: true, default: '' },
    noteInterne: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ statut: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
