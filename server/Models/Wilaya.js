import mongoose from 'mongoose';

/**
 * One record per Algerian wilaya. Delivery is priced per wilaya and per mode,
 * and the customer sees the cost in the cart before confirming, so these two
 * numbers are the only thing between a quoted total and a wrong one.
 *
 * `isActive: false` means the shop does not deliver there. The checkout keeps
 * the wilaya selectable and explains, rather than hiding it, because a customer
 * who cannot find her own wilaya concludes the site is broken.
 */
const wilayaSchema = new mongoose.Schema(
  {
    code: { type: Number, required: true, unique: true, min: 1, max: 58, index: true },
    nom: { type: String, required: true, trim: true },
    nomAr: { type: String, required: true, trim: true },
    fraisDomicile: { type: Number, required: true, min: 0 },
    fraisStopDesk: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

wilayaSchema.methods.fraisPour = function fraisPour(mode) {
  return mode === 'STOP_DESK' ? this.fraisStopDesk : this.fraisDomicile;
};

export default mongoose.model('Wilaya', wilayaSchema);
