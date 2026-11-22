export function TimerRing({ remainingMs, totalMs, size = 58, frozen = false }: { remainingMs: number; totalMs: number; size?: number; frozen?: boolean }) {
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const r = 24;
  const c = 2 * Math.PI * r;
  const secs = Math.ceil(remainingMs / 1000);
  const tone = frac < 0.2 ? "danger" : frac < 0.4 ? "warn" : "ok";
  const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div
      className={`pa-timer pa-timer-${tone}${frozen ? " pa-timer-frozen" : ""}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${secs} seconds left`}
    >
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <circle cx="30" cy="30" r="28" className="pa-timer-plate" />
        <circle cx="30" cy="30" r={r} className="pa-timer-track" />
        <circle
          cx="30"
          cy="30"
          r={r}
          className="pa-timer-arc"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <span className="pa-timer-text">{label}</span>
    </div>
  );
}
