import mongoose from 'mongoose';

const localisedSchema = new mongoose.Schema(
  { fr: { type: String, required: true, trim: true }, ar: { type: String, trim: true, default: '' } },
  { _id: false }
);

/**
 * A womenswear department. `guideTailles` points at which measurement table
 * applies, because a dress and a pair of jeans are not measured the same way.
 */
const categorySchema = new mongoose.Schema(
  {
    nom: { type: localisedSchema, required: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
    description: { type: localisedSchema, default: () => ({ fr: '', ar: '' }) },
    image: { type: String, default: '' },
    guideTailles: { type: String, enum: ['HAUT', 'BAS', 'ROBE'], default: 'HAUT' },
    ordre: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1, ordre: 1 });

export default mongoose.model('Category', categorySchema);
