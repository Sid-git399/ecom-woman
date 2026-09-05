# Warda

Boutique de prêt-à-porter féminin en Algérie. Français et arabe, paiement à la
livraison, livraison dans les 58 wilayas.

MERN : React 19 + Vite 6 + Tailwind v4 côté client, Express 5 + Mongoose 9 +
MongoDB côté serveur.

---

## Démarrer

```bash
# API
cd server
npm install
cp .env.example .env      # puis remplir MONGO_URI et JWT_SECRET
npm run seed              # catalogue de départ, 58 wilayas, paramètres
npm run dev               # http://localhost:5000

# Boutique
cd client
npm install
npm run dev               # http://localhost:5173
```

Le client vise `http://localhost:5000/api` par défaut (`client/api.js`). Pour
pointer ailleurs sans toucher au code, créez `client/.env.local` :

```
VITE_API_URL=https://warda-api.onrender.com/api
```

### Variables d’environnement (serveur)

| Variable | Obligatoire | Rôle |
|---|---|---|
| `MONGO_URI` | oui | Connexion MongoDB |
| `JWT_SECRET` | oui | Signature des sessions, 32 caractères minimum |
| `CLIENT_URLS` | oui en production | Origines autorisées, séparées par des virgules |
| `PORT` | non | 5000 par défaut |
| `NODE_ENV` | non | `production` active les cookies `secure` + `sameSite=none` |
| `ADMIN_PHONE`, `ADMIN_PASSWORD` | pour créer l’admin | Voir plus bas |
| `CLOUDINARY_*` | pour l’envoi de photos | `CLOUD_NAME`, `API_KEY`, `API_SECRET` |

Le serveur refuse de démarrer si `MONGO_URI` ou `JWT_SECRET` manquent, plutôt
que de tomber en panne à la première commande.

### Compte administrateur

Aucun mot de passe par défaut n’est créé : un compte admin avec un mot de passe
connu sur une URL publique est une porte ouverte.

```bash
cd server
ADMIN_PHONE="0550123456" ADMIN_PASSWORD="un-mot-de-passe-long" npm run seed
```

---

## Commandes

### Serveur

| Commande | Effet |
|---|---|
| `npm run dev` | API en rechargement automatique |
| `npm start` | API en production |
| `npm run seed` | Remplit la base. Idempotent : relançable sans risque |
| `npm run seed -- --reset` | Vide le catalogue d’abord. Ne touche jamais aux commandes |
| `npm run verify` | 698 contrôles du catalogue via les vrais validateurs, **sans base de données** |
| `npm run smoke` | 12 contrôles de l’API assemblée, **sans base de données** |

### Client

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Sert `dist/` sur le port 4173 |
| `npm run verify:render` | 864 contrôles : 27 routes × FR/AR × 360px/1280px |
| `npm run verify:flows` | 23 parcours : achat, filtres, langue, clavier |
| `npm run verify:contraste` | Contraste de 1018 textes rendus, seuils WCAG AA |

Les trois derniers attendent `npm run preview` sur le port 4173 et n’ont besoin
d’aucune base de données : l’API est simulée à partir du **vrai** catalogue de
seed, si bien que les pages testées affichent le même contenu qu’en production,
ruptures de stock comprises.

---

## Structure

```
client/
  api.js                  URL de l’API
  src/
    i18n/                 fr.js, ar.js, provider (écrit <html lang> et <html dir>)
    lib/api.js            seul point d’appel réseau
    lib/format.js         prix, dates, téléphones
    lib/sizeGuide.js      tables de mensurations
    context/              panier (localStorage), session
    Components/
      Brand/WardaRose     la marque. Quatre emplacements autorisés, pas un de plus
      Layout/             en-tête, pied de page, panneau panier
      Shop/               carte article, guide des tailles
      UI/                 boutons, champs, états, animation
    Pages/                boutique et administration
  verify/                 harnais de vérification (fixtures + trois suites)

server/
  Models/                 Product (matrice couleur × taille), Order, User, …
  Controllers/            catalogue, commandes, compte, réglages
  Routes/index.js         routes publiques, compte, administration
  Middleware/             session cookie, erreurs, envoi d’images
  seed/                   catalogue, wilayas, expansion des variantes, harnais
```

---

## Ce qu’il reste à faire avant la mise en ligne

1. **Photos.** Les fiches pointent vers `/products/<slug>-01.jpg` dans
   `client/public/`. Déposer les vraies photos sous ce nom remplace les
   emplacements sans toucher au code. Cadrage 3:4, portrait.
2. **Catalogue réel.** `server/seed/catalogue.js` contient 22 articles
   plausibles, pas le vrai stock. Les remplacer, ou tout saisir depuis
   l’administration.
3. **Coordonnées.** Téléphone, WhatsApp, adresse, horaires et réseaux se
   règlent dans Administration → Paramètres.
4. **Tarifs de livraison.** Les 58 wilayas partent avec des tarifs indicatifs
   par zone. Administration → Livraison.
5. **Cloudinary.** Sans les trois clés, l’envoi de photos depuis
   l’administration répond « L’envoi d’images n’est pas configuré ». Tout le
   reste fonctionne.

Voir `HANDOVER.md` pour l’exploitation quotidienne et `DESIGN.md` pour les
règles graphiques.
