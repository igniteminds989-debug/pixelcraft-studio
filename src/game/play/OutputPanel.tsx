import { useEffect, useRef } from "react";
import type { CheckResult } from "../engine/check";

export interface OutLine { kind: "cmd" | "out" | "err" | "info" | "ok"; text: string }

export function OutputPanel({
  tab, onTab, lines, onClear, check, busy,
}: {
  tab: "output" | "results";
  onTab: (t: "output" | "results") => void;
  lines: OutLine[];
  onClear: () => void;
  check: CheckResult | null;
  busy: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, tab]);

  return (
    <div className="pa-output">
      <div className="pa-output-tabs" role="tablist" aria-label="Output">
        <button type="button" role="tab" aria-selected={tab === "output"} className="pa-otab" onClick={() => onTab("output")}>Output</button>
        <button type="button" role="tab" aria-selected={tab === "results"} className="pa-otab" onClick={() => onTab("results")}>
          Results
          {check && <span className={"pa-otab-dot " + (check.passed ? "pa-dot-pass" : "pa-dot-fail")} aria-hidden />}
        </button>
        {tab === "output" && (
          <button type="button" className="pa-clear" onClick={onClear}>Clear</button>
        )}
      </div>
      <div ref={scrollRef} className="pa-output-body pa-scroll" aria-live="off">
        {tab === "output" ? (
          lines.length === 0 && !busy ? (
            <p className="pa-out-empty">&gt; Run your code to see what Python prints.</p>
          ) : (
            <>
              {lines.map((l, i) => (
                <pre key={i} className={"pa-out-line pa-out-" + l.kind}>
                  {l.kind === "cmd" ? "> " : ""}
                  {l.text}
                </pre>
              ))}
              {busy && <pre className="pa-out-line pa-out-info">&gt; running<span className="pa-dots" /></pre>}
            </>
          )
        ) : check ? (
          <div className="pa-results">
            <div className={"pa-result-row " + (check.passed ? "pa-result-pass" : "pa-result-fail")}>
              <span className="pa-result-icon" aria-hidden>{check.passed ? "✔" : "✖"}</span>
              <span>Test 1 · printed output</span>
              <b>{check.passed ? "Passed" : "Failed"}</b>
            </div>
            <p className="pa-result-msg">{check.message}</p>
            {(check.expected !== undefined || check.got !== undefined) && (
              <div className="pa-compare">
                <div>
                  <span className="pa-example-label">Expected</span>
                  <pre className="pa-compare-box">{check.expected ?? ""}</pre>
                </div>
                <div>
                  <span className="pa-example-label">Got</span>
                  <pre className={"pa-compare-box " + (check.passed ? "" : "pa-compare-bad")}>{check.got || "(nothing)"}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="pa-out-empty">Submit your answer to see how it compares.</p>
        )}
      </div>
    </div>
  );
}
