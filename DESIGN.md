# Warda — règles graphiques

Boutique féminine romantique, pas un catalogue de meubles repeint en rose. Ce
document dit ce qui est décidé et pourquoi, pour que la prochaine page ne
rouvre pas les mêmes questions.

---

## Couleur

Tous les jetons vivent dans `client/src/index.css`. **Aucun composant n’écrit
une valeur hexadécimale.**

| Jeton | Valeur | Emploi |
|---|---|---|
| `porcelain` | `#fbf7f4` | Fond de page. Chaud, jamais blanc pur |
| `shell` | `#f4ece7` | Bande de section alternée |
| `plum` | `#3e2430` | Barre de navigation, pied de page, bandes, boutons |
| `plum-deep` | `#2c1922` | Survol du plum, surfaces les plus profondes |
| `ink` | `#2a1f24` | Texte courant — 14.93:1 |
| `ink-soft` | `#736268` | Texte secondaire — 5.36:1 |
| `rose` | `#c9788a` | Signature. Filets, marqueurs, **jamais de texte** |
| `rose-deep` | `#994354` | Rose lisible sur fond clair |
| `rose-light` | `#d18396` | Rose lisible sur fond plum |
| `blush` | `#ebd3d6` | Texte sur plum (9.88:1), aplats doux |
| `taupe` | `#dccec6` | Bordures, filets, cadres d’image |

### La règle du rose

Le rose signature ne porte jamais de texte. À 3.02:1 sur porcelain, il n’en a
pas le droit. Deux variantes existent pour cela, et chacune a été vérifiée
contre **toutes** les surfaces où elle atterrit, pas seulement contre le fond
de page :

- `rose-deep` : 6.00:1 sur porcelain, 5.48:1 sur shell, 4.51:1 sur blush.
- `rose-light` : 4.93:1 sur plum, 5.83:1 sur plum-deep.

C’est une leçon payée : la valeur précédente de `rose-deep` avait été choisie
contre porcelain (4.70:1) et échouait à 4.29:1 sur les bandes shell, où elle
est en réalité le plus utilisée.

**Aucun or nulle part.** L’or appartenait à une autre boutique.

### Texte sur photo

Interdit sans aplat opaque derrière. Un dégradé au-dessus d’une photo que la
boutique téléverse elle-même rend le contraste invérifiable. Les vignettes de
catégorie portent donc une bande `plum/95` pleine, pas un dégradé.

---

## Typographie

| Rôle | Latin | Arabe |
|---|---|---|
| Titres | Cormorant Garamond 300–600 | Tajawal 500 |
| Texte | DM Sans 300–500 | Tajawal 400 |

Les deux familles latines sont variables : la plage réelle est déclarée
(`font-weight: 300 600`). Nommer une graisse unique sur un fichier variable
fait synthétiser les autres par le navigateur, ce qui sur une serif à fort
contraste ressemble à une bavure.

**Cormorant ne passe jamais en capitales et jamais sous 20px** : ses déliés
disparaissent. La casse et la famille sont opt-in via `.font-display` — les
mettre sur `h1, h2, h3` fuit sur tous les titres qui ne sont pas du display,
noms d’articles compris.

Cormorant n’a pas d’arabe. En arabe le rôle display revient à Tajawal en 500,
ce qui garde la hiérarchie sans une serif de repli qui parlerait d’une tout
autre voix.

---

## Direction

L’arabe n’est pas une traduction posée sur une mise en page française. Choisir
l’arabe change **ensemble** la direction, la famille de caractères et la taille
de base. Le provider écrit `<html lang>` et `<html dir>`, et toute la mise en
page se retourne grâce aux propriétés logiques de Tailwind : `ps-`, `pe-`,
`ms-`, `me-`, `start-`, `end-`.

Il n’y a **aucun `isRtl ? … : …`** dans le balisage, et il ne doit pas y en
avoir. Trois exceptions assumées :

- les chevrons de galerie (`rtl:-scale-x-100`) pointent vers l’extérieur ;
- le panneau panier part du bord logique de fin ;
- les tableaux de mesures restent en `dir="ltr"` : « 84 – 88 » se lit dans ce
  sens dans les deux langues, l’inverser retourne l’intervalle.

Les chiffres restent occidentaux (0-9) dans les deux langues. L’Algérie écrit
prix, téléphones et dates ainsi ; passer aux chiffres arabo-indiens donnerait
un site étranger à la cliente qu’il sert.

---

## Formes et mouvement

Rayons 6 / 10 / 16px, pilules pour les boutons. Ombres larges et pâles.
Les photos vivent dans un cadre 3:4 fixe — standard mode, et c’est ce qui tient
la grille avant l’arrivée des images.

Une seule animation d’entrée pour tout le site : `Reveal`, une montée courte
avec fondu, jouée une fois. Les cartes, les sections, les lignes du hero sont
ce même composant avec un délai. Six animations différentes donneraient six
voix.

`prefers-reduced-motion` est traité deux fois : chaque composant se résout à
son état final (et non figé à mi-course), et un plancher global dans
`index.css` garantit que rien ne bouge si un composant était oublié.

Framer Motion est chargé via `LazyMotion` avec les composants `m`. Ne pas le
nommer dans `manualChunks` : cela refusionne l’import dynamique et fait passer
la charge initiale de 128 à 154 Ko gzip.

---

## La marque

`WardaRose` — une rose ouverte vue de dessus, seize pétales géométriques.
Elle apparaît à **quatre endroits, et nulle part ailleurs** :

1. l’état de chargement ;
2. le séparateur entre grandes sections ;
3. l’illustration des états vides ;
4. un filigrane surdimensionné très pâle derrière le pied de page.

Elle est délibérément absente de la barre de navigation, des cartes article et
des boutons. Un motif employé quatre fois se lit comme une direction
artistique ; le même motif quinze fois se lit comme un gabarit.

---

## Cibles tactiles

44px minimum, hauteur **et** largeur, pour tout ce qui se touche — y compris
les liens du pied de page et les cases à cocher des tableaux d’administration,
qui se règlent sur un téléphone entre deux clientes. Une case à cocher de 16px
est enveloppée dans un `<label>` de 44px : c’est le label qu’on touche.

Deux exemptions, vérifiées par le harnais : un contrôle visuellement masqué
(le lien d’évitement) fait 1×1 par définition et s’atteint au clavier.

`npm run verify:render` mesure tout cela sur 27 routes, deux langues et deux
largeurs.

---

## Le piège des 360px

Un enfant en `mx-auto` dans une colonne flex annule `align-items: stretch` et
pousse le document de côté. D’où, sur `main` :

```jsx
<main className="flex min-w-0 flex-1 flex-col [&>*]:w-full [&>*]:min-w-0">
```

Deuxième piège, trouvé en vérifiant : `.sr-only` est en `position: absolute`.
Sans ancêtre positionné, un `<span class="sr-only">` se place par rapport au
bloc conteneur initial — il **échappe** au conteneur à défilement qui le
contient et élargit le document. Un seul, dans un en-tête de tableau
d’administration, portait la page à 720px de large sur un écran de 360px. Tout
conteneur `overflow-x-auto` porte donc `relative`.

`body { overflow-x: hidden }` masque ce genre de symptôme. Le harnais exclut
volontairement `body` de ses exemptions pour que la cause reste visible.
