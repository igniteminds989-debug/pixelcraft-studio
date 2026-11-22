import { useEffect, useState } from "react";
import type { Question } from "../data/questions";
import type { Topic } from "../data/lessons";
import type { Phase } from "./usePlayFlow";
import { PanelDecor } from "./HudBar";
import { RecapPanel } from "./RecapPanel";

const DIFF: Record<Question["difficulty"], { label: string; cls: string }> = {
  warmup: { label: "Warm-up", cls: "pa-chip-green" },
  apply: { label: "Apply", cls: "pa-chip-gold" },
  twist: { label: "Twist", cls: "pa-chip-purple" },
};

export function QuestionPanel({
  topic, question, qIndex, total, solved, phase, hintUsed, onUseHint, onStartQuestions, crumbs,
}: {
  topic: Topic;
  question: Question;
  qIndex: number;
  total: number;
  solved: number;
  phase: Phase;
  hintUsed: boolean;
  onUseHint: () => void;
  onStartQuestions: () => void;
  crumbs: string[];
}) {
  const [tab, setTab] = useState<"problem" | "recap">("problem");
  const [hintOpen, setHintOpen] = useState(false);
  useEffect(() => {
    setHintOpen(false);
    setTab("problem");
  }, [question.id]);

  const isRecap = phase === "recap";
  const diff = DIFF[question.difficulty];
  const canHint = phase === "running" || hintUsed;

  return (
    <section className="pa-panel pa-tablet" aria-label="Question">
      <PanelDecor />
      <div className="pa-plaque">
        <span className="pa-plaque-gem" aria-hidden />
        <h2 className="pa-plaque-title">{isRecap ? "Topic recap" : question.title}</h2>
        <span className="pa-plaque-gem" aria-hidden />
      </div>

      {!isRecap && (
        <div className="pa-chiprow">
          <span className={"pa-chip " + diff.cls}>{diff.label}</span>
          <span className="pa-chip pa-chip-stone">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <path d="M12 9v4l3 2M9 2h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
            {question.timeLimitSeconds}s
          </span>
          <span className="pa-chip pa-chip-xp">+10 XP</span>
          <div className="pa-subtabs" role="tablist" aria-label="Question sections">
            <button type="button" role="tab" aria-selected={tab === "problem"} className="pa-subtab" onClick={() => setTab("problem")}>Problem</button>
            <button type="button" role="tab" aria-selected={tab === "recap"} className="pa-subtab" onClick={() => setTab("recap")}>Recap</button>
          </div>
        </div>
      )}

      <div className="pa-tablet-body pa-scroll">
        {isRecap ? (
          <RecapPanel topic={topic} onStart={onStartQuestions} />
        ) : tab === "recap" ? (
          <RecapPanel topic={topic} showStart={false} />
        ) : (
          <div className="pa-problem" key={question.id}>
            <h3 className="pa-section-title"><span className="pa-rune-line" aria-hidden />Problem</h3>
            <p className="pa-prompt">{question.prompt}</p>

            <h3 className="pa-section-title"><span className="pa-rune-line" aria-hidden />Examples</h3>
            <div className="pa-example">
              <div className="pa-example-col">
                <span className="pa-example-label">Input</span>
                <pre className="pa-example-code">{question.example.input}</pre>
              </div>
              <div className="pa-example-col">
                <span className="pa-example-label">Output</span>
                <pre className="pa-example-code pa-example-out">{question.example.output}</pre>
              </div>
            </div>

            <h3 className="pa-section-title"><span className="pa-rune-line" aria-hidden />Rule</h3>
            <div className="pa-chiprow pa-chiprow-tight">
              <span className="pa-chip pa-chip-rule">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" fill="currentColor" />
                </svg>
                {question.rule}
              </span>
            </div>

            <div className={"pa-hint" + (hintOpen ? " pa-hint-open" : "")}>
              <button
                type="button"
                className="pa-hint-toggle"
                aria-expanded={hintOpen}
                disabled={!canHint}
                onClick={() => {
                  if (!hintOpen && !hintUsed) onUseHint();
                  setHintOpen((o) => !o);
                }}
              >
                <span className="pa-hint-bulb" aria-hidden>💡</span>
                <span>{hintOpen ? "Hide hint" : canHint ? "Show hint" : "Hint unlocks when you start"}</span>
                {!hintUsed && canHint && <small>removes speed bonus</small>}
                <span className="pa-hint-caret" aria-hidden>▾</span>
              </button>
              {hintOpen && <div className="pa-hint-body">{question.hint}</div>}
            </div>
          </div>
        )}
      </div>

      <footer className="pa-tablet-foot">
        <span className="pa-foot-crumb">{crumbs.join(" › ")}</span>
        <ol className="pa-stepper" aria-label={`Question ${qIndex + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <li
              key={i}
              className={
                "pa-step" + (i < solved ? " pa-step-done" : "") + (i === qIndex && !isRecap && phase !== "complete" ? " pa-step-cur" : "")
              }
            >
              {i + 1}
            </li>
          ))}
        </ol>
      </footer>
    </section>
  );
}
