import { useCallback, useEffect, useRef, useState } from "react";

export type SfxName = "tap" | "whoosh" | "hop" | "eat" | "correct" | "wrong" | "timeup" | "tick" | "victory";

const STORAGE_KEY = "pa-sound-muted";

/** Synthesised game sounds. The AudioContext is only created after the first user gesture. */
export function useGameAudio() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setMuted(true);
    } catch {
      /* storage unavailable */
    }
    const unlock = () => {
      if (ctxRef.current) {
        if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
        return;
      }
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    };
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      document.removeEventListener("visibilitychange", onVis);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const play = useCallback((name: SfxName) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || mutedRef.current || ctx.state !== "running") return;
    const now = ctx.currentTime;

    const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number, endFreq?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now + start);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, now + start + dur);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(vol, now + start + Math.min(0.015, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(master);
      o.start(now + start);
      o.stop(now + start + dur + 0.05);
    };
    const noise = (start: number, dur: number, vol: number, filterType: BiquadFilterType, f0: number, f1?: number) => {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.setValueAtTime(f0, now + start);
      if (f1) f.frequency.exponentialRampToValueAtTime(f1, now + start + dur);
      f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(vol, now + start + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      src.connect(f).connect(g).connect(master);
      src.start(now + start);
      src.stop(now + start + dur + 0.05);
    };

    switch (name) {
      case "tap":
        tone(720, 0, 0.07, "sine", 0.25, 520);
        break;
      case "whoosh":
        noise(0, 0.45, 0.35, "bandpass", 300, 2400);
        tone(220, 0.05, 0.35, "sine", 0.12, 660);
        break;
      case "hop":
        tone(310, 0, 0.09, "sine", 0.16, 560);
        break;
      case "eat":
        noise(0, 0.06, 0.5, "bandpass", 1800);
        noise(0.08, 0.06, 0.45, "bandpass", 1400);
        noise(0.16, 0.07, 0.4, "bandpass", 1100);
        tone(1318.5, 0.22, 0.5, "triangle", 0.22);
        tone(1760, 0.3, 0.6, "triangle", 0.18);
        tone(2637, 0.38, 0.5, "sine", 0.08);
        break;
      case "correct":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.085, 0.32, "triangle", 0.22));
        break;
      case "wrong":
        tone(116, 0, 0.38, "sawtooth", 0.14, 92);
        tone(110, 0, 0.38, "square", 0.08, 86);
        break;
      case "timeup":
        tone(660, 0, 0.9, "sine", 0.22, 196);
        tone(990, 0.05, 0.6, "triangle", 0.06, 300);
        break;
      case "tick":
        tone(1200, 0, 0.035, "square", 0.05);
        break;
      case "victory": {
        const seq: [number, number, number][] = [
          [523.25, 0, 0.18], [659.25, 0.16, 0.18], [783.99, 0.32, 0.18], [1046.5, 0.48, 0.5],
          [783.99, 0.72, 0.14], [1046.5, 0.86, 0.9],
        ];
        seq.forEach(([f, s, d]) => {
          tone(f, s, d, "triangle", 0.22);
          tone(f / 2, s, d, "sine", 0.1);
        });
        tone(2093, 0.86, 1.1, "sine", 0.05);
        break;
      }
    }
  }, []);

  return { muted, toggleMute, play };
}
