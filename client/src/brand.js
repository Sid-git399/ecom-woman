/**
 * Brand constants.
 *
 * "Warda" is وردة, Arabic for rose. It works spoken in both French and Arabic,
 * which is the whole point for a shop whose customers switch between them
 * mid-sentence.
 *
 * The contact block is a build-time fallback. At runtime the Settings record
 * from the API wins, so the shop can change its phone number from the admin
 * without a redeploy.
 */

export const brand = {
  name: 'Warda',
  nameAr: 'ووردة',
  descriptor: { fr: 'Prêt-à-porter féminin', ar: 'ملابس نسائية' },
};

export const contact = {
  telephone: '0550123456',
  telephone2: '',
  whatsapp: '213550123456',
  adresse: { fr: 'Alger Centre, Alger', ar: 'الجزائر الوسطى، الجزائر' },
  horaires: {
    fr: 'Samedi au jeudi, 10h00 à 19h00. Vendredi fermé.',
    ar: 'السبت إلى الخميس، من 10:00 إلى 19:00. الجمعة مغلق.',
  },
  instagram: 'warda.dz',
  facebook: '',
  tiktok: '',
};

/**
 * Pre-filled WhatsApp message for the product page fallback. Many customers
 * never touch the cart, so this carries the reference and the chosen size into
 * the chat rather than opening a blank conversation.
 */
export function whatsappProductLink(product, { taille, couleur } = {}, phone = contact.whatsapp, locale = 'fr') {
  const lines =
    locale === 'ar'
      ? [
          'مرحبا ووردة،',
          `أريد طلب: ${product?.nom?.ar || product?.nom?.fr || ''}`,
          product?.ref ? `المرجع: ${product.ref}` : null,
          taille ? `المقاس: ${taille}` : null,
          couleur ? `اللون: ${couleur}` : null,
        ]
      : [
          'Bonjour Warda,',
          `Je souhaite commander : ${product?.nom?.fr || ''}`,
          product?.ref ? `Réf : ${product.ref}` : null,
          taille ? `Taille : ${taille}` : null,
          couleur ? `Couleur : ${couleur}` : null,
        ];

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;
}

export function whatsappLink(message, phone = contact.whatsapp) {
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export const instagramUrl = (handle = contact.instagram) => `https://instagram.com/${handle}`;
