export type TestSpec =
  | { kind: "stdout"; expected: string }
  | { kind: "function"; fnName: string; cases: { args: unknown[]; expected: unknown }[] };

export interface Question {
  id: string;
  title: string;
  prompt: string;
  example: { input: string; output: string };
  rule: string;
  difficulty: "warmup" | "apply" | "twist";
  starterCode: string;
  timeLimitSeconds: number;
  test: TestSpec;
  hint: string;
}

const START = "# Write your code below";

export const QUESTIONS: Record<string, Question[]> = {
  "topic-1": [
    {
      id: "topic-1-q1",
      title: "Hello, Pip!",
      prompt: "Print exactly: Hello, Pip!",
      example: { input: "(no input)", output: "Hello, Pip!" },
      rule: "Match every letter, comma and the ! exactly",
      difficulty: "warmup",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "Hello, Pip!" },
      hint: "Put the text in quotes inside print().",
    },
    {
      id: "topic-1-q2",
      title: "Two values, one line",
      prompt: "Print the word Pip and the number 1 on ONE line, separated by a space, using a single print().",
      example: { input: "(no input)", output: "Pip 1" },
      rule: "Use exactly one print()",
      difficulty: "apply",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "Pip 1" },
      hint: "print() can take several values separated by commas.",
    },
    {
      id: "topic-1-q3",
      title: "The dashing date",
      prompt: "Print 2026, 11 and 22 on one line separated by dashes, with a single print() and the sep option.",
      example: { input: "(no input)", output: "2026-11-22" },
      rule: "One print() with sep=",
      difficulty: "twist",
      starterCode: START,
      timeLimitSeconds: 90,
      test: { kind: "stdout", expected: "2026-11-22" },
      hint: 'print(1, 2, sep="x") prints 1x2.',
    },
  ],
  "topic-2": [
    {
      id: "topic-2-q1",
      title: "A box of fruits",
      prompt: "Create a variable fruits equal to 5, then print it.",
      example: { input: "(no input)", output: "5" },
      rule: "Print the variable, not the number",
      difficulty: "warmup",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "5" },
      hint: "fruits = 5 on one line, then print(fruits).",
    },
    {
      id: "topic-2-q2",
      title: "Say hi to Pip",
      prompt: "Create name equal to the text Pip, then print Hi followed by a space and the name, using +.",
      example: { input: "(no input)", output: "Hi Pip" },
      rule: "Join the strings with +",
      difficulty: "apply",
      starterCode: START,
      timeLimitSeconds: 75,
      test: { kind: "stdout", expected: "Hi Pip" },
      hint: '"Hi " + name',
    },
    {
      id: "topic-2-q3",
      title: "The great swap",
      prompt: "Swap the values of a and b, then print a, then print b.",
      example: { input: "a = 1, b = 2", output: "2\n1" },
      rule: "Swap first, then print a and b",
      difficulty: "twist",
      starterCode: "a = 1\nb = 2\n# swap a and b, then print a and b on separate lines",
      timeLimitSeconds: 90,
      test: { kind: "stdout", expected: "2\n1" },
      hint: "a, b = b, a",
    },
  ],
  "topic-3": [
    {
      id: "topic-3-q1",
      title: "Fruit multiplier",
      prompt: "Print the result of 7 * 8.",
      example: { input: "(no input)", output: "56" },
      rule: "Let Python do the math",
      difficulty: "warmup",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "56" },
      hint: "print(7 * 8)",
    },
    {
      id: "topic-3-q2",
      title: "Share the fruits",
      prompt: "Print 17 // 5 on one line and 17 % 5 on the next line.",
      example: { input: "(no input)", output: "3\n2" },
      rule: "Two prints, one per line",
      difficulty: "apply",
      starterCode: START,
      timeLimitSeconds: 75,
      test: { kind: "stdout", expected: "3\n2" },
      hint: "// is the whole part, % is what is left over.",
    },
    {
      id: "topic-3-q3",
      title: "Power and decimals",
      prompt: "Print 2 ** 5 on one line and 10 / 4 on the next line.",
      example: { input: "(no input)", output: "32\n2.5" },
      rule: "Use ** and /",
      difficulty: "twist",
      starterCode: START,
      timeLimitSeconds: 90,
      test: { kind: "stdout", expected: "32\n2.5" },
      hint: "** means power; / always gives a decimal.",
    },
  ],
  "topic-4": [
    {
      id: "topic-4-q1",
      title: "Shout it out",
      prompt: "Print python in UPPERCASE using a string method.",
      example: { input: '"python"', output: "PYTHON" },
      rule: "Use a string method",
      difficulty: "warmup",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "PYTHON" },
      hint: '"python".upper()',
    },
    {
      id: "topic-4-q2",
      title: "How long is the jungle?",
      prompt: "Print the length of the word jungle.",
      example: { input: '"jungle"', output: "6" },
      rule: "Use len()",
      difficulty: "warmup",
      starterCode: START,
      timeLimitSeconds: 60,
      test: { kind: "stdout", expected: "6" },
      hint: 'len("jungle")',
    },
    {
      id: "topic-4-q3",
      title: "Pip laughs",
      prompt: "Print the word ha repeated 3 times as one word, using *.",
      example: { input: '"ha"', output: "hahaha" },
      rule: "Use * on a string",
      difficulty: "apply",
      starterCode: START,
      timeLimitSeconds: 75,
      test: { kind: "stdout", expected: "hahaha" },
      hint: '"ha" * 3',
    },
    {
      id: "topic-4-q4",
      title: "Head and tail",
      prompt: "Print the first letter of word, then the last letter, each on its own line. Use indexing (the last one with a negative index).",
      example: { input: 'word = "snake"', output: "s\ne" },
      rule: "Use word[0] and a negative index",
      difficulty: "twist",
      starterCode: 'word = "snake"\n# print the first letter, then the last letter, on separate lines',
      timeLimitSeconds: 90,
      test: { kind: "stdout", expected: "s\ne" },
      hint: "word[0] is the first letter, word[-1] is the last.",
    },
  ],
};
