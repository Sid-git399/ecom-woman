import { forwardRef, useId } from 'react';
import { Link } from 'react-router-dom';

/**
 * Buttons, fields and the page shell.
 *
 * Variants are complete class strings rather than a base plus overrides.
 * Tailwind resolves conflicts by stylesheet order, not by the order classes
 * appear in the attribute, so `bg-plum` after `bg-transparent` in a template
 * literal does not reliably win — a lesson from a hero CTA that lost its fill
 * on the previous build of this shop.
 */

const VARIANTS = {
  primary:
    'bg-plum text-blush hover:bg-plum-deep active:bg-plum-deep disabled:bg-taupe disabled:text-ink-soft',
  secondary:
    'border border-plum bg-transparent text-plum hover:bg-plum hover:text-blush disabled:border-taupe disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft',
  soft:
    'bg-shell text-ink hover:bg-blush disabled:bg-shell disabled:text-ink-soft',
  // On the plum hero band, where the plum button would disappear.
  onPlum:
    'bg-porcelain text-plum hover:bg-blush disabled:bg-plum-deep disabled:text-ink-soft',
  ghost:
    'bg-transparent text-plum underline-offset-4 hover:underline disabled:text-ink-soft',
};

const TAILLES = {
  // 44px minimum: the smallest reliable tap target on a phone.
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-6 text-sm',
  lg: 'min-h-13 px-8 text-base',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', as, to, children, ...props },
  ref
) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-pill transition-colors duration-200',
    'disabled:cursor-not-allowed',
    TAILLES[size] || TAILLES.md,
    VARIANTS[variant] || VARIANTS.primary,
    className,
  ].join(' ');

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  const Tag = as || 'button';
  return (
    <Tag ref={ref} className={classes} {...(Tag === 'button' ? { type: props.type || 'button' } : {})} {...props}>
      {children}
    </Tag>
  );
});

/**
 * A labelled input with its error wired up.
 *
 * The error is tied to the input through aria-describedby and aria-invalid, so
 * a screen reader announces what is wrong when focus lands there — a red
 * border alone says nothing to someone who cannot see it.
 */
export const Field = forwardRef(function Field(
  { label, error, aide, as = 'input', className = '', required, children, id: idProp, ...props },
  ref
) {
  const generated = useId();
  const id = idProp || generated;
  const aideId = `${id}-aide`;
  const errorId = `${id}-erreur`;

  const Tag = as;
  const base = [
    'w-full min-w-0 rounded-md border bg-porcelain px-3 py-2.5 text-ink',
    'placeholder:text-ink-soft/70 transition-colors',
    error ? 'border-rose-deep' : 'border-taupe focus:border-rose-deep',
    as === 'textarea' ? 'min-h-28 resize-y' : 'min-h-12',
    className,
  ].join(' ');

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-ink-soft">
        {label}
        {required ? <span className="text-rose-deep" aria-hidden="true"> *</span> : null}
      </label>
      <Tag
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[aide ? aideId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className={base}
        {...props}
      >
        {children}
      </Tag>
      {aide && !error ? (
        <p id={aideId} className="text-xs text-ink-soft">
          {aide}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-rose-deep" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

/** Page width. One place, so every page lines up with the header. */
export function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, titre, sub, className = '', align = 'start' }) {
  const alignement = align === 'center' ? 'items-center text-center' : 'items-start text-start';
  return (
    <div className={`flex flex-col ${alignement} ${className}`}>
      {eyebrow ? (
        <span className="mb-2 text-xs uppercase tracking-[0.18em] text-rose-deep">{eyebrow}</span>
      ) : null}
      <h2 className="font-display text-3xl text-ink sm:text-4xl">{titre}</h2>
      {sub ? <p className="mt-3 max-w-xl text-ink-soft">{sub}</p> : null}
    </div>
  );
}

/** A rose hairline. The brand mark used sparingly, as a rule rather than art. */
export function Hairline({ className = '' }) {
  return <span className={`block h-px w-12 bg-rose ${className}`} aria-hidden="true" />;
}
