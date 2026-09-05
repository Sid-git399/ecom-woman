/**
 * Accent-stripping slug used for product and category URLs.
 *
 * Always built from the French name. Slugs must stay stable and ASCII: an
 * Arabic slug would percent-encode into an unreadable URL, and the shop shares
 * these links on Instagram.
 */
export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default slugify;
