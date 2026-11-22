import { useCallback, useMemo, useReducer, useRef } from "react";
import { QUESTIONS, type Question } from "../data/questions";
import { LESSONS, type Topic } from "../data/lessons";
import type { CheckResult } from "../engine/check";

export type Phase = "recap" | "ready" | "running" | "celebrating" | "correct" | "timeout" | "complete";
export type PipEventType = "none" | "wake" | "correct" | "wrong" | "timeout";

export const XP_CORRECT = 10;
export const XP_SPEED_BONUS = 5;
export const XP_PER_COMBO = 2;
export const XP_TOPIC_COMPLETE = 30;

export interface Reward {
  base: number;
  speed: number;
  combo: number;
  total: number;
  /** Consecutive first-try corrects including this answer (0 when this was not a first try). */
  streak: number;
}

export function levelForXp(xp: number) {
  return Math.floor(xp / 50) + 1;
}

/** Rewards: +10 per correct, +5 if solved in under half the time without the hint, +2 per combo level. */
export function computeReward(args: {
  elapsedMs: number;
  limitMs: number;
  hintUsed: boolean;
  firstTry: boolean;
  prevStreak: number;
}): Reward {
  const speed = !args.hintUsed && args.elapsedMs < args.limitMs / 2 ? XP_SPEED_BONUS : 0;
  const streak = args.firstTry ? args.prevStreak + 1 : 0;
  const combo = streak >= 2 ? (streak - 1) * XP_PER_COMBO : 0;
  return { base: XP_CORRECT, speed, combo, total: XP_CORRECT + speed + combo, streak };
}

export interface FlowState {
  phase: Phase;
  qIndex: number;
  solved: number;
  xp: number;
  streak: number;
  attempts: number;
  hintUsed: boolean;
  code: string;
  codeFor: string | null;
  lastCheck: CheckResult | null;
  lastReward: Reward | null;
  pipEvent: { type: PipEventType; id: number };
}

type Action =
  | { type: "START_QUESTIONS" }
  | { type: "START"; starter: string; qid: string }
  | { type: "SET_CODE"; code: string }
  | { type: "CORRECT"; check: CheckResult; reward: Reward }
  | { type: "WRONG"; check: CheckResult }
  | { type: "TIMEOUT" }
  | { type: "PIP_DONE" }
  | { type: "NEXT"; isLast: boolean }
  | { type: "RETRY" }
  | { type: "HINT" }
  | { type: "CLEAR_CHECK" };

function reducer(s: FlowState, a: Action): FlowState {
  const ev = (type: PipEventType) => ({ type, id: s.pipEvent.id + 1 });
  switch (a.type) {
    case "START_QUESTIONS":
      return s.phase === "recap" ? { ...s, phase: "ready" } : s;
    case "START": {
      if (s.phase !== "ready") return s;
      const fresh = s.codeFor !== a.qid;
      return {
        ...s,
        phase: "running",
        code: fresh ? a.starter : s.code,
        codeFor: a.qid,
        attempts: fresh ? 0 : s.attempts,
        hintUsed: fresh ? false : s.hintUsed,
        lastCheck: null,
        pipEvent: ev("wake"),
      };
    }
    case "SET_CODE":
      return { ...s, code: a.code };
    case "CORRECT":
      if (s.phase !== "running") return s;
      return {
        ...s,
        phase: "celebrating",
        solved: s.solved + 1,
        xp: s.xp + a.reward.total,
        streak: a.reward.streak,
        lastCheck: a.check,
        lastReward: a.reward,
        pipEvent: ev("correct"),
      };
    case "WRONG":
      if (s.phase !== "running") return s;
      return { ...s, attempts: s.attempts + 1, streak: 0, lastCheck: a.check, pipEvent: ev("wrong") };
    case "TIMEOUT":
      if (s.phase !== "running") return s;
      return { ...s, phase: "timeout", streak: 0, attempts: s.attempts + 1, pipEvent: ev("timeout") };
    case "PIP_DONE":
      return s.phase === "celebrating" ? { ...s, phase: "correct" } : s;
    case "NEXT":
      if (s.phase !== "correct") return s;
      if (a.isLast) return { ...s, phase: "complete", xp: s.xp + XP_TOPIC_COMPLETE };
      return { ...s, phase: "ready", qIndex: s.qIndex + 1, lastCheck: null, hintUsed: false };
    case "RETRY":
      return s.phase === "timeout" ? { ...s, phase: "running", lastCheck: null, pipEvent: ev("wake") } : s;
    case "HINT":
      return { ...s, hintUsed: true };
    case "CLEAR_CHECK":
      return { ...s, lastCheck: null };
  }
}

export function usePlayFlow(topicId: string, onReward?: (r: { xp: number }) => void) {
  const topic: Topic | undefined = useMemo(
    () => LESSONS.flatMap((l) => l.topics).find((t) => t.id === topicId),
    [topicId],
  );
  const questions: Question[] = useMemo(() => QUESTIONS[topicId] ?? [], [topicId]);
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    phase: "recap" as Phase,
    qIndex: 0,
    solved: 0,
    xp: 0,
    streak: 0,
    attempts: 0,
    hintUsed: false,
    code: "",
    codeFor: null,
    lastCheck: null,
    lastReward: null,
    pipEvent: { type: "none" as PipEventType, id: 0 },
  }));
  const stateRef = useRef(state);
  stateRef.current = state;
  const rewardRef = useRef(onReward);
  rewardRef.current = onReward;

  const question = questions[state.qIndex] ?? questions[0];
  const isLast = state.qIndex >= questions.length - 1;

  const startQuestions = useCallback(() => dispatch({ type: "START_QUESTIONS" }), []);
  const start = useCallback(() => {
    const q = questions[stateRef.current.qIndex];
    if (q) dispatch({ type: "START", starter: q.starterCode, qid: q.id });
  }, [questions]);
  const setCode = useCallback((code: string) => dispatch({ type: "SET_CODE", code }), []);
  const markCorrect = useCallback(
    (check: CheckResult, elapsedMs: number, limitMs: number) => {
      const s = stateRef.current;
      if (s.phase !== "running") return null;
      const reward = computeReward({
        elapsedMs,
        limitMs,
        hintUsed: s.hintUsed,
        firstTry: s.attempts === 0,
        prevStreak: s.streak,
      });
      dispatch({ type: "CORRECT", check, reward });
      rewardRef.current?.({ xp: reward.total });
      return reward;
    },
    [],
  );
  const markWrong = useCallback((check: CheckResult) => dispatch({ type: "WRONG", check }), []);
  const markTimeout = useCallback(() => dispatch({ type: "TIMEOUT" }), []);
  const pipDone = useCallback(() => dispatch({ type: "PIP_DONE" }), []);
  const next = useCallback(() => {
    const last = stateRef.current.qIndex >= questions.length - 1;
    if (stateRef.current.phase !== "correct") return;
    dispatch({ type: "NEXT", isLast: last });
    if (last) rewardRef.current?.({ xp: XP_TOPIC_COMPLETE });
  }, [questions.length]);
  const retry = useCallback(() => dispatch({ type: "RETRY" }), []);
  const useHint = useCallback(() => dispatch({ type: "HINT" }), []);
  const clearCheck = useCallback(() => dispatch({ type: "CLEAR_CHECK" }), []);

  return {
    state,
    topic,
    questions,
    question,
    isLast,
    level: levelForXp(state.xp),
    actions: { startQuestions, start, setCode, markCorrect, markWrong, markTimeout, pipDone, next, retry, useHint, clearCheck },
  };
}
