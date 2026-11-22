import { describe, expect, it } from "vitest";
import { computeReward, levelForXp } from "./usePlayFlow";
import { checkAnswer } from "../engine/check";
import { QUESTIONS } from "../data/questions";
import { LESSONS } from "../data/lessons";

const base = { elapsedMs: 50_000, limitMs: 60_000, hintUsed: false, firstTry: true, prevStreak: 0 };

describe("PyArena rewards", () => {
  it("gives +10 XP for a correct answer", () => {
    expect(computeReward(base).total).toBe(10);
  });
  it("adds +5 speed bonus when solved in under half the time without the hint", () => {
    expect(computeReward({ ...base, elapsedMs: 20_000 }).speed).toBe(5);
  });
  it("drops the speed bonus when the hint was used", () => {
    expect(computeReward({ ...base, elapsedMs: 20_000, hintUsed: true }).speed).toBe(0);
  });
  it("adds +2 per combo level for consecutive first-try corrects", () => {
    expect(computeReward({ ...base, prevStreak: 1 }).combo).toBe(2);
    expect(computeReward({ ...base, prevStreak: 2 }).combo).toBe(4);
  });
  it("resets the combo when the answer was not a first try", () => {
    const r = computeReward({ ...base, firstTry: false, prevStreak: 3 });
    expect(r.streak).toBe(0);
    expect(r.combo).toBe(0);
  });
  it("levels up every 50 XP", () => {
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
  });
});

describe("Answer check", () => {
  const q = QUESTIONS["topic-2"]![2]!;
  it("ignores \\r\\n and trailing spaces", () => {
    expect(checkAnswer({ status: "ok", stdout: "2  \r\n1\n\n", stderr: "" }, q).passed).toBe(true);
  });
  it("fails when the code errored", () => {
    expect(checkAnswer({ status: "error", stdout: "2\n1", stderr: "boom" }, q).passed).toBe(false);
  });
  it("keeps questionCount equal to the real number of questions", () => {
    for (const t of LESSONS.flatMap((l) => l.topics)) expect(QUESTIONS[t.id]?.length).toBe(t.questionCount);
  });
});
