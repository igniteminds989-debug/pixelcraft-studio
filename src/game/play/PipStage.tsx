import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SfxName } from "./useGameAudio";
import type { PipEventType } from "./usePlayFlow";

/* ---------- Scene constants (key-art coordinates, 1672 x 941) ---------- */
const KW = 1672;
const KH = 941;
const CTRL: [number, number][] = [
  [740, 905], [800, 790], [880, 695], [1000, 625], [1022, 540], [1062, 440], [1105, 345],
];
const TEMPLE_DOOR = { x: 1114, y: 292 };

export type PoseId = "sleep" | "curious" | "side" | "back" | "three-quarter" | "fruit" | "hurt" | "victory" | "front";
export type WalkPose = "side" | "back" | "three-quarter";

const POSE_FACTOR: Record<PoseId, number> = {
  sleep: 0.74, curious: 1, side: 1.2, back: 1.2, "three-quarter": 1.2, fruit: 1.04, hurt: 1, victory: 1.12, front: 1.2,
};
/** Walk poses whose art is not in /assets yet. Drop pip-side.png etc. into public/assets and remove them here. */
const MISSING_POSES = new Set<PoseId>(["side", "back", "three-quarter"]);
const FALLBACK_WALK: PoseId = "front";
const FLIPPED_POSES = new Set<PoseId>(["side", "three-quarter"]);
const RENDERED_POSES: PoseId[] = (
  ["sleep", "curious", "side", "back", "three-quarter", "fruit", "hurt", "victory", "front"] as PoseId[]
).filter((p) => !MISSING_POSES.has(p));

const resolvePose = (p: PoseId): PoseId => (MISSING_POSES.has(p) ? FALLBACK_WALK : p);

/* ---------- Path: Catmull-Rom sampled by arc length ---------- */
interface PathSample { x: number; y: number; len: number }
function buildPath(): { samples: PathSample[]; total: number } {
  const pts = [CTRL[0]!, ...CTRL, CTRL[CTRL.length - 1]!];
  const samples: PathSample[] = [];
  let total = 0;
  let prev: [number, number] | null = null;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!];
    for (let s = 0; s < 60; s++) {
      const t = s / 60;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      if (prev) total += Math.hypot(x - prev[0], y - prev[1]);
      samples.push({ x, y, len: total });
      prev = [x, y];
    }
  }
  const last = CTRL[CTRL.length - 1]!;
  if (prev) total += Math.hypot(last[0] - prev[0], last[1] - prev[1]);
  samples.push({ x: last[0], y: last[1], len: total });
  return { samples, total };
}
const PATH = buildPath();

function pointAt(u: number): { x: number; y: number; dx: number } {
  const target = Math.max(0, Math.min(1, u)) * PATH.total;
  const s = PATH.samples;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid]!.len < target) lo = mid + 1;
    else hi = mid;
  }
  const b = s[lo]!;
  const a = s[Math.max(0, lo - 1)]!;
  const span = b.len - a.len || 1;
  const k = Math.max(0, Math.min(1, (target - a.len) / span));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: b.x - a.x };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const depthScale = (y: number) => 0.5 + 0.5 * clamp((y - 340) / (905 - 340), 0, 1);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function fruitSpots(count: number): number[] {
  if (count === 3) return [0.36, 0.66, 0.95];
  if (count === 4) return [0.28, 0.5, 0.73, 0.95];
  return Array.from({ length: count }, (_, i) => 0.2 + (0.75 * (i + 1)) / count);
}

/* ---------- Deterministic decoration data ---------- */
function rand(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function makeFireflies(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const near = rand(i, 1);
    const dur = 7 + (1 - near) * 9;
    return {
      left: rand(i, 2) * 100,
      top: 18 + rand(i, 3) * 72,
      size: 2.5 + near * 7,
      blur: near > 0.7 ? (near - 0.7) * 10 : 0,
      dur,
      blink: 1.6 + rand(i, 4) * 2.6,
      delay: -rand(i, 5) * dur,
      dx: (rand(i, 6) - 0.5) * (40 + near * 120),
      dy: -(20 + near * 70),
      op: 0.45 + near * 0.55,
    };
  });
}

