"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { H, THEMES, W, Z, type Theme } from "./scene";
// 게임의 캐릭터 엔진과 캐릭터 코드를 그대로 쓴다(components/online/rig)
import { drawChar, makeChar, startAction } from "./rig/chars";

// 장면 무대. 게임 화면과 같은 층으로 쌓는다: 바닥(지도) → 건물, 나무, 수풀, 캐릭터(발밑 y 로 앞뒤 정렬) → 시야 안개 → 위치 공개와 감옥 고리 → 화면 위 표시.
// 캐릭터는 장면 대본(StageScript)이 정한 자리로 옮기고, 걸음걸이와 방향, 잡기, 갇힘, 탈옥 동작은 게임 코드가 그린다.
// 대본이 끝나면 처음부터 다시 돈다. 화면에 보일 때만 돌고, 움직임을 줄이도록 설정한 사람에게는 한 순간에 멈춰 둔다.

export type Team = "police" | "robber";
export type Cast = { id: string; team: Team; x: number; y: number; tag?: string; me?: boolean; jailed?: boolean };
export type Place = { x: number; y: number; inBush?: boolean; hidden?: boolean; shade?: boolean; face?: number; state?: string };
export type Api = { act: (id: string, name: "catch" | "jail" | "escape", dx?: number) => void; once: (key: string) => boolean; pop: (id: string, amount: number) => void };
export type StageScript = {
  length: number; // 초. 끝나면 처음으로
  still: number; // 움직임을 줄인 사람에게 멈춰 보여 줄 순간
  cast: Cast[];
  move: (t: number, api: Api) => Record<string, Place>;
};

export type Agent = { id: string; team: Team; x: number; y: number; vx: number; vy: number; ix: number; iy: number; state: string; inBush: boolean; isPlayer: boolean; faceA: number };
// drawChar 가 돌려받는 캐릭터. 게임 코드가 만든 객체라 필요한 것만 적는다
type Char = { el: HTMLDivElement; a: Agent };

const VISION = 510, NEAR = 150, CONE = 1.15, BUSH_SEE = 120, TURN = 7;

/** 게임 drawFog 의 시야 다각형: 바라보는 쪽은 VISION, 나머지는 NEAR, 건물에 막히면 멈춘다 */
function fogPoints(theme: Theme, x: number, y: number, face: number, blockers: number[][]) {
  const R = VISION * THEMES[theme].vision;
  const reach = (a: number) => {
    let d = a - face;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    const k = Math.min(1, Math.max(0, (CONE + 0.14 - d) / 0.28));
    return NEAR + (R - NEAR) * k * k * (3 - 2 * k);
  };
  const pts: string[] = [];
  for (let i = 0; i < 180; i++) {
    const a = -Math.PI + (i / 180) * Math.PI * 2, dx = Math.cos(a) || 1e-9, dy = Math.sin(a) || 1e-9;
    let t = reach(a);
    for (const [bx, by, bw, bh] of blockers) {
      const tx1 = (bx - x) / dx, tx2 = (bx + bw - x) / dx, ty1 = (by - y) / dy, ty2 = (by + bh - y) / dy;
      const tn = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2)), tf = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
      if (tf >= tn && tn > 0 && tn < t) t = tn;
    }
    pts.push(`${(x + dx * t).toFixed(1)},${(y + dy * t).toFixed(1)}`);
  }
  return { pts: pts.join(" "), R };
}

/** 게임 sees: 시야 거리 안이고, 가깝거나 바라보는 쪽이며, 수풀 속이면 아주 가까울 때만 보인다 */
function sees(theme: Theme, me: Agent, a: Agent) {
  const d = Math.hypot(a.x - me.x, a.y - me.y), R = VISION * THEMES[theme].vision;
  if (d > R) return false;
  if (a.inBush && d > BUSH_SEE) return false;
  if (d < NEAR) return true;
  let da = Math.atan2(a.y - me.y, a.x - me.x) - me.faceA;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) < CONE;
}

