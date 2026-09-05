import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as auth from '../Controllers/authController.js';
import * as products from '../Controllers/productController.js';
import * as orders from '../Controllers/orderController.js';
import * as catalogue from '../Controllers/catalogueController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../Middleware/auth.js';
import { upload, uploadMany } from '../Middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Rate limits, tightest where the damage is worst.
 *
 * Login is the one worth guarding hardest: the identifier is a phone number,
 * which is guessable in a way an email address is not, so an unthrottled login
 * endpoint is an invitation to enumerate 05xxxxxxxx.
 */
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

// ── Public ───────────────────────────────────────────────────────────────────

router.get('/produits', products.listProducts);
router.get('/produits/facettes', products.listFacets);
// After /facettes, or Express matches "facettes" as a slug.
router.get('/produits/:slug', products.getProduct);

router.get('/categories', catalogue.listCategories);
router.get('/wilayas', catalogue.listWilayas);
router.get('/parametres', catalogue.getPublicSettings);

router.post('/contact', writeLimit, catalogue.sendMessage);

// Guests check out. Requiring an account before buying loses the sale, so the
// session is optional and only used to attach the order to a profile.
router.post('/commandes', writeLimit, optionalAuth, orders.createOrder);
router.get('/commandes/suivi', orders.trackOrder);

// ── Account ──────────────────────────────────────────────────────────────────

router.post('/auth/inscription', loginLimit, auth.register);
router.post('/auth/connexion', loginLimit, auth.login);
router.post('/auth/deconnexion', auth.logout);
router.get('/auth/moi', requireAuth, auth.me);
router.patch('/auth/profil', requireAuth, auth.updateProfile);
router.post('/auth/mot-de-passe', requireAuth, loginLimit, auth.changePassword);

router.post('/auth/adresses', requireAuth, auth.addAddress);
router.delete('/auth/adresses/:id', requireAuth, auth.removeAddress);

router.get('/favoris', requireAuth, auth.listFavoris);
router.post('/favoris/:productId', requireAuth, auth.toggleFavori);

router.get('/mes-commandes', requireAuth, orders.myOrders);
router.get('/mes-commandes/:id', requireAuth, orders.getMyOrder);

// ── Admin ────────────────────────────────────────────────────────────────────

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get('/stats', orders.stats);

admin.post('/produits', products.createProduct);
admin.patch('/produits/:id', products.updateProduct);
admin.patch('/produits/:id/stock', products.updateStock);
admin.delete('/produits/:id', products.deleteProduct);

admin.post(
  '/images',
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ message: 'Aucune image reçue' });
    res.status(201).json({ urls: await uploadMany(req.files) });
  })
);

admin.post('/categories', catalogue.createCategory);
admin.patch('/categories/:id', catalogue.updateCategory);
admin.delete('/categories/:id', catalogue.deleteCategory);

admin.get('/commandes', orders.listOrders);
admin.get('/commandes/:id', orders.getOrder);
admin.patch('/commandes/:id', orders.updateOrder);

admin.patch('/wilayas/:id', catalogue.updateWilaya);
admin.patch('/wilayas', catalogue.updateWilayasBulk);

admin.get('/parametres', catalogue.getPublicSettings);
admin.patch('/parametres', catalogue.updateSettings);

admin.get('/messages', catalogue.listMessages);
admin.patch('/messages/:id', catalogue.updateMessage);
admin.delete('/messages/:id', catalogue.deleteMessage);

router.use('/admin', admin);

export default router;
