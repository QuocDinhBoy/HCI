/* ─── Button Component ─────────────────────────────────────
   Sử dụng class-based thay inline style để dễ override
───────────────────────────────────────────────────────────── */

const PALETTE = {
  primary: 'btn-primary',
  success: 'btn-success',
  warm:    'btn-warm',
  purple:  'btn-purple',
  ghost:   'btn-ghost',
  danger:  'btn-danger',
};

const SIZES = {
  sm:  'btn-sm',
  md:  '',
  lg:  'btn-lg',
  xl:  'btn-xl',
  kid: 'btn-kid',
};

export default function Button({
  children,
  type     = 'button',
  variant  = 'primary',
  size     = 'md',
  full     = false,
  disabled = false,
  onClick,
  style,
  className = '',
  id,
}) {
  const variantClass = PALETTE[variant] || 'btn-primary';
  const sizeClass    = SIZES[size]    || '';

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={[
        'btn',
        variantClass,
        sizeClass,
        full ? 'btn-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}
