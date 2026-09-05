# Warda — guide d’exploitation

Ce document s’adresse à la personne qui tient la boutique, pas au développeur.

---

## 1. Se connecter à l’administration

`https://votre-site.dz/connexion`, avec le numéro et le mot de passe du compte
administrateur. Un lien **Administration** apparaît ensuite dans « Mon compte »,
et l’adresse directe est `/admin`.

L’administration est pensée pour un téléphone : les onglets défilent
latéralement, les tableaux aussi, et rien n’est trop petit pour le pouce.

---

## 2. La journée type

### Une commande arrive

Administration → **Commandes**. Les nouvelles sont en tête.

1. Ouvrir la commande : elle affiche le nom, le téléphone (cliquable, il lance
   l’appel), la wilaya, la commune, l’adresse et le montant à encaisser.
2. Appeler la cliente pour confirmer. La langue dans laquelle elle a commandé
   est indiquée — appelez-la dans celle-là.
3. Passer le statut à **Confirmée**.
4. Préparer le colis, puis **Imprimer le bon** : seule la fiche s’imprime, pas
   le reste du site.
5. **Expédiée** au départ, **Livrée** une fois payée.

**Annuler une commande remet automatiquement les articles en stock.** C’est
important : avec le paiement à la livraison, une commande sur laquelle la
cliente se rétracte est courante, et sans cela vous perdriez des pièces
vendables à chaque fois. Repasser une commande annulée à un autre statut
ressort le stock à nouveau — les deux sens sont gérés.

Le champ **Note interne** s’enregistre en quittant le champ. La cliente ne le
voit jamais.

### Les statuts

| Statut | Sens |
|---|---|
| Nouvelle | Reçue, pas encore appelée |
| Confirmée | Cliente jointe, commande validée |
| En préparation | Colis en cours |
| Expédiée | Partie chez le livreur |
| Livrée | Payée et reçue |
| Annulée | Abandonnée — **le stock revient** |

---

## 3. Le stock, couleur par taille

C’est la particularité du prêt-à-porter, et toute l’administration est bâtie
dessus : une robe n’est pas un article avec un stock, c’est une **grille de
couleurs × tailles**. Une cliente qui choisit « Noir, M » demande exactement
une case de cette grille.

Administration → **Articles** → crayon.

- **Couleurs** : nom en français, nom en arabe, teinte. La teinte est la
  pastille que la cliente voit ; le nom est ce qu’entend une personne
  malvoyante, et ce qui distingue bordeaux de prune sur une vignette.
- **Tailles** : cochez celles que vous vendez.
- **Grille de stock** : une case par couleur et par taille.

**Mettez 0 pour une taille épuisée.** Elle reste visible sur la fiche, barrée
et non cliquable. Ne la retirez pas : « nous n’avons jamais fait votre taille »
et « votre taille est partie » ne sont pas la même nouvelle pour la cliente,
et une case absente dit la première.

Quand toutes les cases d’un article sont à 0, l’article s’affiche « Épuisé »
tout seul. Il n’y a pas de case « épuisé » à cocher : la disponibilité est
calculée depuis le stock, elle ne peut donc jamais le contredire.

**Ancien prix** : à remplir seulement pour une promotion. Le site affiche alors
le pourcentage et barre l’ancien prix. Laissez vide sinon.

---

## 4. Les photos

Cadrage **portrait**, format 3:4. Toutes les vignettes sont recadrées dans ce
rapport ; une photo paysage y perdra les côtés.

Deux façons de les mettre :

- **Depuis l’administration** : bouton « Ajouter » dans la fiche article.
  Nécessite les clés Cloudinary (voir le README). C’est la méthode normale.
- **Par fichier** : déposer les images dans `client/public/products/` sous le
  nom `<adresse-de-l-article>-01.jpg`, `-02.jpg`… Utile pour un premier
  chargement en masse.

La première photo est celle de la grille. Choisissez-la en conséquence.

---

## 5. Les tarifs de livraison

Administration → **Livraison**. Les 58 wilayas, deux tarifs chacune : à
domicile et en point de retrait.

Modifiez ce que vous voulez, puis **Enregistrer** une seule fois en bas. Rien
n’est envoyé avant. Si vous quittez la page sans enregistrer, le navigateur
vous prévient.