const STAGE_CSS = `
.og-stage .char { position:absolute; left:0; top:0; will-change:transform; transform-origin:0 0; }
.og-stage .char svg { position:absolute; left:0; bottom:0; display:none; overflow:visible; }
.og-stage .char svg.on { display:block; }
.og-stage .char .shadow { position:absolute; left:0; bottom:-14px; width:96px; height:26px; margin-left:-48px; border-radius:50%; background:rgba(29,35,43,.16); }
.og-stage .char.shade svg { filter:saturate(.55) contrast(.78) brightness(1.16); opacity:.92; transition:filter .28s ease-out, opacity .28s; }
.og-stage .char svg { transition:filter .28s ease-out, opacity .28s; }
.og-stage .tag { position:absolute; left:0; transform:translateX(-50%); white-space:nowrap; font-size:46px; font-weight:800; line-height:1.15; padding:4px 22px 6px; border-radius:999px; background:#fff; color:#1D232B; box-shadow:0 2px 0 rgba(29,35,43,.12); }
.og-stage .tag.me.police { background:#2A9BEF; color:#fff; }
.og-stage .tag.me.robber { background:#35C26B; color:#fff; }
.og-stage .layer { position:absolute; overflow:visible; pointer-events:none; }
`;

export default function GameStage({
  label,
  theme,
  bounds,
  map,
  sprites,
  script,
  fog = true,
  blockers = [],
  overlay,
  hud,
  follow = true,
  cam: fixedCam,
}: {
  label: string;
  theme: Theme;
  bounds: [number, number, number, number]; // 지도를 그리는 월드 범위 x, y, w, h
  map: ReactNode;
  sprites: { y: number; node: ReactNode }[];
  script: StageScript;
  fog?: boolean;
  blockers?: number[][];
  overlay?: (t: number, agents: Record<string, Agent>) => ReactNode;
  hud: (t: number) => ReactNode;
  follow?: boolean;
  cam?: [number, number];
}) {
  const box = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const actors = useRef<HTMLDivElement>(null);
  const fogSvg = useRef<SVGSVGElement>(null);
  const fogPoly = useRef<SVGPolygonElement>(null);
  const fogGrad = useRef<SVGRadialGradientElement>(null);
  const [scale, setScale] = useState(1);
  const [tick, setTick] = useState(0);
  const [snap, setSnap] = useState<Record<string, Agent>>({});
  const id = `st${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // 틀 폭에 맞춰 844x390 무대를 줄인다
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = actors.current, wEl = world.current;
    if (!host || !wEl) return;
    let chars = new Map<string, Char>(), agents = new Map<string, Agent>();
    let t = 0, last = 0, raf = 0, visible = false, hudT = 0;
    let cam: [number, number] = fixedCam ?? [0, 0];
    const fired = new Set<string>();
    const api: Api = {
      act: (aid, name, dx) => { const c = chars.get(aid); if (c) startAction(c, name, dx ?? 1); },
      once: (key) => (fired.has(key) ? false : (fired.add(key), true)),
      // 대기실에서 칸에 들어갈 때처럼 납작했다 튀어나오게(lobby.js morph)
      pop: (aid, amount) => { const c = chars.get(aid) as unknown as { pop: { x: number } } | undefined; if (c) c.pop.x = amount; },
    };
    const reset = () => {
      host.replaceChildren();
      chars = new Map(); agents = new Map(); fired.clear(); t = 0;
      for (const c of script.cast) {
        const a: Agent = { id: c.id, team: c.team, x: c.x, y: c.y, vx: 0, vy: 0, ix: 0, iy: 0, state: c.jailed ? "jailed" : "free", inBush: false, isPlayer: !!c.me, faceA: 0 };
        const ch = makeChar(host, a, c.tag, c.me) as Char;
        if (c.jailed) startAction(ch, "jailed");
        chars.set(c.id, ch); agents.set(c.id, a);
      }
    };
    const step = (dt: number) => {
      t += dt;
      if (t > script.length) reset();
      const places = script.move(t, api);
      for (const [aid, a] of agents) {
        const p = places[aid];
        if (!p) continue;
        const vx = (p.x - a.x) / dt, vy = (p.y - a.y) / dt, sp = Math.hypot(vx, vy);
        a.vx = vx; a.vy = vy;
        a.ix = sp > 8 ? vx / sp : 0; a.iy = sp > 8 ? vy / sp : 0;
        a.x = p.x; a.y = p.y; a.inBush = !!p.inBush;
        if (p.state) a.state = p.state;
        // 바라보는 쪽은 움직이는 쪽으로 TURN 속도만큼 돈다(게임 step). 대본이 정하면 그쪽을 본다
        const want = p.face ?? (sp > 8 ? Math.atan2(vy, vx) : a.faceA);
        let da = want - a.faceA; da = Math.atan2(Math.sin(da), Math.cos(da));
        a.faceA += Math.sign(da) * Math.min(Math.abs(da), TURN * dt);
        const c = chars.get(aid)!;
        c.el.classList.toggle("shade", !!p.shade);
        c.el.dataset.hidden = p.hidden ? "1" : "";
      }
      const mine = [...agents.values()].find((a) => a.isPlayer) ?? null;
      for (const [aid, c] of chars) {
        drawChar(c, dt);
        const a = agents.get(aid)!;
        const show = c.el.dataset.hidden !== "1" && (!fog || !mine || a.team === mine.team || sees(theme, mine, a));
        c.el.style.display = show ? "" : "none";
      }
      // 카메라: 게임처럼 살짝 늦게 따라간다
      if (follow && mine && !fixedCam) {
        const tx = mine.x + mine.vx * 0.22 - W / 2 / Z, ty = mine.y - 30 + mine.vy * 0.22 - H / 2 / Z, k = Math.min(1, dt * 6);
        cam = t < 0.05 ? [tx, ty] : [cam[0] + (tx - cam[0]) * k, cam[1] + (ty - cam[1]) * k];
      }
      wEl.style.transform = `scale(${Z}) translate(${-cam[0]}px, ${-cam[1]}px)`;
      if (fog && mine && fogPoly.current && fogGrad.current && fogSvg.current) {
        const { pts, R } = fogPoints(theme, mine.x, mine.y, mine.faceA, blockers);
        fogPoly.current.setAttribute("points", pts);
        fogGrad.current.setAttribute("cx", String(mine.x)); fogGrad.current.setAttribute("cy", String(mine.y)); fogGrad.current.setAttribute("r", String(R));
      }
      hudT += dt;
      if (hudT > 1 / 15) { hudT = 0; setTick(t); setSnap(Object.fromEntries([...agents].map(([k, a]) => [k, { ...a }]))); }
    };
    reset();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      for (let k = 0; k < script.still * 30; k++) step(1 / 30);
      setTick(t);
      return () => host.replaceChildren();
    }
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    });
    io.observe(box.current!);
    return () => { io.disconnect(); cancelAnimationFrame(raf); host.replaceChildren(); };
    // 대본과 장면 설정은 처음 한 번만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bx, by, bw, bh] = bounds;
  const T = THEMES[theme];
  const layer = (z: number, node: ReactNode, key?: string) => (
    <svg key={key} className="layer" style={{ left: bx, top: by, width: bw, height: bh, zIndex: z }} viewBox={`${bx} ${by} ${bw} ${bh}`}>
      {node}
    </svg>
  );
  return (
    <div ref={box} role="img" aria-label={label} className="og-stage relative h-full w-full select-none overflow-hidden" style={{ fontFamily: "Pretendard, 'Noto Sans KR', system-ui, sans-serif" }}>
      <style>{STAGE_CSS}</style>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }} aria-hidden>
        <div ref={world} style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0" }}>
          {layer(0, map)}
          {sprites.map((s, i) => layer(Math.round(s.y), s.node, `s${i}`))}
          <div ref={actors} style={{ position: "absolute", left: 0, top: 0 }} />
          {fog && (
            <svg ref={fogSvg} className="layer" style={{ left: bx, top: by, width: bw, height: bh, zIndex: 100000 }} viewBox={`${bx} ${by} ${bw} ${bh}`}>
              <defs>
                <radialGradient ref={fogGrad} id={`${id}-g`} cx={0} cy={0} r={VISION} gradientUnits="userSpaceOnUse">
                  <stop offset={0.72} stopColor="#000" />
                  <stop offset={1} stopColor="#fff" />
                </radialGradient>
                <filter id={`${id}-b`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation={7 / Z} />
                </filter>
                <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={bx} y={by} width={bw} height={bh}>
                  <rect x={bx} y={by} width={bw} height={bh} fill="#fff" />
                  <polygon ref={fogPoly} points="" fill={`url(#${id}-g)`} filter={`url(#${id}-b)`} />
                </mask>
              </defs>
              <rect x={bx} y={by} width={bw} height={bh} fill={`rgba(${T.fog},${T.fogA})`} mask={`url(#${id}-m)`} />
            </svg>
          )}
          {overlay && layer(100001, overlay(tick, snap))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: W, height: H }}>
          {hud(tick)}
        </svg>
      </div>
    </div>
  );
}
