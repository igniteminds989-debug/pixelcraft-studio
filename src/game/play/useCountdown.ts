import { useCallback, useEffect, useRef, useState } from "react";

/** Wall-clock countdown: remaining time always comes from Date.now() deltas, never from tick counts. */
export function useCountdown(totalSeconds: number, onExpire: () => void) {
  const totalMs = totalSeconds * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  const start = useCallback(() => {
    endRef.current = Date.now() + totalMs;
    setRemainingMs(totalMs);
    setRunning(true);
  }, [totalMs]);

  const stop = useCallback(() => {
    setRunning((r) => {
      if (r) setRemainingMs(Math.max(0, endRef.current - Date.now()));
      return false;
    });
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setRemainingMs(totalMs);
  }, [totalMs]);

  useEffect(() => {
    if (!running) setRemainingMs((r) => (r === 0 ? 0 : r));
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const r = Math.max(0, endRef.current - Date.now());
      setRemainingMs(r);
      if (r <= 0) {
        setRunning(false);
        expireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [running]);

  return { remainingMs, totalMs, running, elapsedMs: totalMs - remainingMs, start, stop, reset };
}
