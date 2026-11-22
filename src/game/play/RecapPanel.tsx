import { Badge } from "../Badges";
import type { Topic } from "../data/lessons";

export function RecapPanel({ topic, onStart, showStart = true }: { topic: Topic; onStart?: () => void; showStart?: boolean }) {
  return (
    <div className="pa-recap">
      <div className="pa-recap-head">
        <Badge id={topic.badgeImage} size={56} className="pa-recap-badge" />
        <div>
          <p className="pa-eyebrow">Quick recap</p>
          <h3 className="pa-recap-title">{topic.title}</h3>
          <p className="pa-recap-desc">{topic.description}</p>
        </div>
      </div>
      <ul className="pa-recap-list">
        {topic.recap.map((line, i) => (
          <li key={i} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="pa-rune" aria-hidden>{["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ"][i % 6]}</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {showStart && onStart && (
        <button type="button" className="pa-btn pa-btn-gold pa-btn-lg pa-recap-start" onClick={onStart}>
          Start questions
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M8 5l11 7-11 7z" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  );
}
