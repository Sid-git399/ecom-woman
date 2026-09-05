/**
 * Locale-aware formatting.
 *
 * Digits stay Western (0-9) in Arabic as well as French. Algeria writes prices,
 * phone numbers and dates with Western digits in both languages; switching to
 * Arabic-Indic numerals would look foreign to the customer this shop serves.
 * Only the currency suffix and the date names change.
 */

const NBSP = ' ';

const CURRENCY = { fr: 'DA', ar: 'دج' };

/**
 * `4 500.00 DA` in French, `4 500.00 دج` in Arabic. Space as the thousands
 * separator, two decimals, non-breaking so a five-digit price never wraps
 * mid-number at 360px.
 *
 * Every price in the storefront and the admin goes through this.
 */
export function formatPrice(value, locale = 'fr') {
  const n = Number(value);
  const suffix = CURRENCY[locale] || CURRENCY.fr;
  if (!Number.isFinite(n)) return `0${NBSP}${suffix}`;

  const [whole, decimals] = Math.abs(n).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 ? '-' : ''}${grouped}.${decimals}${NBSP}${suffix}`;
}

/** Without the decimals, for dense admin tables where `.00` is noise. */
export function formatPriceShort(value, locale = 'fr') {
  const n = Number(value);
  const suffix = CURRENCY[locale] || CURRENCY.fr;
  if (!Number.isFinite(n)) return `0${NBSP}${suffix}`;
  const grouped = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 ? '-' : ''}${grouped}${NBSP}${suffix}`;
}

export function formatDate(value, locale = 'fr') {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d);
}

export function formatDateTime(value, locale = 'fr') {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const tag = locale === 'ar' ? 'ar-DZ' : 'fr-DZ';
  const date = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d);
  const time = new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(d);
  return `${date} ${time}`;
}

/** Algerian mobile numbers as `05 40 87 03 82`. */
export function formatPhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('213')) digits = `0${digits.slice(3)}`;
  if (digits.length !== 10) return raw;
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

/** Digits-only international form, for tel: and wa.me links. */
export function toInternational(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('213')) return digits;
  if (digits.startsWith('0')) return `213${digits.slice(1)}`;
  return `213${digits}`;
}
