interface ContextualOverlayProps {
  spo2: number;
}

export default function ContextualOverlay({ spo2 }: ContextualOverlayProps) {
  // If SpO2 is normal, don't show the vignette
  if (spo2 >= 90) return null;

  // Calculate opacity based on severity of hypoxia (90 -> 0%, 50 -> 40%)
  const severity = Math.max(0, 90 - spo2);
  const opacity = Math.min(0.4, severity * 0.01); 

  return (
    <div 
      className="pointer-events-none absolute inset-0 z-50 mix-blend-multiply transition-opacity duration-1000 ease-in-out"
      style={{
        boxShadow: `inset 0 0 ${severity * 2}px ${severity}px rgba(10, 30, 80, ${opacity})`,
        opacity: opacity > 0 ? 1 : 0
      }}
    >
        {spo2 < 85 && (
            <div className="absolute inset-0 bg-blue-900/10 animate-pulse"></div>
        )}
    </div>
  );
}
