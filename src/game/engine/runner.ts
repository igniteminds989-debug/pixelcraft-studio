import type { Question } from "../data/questions";

export type RunResult = { status: "ok" | "error" | "timeout"; stdout: string; stderr: string };

export async function runCode(code: string, q: Question): Promise<RunResult> {
  void code;
  void q;
  await new Promise((r) => setTimeout(r, 400));
  return { status: "error", stdout: "", stderr: "Python engine not connected yet." };
}
