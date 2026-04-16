/* ─── Card Component ────────────────────────────────────────
   Variant-based pastel card with optional clickable/hover
───────────────────────────────────────────────────────────── */

const VARIANT_CLASS = {
  default:  '',
  sky:      'card-sky',
  mint:     'card-mint',
  sun:      'card-sun',
  lavender: 'card-lavender',
  coral:    'card-coral',
  peach:    'card-peach',
};

export default function Card({
  children,
  variant   = 'default',
  clickable = false,
  onClick,
  style,
  className = '',
  as: Tag   = 'div',
  href,
  id,
}) {
  const variantClass = VARIANT_CLASS[variant] || '';
  const classes = [
    'surface-card',
    variantClass,
    clickable ? 'card-clickable hover-lift' : '',
    className,
  ].filter(Boolean).join(' ');

  if (href) {
    return (
      <a id={id} href={href} className={classes} style={style}>
        {children}
      </a>
    );
  }

  return (
    <Tag id={id} className={classes} style={style} onClick={onClick}>
      {children}
    </Tag>
  );
}