/* ---------- Animation steps ---------- */
interface Step {
  dur: number;
  start?: () => void;
  update?: (p: number, elapsed: number) => void;
  end?: () => void;
}

export interface PipStageProps {
  mode: "sleep" | "awake";
  event: { type: PipEventType; id: number };
  solved: number;
  fruitCount: number;
  xpGain: number;
  typingTick: number;
  idleCurious: boolean;
  urgent: boolean;
  walkPose?: WalkPose;
  onSequenceDone: () => void;
  onSfx: (name: SfxName) => void;
  children?: ReactNode;
}

export function PipStage({
  mode, event, solved, fruitCount, xpGain, typingTick, idleCurious, urgent, walkPose = "side",
  onSequenceDone, onSfx, children,
}: PipStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fruitRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [fireflies, setFireflies] = useState<ReturnType<typeof makeFireflies>>([]);
  const spots = fruitSpots(fruitCount);

  const props = useRef({ mode, idleCurious, xpGain, onSequenceDone, onSfx, walkPose });
  props.current = { mode, idleCurious, xpGain, onSequenceDone, onSfx, walkPose };

  const sim = useRef({
    clock: 0,
    u: 0,
    pose: "sleep" as PoseId,
    lift: 0,
    sx: 1,
    sy: 1,
    rot: 0,
    flip: 1,
    glow: 0,
    zoom: 1.18,
    cam: { x: 0, y: 0, z: 1.18, init: false },
    ptr: { x: 0, y: 0, tx: 0, ty: 0 },
    steps: [] as Step[],
    stepIdx: 0,
    stepT0: 0,
    wiggleT: -10,
    popT: -10,
    curiousTilt: 0,
    eaten: solved,
    dims: { W: 1, H: 1, c0: 1, bh: 100 },
    lastFilter: "",
    reduced: false,
    finePointer: true,
    small: false,
    view: { tx: 0, ty: 0, S: 1 },
  });

  /* Environment flags + sizing */
  useEffect(() => {
    const s = sim.current;
    const mqR = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqP = window.matchMedia("(pointer: fine)");
    const apply = () => {
      s.reduced = mqR.matches;
      s.finePointer = mqP.matches;
    };
    apply();
    mqR.addEventListener("change", apply);
    mqP.addEventListener("change", apply);

    const stage = stageRef.current;
    const measure = () => {
      if (!stage) return;
      const W = stage.clientWidth || 1;
      const H = stage.clientHeight || 1;
      const c0 = Math.max(W / KW, H / KH);
      const bh = (0.235 * H) / c0;
      s.dims = { W, H, c0, bh };
      s.small = W < 640;
      worldRef.current?.style.setProperty("--pa-bh", `${bh}px`);
    };
    measure();
    setFireflies(makeFireflies(window.innerWidth < 640 || !mqP.matches ? 10 : 22));
    const ro = new ResizeObserver(measure);
    if (stage) ro.observe(stage);
    return () => {
      ro.disconnect();
      mqR.removeEventListener("change", apply);
      mqP.removeEventListener("change", apply);
    };
  }, []);

  /* FX helpers (screen-space, transform + opacity only) */
  const toScreen = (x: number, y: number) => {
    const v = sim.current.view;
    return { x: x * v.S + v.tx, y: y * v.S + v.ty };
  };
  const pipMouth = () => {
    const s = sim.current;
    const p = pointAt(s.u);
    const d = depthScale(p.y);
    return { x: p.x, y: p.y - s.dims.bh * POSE_FACTOR[resolvePose(s.pose)] * d * 0.62, d };
  };
  const burst = (wx: number, wy: number, count: number, kind: "spark" | "confetti") => {
    const fx = fxRef.current;
    if (!fx) return;
    const s = sim.current;
    const n = Math.round(s.small ? count * 0.5 : count) * (s.reduced ? 0.5 : 1);
    const { x, y } = toScreen(wx, wy);
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      el.className = kind === "spark" ? "pa-spark" : "pa-confetti";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (kind === "confetti") el.dataset.c = String(Math.floor(rand(i, 9) * 4));
      fx.appendChild(el);
      const ang = (i / n) * Math.PI * 2 + rand(i, 7) * 0.6;
      const dist = (kind === "spark" ? 50 : 90) + rand(i, 8) * (kind === "spark" ? 70 : 120);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - (kind === "confetti" ? 60 : 20);
      const anim = el.animate(
        [
          { transform: "translate(-50%,-50%) scale(0.4) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(1) rotate(${dx * 2}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + (kind === "confetti" ? 140 : 40)}px)) scale(0.2) rotate(${dx * 4}deg)`, opacity: 0 },
        ],
        { duration: kind === "spark" ? 750 + rand(i, 3) * 350 : 1300 + rand(i, 4) * 500, easing: "cubic-bezier(.2,.7,.3,1)" },
      );
      anim.onfinish = () => el.remove();
    }
  };
  const floatText = (wx: number, wy: number, text: string) => {
    const fx = fxRef.current;
    if (!fx) return;
    const { x, y } = toScreen(wx, wy);
    const el = document.createElement("span");
    el.className = "pa-float-xp";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    fx.appendChild(el);
    const anim = el.animate(
      [
        { transform: "translate(-50%,0) scale(.6)", opacity: 0 },
        { transform: "translate(-50%,-24px) scale(1.15)", opacity: 1, offset: 0.18 },
        { transform: "translate(-50%,-70px) scale(1)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%,-96px) scale(.95)", opacity: 0 },
      ],
      { duration: 1300, easing: "ease-out" },
    );
    anim.onfinish = () => el.remove();
  };
  const flash = (kind: "gold" | "red", duration: number) => {
    const el = flashRef.current;
    if (!el) return;
    el.dataset.kind = kind;
    el.animate([{ opacity: 0 }, { opacity: kind === "gold" ? 0.55 : 0.42, offset: 0.25 }, { opacity: 0 }], { duration, easing: "ease-out" });
  };
  const shake = () => {
    const el = shakeRef.current;
    if (!el || sim.current.reduced) return;
    el.animate(
      [0, -10, 9, -7, 6, -4, 3, -1, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 2 : -2}px)` })),
      { duration: 650, easing: "ease-out" },
    );
  };

  /* Sequences */
  const runSteps = (steps: Step[]) => {
    const s = sim.current;
    s.steps = steps;
    s.stepIdx = 0;
    s.stepT0 = s.clock;
    steps[0]?.start?.();
  };

  const correctSequence = (fruitIndex: number): Step[] => {
    const s = sim.current;
    const spot = spots[fruitIndex] ?? spots[spots.length - 1] ?? 0.9;
    const u0 = s.u;
    const u1 = Math.max(u0, spot - 0.045);
    const walkDur = 1150 + (u1 - u0) * 1800;
    const hops = Math.max(3, Math.round((u1 - u0) * 13));
    let lastHop = -1;
    let flyFrom = { x: 0, y: 0 };
    const fruitEl = () => fruitRefs.current[fruitIndex]?.querySelector<HTMLDivElement>(".pa-fruit-fly") ?? null;
    return [
      { dur: 300, start: () => { s.pose = "curious"; s.zoom = 1.24; } },
      {
        dur: walkDur,
        start: () => { s.pose = resolvePose(props.current.walkPose); s.zoom = 1.32; lastHop = -1; },
        update: (p) => {
          const e = easeInOutQuad(p);
          s.u = u0 + (u1 - u0) * e;
          const hp = e * hops;
          const hop = Math.min(hops - 1, Math.floor(hp));
          const phase = p >= 1 ? 1 : hp - hop;
          if (hop !== lastHop) { lastHop = hop; props.current.onSfx("hop"); }
          const arc = Math.sin(Math.PI * phase);
          s.lift = arc * 28 * (s.dims.bh / 160) * (s.dims.c0 > 0 ? 1 : 1);
          if (s.reduced) { s.sx = 1; s.sy = 1; s.rot = 0; } else {
            let sy = 1 + 0.07 * arc;
            let sx = 1 - 0.045 * arc;
            if (phase < 0.18) {
              const k = 1 - phase / 0.18;
              sy *= 1 - 0.1 * k;
              sx *= 1 + 0.08 * k;
            }
            s.sx = sx;
            s.sy = sy;
            s.rot = Math.sin(2 * Math.PI * phase) * 2.2;
          }
          const dir = pointAt(s.u + 0.01).x - pointAt(s.u).x;
          s.flip = FLIPPED_POSES.has(s.pose) && dir > 0 ? -1 : 1;
        },
        end: () => { s.lift = 0; s.rot = 0; s.flip = 1; s.u = u1; },
      },
      {
        dur: 240,
        start: () => { s.pose = "curious"; s.zoom = 1.62; },
        update: (p) => { const e = Math.sin((p * Math.PI) / 2); s.sy = 1 - 0.1 * e; s.sx = 1 + 0.07 * e; },
      },
      {
        dur: 380,
        start: () => {
          const sp = pointAt(spot);
          flyFrom = { x: sp.x, y: sp.y - s.dims.bh * 0.12 * depthScale(sp.y) };
        },
        update: (p) => {
          const e = p * p;
          const m = pipMouth();
          const el = fruitEl();
          if (el) {
            const dx = (m.x - flyFrom.x) * e;
            const dy = (m.y - flyFrom.y) * e - Math.sin(p * Math.PI) * s.dims.bh * 0.25;
            el.style.transform = `translate(${dx}px, ${dy}px) scale(${1 - 0.55 * e})`;
          }
          s.sy = 0.9 + 0.1 * e;
          s.sx = 1.07 - 0.07 * e;
        },
        end: () => {
          s.eaten = Math.max(s.eaten, fruitIndex + 1);
          fruitRefs.current[fruitIndex]?.classList.add("pa-fruit-eaten");
        },
      },
      {
        dur: 850,
        start: () => {
          s.pose = "fruit";
          s.glow = 1;
          const m = pipMouth();
          burst(m.x, m.y, 20, "spark");
          burst(m.x, m.y - s.dims.bh * 0.3, 26, "confetti");
          floatText(m.x, m.y - s.dims.bh * 0.5 * m.d, `+${props.current.xpGain} XP`);
          flash("gold", 550);
          props.current.onSfx("eat");
        },
        update: (p) => {
          if (s.reduced) return;
          const b = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p);
          s.lift = b * s.dims.bh * 0.16;
          s.sy = 1 + 0.07 * b - 0.05 * (1 - b) * (1 - p) * (p > 0.5 ? 1 : 0);
          s.sx = 1 - 0.045 * b;
        },
        end: () => { s.lift = 0; s.sx = 1; s.sy = 1; },
      },
      { dur: 250 },
      {
        dur: 520,
        update: (p) => { const e = Math.sin(p * Math.PI); s.sx = 1 + 0.07 * e; s.sy = 1 - 0.09 * e; },
        end: () => { s.pose = "sleep"; s.sx = 1; s.sy = 1; s.zoom = 1.18; props.current.onSequenceDone(); },
      },
    ];
  };

  const wrongSequence = (): Step[] => {
    const s = sim.current;
    return [
      {
        dur: 650,
        start: () => { s.pose = "hurt"; s.lift = 0; s.rot = 0; shake(); flash("red", 600); s.zoom = 1.24; },
        update: (p) => {
          if (s.reduced) return;
          s.rot = Math.sin(p * Math.PI * 7) * 4 * (1 - p);
          s.sx = 1 + 0.05 * (1 - p);
          s.sy = 1 - 0.06 * (1 - p);
        },
        end: () => { s.rot = 0; s.sx = 1; s.sy = 1; },
      },
      { dur: 500, end: () => { s.zoom = 1.18; } },
    ];
  };

  /* React to flow events */
  const lastEvent = useRef(event.id);
  useEffect(() => {
    if (event.id === lastEvent.current) return;
    lastEvent.current = event.id;
    const s = sim.current;
    if (event.type === "correct") runSteps(correctSequence(solved - 1));
    else if (event.type === "wrong") runSteps(wrongSequence());
    else if (event.type === "timeout") { s.steps = []; s.lift = 0; s.rot = 0; s.sx = 1; s.sy = 1; s.zoom = 1.18; }
    else if (event.type === "wake") {
      s.steps = [];
      s.popT = s.clock;
      const m = pipMouth();
      burst(m.x, m.y - s.dims.bh * 0.2, 10, "spark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  useEffect(() => {
    if (typingTick > 0) sim.current.wiggleT = sim.current.clock;
  }, [typingTick]);

  /* Main loop */
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const s = sim.current;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      s.clock += dt * 1000;
      const t = s.clock / 1000;
      const { W, H, c0, bh } = s.dims;

      // sequence stepping
      if (s.steps.length) {
        let step = s.steps[s.stepIdx];
        while (step) {
          const el = s.clock - s.stepT0;
          const p = step.dur > 0 ? Math.min(1, el / step.dur) : 1;
          step.update?.(p, el);
          if (p < 1) break;
          step.end?.();
          s.stepIdx++;
          s.stepT0 += step.dur;
          step = s.steps[s.stepIdx];
          if (step) { step.start?.(); } else { s.steps = []; }
        }
      } else {
        // idle
        const awake = props.current.mode === "awake";
        s.pose = awake ? "curious" : "sleep";
        s.lift = 0;
        s.flip = 1;
        if (s.reduced) { s.sx = 1; s.sy = 1; s.rot = 0; }
        else if (awake) {
          s.curiousTilt += ((props.current.idleCurious ? 7 : 0) - s.curiousTilt) * (1 - Math.exp(-4 * dt));
          s.rot = Math.sin(t * 1.7) * 1.8 + s.curiousTilt;
          s.sx = 1 + Math.sin(t * 2.2) * 0.008;
          s.sy = 1 - Math.sin(t * 2.2) * 0.012;
          const w = (s.clock - s.wiggleT) / 360;
          if (w >= 0 && w < 1) {
            s.rot += Math.sin(w * Math.PI * 5) * 3.2 * (1 - w);
            s.sy += Math.sin(w * Math.PI * 3) * 0.035 * (1 - w);
          }
        } else {
          const b = Math.sin((t * 2 * Math.PI) / 3.2);
          s.sy = 1 + 0.028 * b;
          s.sx = 1 - 0.014 * b;
          s.rot = 0;
        }
        const pop = (s.clock - s.popT) / 320;
        if (pop >= 0 && pop < 1) {
          const k = Math.sin(pop * Math.PI) * (1 - pop * 0.5);
          s.sy *= 1 + 0.12 * k;
          s.sx *= 1 - 0.06 * k;
          s.lift = k * bh * 0.08;
        }
      }
      s.glow = Math.max(0, s.glow - dt * 0.55);

      // Pip transforms
      const p = pointAt(s.u);
      const d = depthScale(p.y);
      if (pipRef.current) pipRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (bodyRef.current) {
        if (bodyRef.current.dataset.pose !== s.pose) bodyRef.current.dataset.pose = s.pose;
        bodyRef.current.style.transform =
          `translate3d(0, ${-s.lift}px, 0) rotate(${s.rot}deg) scale(${s.sx * d * s.flip}, ${s.sy * d})`;
      }
      if (shadowRef.current) {
        const liftK = clamp(s.lift / (bh * 0.35), 0, 1);
        shadowRef.current.style.transform = `translate(-50%, -50%) scale(${d * (1 - 0.45 * liftK)})`;
        shadowRef.current.style.opacity = String(0.75 - 0.4 * liftK);
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(-50%, -50%) translateY(${-bh * 0.5 * d}px) scale(${d * (1 + s.glow * 0.9)})`;
        glowRef.current.style.opacity = String(0.55 + s.glow * 0.45);
      }
      const far = (1 - d) / 0.5;
      const filter = `saturate(${(1 - 0.28 * far).toFixed(2)}) hue-rotate(${(far * 14).toFixed(1)}deg) brightness(${(1 - 0.1 * far).toFixed(2)})`;
      if (filter !== s.lastFilter && spriteRef.current) { spriteRef.current.style.filter = filter; s.lastFilter = filter; }

      // Camera
      const motion = !s.reduced;
      const zT = motion ? s.zoom + Math.sin(t * 0.21) * 0.006 : 1.18;
      const fx = p.x;
      const fy = p.y - bh * d * 0.5;
      const k = 1 - Math.exp(-5.5 * dt);
      if (!s.cam.init) { s.cam.x = fx; s.cam.y = fy; s.cam.z = zT; s.cam.init = true; }
      s.cam.x += (fx - s.cam.x) * k;
      s.cam.y += (fy - s.cam.y) * k;
      s.cam.z += (zT - s.cam.z) * k;
      const pk = 1 - Math.exp(-4 * dt);
      const allowPtr = motion && s.finePointer;
      s.ptr.x += ((allowPtr ? s.ptr.tx : 0) - s.ptr.x) * pk;
      s.ptr.y += ((allowPtr ? s.ptr.ty : 0) - s.ptr.y) * pk;
      const S = c0 * s.cam.z;
      const swayX = motion ? Math.sin(t * 0.33) * W * 0.006 : 0;
      const swayY = motion ? Math.cos(t * 0.27) * H * 0.005 : 0;
      let tx = W * 0.5 - s.cam.x * S - s.ptr.x * W * 0.02 + swayX;
      let ty = H * 0.6 - s.cam.y * S - s.ptr.y * H * 0.02 + swayY;
      tx = clamp(tx, W - KW * S, 0);
      ty = clamp(ty, H - KH * S, 0);
      s.view = { tx, ty, S };
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${S})`;

      // Foreground parallax (1.8x the zoom)
      if (frontRef.current) {
        const fz = motion ? 1 + (s.cam.z - 1) * 1.8 : 1.2;
        const centerTx = W * 0.5 - (KW / 2) * S;
        const ftx = clamp((tx - centerTx) * 0.35 - s.ptr.x * W * 0.036, -W * 0.12, W * 0.12);
        const fty = clamp(-s.ptr.y * H * 0.036, -H * 0.1, H * 0.1);
        frontRef.current.style.transform = `translate3d(${motion ? ftx : 0}px, ${motion ? fty : 0}px, 0) scale(${fz})`;
      }
      if (tiltRef.current) {
        tiltRef.current.style.transform = allowPtr
          ? `perspective(1200px) rotateX(${(-s.ptr.y * 0.8).toFixed(3)}deg) rotateY(${(s.ptr.x * 0.8).toFixed(3)}deg) scale(1.02)`
          : "none";
      }
    };

    const startLoop = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => {
      const hidden = document.hidden;
      stageRef.current?.classList.toggle("pa-paused", hidden);
      if (hidden) stopLoop(); else startLoop();
    };
    document.addEventListener("visibilitychange", onVis);
    if (!document.hidden) startLoop();
    return () => { stopLoop(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    sim.current.ptr.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    sim.current.ptr.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  };
  const onPointerLeave = () => { sim.current.ptr.tx = 0; sim.current.ptr.ty = 0; };

  const godRays = [-26, -13, 0, 12, 25];

  return (
    <div
      ref={stageRef}
      className={"pa-stage" + (urgent ? " pa-urgent" : "")}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={tiltRef} className="pa-stage-tilt">
        <div ref={shakeRef} className="pa-stage-shake">
          <div ref={worldRef} className="pa-world" style={{ width: KW, height: KH }}>
            <img className="pa-keyart" src="/assets/bg-keyart.png" alt="" draggable={false} />
            <div className="pa-temple-glow" style={{ left: TEMPLE_DOOR.x, top: TEMPLE_DOOR.y }} aria-hidden />
            <div className="pa-godrays" style={{ left: TEMPLE_DOOR.x, top: TEMPLE_DOOR.y }} aria-hidden>
              {godRays.map((deg, i) => (
                <span key={i} className="pa-ray" style={{ "--pa-ray-rot": `${deg}deg`, animationDelay: `${-i * 1.3}s` } as React.CSSProperties} />
              ))}
            </div>
            {spots.map((u, i) => {
              const pt = pointAt(u);
              const d = depthScale(pt.y);
              return (
                <div
                  key={i}
                  ref={(el) => { fruitRefs.current[i] = el; }}
                  className={"pa-fruit" + (i < sim.current.eaten ? " pa-fruit-eaten" : "")}
                  style={{ left: pt.x, top: pt.y, "--pa-d": d } as React.CSSProperties}
                  aria-hidden
                >
                  <div className="pa-fruit-shadow" />
                  <div className="pa-fruit-fly">
                    <div className="pa-fruit-bob" style={{ animationDelay: `${-i * 0.7}s` }}>
                      <GoldenFruit id={i} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={pipRef} className="pa-pip" aria-hidden>
              <div ref={shadowRef} className="pa-pip-shadow" />
              <div ref={glowRef} className="pa-pip-glow" />
              <div ref={bodyRef} className="pa-pip-body" data-pose="sleep">
                <div ref={spriteRef} className="pa-pip-sprite">
                  {RENDERED_POSES.map((pose) => (
                    <img
                      key={pose}
                      className="pa-pip-img"
                      data-pose={pose}
                      src={`/assets/pip-${pose}.png`}
                      alt=""
                      draggable={false}
                      style={{ height: `calc(var(--pa-bh) * ${POSE_FACTOR[pose]})` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pa-fog pa-fog-a" aria-hidden />
          <div className="pa-fog pa-fog-b" aria-hidden />
          <div className="pa-fog pa-fog-c" aria-hidden />
          <div className="pa-fireflies" aria-hidden>
            {fireflies.map((f, i) => (
              <span
                key={i}
                className="pa-firefly"
                style={{
                  left: `${f.left}%`,
                  top: `${f.top}%`,
                  width: f.size,
                  height: f.size,
                  filter: f.blur ? `blur(${f.blur.toFixed(1)}px)` : undefined,
                  "--pa-dx": `${f.dx}px`,
                  "--pa-dy": `${f.dy}px`,
                  "--pa-op": f.op,
                  animationDuration: `${f.dur}s, ${f.blink}s`,
                  animationDelay: `${f.delay}s, ${f.delay / 3}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div ref={frontRef} className="pa-front" aria-hidden />
          <div ref={fxRef} className="pa-fx" aria-hidden />
          <div ref={flashRef} className="pa-flash" aria-hidden />
          <div className="pa-glass" aria-hidden />
        </div>
      </div>
      {children}
    </div>
  );
}

