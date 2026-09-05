import { useT } from '../../i18n';

/**
 * Order status.
 *
 * Every state carries a word as well as a colour. Colour alone excludes anyone
 * who cannot distinguish these hues, and "confirmée" versus "annulée" is not a
 * distinction to leave to a shade of pink.
 */
const STYLES = {
  NOUVELLE: 'bg-blush text-plum-deep',
  CONFIRMEE: 'bg-shell text-plum-deep border border-taupe',
  EN_PREPARATION: 'bg-taupe/60 text-ink',
  EXPEDIEE: 'bg-plum text-blush',
  LIVREE: 'bg-rose-deep text-porcelain',
  ANNULEE: 'bg-transparent text-ink-soft border border-taupe line-through',
};

export function StatutBadge({ statut, className = '' }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-xs ${STYLES[statut] || STYLES.NOUVELLE} ${className}`}
    >
      {t.statuts[statut] || statut}
    </span>
  );
}

export default StatutBadge;
