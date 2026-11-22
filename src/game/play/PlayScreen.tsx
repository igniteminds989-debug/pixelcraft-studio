import { useCallback, useEffect, useRef, useState } from "react";
import "./play.css";
import { LESSONS } from "../data/lessons";
import { runCode } from "../engine/runner";
import { checkAnswer, type CheckResult } from "../engine/check";
import { usePlayFlow } from "./usePlayFlow";
import { useCountdown } from "./useCountdown";
import { useGameAudio } from "./useGameAudio";
import { PipStage } from "./PipStage";
import { QuestionPanel } from "./QuestionPanel";
import { CodeEditor } from "./CodeEditor";
import { OutputPanel, type OutLine } from "./OutputPanel";
import { TopBar, StageHud, PanelDecor, SnakeIcon } from "./HudBar";
import { TopicCompleteOverlay } from "./TopicCompleteOverlay";

export interface PlayScreenProps {
  topicId: string;
  onBack: () => void;
  onTopicComplete: (topicId: string) => void;
  onReward?: (r: { xp: number }) => void;
}

const hasRealCode = (code: string) => code.split("\n").some((l) => l.trim() !== "" && !l.trim().startsWith("#"));

export function PlayScreen({ topicId, onBack, onTopicComplete, onReward }: PlayScreenProps) {
  const audio = useGameAudio();
  const flow = usePlayFlow(topicId, onReward);
  const { state, topic, questions, question, isLast, level, actions } = flow;
  const [announce, setAnnounce] = useState("");
  const [mobileTab, setMobileTab] = useState<"question" | "code">("question");
  const [outTab, setOutTab] = useState<"output" | "results">("output");
  const [lines, setLines] = useState<OutLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [typingTick, setTypingTick] = useState(0);
  const [idleCurious, setIdleCurious] = useState(false);
  const lastTypingRef = useRef(0);
  const idleTimerRef = useRef<number | undefined>(undefined);

  const onExpire = useCallback(() => {
    actions.markTimeout();
    audio.play("timeup");
    setAnnounce("Time's up! Pip fell asleep.");
  }, [actions, audio]);
  const countdown = useCountdown(question?.timeLimitSeconds ?? 60, onExpire);

  const phase = state.phase;

  // keep the timer frozen at full time in recap/ready
  useEffect(() => {
    if (phase === "ready" || phase === "recap") countdown.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.id]);

  // tick in the last 10 seconds
  const secsLeft = Math.ceil(countdown.remainingMs / 1000);
  useEffect(() => {
    if (countdown.running && secsLeft <= 10 && secsLeft > 0) audio.play("tick");
  }, [secsLeft, countdown.running, audio]);

  // curious tilt after 15s without typing
  const armIdle = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    setIdleCurious(false);
    idleTimerRef.current = window.setTimeout(() => setIdleCurious(true), 15000);
  }, []);
  useEffect(() => {
    if (phase === "running") armIdle();
    else {
      window.clearTimeout(idleTimerRef.current);
      setIdleCurious(false);
    }
    return () => window.clearTimeout(idleTimerRef.current);
  }, [phase, armIdle]);

  const onTyping = useCallback(() => {
    armIdle();
    const now = Date.now();
    if (now - lastTypingRef.current > 450) {
      lastTypingRef.current = now;
      setTypingTick((t) => t + 1);
    }
  }, [armIdle]);

  if (!topic || !question) {
    return (
      <div className="pa-root pa-root-center">
        <p className="pa-missing">This topic has no questions yet.</p>
        <button type="button" className="pa-btn pa-btn-stone" onClick={onBack}>Back</button>
      </div>
    );
  }

  const lessonIdx = LESSONS.findIndex((l) => l.topics.some((t) => t.id === topicId));
  const crumbs = [`Lesson ${lessonIdx + 1}`, topic.title];

  const handleStartQuestions = () => {
    audio.play("tap");
    actions.startQuestions();
  };
  const handleStart = () => {
    audio.play("whoosh");
    actions.start();
    countdown.start();
    setLines([]);
    setOutTab("output");
    setMobileTab("code");
    setAnnounce(`Question ${state.qIndex + 1} started. ${question.timeLimitSeconds} seconds.`);
  };
  const handleRetry = () => {
    audio.play("whoosh");
    actions.retry();
    countdown.start();
    setAnnounce("Timer reset. Try again!");
  };

  const applyCheck = (check: CheckResult) => {
    if (check.passed) {
      countdown.stop();
      const reward = actions.markCorrect(check, countdown.elapsedMs, countdown.totalMs);
      if (!reward) return;
      audio.play("correct");
      setOutTab("results");
      setAnnounce(`Correct! Plus ${reward.total} XP.`);
    } else {
      actions.markWrong(check);
      audio.play("wrong");
      setOutTab("results");
      setAnnounce("Wrong answer. " + check.message);
    }
  };

  const doRun = async (submit: boolean) => {
    if (phase !== "running" || busy) return;
    audio.play("tap");
    setBusy(true);
    setOutTab("output");
    setLines((l) => [...l, { kind: "cmd", text: submit ? "submit terminal.py" : "python terminal.py" }]);
    const result = await runCode(state.code, question);
    setBusy(false);
    setLines((l) => [
      ...l,
      ...(result.stdout ? [{ kind: "out" as const, text: result.stdout }] : []),
      ...(result.stderr ? [{ kind: "err" as const, text: result.stderr }] : []),
    ]);
    if (submit) applyCheck(checkAnswer(result, question));
  };

  // REMOVE BEFORE MERGE: dev-only simulation helpers
  const expected = question.test.kind === "stdout" ? question.test.expected : "";
  const simulateCorrect = () => {
    if (phase !== "running") return;
    setLines((l) => [...l, { kind: "cmd", text: "submit terminal.py (simulated)" }, { kind: "out", text: expected }]);
    applyCheck(checkAnswer({ status: "ok", stdout: expected, stderr: "" }, question));
  };
  const simulateWrong = () => {
    if (phase !== "running") return;
    setLines((l) => [...l, { kind: "cmd", text: "submit terminal.py (simulated)" }, { kind: "out", text: "Hello Pip" }]);
    applyCheck(checkAnswer({ status: "ok", stdout: "Hello Pip", stderr: "" }, question));
  };
  const simulateTimeout = () => {
    if (phase !== "running") return;
    countdown.stop();
    onExpire();
  };

  const handleNext = () => {
    audio.play(isLast ? "victory" : "tap");
    actions.next();
    setLines([]);
    setOutTab("output");
    setMobileTab("question");
    if (isLast) setAnnounce("Topic complete! Plus 30 XP.");
  };

  const locked = phase !== "running";
  const urgent = phase === "running" && countdown.remainingMs <= 10_000;
  const reward = state.lastReward;

  const lockContent =
    phase === "ready" ? (
      <>
        <span className="pa-lock-icon" aria-hidden>🔒</span>
        <span>Press start to unlock</span>
        <button type="button" className="pa-btn pa-btn-leaf pa-btn-sm" onClick={handleStart}>I'm ready, start!</button>
      </>
    ) : phase === "recap" ? (
      <>
        <span className="pa-lock-icon" aria-hidden>📜</span>
        <span>Read the recap, then start the questions</span>
      </>
    ) : phase === "timeout" ? (
      <>
        <span className="pa-lock-icon" aria-hidden>⏳</span>
        <span>Time's up. Try again to unlock</span>
      </>
    ) : (
      <>
        <span className="pa-lock-icon" aria-hidden>✨</span>
        <span>Nice work! Pip is on the move…</span>
      </>
    );

  return (
    <div className="pa-root" data-tab={mobileTab}>
      <div className="pa-ambient" aria-hidden />
      <TopBar onBack={() => { audio.play("tap"); onBack(); }} crumbs={crumbs} xp={state.xp} level={level} muted={audio.muted} onToggleMute={audio.toggleMute} />

      <main className="pa-layout">
        <div className="pa-col-left">
          <QuestionPanel
            topic={topic}
            question={question}
            qIndex={state.qIndex}
            total={questions.length}
            solved={state.solved}
            phase={phase}
            hintUsed={state.hintUsed}
            onUseHint={() => { audio.play("tap"); actions.useHint(); }}
            onStartQuestions={handleStartQuestions}
            crumbs={crumbs}
          />
        </div>

        <div className="pa-game-frame">
          <PanelDecor rivets={false} />
          <PipStage
            mode={phase === "running" || phase === "celebrating" ? "awake" : "sleep"}
            event={state.pipEvent}
            solved={state.solved}
            fruitCount={questions.length}
            xpGain={reward?.total ?? 10}
            typingTick={typingTick}
            idleCurious={idleCurious}
            urgent={urgent}
            onSequenceDone={actions.pipDone}
            onSfx={audio.play}
          >
            <StageHud
              fruitCount={questions.length}
              solved={state.solved}
              qIndex={state.qIndex}
              remainingMs={countdown.remainingMs}
              totalMs={countdown.totalMs}
              phase={phase}
              xp={state.xp}
              level={level}
              streak={state.streak}
            />

            {phase === "recap" && (
              <div className="pa-stage-overlay pa-stage-overlay-soft">
                <div className="pa-stage-card pa-pop">
                  <p className="pa-eyebrow">{crumbs[0]}</p>
                  <h2 className="pa-stage-card-title">{topic.title}</h2>
                  <p className="pa-stage-card-text">Pip is napping. Read the recap, then wake him up!</p>
                  <button type="button" className="pa-btn pa-btn-gold" onClick={handleStartQuestions}>Start questions</button>
                </div>
              </div>
            )}
            {phase === "ready" && (
              <div className="pa-stage-overlay pa-stage-overlay-soft">
                <div className="pa-stage-card pa-pop" key={question.id}>
                  <p className="pa-eyebrow">Question {state.qIndex + 1} of {questions.length}</p>
                  <h2 className="pa-stage-card-title">{question.title}</h2>
                  <button type="button" className="pa-btn pa-btn-gold pa-btn-lg pa-btn-breathe" onClick={handleStart}>
                    I'm ready, start!
                  </button>
                  <p className="pa-stage-card-text pa-small">{question.timeLimitSeconds} seconds on the clock</p>
                </div>
              </div>
            )}
            {phase === "timeout" && (
              <div className="pa-stage-overlay pa-stage-overlay-dim">
                <div className="pa-stage-card pa-pop">
                  <h2 className="pa-stage-card-title pa-title-danger">Time's up!</h2>
                  <p className="pa-stage-card-text">Pip dozed off. Your code is still there.</p>
                  <button type="button" className="pa-btn pa-btn-leaf" onClick={handleRetry}>Try again</button>
                </div>
              </div>
            )}
            {phase === "correct" && reward && (
              <div className="pa-stage-overlay pa-stage-overlay-right">
                <div className="pa-stage-card pa-result-card pa-pop">
                  <h2 className="pa-stage-card-title pa-title-win">Correct!</h2>
                  <ul className="pa-xp-breakdown">
                    <li><span>Correct answer</span><b>+{reward.base}</b></li>
                    {reward.speed > 0 && <li><span>Speed bonus</span><b>+{reward.speed}</b></li>}
                    {reward.combo > 0 && <li><span>Combo x{reward.streak}</span><b>+{reward.combo}</b></li>}
                    <li className="pa-xp-total"><span>Total</span><b>+{reward.total} XP</b></li>
                  </ul>
                  <button type="button" className="pa-btn pa-btn-gold" onClick={handleNext} autoFocus>
                    {isLast ? "Finish topic" : "Next question"}
                  </button>
                </div>
              </div>
            )}
          </PipStage>
        </div>

        <div className="pa-mobile-tabs" role="tablist" aria-label="Panels">
          <button type="button" role="tab" aria-selected={mobileTab === "question"} className="pa-mtab" onClick={() => { audio.play("tap"); setMobileTab("question"); }}>
            Question
          </button>
          <button type="button" role="tab" aria-selected={mobileTab === "code"} className="pa-mtab" onClick={() => { audio.play("tap"); setMobileTab("code"); }}>
            Code
          </button>
        </div>

        <section className="pa-panel pa-terminal" aria-label="Code terminal">
          <PanelDecor />
          <div className="pa-term-titlebar">
            <span className="pa-lanterns" aria-hidden><i /><i /><i /></span>
            <span className="pa-term-name"><SnakeIcon /> terminal.py</span>
            <span className="pa-term-keys">Ctrl+Enter run · Ctrl+Shift+Enter submit</span>
          </div>
          <div className="pa-term-body">
            <CodeEditor
              value={state.code || (phase === "running" ? "" : question.starterCode)}
              onChange={actions.setCode}
              locked={locked}
              lockContent={lockContent}
              onRun={() => void doRun(false)}
              onSubmit={() => void doRun(true)}
              onTyping={onTyping}
            />
            <OutputPanel
              tab={outTab}
              onTab={(t) => { audio.play("tap"); setOutTab(t); }}
              lines={lines}
              onClear={() => setLines([])}
              check={state.lastCheck}
              busy={busy}
            />
          </div>
          <div className="pa-term-actions">
            {import.meta.env.DEV && (
              /* REMOVE BEFORE MERGE: dev-only simulation panel */
              <div className="pa-dev" aria-label="Developer simulation">
                <span>dev</span>
                <button type="button" onClick={simulateCorrect} disabled={locked}>Simulate correct</button>
                <button type="button" onClick={simulateWrong} disabled={locked}>Simulate wrong</button>
                <button type="button" onClick={simulateTimeout} disabled={locked}>Simulate time-out</button>
              </div>
            )}
            <div className="pa-term-buttons">
              <button type="button" className="pa-btn pa-btn-stone" onClick={() => void doRun(false)} disabled={locked || busy}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M7 5l12 7-12 7z" fill="currentColor" /></svg>
                Run
              </button>
              <button
                type="button"
                className={"pa-btn pa-btn-leaf" + (!locked && hasRealCode(state.code) ? " pa-btn-pulse" : "")}
                onClick={() => void doRun(true)}
                disabled={locked || busy}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Submit
              </button>
            </div>
          </div>
        </section>
      </main>

      {phase === "complete" && (
        <TopicCompleteOverlay topic={topic} xp={state.xp} onBack={() => { audio.play("tap"); onTopicComplete(topicId); }} />
      )}

      <div className="pa-sr-only" aria-live="assertive" role="status">{announce}</div>
    </div>
  );
}
