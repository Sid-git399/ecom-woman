/**
 * WardaRose — the shop's mark.
 *
 * An open rose seen from above: two offset rings of vesica petals around a
 * centre. Geometric rather than illustrated, so it stays crisp at any size and
 * can be regenerated if the brand ever needs a variant.
 *
 * It appears in exactly four places and nowhere else:
 *   1. the loading state
 *   2. the divider between major page sections
 *   3. the empty-state illustration
 *   4. an oversized, very low opacity watermark behind the footer
 * One device used four times reads as art direction. The same device used
 * fifteen times reads as a template, so it is deliberately absent from the
 * navbar, the product cards and the buttons.
 */

// Two rings, sixteen petals. Legible from about 64px up.
const FULL = [
  'M100 74Q121 50 100 26Q79 50 100 74',
  'M118.38 81.62Q150.2 79.49 152.33 47.67Q120.51 49.8 118.38 81.62',
  'M126 100Q150 121 174 100Q150 79 126 100',
  'M118.38 118.38Q120.51 150.2 152.33 152.33Q150.2 120.51 118.38 118.38',
  'M100 126Q79 150 100 174Q121 150 100 126',
  'M81.62 118.38Q49.8 120.51 47.67 152.33Q79.49 150.2 81.62 118.38',
  'M74 100Q50 79 26 100Q50 121 74 100',
  'M81.62 81.62Q79.49 49.8 47.67 47.67Q49.8 79.49 81.62 81.62',
  'M104.21 89.84Q120.3 79.73 116.07 61.2Q99.98 71.31 104.21 89.84',
  'M110.16 95.79Q128.69 100.02 138.8 83.93Q120.27 79.7 110.16 95.79',
  'M110.16 104.21Q120.27 120.3 138.8 116.07Q128.69 99.98 110.16 104.21',
  'M104.21 110.16Q99.98 128.69 116.07 138.8Q120.3 120.27 104.21 110.16',
  'M95.79 110.16Q79.7 120.27 83.93 138.8Q100.02 128.69 95.79 110.16',
  'M89.84 104.21Q71.31 99.98 61.2 116.07Q79.73 120.3 89.84 104.21',
  'M89.84 95.79Q79.73 79.7 61.2 83.93Q71.31 100.02 89.84 95.79',
  'M95.79 89.84Q100.02 71.31 83.93 61.2Q79.7 79.73 95.79 89.84',
];

// Outer ring only. Below 64px the inner ring closes up into a blob.
const COMPACT = [
  'M100 74Q121 50 100 26Q79 50 100 74',
  'M118.38 81.62Q150.2 79.49 152.33 47.67Q120.51 49.8 118.38 81.62',
  'M126 100Q150 121 174 100Q150 79 126 100',
  'M118.38 118.38Q120.51 150.2 152.33 152.33Q150.2 120.51 118.38 118.38',
  'M100 126Q79 150 100 174Q121 150 100 126',
  'M81.62 118.38Q49.8 120.51 47.67 152.33Q79.49 150.2 81.62 118.38',
  'M74 100Q50 79 26 100Q50 121 74 100',
  'M81.62 81.62Q79.49 49.8 47.67 47.67Q49.8 79.49 81.62 81.62',
];

export default function WardaRose({
  size = 96,
  variant = 'auto',
  strokeWidth,
  className = '',
  title,
  ...rest
}) {
  const compact = variant === 'compact' || (variant === 'auto' && size < 64);
  const petals = compact ? COMPACT : FULL;
  const sw = strokeWidth ?? (compact ? 3.4 : 2.4);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g stroke="currentColor" strokeWidth={sw} strokeLinejoin="round">
        {petals.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx="100" cy="100" r={compact ? 9 : 7.5} />
      </g>
    </svg>
  );
}
