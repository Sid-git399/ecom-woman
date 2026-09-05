/**
 * Body measurements in centimetres.
 *
 * Three tables, because a top, a pair of trousers and a dress are not measured
 * the same way and a single table would ask a customer to guess which columns
 * apply to her. The category carries which one to show (`guideTailles`).
 *
 * These are body measurements, not garment measurements. That distinction is
 * the one most size guides get wrong, and it is why the fit advice on each
 * product page exists alongside this table rather than instead of it.
 */

export const TABLES = {
  HAUT: {
    colonnes: ['poitrine', 'tourTaille'],
    lignes: [
      { taille: 'XS', poitrine: '80 – 84', tourTaille: '60 – 64' },
      { taille: 'S', poitrine: '84 – 88', tourTaille: '64 – 68' },
      { taille: 'M', poitrine: '88 – 92', tourTaille: '68 – 72' },
      { taille: 'L', poitrine: '92 – 97', tourTaille: '72 – 78' },
      { taille: 'XL', poitrine: '97 – 103', tourTaille: '78 – 84' },
      { taille: 'XXL', poitrine: '103 – 109', tourTaille: '84 – 90' },
    ],
  },
  BAS: {
    colonnes: ['tourTaille', 'hanches'],
    lignes: [
      { taille: 'XS', tourTaille: '60 – 64', hanches: '86 – 90' },
      { taille: 'S', tourTaille: '64 – 68', hanches: '90 – 94' },
      { taille: 'M', tourTaille: '68 – 72', hanches: '94 – 98' },
      { taille: 'L', tourTaille: '72 – 78', hanches: '98 – 103' },
      { taille: 'XL', tourTaille: '78 – 84', hanches: '103 – 109' },
      { taille: 'XXL', tourTaille: '84 – 90', hanches: '109 – 115' },
    ],
  },
  ROBE: {
    colonnes: ['poitrine', 'tourTaille', 'hanches'],
    lignes: [
      { taille: 'XS', poitrine: '80 – 84', tourTaille: '60 – 64', hanches: '86 – 90' },
      { taille: 'S', poitrine: '84 – 88', tourTaille: '64 – 68', hanches: '90 – 94' },
      { taille: 'M', poitrine: '88 – 92', tourTaille: '68 – 72', hanches: '94 – 98' },
      { taille: 'L', poitrine: '92 – 97', tourTaille: '72 – 78', hanches: '98 – 103' },
      { taille: 'XL', poitrine: '97 – 103', tourTaille: '78 – 84', hanches: '103 – 109' },
      { taille: 'XXL', poitrine: '103 – 109', tourTaille: '84 – 90', hanches: '109 – 115' },
    ],
  },
};

export default TABLES;
