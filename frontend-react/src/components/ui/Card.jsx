export default function Card({ children, style, className = '' }) {
  return (
    <section className={`surface-card ${className}`} style={{ padding: 16, ...style }}>
      {children}
    </section>
  );
}
