import Button from '../ui/Button';

export default function CameraView({
  videoRef,
  title = 'Camera',
  subtitle,
  isActive,
  onStart,
  onStop,
  onCapture,
  captureDisabled = false,
  children,
}) {
  return (
    <div className="surface-card" style={{ padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 22 }}>{title}</h3>
        {subtitle ? <p style={{ color: '#4f758a', marginTop: 4 }}>{subtitle}</p> : null}
      </div>

      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: '#0f172a',
          border: '2px solid #d7e7f2',
          aspectRatio: '4 / 3',
          position: 'relative',
        }}
      >
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {children}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {!isActive ? (
          <Button variant="primary" onClick={onStart}>
            Bật camera
          </Button>
        ) : (
          <Button variant="danger" onClick={onStop}>
            Tắt camera
          </Button>
        )}

        {onCapture ? (
          <Button variant="warm" onClick={onCapture} disabled={!isActive || captureDisabled}>
            Chụp và phân tích
          </Button>
        ) : null}
      </div>
    </div>
  );
}
