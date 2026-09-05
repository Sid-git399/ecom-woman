import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['CLIENT', 'ADMIN'];

/** Normalises 0550123456, +213 550 12 34 56 and 213550123456 to one form. */
export function normalisePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('213')) digits = `0${digits.slice(3)}`;
  return digits;
}

/**
 * Algerian mobile: ten digits starting 05, 06 or 07.
 *
 * Landlines are rejected as an ordering contact on purpose. The shop confirms
 * every order by phone and a landline nobody answers during the day loses the
 * sale.
 */
export function isValidPhone(raw) {
  return /^0(5|6|7)\d{8}$/.test(normalisePhone(raw));
}

const adresseSchema = new mongoose.Schema(
  {
    libelle: { type: String, trim: true, default: 'Domicile' },
    wilayaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wilaya' },
    commune: { type: String, trim: true, default: '' },
    adresse: { type: String, trim: true, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },

    // The login identifier. Stored normalised so 0550... and +213550... are one
    // account.
    telephone: { type: String, required: true, unique: true, trim: true, index: true, set: normalisePhone },
    // Optional, and a second way to log in. `undefined` rather than '' so the
    // partial unique index below ignores accounts without one.
    email: { type: String, trim: true, lowercase: true, default: undefined },

    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'CLIENT', index: true },

    adresses: { type: [adresseSchema], default: [] },
    favoris: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

// Unique only among accounts that actually have an email, so the many accounts
// without one do not collide on null.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    nom: this.nom,
    telephone: this.telephone,
    email: this.email || '',
    role: this.role,
    adresses: this.adresses,
    favoris: this.favoris,
  };
};

export default mongoose.model('User', userSchema);