function GoldenFruit({ id }: { id: number }) {
  const g = `pa-fruit-g-${id}`;
  const h = `pa-fruit-h-${id}`;
  return (
    <svg viewBox="0 0 64 64" className="pa-fruit-svg">
      <defs>
        <radialGradient id={g} cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="oklch(0.98 0.12 95)" />
          <stop offset="45%" stopColor="oklch(0.85 0.17 82)" />
          <stop offset="100%" stopColor="oklch(0.62 0.16 55)" />
        </radialGradient>
        <radialGradient id={h} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.92 0.17 90 / 0.8)" />
          <stop offset="100%" stopColor="oklch(0.92 0.17 90 / 0)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="36" r="30" fill={`url(#${h})`} />
      <path d="M32 18c-6-5-20-3-20 13 0 13 9 23 20 23s20-10 20-23c0-16-14-18-20-13z" fill={`url(#${g})`} stroke="oklch(0.55 0.14 60)" strokeWidth="1.5" />
      <path d="M32 19c0-5 2-8 4-10" stroke="oklch(0.4 0.08 70)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M35 12c6-6 13-4 14-2-4 5-10 6-14 2z" fill="oklch(0.62 0.18 140)" />
      <ellipse cx="23" cy="29" rx="5" ry="7" fill="oklch(1 0 0 / 0.55)" transform="rotate(-25 23 29)" />
    </svg>
  );
}
