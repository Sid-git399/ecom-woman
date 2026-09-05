import { m, useReducedMotion } from 'framer-motion';

/**
 * The one entrance animation the site uses.
 *
 * A short rise and fade, once, when a section reaches the viewport. Everything
 * else — cards, sections, hero lines — is this component with a delay, so the
 * whole site moves with one voice instead of six.
 *
 * Under `prefers-reduced-motion` it resolves to the final state rather than
 * freezing mid-flight: a customer who asked for less motion still has to be
 * able to read the page.
 */
export function Reveal({ children, delay = 0, y = 16, className = '', as = 'div', once = true }) {
  const reduit = useReducedMotion();
  const Tag = m[as] || m.div;

  if (reduit) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Staggered children, for grids. The delay is capped so row four is not slow. */
export function stagger(index, step = 0.06, max = 0.36) {
  return Math.min(index * step, max);
}

export default Reveal;
