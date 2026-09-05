import mongoose from 'mongoose';

export const STATUTS_MESSAGE = ['NOUVEAU', 'LU', 'TRAITE'];

/**
 * Contact form submissions. Phone required, email optional, matching the
 * checkout: this audience gives you a phone number and often has no email.
 */
const messageSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    telephone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    sujet: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },
    locale: { type: String, enum: ['fr', 'ar'], default: 'fr' },
    statut: { type: String, enum: STATUTS_MESSAGE, default: 'NOUVEAU', index: true },
  },
  { timestamps: true }
);

messageSchema.index({ createdAt: -1 });

export default mongoose.model('Message', messageSchema);
