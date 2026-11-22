export type TokenType = "kw" | "str" | "num" | "com" | "bi" | "def" | "op" | "txt";
export interface Token { t: TokenType; v: string }

const KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
  "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
]);
const BUILTINS = new Set([
  "print", "len", "range", "int", "float", "str", "list", "dict", "set", "tuple", "input", "type", "sum", "min",
  "max", "abs", "sorted", "enumerate", "zip", "map", "filter", "round", "bool",
]);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let expectName = false;
  const n = src.length;
  while (i < n) {
    const c = src[i] as string;
    if (c === "#") {
      let j = src.indexOf("\n", i);
      if (j === -1) j = n;
      out.push({ t: "com", v: src.slice(i, j) });
      i = j;
      continue;
    }
    // strings (optional prefix f/r/b)
    const pre = /^[rRbBfFuU]{0,2}("""|'''|"|')/.exec(src.slice(i, i + 5));
    if (pre && (c === '"' || c === "'" || /[rRbBfFuU]/.test(c))) {
      const q = pre[1] as string;
      let j = i + pre[0].length;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src.startsWith(q, j)) { j += q.length; break; }
        if (q.length === 1 && src[j] === "\n") break;
        j++;
      }
      out.push({ t: "str", v: src.slice(i, Math.min(j, n)) });
      i = Math.min(j, n);
      expectName = false;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^(0[xX][0-9a-fA-F_]+|[0-9][0-9_]*\.?[0-9_]*(?:[eE][+-]?[0-9]+)?j?|\.[0-9]+)/.exec(src.slice(i));
      const v = m ? m[0] : c;
      out.push({ t: "num", v });
      i += v.length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      const v = (m ? m[0] : c) as string;
      let t: TokenType = "txt";
      if (expectName) { t = "def"; expectName = false; }
      else if (KEYWORDS.has(v)) { t = "kw"; if (v === "def" || v === "class") expectName = true; }
      else if (BUILTINS.has(v)) t = "bi";
      out.push({ t, v });
      i += v.length;
      continue;
    }
    if (/[+\-*/%=<>!&|^~@:,.()[\]{}]/.test(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.t === "txt" && !/[A-Za-z0-9_]/.test(last.v)) last.v += c;
    else out.push({ t: "txt", v: c });
    i++;
  }
  return out;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightPython(src: string): string {
  return tokenize(src)
    .map((tk) => (tk.t === "txt" ? esc(tk.v) : `<span class="pa-tk-${tk.t}">${esc(tk.v)}</span>`))
    .join("");
}
