import Category from '../Models/Category.js';
import Product from '../Models/Product.js';
import Wilaya from '../Models/Wilaya.js';
import Settings, { getSettings } from '../Models/Settings.js';
import Message from '../Models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { isValidPhone, normalisePhone } from '../Models/User.js';

/**
 * Categories, wilayas, settings and the contact form — the smaller surfaces
 * that do not each need a file.
 */

// ── Categories ───────────────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (req, res) => {
  const filter = req.query.toutes === 'true' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ ordre: 1 }).lean();

  // The count comes from an aggregate, not a query per category. Seven
  // categories meant seven round trips, on the request that renders the nav.
  const counts = await Product.aggregate([{ $group: { _id: '$categoryId', n: { $sum: 1 } } }]);
  const parId = new Map(counts.map((c) => [String(c._id), c.n]));

  res.json({ categories: categories.map((c) => ({ ...c, nbArticles: parId.get(String(c._id)) || 0 })) });
});

export const createCategory = asyncHandler(async (req, res) => {
  const slug = slugify(req.body.slug || req.body.nom?.fr || '');
  if (!slug) return res.status(400).json({ message: 'Le nom de la catégorie est requis' });
  const categorie = await Category.create({ ...req.body, slug });
  res.status(201).json({ categorie });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const categorie = await Category.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });
  res.json({ categorie });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  // Refused while articles still point at it. Deleting anyway would leave
  // products with a dangling categoryId, and they would vanish from the shop
  // without ever being deleted — the hardest kind of missing stock to explain.
  const nb = await Product.countDocuments({ categoryId: req.params.id });
  if (nb > 0) {
    return res.status(409).json({
      message: `Cette catégorie contient ${nb} article(s). Déplacez-les avant de la supprimer.`,
    });
  }

  const categorie = await Category.findByIdAndDelete(req.params.id);
  if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });
  res.json({ message: 'Catégorie supprimée' });
});

// ── Wilayas ──────────────────────────────────────────────────────────────────

export const listWilayas = asyncHandler(async (_req, res) => {
  // Inactive wilayas are returned too, flagged. The checkout shows them as
  // selectable and explains that delivery is not available there yet; hiding
  // them makes a customer think the site is broken when she cannot find her own.
  const wilayas = await Wilaya.find().sort({ code: 1 }).lean();
  res.json({ wilayas });
});

export const updateWilaya = asyncHandler(async (req, res) => {
  const { fraisDomicile, fraisStopDesk, isActive } = req.body;
  const update = {};
  if (fraisDomicile !== undefined) update.fraisDomicile = Math.max(0, Number(fraisDomicile) || 0);
  if (fraisStopDesk !== undefined) update.fraisStopDesk = Math.max(0, Number(fraisStopDesk) || 0);
  if (isActive !== undefined) update.isActive = Boolean(isActive);

  const wilaya = await Wilaya.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
  if (!wilaya) return res.status(404).json({ message: 'Wilaya introuvable' });
  res.json({ wilaya });
});

/** Bulk fee edits, so the shop can reprice a whole band in one save. */
export const updateWilayasBulk = asyncHandler(async (req, res) => {
  const { wilayas } = req.body;
  if (!Array.isArray(wilayas)) return res.status(400).json({ message: 'Liste attendue' });

  await Promise.all(
    wilayas.map((w) =>
      Wilaya.updateOne(
        { _id: w.id },
        {
          $set: {
            fraisDomicile: Math.max(0, Number(w.fraisDomicile) || 0),
            fraisStopDesk: Math.max(0, Number(w.fraisStopDesk) || 0),
            isActive: Boolean(w.isActive),
          },
        }
      )
    )
  );

  res.json({ wilayas: await Wilaya.find().sort({ code: 1 }).lean() });
});

// ── Settings ─────────────────────────────────────────────────────────────────

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findByIdAndUpdate(
    'warda-settings',
    { $set: req.body },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );
  res.json({ settings });
});

// ── Contact ──────────────────────────────────────────────────────────────────

export const sendMessage = asyncHandler(async (req, res) => {
  const { nom, telephone, email, sujet, message, locale } = req.body;

  if (!nom?.trim()) return res.status(400).json({ message: 'Votre nom est requis' });
  if (!isValidPhone(telephone)) {
    return res.status(400).json({ message: 'Numéro invalide. Format attendu : 0555 12 34 56' });
  }
  if (!message?.trim()) return res.status(400).json({ message: 'Votre message est vide' });

  await Message.create({
    nom: nom.trim(),
    telephone: normalisePhone(telephone),
    email: email?.trim().toLowerCase() || '',
    sujet: sujet?.trim() || '',
    message: message.trim(),
    locale: locale === 'ar' ? 'ar' : 'fr',
  });

  res.status(201).json({ message: 'Message envoyé. Nous vous répondons vite.' });
});

export const listMessages = asyncHandler(async (req, res) => {
  const filter = req.query.statut ? { statut: req.query.statut } : {};
  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const nouveaux = await Message.countDocuments({ statut: 'NOUVEAU' });
  res.json({ messages, nouveaux });
});

export const updateMessage = asyncHandler(async (req, res) => {
  const message = await Message.findByIdAndUpdate(
    req.params.id,
    { statut: req.body.statut },
    { returnDocument: 'after', runValidators: true }
  );
  if (!message) return res.status(404).json({ message: 'Message introuvable' });
  res.json({ contact: message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message introuvable' });
  res.json({ message: 'Message supprimé' });
});
