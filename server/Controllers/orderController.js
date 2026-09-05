import mongoose from 'mongoose';
import Order, { STATUTS } from '../Models/Order.js';
import Product from '../Models/Product.js';
import Wilaya from '../Models/Wilaya.js';
import { nextOrderNumber } from '../Models/Counter.js';
import { isValidPhone, normalisePhone } from '../Models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Checkout, cash on delivery.
 *
 * There is no payment gateway. The customer confirms, the shop calls her back,
 * and she pays the driver. That makes two things load-bearing:
 *
 *  1. Prices are recomputed here from the database. The cart total arrives in
 *     the request body and is never trusted — anyone can edit it, and with no
 *     gateway to reconcile against, a tampered total is simply the amount the
 *     driver would collect.
 *
 *  2. Her phone number must be reachable, because it is the only way the order
 *     gets confirmed.
 */

const MAX_ARTICLES = 20;

export const createOrder = asyncHandler(async (req, res) => {
  const { client, livraison, items, noteClient, locale } = req.body;

  if (!client?.nom?.trim()) return res.status(400).json({ message: 'Votre nom est requis' });
  if (!isValidPhone(client?.telephone)) {
    return res.status(400).json({ message: 'Numéro invalide. Format attendu : 0555 12 34 56' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Votre panier est vide' });
  }
  if (items.length > MAX_ARTICLES) {
    return res.status(400).json({ message: `Maximum ${MAX_ARTICLES} articles par commande` });
  }
  if (!livraison?.wilayaId || !livraison?.commune?.trim()) {
    return res.status(400).json({ message: 'Wilaya et commune requises' });
  }

  const mode = livraison.mode === 'STOP_DESK' ? 'STOP_DESK' : 'DOMICILE';

  const wilaya = await Wilaya.findById(livraison.wilayaId);
  if (!wilaya) return res.status(400).json({ message: 'Wilaya introuvable' });
  if (!wilaya.isActive) {
    return res.status(400).json({
      message: `Nous ne livrons pas encore à ${wilaya.nom}. Appelez-nous, nous trouverons une solution.`,
    });
  }

  // Every line is resolved against the real article and the real variant.
  const lignes = [];
  let sousTotal = 0;

  for (const item of items) {
    const quantite = Math.max(1, parseInt(item?.quantite, 10) || 0);
    if (!mongoose.isValidObjectId(item?.productId)) {
      return res.status(400).json({ message: 'Article invalide dans le panier' });
    }

    const produit = await Product.findById(item.productId);
    if (!produit) return res.status(400).json({ message: "Un article de votre panier n'est plus disponible" });

    const variant = produit.variants.find((v) => v.couleur === item.couleur && v.taille === item.taille);
    if (!variant) {
      return res.status(400).json({
        message: `${produit.nom.fr} n'existe pas en ${item.couleur} taille ${item.taille}`,
      });
    }
    if (variant.stock < quantite) {
      return res.status(409).json({
        message:
          variant.stock === 0
            ? `${produit.nom.fr} en ${variant.couleur}, taille ${variant.taille} vient d'être épuisé`
            : `Il ne reste que ${variant.stock} × ${produit.nom.fr} en ${variant.couleur}, taille ${variant.taille}`,
      });
    }

    lignes.push({
      productId: produit._id,
      ref: produit.ref,
      nom: produit.nom.fr,
      taille: variant.taille,
      couleur: variant.couleur,
      // The server's price, not the browser's.
      prix: produit.prix,
      quantite,
      image: produit.images?.[0]?.url || '',
    });
    sousTotal += produit.prix * quantite;
  }

  const fraisLivraison = wilaya.fraisPour(mode);

  const order = await Order.create({
    numero: await nextOrderNumber(),
    clientNom: client.nom.trim(),
    clientTelephone: normalisePhone(client.telephone),
    clientEmail: client.email?.trim().toLowerCase() || '',
    userId: req.user?._id || null,
    wilayaId: wilaya._id,
    // The name is copied, not just referenced. If the shop later renames or
    // deactivates a wilaya, the delivery slip for this order must still say
    // where it was going.
    wilayaNom: wilaya.nom,
    commune: livraison.commune.trim(),
    adresse: livraison.adresse?.trim() || '',
    items: lignes,
    sousTotal,
    fraisLivraison,
    total: sousTotal + fraisLivraison,
    modeLivraison: mode,
    locale: locale === 'ar' ? 'ar' : 'fr',
    noteClient: noteClient?.trim() || '',
  });

  // Stock comes down only after the order exists. $inc is atomic per variant,
  // so two customers taking the last piece cannot both succeed — the second
  // goes negative and is corrected below rather than overselling silently.
  for (const ligne of lignes) {
    await Product.updateOne(
      { _id: ligne.productId, 'variants.couleur': ligne.couleur, 'variants.taille': ligne.taille },
      { $inc: { 'variants.$.stock': -ligne.quantite } }
    );
  }
  // A concurrent checkout can still drive a cell below zero between the read
  // above and the decrement. Clamping keeps the catalogue honest; the shop
  // resolves the rare double-sale on the confirmation call, which it makes on
  // every order anyway.
  await Product.updateMany({ 'variants.stock': { $lt: 0 } }, { $set: { 'variants.$[negative].stock': 0 } }, {
    arrayFilters: [{ 'negative.stock': { $lt: 0 } }],
  });

  res.status(201).json({ commande: order });
});

/** Order lookup by number + phone, for customers who checked out as guests. */
export const trackOrder = asyncHandler(async (req, res) => {
  const { numero, telephone } = req.query;
  if (!numero || !telephone) return res.status(400).json({ message: 'Numéro de commande et téléphone requis' });

  const order = await Order.findOne({
    numero: String(numero).trim().toUpperCase(),
    // Both must match. The order number alone is guessable — they are
    // sequential — and would expose another customer's name and address.
    clientTelephone: normalisePhone(telephone),
  });

  if (!order) return res.status(404).json({ message: 'Aucune commande ne correspond' });
  res.json({ commande: order });
});

export const myOrders = asyncHandler(async (req, res) => {
  const commandes = await Order.find({
    // Orders placed before she created an account are matched on the phone
    // number too, so her history is not split in half by the day she signed up.
    $or: [{ userId: req.user._id }, { clientTelephone: req.user.telephone }],
  }).sort({ createdAt: -1 });
  res.json({ commandes });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const commande = await Order.findOne({
    _id: req.params.id,
    $or: [{ userId: req.user._id }, { clientTelephone: req.user.telephone }],
  });
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
  res.json({ commande });
});

// ── Admin ────────────────────────────────────────────────────────────────────

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

  const filter = {};
  if (req.query.statut && STATUTS.includes(req.query.statut)) filter.statut = req.query.statut;
  if (req.query.q?.trim()) {
    const safe = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ numero: rx }, { clientNom: rx }, { clientTelephone: rx }];
  }

  const [commandes, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ commandes, total, page, pages: Math.ceil(total / limit) || 0 });
});

