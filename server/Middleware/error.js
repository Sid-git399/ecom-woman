/**
 * One place that turns anything thrown into a JSON body the client can show.
 *
 * The client renders `message` directly to the customer, so these strings are
 * French sentences rather than error codes. Internals stay in the server log.
 */

export function notFound(req, res) {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifies the error
// handler by its four-argument signature; dropping `next` unregisters it.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Mongoose validation. Reported field by field so the form can highlight the
  // right input instead of showing one generic banner.
  if (err.name === 'ValidationError') {
    const champs = {};
    for (const [key, detail] of Object.entries(err.errors)) champs[key] = detail.message;
    return res.status(400).json({ message: 'Données invalides', champs });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }

  // Duplicate key. Which field collided matters: "this phone number already
  // has an account" is actionable, "E11000" is not.
  if (err.code === 11000) {
    const champ = Object.keys(err.keyPattern || {})[0] || '';
    const messages = {
      telephone: 'Ce numéro est déjà utilisé',
      email: 'Cette adresse e-mail est déjà utilisée',
      ref: 'Cette référence existe déjà',
      slug: 'Cette adresse existe déjà',
      code: 'Ce code existe déjà',
    };
    return res.status(409).json({ message: messages[champ] || 'Cet enregistrement existe déjà' });
  }

  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Fichier trop volumineux' });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 ? 'Une erreur est survenue. Réessayez dans un instant.' : err.message,
  });
}
