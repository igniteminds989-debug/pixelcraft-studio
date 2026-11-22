import { useMemo, useRef, useState, type ReactNode } from "react";
import { highlightPython } from "./pythonHighlight";

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
const CLOSERS = new Set([")", "]", "}", '"', "'"]);
const INDENT = "    ";

export function CodeEditor({
  value, onChange, locked, lockContent, onRun, onSubmit, onTyping,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  lockContent?: ReactNode;
  onRun: () => void;
  onSubmit: () => void;
  onTyping?: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);
  const html = useMemo(() => highlightPython(value) + "\n", [value]);
  const lineCount = value.split("\n").length;

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (codeRef.current) codeRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (lineRef.current) lineRef.current.style.setProperty("--pa-scroll", `${-ta.scrollTop}px`);
  };
  const updateActive = () => {
    const ta = taRef.current;
    if (!ta) return;
    setActiveLine(ta.value.slice(0, ta.selectionStart).split("\n").length - 1);
  };

  /** Insert text keeping native undo where supported. */
  const replace = (start: number, end: number, text: string, caretStart?: number, caretEnd?: number) => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(start, end);
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, text);
    } catch {
      ok = false;
    }
    if (!ok) {
      ta.setRangeText(text, start, end, "end");
      onChange(ta.value);
    }
    const cs = caretStart ?? start + text.length;
    ta.setSelectionRange(cs, caretEnd ?? cs);
    updateActive();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const v = ta.value;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onSubmit();
      else onRun();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const multi = v.slice(s, en).includes("\n");
      if (!e.shiftKey && !multi) {
        replace(s, en, INDENT);
        return;
      }
      const blockEnd = en > s && v[en - 1] === "\n" ? en - 1 : en;
      const lineEnd = v.indexOf("\n", blockEnd) === -1 ? v.length : v.indexOf("\n", blockEnd);
      const block = v.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      let firstDelta = 0;
      let total = 0;
      const out = lines.map((l, i) => {
        if (e.shiftKey) {
          const m = /^ {1,4}|^\t/.exec(l);
          const cut = m ? m[0].length : 0;
          if (i === 0) firstDelta = -cut;
          total -= cut;
          return l.slice(cut);
        }
        if (i === 0) firstDelta = INDENT.length;
        total += INDENT.length;
        return INDENT + l;
      });
      const next = out.join("\n");
      const ns = Math.max(lineStart, s + firstDelta);
      replace(lineStart, lineEnd, next, multi ? lineStart : ns, multi ? lineStart + next.length : Math.max(lineStart, en + total));
      return;
    }
    if (e.key === "Enter" && !mod) {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const line = v.slice(lineStart, s);
      const indent = (/^[ \t]*/.exec(line) ?? [""])[0];
      const before = line.trimEnd();
      const extra = before.endsWith(":") || /[([{]$/.test(before) ? INDENT : "";
      const nextCh = v[en] ?? "";
      if (/[([{]$/.test(before) && /[)\]}]/.test(nextCh)) {
        const ins = "\n" + indent + extra + "\n" + indent;
        replace(s, en, ins, s + 1 + indent.length + extra.length);
        return;
      }
      replace(s, en, "\n" + indent + extra);
      return;
    }
    if (e.key === "Backspace" && s === en && s > 0) {
      const prev = v[s - 1] ?? "";
      const nextCh = v[s] ?? "";
      if (PAIRS[prev] && PAIRS[prev] === nextCh) {
        e.preventDefault();
        replace(s - 1, s + 1, "");
        return;
      }
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const before = v.slice(lineStart, s);
      if (before.length > 0 && /^ +$/.test(before)) {
        e.preventDefault();
        const cut = before.length % 4 === 0 ? 4 : before.length % 4;
        replace(s - cut, s, "");
        return;
      }
    }
    if (e.key.length === 1 && !mod && !e.altKey) {
      const nextCh = v[en] ?? "";
      if (CLOSERS.has(e.key) && s === en && nextCh === e.key) {
        e.preventDefault();
        ta.setSelectionRange(s + 1, s + 1);
        return;
      }
      const close = PAIRS[e.key];
      if (close) {
        const prev = v[s - 1] ?? "";
        const isQuote = e.key === '"' || e.key === "'";
        if (s !== en) {
          e.preventDefault();
          const sel = v.slice(s, en);
          replace(s, en, e.key + sel + close, s + 1, en + 1);
          return;
        }
        if (isQuote && /[A-Za-z0-9_]/.test(prev)) return;
        if (nextCh && !/[\s)\]},:]/.test(nextCh)) return;
        e.preventDefault();
        replace(s, en, e.key + close, s + 1);
      }
    }
  };

  return (
    <div className={"pa-editor" + (locked ? " pa-editor-locked" : "")}>
      <div className="pa-gutter" aria-hidden>
        <div ref={gutterRef} className="pa-gutter-inner">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={"pa-gutter-n" + (i === activeLine && !locked ? " pa-gutter-active" : "")}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="pa-code-area">
        <div ref={lineRef} className="pa-active-line" style={{ "--pa-line": activeLine } as React.CSSProperties} aria-hidden />
        <pre className="pa-code-pre" aria-hidden>
          <code ref={codeRef} dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
        <textarea
          ref={taRef}
          className="pa-code-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onTyping?.();
            updateActive();
          }}
          onKeyDown={onKeyDown}
          onKeyUp={updateActive}
          onClick={updateActive}
          onSelect={updateActive}
          onScroll={syncScroll}
          readOnly={locked}
          tabIndex={locked ? -1 : 0}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          wrap="off"
          aria-label="Python code editor. Ctrl+Enter runs, Ctrl+Shift+Enter submits."
        />
      </div>
      {locked && <div className="pa-editor-lock">{lockContent}</div>}
    </div>
  );
}