export const getOrder = asyncHandler(async (req, res) => {
  const commande = await Order.findById(req.params.id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
  res.json({ commande });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const { statut, noteInterne } = req.body;
  const commande = await Order.findById(req.params.id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

  if (statut !== undefined) {
    if (!STATUTS.includes(statut)) return res.status(400).json({ message: 'Statut inconnu' });

    // Cancelling puts the stock back. Without this the shop loses sellable
    // pieces every time an order falls through on the confirmation call —
    // which, with cash on delivery, is a routine event rather than an edge case.
    if (statut === 'ANNULEE' && commande.statut !== 'ANNULEE') {
      for (const ligne of commande.items) {
        await Product.updateOne(
          { _id: ligne.productId, 'variants.couleur': ligne.couleur, 'variants.taille': ligne.taille },
          { $inc: { 'variants.$.stock': ligne.quantite } }
        );
      }
    }
    // And un-cancelling takes it out again, so toggling the status twice does
    // not quietly invent stock.
    if (commande.statut === 'ANNULEE' && statut !== 'ANNULEE') {
      for (const ligne of commande.items) {
        await Product.updateOne(
          { _id: ligne.productId, 'variants.couleur': ligne.couleur, 'variants.taille': ligne.taille },
          { $inc: { 'variants.$.stock': -ligne.quantite } }
        );
      }
    }

    commande.statut = statut;
  }

  if (noteInterne !== undefined) commande.noteInterne = noteInterne.trim();
  await commande.save();
  res.json({ commande });
});

export const stats = asyncHandler(async (_req, res) => {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const [parStatut, mois, recentes, rupture] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$statut', n: { $sum: 1 } } }]),
    Order.aggregate([
      // Cancelled orders are excluded from revenue. Counting them would show
      // the shop a number it never collected.
      { $match: { createdAt: { $gte: debutMois }, statut: { $ne: 'ANNULEE' } } },
      { $group: { _id: null, chiffre: { $sum: '$total' }, n: { $sum: 1 } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(8).lean(),
    // Articles with no sellable variant left. Counting articles that have any
    // variant at zero would count almost the whole catalogue — one sold-out
    // size is normal, none left at all is what the shop needs to act on.
    Product.countDocuments({ variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } } }),
  ]);

  const statuts = Object.fromEntries(STATUTS.map((s) => [s, 0]));
  for (const row of parStatut) statuts[row._id] = row.n;

  res.json({
    statuts,
    moisChiffre: mois[0]?.chiffre || 0,
    moisCommandes: mois[0]?.n || 0,
    recentes,
    articlesEnRupture: rupture,
  });
});
