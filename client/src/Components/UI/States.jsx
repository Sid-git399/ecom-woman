import { Link } from 'react-router-dom';
import { useT } from '../../i18n';

/**
 * Loading, empty and error states.
 *
 * `Loading` reserves a viewport by default, and that default is load-bearing.
 * A short loading state that occupies no height lets the footer render on
 * screen and then drop a full screen when the content arrives — measured at
 * 0.22 CLS on the previous build of this shop before the height was reserved.
 */

export function Loading({ className = 'min-h-[calc(100dvh-5rem)]', label }) {
  const t = useT();
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-live="polite">
      <span className="flex flex-col items-center gap-3 text-ink-soft">
        <span
          className="block h-8 w-8 animate-spin rounded-full border-2 border-taupe border-t-rose-deep"
          aria-hidden="true"
        />
        <span className="text-sm">{label || t.common.chargement}</span>
      </span>
    </div>
  );
}

/** Skeleton for the product grid, matching the card's 3:4 frame exactly. */
export function GridSkeleton({ n = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] w-full rounded-lg bg-shell" />
          <div className="mt-3 h-4 w-3/4 rounded bg-shell" />
          <div className="mt-2 h-4 w-1/3 rounded bg-shell" />
        </div>
      ))}
    </div>
  );
}

export function Empty({ titre, sub, action, to, onAction, icon }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      {icon ? <div className="mb-5 text-rose" aria-hidden="true">{icon}</div> : null}
      <h2 className="font-display text-2xl text-ink">{titre}</h2>
      {sub ? <p className="mt-3 text-ink-soft">{sub}</p> : null}
      {action && to ? (
        <Link
          to={to}
          className="mt-7 inline-flex min-h-11 items-center rounded-pill bg-plum px-6 text-sm text-blush transition-colors hover:bg-plum-deep"
        >
          {action}
        </Link>
      ) : null}
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-7 inline-flex min-h-11 items-center rounded-pill bg-plum px-6 text-sm text-blush transition-colors hover:bg-plum-deep"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className = 'min-h-[calc(100dvh-5rem)]' }) {
  const t = useT();
  return (
    <div className={`flex items-center justify-center px-4 ${className}`}>
      <div className="max-w-md text-center">
        <h2 className="font-display text-2xl text-ink">{t.common.erreur}</h2>
        <p className="mt-3 text-ink-soft">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-7 inline-flex min-h-11 items-center rounded-pill border border-plum px-6 text-sm text-plum transition-colors hover:bg-plum hover:text-blush"
          >
            {t.common.reessayer}
          </button>
        ) : null}
      </div>
    </div>
  );
}
