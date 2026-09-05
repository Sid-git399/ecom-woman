import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 5000;

/**
 * Required configuration is checked at boot, not on the first request that
 * needs it. A server that starts happily and then 500s on the first login is
 * far harder to diagnose than one that refuses to start and says why.
 */
const REQUIS = ['MONGO_URI', 'JWT_SECRET'];
const manquants = REQUIS.filter((key) => !process.env[key]);
if (manquants.length) {
  console.error(`Variables d'environnement manquantes : ${manquants.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET doit faire au moins 32 caractères');
  process.exit(1);
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB : ${mongoose.connection.name}`);

  const server = app.listen(PORT, () => console.log(`API sur le port ${PORT}`));

  // Render sends SIGTERM before replacing an instance. Draining first means
  // an order being written finishes instead of being cut off mid-insert.
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    });
  }
}

start().catch((err) => {
  console.error('Démarrage impossible :', err.message);
  process.exit(1);
});
