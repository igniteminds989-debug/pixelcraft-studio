import { useEffect, useRef } from "react";
import { Badge } from "../Badges";
import type { Topic } from "../data/lessons";

export function TopicCompleteOverlay({ topic, xp, onBack }: { topic: Topic; xp: number; onBack: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => btnRef.current?.focus(), 900);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="pa-victory" role="dialog" aria-modal="true" aria-labelledby="pa-victory-title">
      <div className="pa-victory-bg" aria-hidden />
      <div className="pa-victory-rays" aria-hidden />
      <div className="pa-victory-confetti" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.35}s`, animationDuration: `${3 + (i % 5) * 0.6}s` }} data-c={i % 4} />
        ))}
      </div>
      <div className="pa-victory-card">
        <p className="pa-eyebrow">Topic complete</p>
        <h2 id="pa-victory-title" className="pa-victory-title">{topic.title}</h2>
        <div className="pa-victory-hero">
          <img className="pa-victory-pip" src="/assets/pip-victory.png" alt="Pip celebrating with a crown" />
          <div className="pa-victory-badge">
            <Badge id={topic.badgeImage} size={96} />
            <span className="pa-victory-badge-name">{topic.badgeName}</span>
          </div>
        </div>
        <div className="pa-victory-xp">
          <span className="pa-victory-xp-big">+30 XP</span>
          <span className="pa-victory-xp-total">{xp} XP earned in this topic</span>
        </div>
        <button ref={btnRef} type="button" className="pa-btn pa-btn-gold pa-btn-lg" onClick={onBack}>
          Back to the map
        </button>
      </div>
    </div>
  );
}
