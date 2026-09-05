import User, { isValidPhone, normalisePhone } from '../Models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { issueSession, clearSession } from '../Middleware/auth.js';

/**
 * Phone number is the identifier, not email.
 *
 * This is how the audience actually signs up. A large share of customers here
 * have no email address they check, and the shop confirms every order by
 * calling — so the phone number is the one field that must be right, and
 * making it the login keeps it that way.
 */

const MIN_PASSWORD = 8;

export const register = asyncHandler(async (req, res) => {
  const { nom, telephone, email, motDePasse } = req.body;

  if (!nom?.trim()) return res.status(400).json({ message: 'Votre nom est requis' });
  if (!isValidPhone(telephone)) {
    return res.status(400).json({ message: 'Numéro invalide. Format attendu : 0555 12 34 56' });
  }
  if (!motDePasse || motDePasse.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères` });
  }

  const existing = await User.findOne({ telephone: normalisePhone(telephone) });
  if (existing) return res.status(409).json({ message: 'Un compte existe déjà avec ce numéro' });

  const user = new User({
    nom: nom.trim(),
    telephone,
    // Hashed by the pre-save hook. Assigning the plain value here is the
    // documented contract of that hook, not an oversight.
    passwordHash: motDePasse,
    // Empty string would collide on the partial unique index the moment a
    // second account also left it blank.
    email: email?.trim() ? email.trim().toLowerCase() : undefined,
  });
  await user.save();

  issueSession(res, user);
  res.status(201).json({ user: user.toPublic() });
});

export const login = asyncHandler(async (req, res) => {
  const { identifiant, motDePasse } = req.body;
  if (!identifiant || !motDePasse) {
    return res.status(400).json({ message: 'Numéro et mot de passe requis' });
  }

  // Either identifier works, because someone who registered with both will not
  // remember which one she used.
  const value = String(identifiant).trim();
  const query = value.includes('@')
    ? { email: value.toLowerCase() }
    : { telephone: normalisePhone(value) };

  const user = await User.findOne(query).select('+passwordHash');

  // One message for "no such account" and for "wrong password". Distinguishing
  // them tells an attacker which numbers are registered.
  const invalide = { message: 'Numéro ou mot de passe incorrect' };
  if (!user) return res.status(401).json(invalide);

  const match = await user.verifyPassword(motDePasse);
  if (!match) return res.status(401).json(invalide);

  issueSession(res, user);
  res.json({ user: user.toPublic() });
});

export const logout = asyncHandler(async (_req, res) => {
  clearSession(res);
  res.json({ message: 'Déconnectée' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { nom, email } = req.body;
  if (nom?.trim()) req.user.nom = nom.trim();
  if (email !== undefined) req.user.email = email?.trim() ? email.trim().toLowerCase() : undefined;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { ancien, nouveau } = req.body;
  if (!nouveau || nouveau.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères` });
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  const match = await user.verifyPassword(ancien || '');
  if (!match) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });

  user.passwordHash = nouveau;
  await user.save();
  res.json({ message: 'Mot de passe modifié' });
});

// ── Saved addresses ──────────────────────────────────────────────────────────

export const addAddress = asyncHandler(async (req, res) => {
  const { libelle, wilayaId, commune, adresse, isDefault } = req.body;
  if (!wilayaId || !commune?.trim()) {
    return res.status(400).json({ message: 'Wilaya et commune requises' });
  }

  if (isDefault) req.user.adresses.forEach((a) => { a.isDefault = false; });
  req.user.adresses.push({
    libelle: libelle?.trim() || 'Domicile',
    wilayaId,
    commune: commune.trim(),
    adresse: adresse?.trim() || '',
    // The first address saved is the default whether she ticked the box or
    // not, so checkout always has something to pre-fill.
    isDefault: Boolean(isDefault) || req.user.adresses.length === 0,
  });

  await req.user.save();
  res.status(201).json({ user: req.user.toPublic() });
});

export const removeAddress = asyncHandler(async (req, res) => {
  const entry = req.user.adresses.id(req.params.id);
  if (!entry) return res.status(404).json({ message: 'Adresse introuvable' });

  const wasDefault = entry.isDefault;
  entry.deleteOne();
  // Deleting the default must promote another one, or checkout silently loses
  // its pre-fill and she retypes everything.
  if (wasDefault && req.user.adresses.length) req.user.adresses[0].isDefault = true;

  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// ── Wishlist ─────────────────────────────────────────────────────────────────

export const toggleFavori = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const index = req.user.favoris.findIndex((id) => String(id) === productId);
  if (index >= 0) req.user.favoris.splice(index, 1);
  else req.user.favoris.push(productId);
  await req.user.save();
  res.json({ favoris: req.user.favoris, ajoute: index < 0 });
});

export const listFavoris = asyncHandler(async (req, res) => {
  await req.user.populate('favoris');
  res.json({ produits: req.user.favoris });
});
