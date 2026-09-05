import mongoose from 'mongoose';

const SINGLETON_ID = 'warda-settings';

const localised = { fr: { type: String, trim: true, default: '' }, ar: { type: String, trim: true, default: '' } };

/**
 * A single record, edited from the admin. Everything the shop will want to
 * change without calling anyone.
 *
 * Enforced as a singleton by a fixed _id rather than by convention, so a second
 * record cannot quietly appear and start winning races.
 */
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SINGLETON_ID },

    telephone: { type: String, trim: true, default: '' },
    telephone2: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },

    adresse: localised,
    horaires: localised,
    heroTitle: localised,
    heroSubtitle: localised,

    instagram: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },
    tiktok: { type: String, trim: true, default: '' },
  },
  { timestamps: true, _id: false }
);

const Settings = mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  return Settings.findByIdAndUpdate(
    SINGLETON_ID,
    { $setOnInsert: { _id: SINGLETON_ID } },
    { returnDocument: 'after', upsert: true }
  );
}

export { SINGLETON_ID };
export default Settings;
