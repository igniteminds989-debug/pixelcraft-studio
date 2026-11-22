import { TimerRing } from "./TimerRing";
import type { Phase } from "./usePlayFlow";

/* Shared carved-stone ornaments: vine corners, leaves and gold rivets. */
export function PanelDecor({ rivets = true }: { rivets?: boolean }) {
  const vine = (
    <svg viewBox="0 0 80 80" className="pa-vine-svg" aria-hidden>
      <path d="M4 76C6 46 22 20 76 4" className="pa-vine-stem" />
      <path d="M10 52c-8-2-10-10-6-14 6 2 8 8 6 14z" className="pa-vine-leaf" />
      <path d="M22 30c-6-6-4-14 2-16 4 5 3 11-2 16z" className="pa-vine-leaf" />
      <path d="M40 16c-2-8 4-13 10-12 0 6-4 10-10 12z" className="pa-vine-leaf" />
      <path d="M28 40c6-1 11 3 10 8-6 1-10-2-10-8z" className="pa-vine-leaf pa-vine-leaf-light" />
      <path d="M52 14c5 2 7 7 4 10-5-2-6-6-4-10z" className="pa-vine-leaf pa-vine-leaf-light" />
    </svg>
  );
  return (
    <>
      <span className="pa-vine pa-vine-tl" aria-hidden>{vine}</span>
      <span className="pa-vine pa-vine-br" aria-hidden>{vine}</span>
      {rivets && (
        <>
          <span className="pa-rivet pa-rivet-tl" aria-hidden />
          <span className="pa-rivet pa-rivet-tr" aria-hidden />
          <span className="pa-rivet pa-rivet-bl" aria-hidden />
          <span className="pa-rivet pa-rivet-br" aria-hidden />
        </>
      )}
    </>
  );
}

export function SnakeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="pa-snake-icon">
      <path d="M6 19c-2 0-3-1.2-3-2.6S4.2 14 6 14h9c2 0 3.2-1.2 3.2-2.8S17 8.5 15 8.5H9.5" fill="none" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="8.5" cy="8.5" r="3" />
      <circle cx="7.6" cy="7.8" r=".7" className="pa-snake-eye" />
      <path d="M5.6 9.6l-1.8.9" strokeWidth="1.2" strokeLinecap="round" fill="none" className="pa-snake-tongue" />
    </svg>
  );
}

export function TopBar({
  onBack, crumbs, xp, level, muted, onToggleMute,
}: {
  onBack: () => void;
  crumbs: string[];
  xp: number;
  level: number;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <header className="pa-topbar">
      <button type="button" className="pa-btn pa-btn-stone pa-btn-sm" onClick={onBack} aria-label="Back to the map">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span>Map</span>
      </button>
      <nav className="pa-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="pa-crumb">
            {i > 0 && <span className="pa-crumb-sep" aria-hidden>›</span>}
            <span className={i === crumbs.length - 1 ? "pa-crumb-current" : undefined}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="pa-topbar-right">
        <div className="pa-xp-chip" aria-label={`Level ${level}, ${xp} XP`}>
          <span className="pa-xp-gem" aria-hidden>{level}</span>
          <span className="pa-xp-chip-text">
            <b>{xp}</b> XP
          </span>
        </div>
        <button
          type="button"
          className="pa-btn pa-btn-stone pa-btn-icon"
          onClick={onToggleMute}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          aria-pressed={!muted}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            {muted ? (
              <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}

function FruitDot({ filled, current }: { filled: boolean; current: boolean }) {
  return (
    <span className={"pa-hud-fruit" + (filled ? " pa-hud-fruit-on" : "") + (current ? " pa-hud-fruit-cur" : "")}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M12 7c-2.4-2-8-1.2-8 5 0 5 3.6 9 8 9s8-4 8-9c0-6.2-5.6-7-8-5z" className="pa-hud-fruit-body" />
        <path d="M12 7.5c0-2 .8-3.2 1.6-4" className="pa-hud-fruit-stem" />
        <path d="M13.4 4.6c2.4-2.4 5.2-1.6 5.6-.8-1.6 2-4 2.4-5.6.8z" className="pa-hud-fruit-leaf" />
      </svg>
    </span>
  );
}

export function StageHud({
  fruitCount, solved, qIndex, remainingMs, totalMs, phase, xp, level, streak,
}: {
  fruitCount: number;
  solved: number;
  qIndex: number;
  remainingMs: number;
  totalMs: number;
  phase: Phase;
  xp: number;
  level: number;
  streak: number;
}) {
  const into = xp % 50;
  return (
    <div className="pa-hud">
      <div className="pa-hud-tl" aria-label={`${solved} of ${fruitCount} fruits collected`}>
        {Array.from({ length: fruitCount }, (_, i) => (
          <FruitDot key={i} filled={i < solved} current={i === qIndex && phase !== "complete" && i >= solved} />
        ))}
      </div>
      <div className="pa-hud-tr">
        <TimerRing remainingMs={remainingMs} totalMs={totalMs} frozen={phase !== "running"} />
      </div>
      <div className="pa-hud-bl">
        <span className="pa-hud-level">Lv {level}</span>
        <span className="pa-hud-xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={50} aria-valuenow={into} aria-label="XP to next level">
          <span className="pa-hud-xpfill" style={{ transform: `scaleX(${into / 50})` }} />
        </span>
        <span className="pa-hud-xptext">{into}/50</span>
      </div>
      <div className="pa-hud-br">
        {streak >= 2 && (
          <span key={streak} className="pa-combo" aria-label={`Combo times ${streak}`}>
            <small>combo</small>x{streak}
          </span>
        )}
      </div>
    </div>
  );
}
