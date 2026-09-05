import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import routes from './Routes/index.js';
import { notFound, errorHandler } from './Middleware/error.js';

const app = express();

// Behind Render's proxy. Without this, express-rate-limit sees every request
// as coming from the proxy's IP and throttles the whole shop as one visitor.
app.set('trust proxy', 1);

/**
 * Only the configured storefront origins are allowed to talk to the API. This
 * keeps the authenticated cookie flow working for the actual frontends while
 * refusing unknown domains that are not intended to use the shop session.
 */
const allowedOrigins = (process.env.CLIENT_URLS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => value.replace(/\/$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      // Quiet rejection: unknown origins are simply not allowed to use the
      // cookie-authenticated API, without turning the request into a 500.
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Render sleeps free instances. This is what the uptime ping hits.
app.get('/api/sante', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
