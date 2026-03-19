interface ContextualOverlayProps {
  spo2: number;
}

export default function ContextualOverlay({ spo2 }: ContextualOverlayProps) {
  // severity: 0 at SpO2=97, increases as SpO2 falls
  const severity = Math.max(0, 97 - spo2);
  // opacity: 0 at SpO2≥97, ~0.12 at SpO2=85, 0.47 max at SpO2=50
  const opacity = Math.min(0.47, severity * 0.013);

  // Pulsing blue overlay: fade in smoothly below SpO2=90
  const pulseOpacity = spo2 < 90 ? Math.min(1, (90 - spo2) / 10) : 0;

  if (opacity === 0 && pulseOpacity === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-1000 ease-in-out"
      style={{
        boxShadow: `inset 0 0 ${severity * 2}px ${severity}px rgba(10, 30, 80, ${opacity})`,
      }}
    >
      <div
        className="absolute inset-0 bg-blue-900/10 animate-pulse transition-opacity duration-1000"
        style={{ opacity: pulseOpacity }}
      />
    </div>
  );
}
