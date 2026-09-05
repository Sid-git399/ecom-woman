/**
 * The 58 Algerian wilayas, in French and Arabic, with delivery fees.
 *
 * Fees are banded by distance from Algiers and sized for clothing: a parcel a
 * courier can carry, not a van. These are plausible starting values, NOT the
 * shop's real tariff. They are editable per wilaya from the admin and must be
 * set to the real numbers before launch.
 */

const BANDS = {
  alger: { domicile: 400, stopDesk: 250 },      // Algiers and its immediate ring
  centre: { domicile: 600, stopDesk: 350 },      // the centre and near coast
  est: { domicile: 700, stopDesk: 400 },
  ouest: { domicile: 700, stopDesk: 400 },
  hautsPlateaux: { domicile: 750, stopDesk: 450 },
  sudNord: { domicile: 900, stopDesk: 550 },     // the north Sahara
  sudProfond: { domicile: 1200, stopDesk: 800 }, // the deep south
};

const LIST = [
  [1, 'Adrar', 'أدرار', 'sudProfond'],
  [2, 'Chlef', 'الشلف', 'centre'],
  [3, 'Laghouat', 'الأغواط', 'hautsPlateaux'],
  [4, 'Oum El Bouaghi', 'أم البواقي', 'est'],
  [5, 'Batna', 'باتنة', 'est'],
  [6, 'Béjaïa', 'بجاية', 'centre'],
  [7, 'Biskra', 'بسكرة', 'est'],
  [8, 'Béchar', 'بشار', 'sudProfond'],
  [9, 'Blida', 'البليدة', 'alger'],
  [10, 'Bouira', 'البويرة', 'centre'],
  [11, 'Tamanrasset', 'تمنراست', 'sudProfond'],
  [12, 'Tébessa', 'تبسة', 'est'],
  [13, 'Tlemcen', 'تلمسان', 'ouest'],
  [14, 'Tiaret', 'تيارت', 'hautsPlateaux'],
  [15, 'Tizi Ouzou', 'تيزي وزو', 'centre'],
  [16, 'Alger', 'الجزائر', 'alger'],
  [17, 'Djelfa', 'الجلفة', 'hautsPlateaux'],
  [18, 'Jijel', 'جيجل', 'est'],
  [19, 'Sétif', 'سطيف', 'est'],
  [20, 'Saïda', 'سعيدة', 'ouest'],
  [21, 'Skikda', 'سكيكدة', 'est'],
  [22, 'Sidi Bel Abbès', 'سيدي بلعباس', 'ouest'],
  [23, 'Annaba', 'عنابة', 'est'],
  [24, 'Guelma', 'قالمة', 'est'],
  [25, 'Constantine', 'قسنطينة', 'est'],
  [26, 'Médéa', 'المدية', 'centre'],
  [27, 'Mostaganem', 'مستغانم', 'ouest'],
  [28, "M'Sila", 'المسيلة', 'hautsPlateaux'],
  [29, 'Mascara', 'معسكر', 'ouest'],
  [30, 'Ouargla', 'ورقلة', 'sudNord'],
  [31, 'Oran', 'وهران', 'ouest'],
  [32, 'El Bayadh', 'البيض', 'hautsPlateaux'],
  [33, 'Illizi', 'إليزي', 'sudProfond'],
  [34, 'Bordj Bou Arréridj', 'برج بوعريريج', 'est'],
  [35, 'Boumerdès', 'بومرداس', 'alger'],
  [36, 'El Tarf', 'الطارف', 'est'],
  [37, 'Tindouf', 'تندوف', 'sudProfond'],
  [38, 'Tissemsilt', 'تيسمسيلت', 'hautsPlateaux'],
  [39, 'El Oued', 'الوادي', 'sudNord'],
  [40, 'Khenchela', 'خنشلة', 'est'],
  [41, 'Souk Ahras', 'سوق أهراس', 'est'],
  [42, 'Tipaza', 'تيبازة', 'alger'],
  [43, 'Mila', 'ميلة', 'est'],
  [44, 'Aïn Defla', 'عين الدفلى', 'centre'],
  [45, 'Naâma', 'النعامة', 'hautsPlateaux'],
  [46, 'Aïn Témouchent', 'عين تموشنت', 'ouest'],
  [47, 'Ghardaïa', 'غرداية', 'sudNord'],
  [48, 'Relizane', 'غليزان', 'ouest'],
  [49, 'Timimoun', 'تيميمون', 'sudProfond'],
  [50, 'Bordj Badji Mokhtar', 'برج باجي مختار', 'sudProfond'],
  [51, 'Ouled Djellal', 'أولاد جلال', 'sudNord'],
  [52, 'Béni Abbès', 'بني عباس', 'sudProfond'],
  [53, 'In Salah', 'عين صالح', 'sudProfond'],
  [54, 'In Guezzam', 'عين قزام', 'sudProfond'],
  [55, 'Touggourt', 'تقرت', 'sudNord'],
  [56, 'Djanet', 'جانت', 'sudProfond'],
  [57, "El M'Ghair", 'المغير', 'sudNord'],
  [58, 'El Meniaa', 'المنيعة', 'sudNord'],
];

export const WILAYAS = LIST.map(([code, nom, nomAr, band]) => ({
  code,
  nom,
  nomAr,
  fraisDomicile: BANDS[band].domicile,
  fraisStopDesk: BANDS[band].stopDesk,
  isActive: true,
}));

export default WILAYAS;
