import type { Question } from "../data/questions";
import type { RunResult } from "./runner";

export interface CheckResult {
  passed: boolean;
  message: string;
  expected?: string;
  got?: string;
}

export function normaliseOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
}

export function checkAnswer(result: RunResult, q: Question): CheckResult {
  const test = q.test;
  if (test.kind === "function") {
    return { passed: false, message: "Function tests arrive with the Python engine." };
  }
  const expected = normaliseOutput(test.expected);
  if (result.status !== "ok") {
    const message =
      result.status === "timeout"
        ? "Your code took too long to finish. Check for loops that never end."
        : "Your code hit an error before it could finish. Read the message in Output and try again.";
    return { passed: false, message, expected, got: normaliseOutput(result.stderr || result.stdout) };
  }
  const got = normaliseOutput(result.stdout);
  if (got === expected) return { passed: true, message: "Output matches exactly!", expected, got };
  return {
    passed: false,
    message: got === "" ? "Your code printed nothing. Did you forget print()?" : "Close! The output does not match yet.",
    expected,
    got,
  };
}
