export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  full = false,
  disabled = false,
  onClick,
}) {
  const palette = {
    primary: {
      bg: 'linear-gradient(120deg,#17a2a2,#0f8f8f)',
      color: '#fff',
      border: 'none',
    },
    ghost: {
      bg: '#ffffff',
      color: '#2d5f77',
      border: '1px solid #cde2ee',
    },
    danger: {
      bg: '#ffe6e0',
      color: '#bc4a36',
      border: '1px solid #ffd0c8',
    },
    warm: {
      bg: 'linear-gradient(120deg,#f9b233,#ff7f6a)',
      color: '#fff',
      border: 'none',
    },
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: full ? '100%' : 'auto',
        borderRadius: 14,
        padding: '10px 16px',
        fontWeight: 800,
        letterSpacing: 0.3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform .15s ease, filter .2s ease',
        ...palette,
      }}
    >
      {children}
    </button>
  );
}
