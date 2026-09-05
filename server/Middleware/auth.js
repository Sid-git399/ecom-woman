import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Sessions ride in an httpOnly cookie, not in localStorage.
 *
 * A token in localStorage is readable by any script on the page and cannot be
 * revoked by the server, so "se déconnecter" becomes a suggestion rather than
 * an act. The cookie is httpOnly, sameSite and — in production — secure, and
 * clearing it genuinely ends the session.
 */

export const COOKIE = 'warda_session';
const MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

function crossSiteCookieRequired() {
  const clientOrigins = (process.env.CLIENT_URLS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isHostedFrontend = clientOrigins.some((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname);
    } catch {
      return false;
    }
  });

  return process.env.NODE_ENV === 'production' || process.env.COOKIE_SAME_SITE === 'none' || isHostedFrontend;
}

function secret() {
  const value = process.env.JWT_SECRET;
  // Failing loudly beats defaulting to 'secret'. A signing key with a known
  // fallback lets anyone mint an admin token.
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum)');
  }
  return value;
}

export function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: '30d' });
  const secureCookies = crossSiteCookieRequired();

  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    // A browser on a different site will not attach a cookie unless it is
    // SameSite=None and Secure.
    sameSite: secureCookies ? 'none' : 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearSession(res) {
  const secureCookies = crossSiteCookieRequired();

  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: secureCookies ? 'none' : 'lax',
    path: '/',
  });
}

function readToken(req) {
  if (req.cookies?.[COOKIE]) return req.cookies[COOKIE];
  // Bearer is accepted as a fallback for tooling and the seed scripts, never
  // as the primary path for the browser.
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Attaches req.user when a valid session exists; silent when it does not. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, secret());
    req.user = await User.findById(payload.sub);
  } catch {
    // Expired or tampered. Treated as anonymous rather than as an error, so a
    // stale cookie never blocks someone from browsing the shop.
  }
  next();
});

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Connexion requise' });

  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch {
    clearSession(res);
    return res.status(401).json({ message: 'Session expirée' });
  }

  // Re-read the user on every request rather than trusting the token's claims.
  // A role revoked or an account deleted has to take effect immediately, and a
  // 30-day token that still says ADMIN would not.
  const user = await User.findById(payload.sub);
  if (!user) {
    clearSession(res);
    return res.status(401).json({ message: 'Compte introuvable' });
  }

  req.user = user;
  next();
});

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Accès réservé' });
  next();
}