**Décochez « Livrée »** pour une wilaya que vous ne desservez pas. Elle reste
visible dans la liste au moment de la commande, avec un message invitant la
cliente à vous appeler. Elle n’est pas cachée : une cliente qui ne trouve pas
sa propre wilaya en conclut que le site est cassé, pas que vous ne livrez pas
chez elle.

Relancer `npm run seed` ne réécrit **jamais** vos tarifs.

---

## 6. Catégories, messages, paramètres

**Catégories** : le « guide des tailles » attaché à chaque catégorie décide de
la table de mensurations que voient ses articles — HAUT, BAS ou ROBE. Un
pantalon et une robe ne se mesurent pas pareil.

Une catégorie qui contient encore des articles ne peut pas être supprimée ; le
site vous dit combien il en reste. C’est volontaire : la supprimer ferait
disparaître ces articles de la boutique sans les effacer, et c’est le pire type
de stock manquant à retrouver.

**Messages** : le formulaire de contact. Le téléphone est cliquable, la langue
d’écriture est indiquée. Marquez « Traité » quand c’est réglé.

**Paramètres** : téléphone, WhatsApp, Instagram, adresse, horaires, et le titre
de la page d’accueil. Laissez le titre vide pour garder celui du site.

---

## 7. Ce que la cliente vit

- Elle commande **sans compte**. Le compte sert à retrouver ses commandes et
  ses adresses, jamais à acheter.
- Elle voit les **frais de livraison dès qu’elle choisit sa wilaya**, avant de
  confirmer. Aucun montant n’apparaît après coup.
- Elle paie **au livreur, en espèces**. Le site ne demande aucune donnée
  bancaire et ne prélève rien.
- Elle reçoit un **numéro de commande** (`WRD-2026-0001`) et peut suivre sa
  commande sur `/suivi` avec ce numéro et son téléphone.

Le numéro et le téléphone sont **tous deux** exigés pour le suivi : les numéros
se suivent, et le numéro seul laisserait n’importe qui lire le nom et l’adresse
de la cliente suivante.

---

## 8. Sécurité — ce qu’il ne faut pas faire

- **Ne partagez pas le compte administrateur.** Créez-en un par personne.
- **Ne mettez jamais le fichier `.env` sur GitHub.** Il contient la clé qui
  signe les sessions ; avec elle, n’importe qui se fabrique un accès admin.
- Le prix payé est **toujours recalculé par le serveur** à partir de la base.
  Ce que le navigateur envoie n’est pas cru. Quelqu’un qui bricole la page
  n’obtient pas un prix différent — c’est ce qui protège une boutique sans
  passerelle de paiement.

---

## 9. Ce qui a été vérifié, et ce qui ne l’a pas été

**Vérifié, automatiquement et reproductible :**

| Suite | Portée |
|---|---|
| `server`, `npm run verify` | 698 contrôles du catalogue via les vrais validateurs Mongoose |
| `server`, `npm run smoke` | 12 contrôles de l’API assemblée : CORS, sessions, routes admin fermées |
| `client`, `npm run verify:render` | 864 contrôles : 27 routes × français/arabe × 360px/1280px |
| `client`, `npm run verify:flows` | 23 parcours : achat complet, filtres, langue, clavier |
| `client`, `npm run verify:contraste` | 1018 textes rendus, seuils WCAG AA |

Ce que ces suites prouvent concrètement : aucune page ne déborde
horizontalement sur un téléphone de 360px, l’arabe retourne réellement la mise
en page, une taille épuisée ne peut pas être achetée, le panier survit à un
rechargement, les frais s’affichent avant confirmation, et le navigateur
n’envoie aucun prix.

**Non vérifié — à faire à la première mise en ligne :**

- **Tout ce qui touche une vraie base MongoDB.** Aucune n’était joignable
  depuis l’environnement de construction : les écritures, les index uniques,
  la décrémentation du stock et la numérotation des commandes ont été validées
  hors ligne, contre les vrais schémas, mais jamais contre un vrai serveur.
  À faire au premier déploiement : passer une commande de bout en bout et
  vérifier que le stock a bien baissé de la bonne case.
- **L’envoi de photos vers Cloudinary**, faute de clés.
- **Le rendu des photos réelles**, qui n’existent pas encore.
- **L’impression du bon de livraison sur une vraie imprimante.** La règle
  d’impression est en place et n’imprime que la fiche ; le papier n’a pas été
  essayé.
