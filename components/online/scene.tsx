import type { ReactNode } from "react";

// 온라인 게임 장면을 그리는 부품. 실제 판을 찍지 않고, 게임과 같은 에셋과 같은 그리기 규칙으로 직접 배치한다.
// 값은 모두 게임 저장소(cops-and-robbers-web-game)에서 옮겼다:
//   지도 색과 시야 값    shared/logic.js 의 THEMES, CFG(VISION 510, NEAR 150, CONE 1.15)
//   길, 건물, 감옥       client/game.js bakeMap, drawBuilding (64칸 보도 줄, 지붕과 벽, 창 격자)
//   수풀, 나무, 꽃       client/brand/map/*.svg
//   캐릭터               client/playground.html SVGS (public/online/*.svg 로 복사), 몸집 경찰 0.95, 도둑 1.12
//   화면 위 표시         폰 가로 844x390 에서 실제 게임의 위치, 크기, 색을 재서 옮겼다(2026-11-06)
// 장면은 폰 가로 화면(844 x 390)에 게임 확대(0.5417)를 그대로 써서, 월드 좌표로 놓고 화면 좌표로 줄인다.

export const W = 844;
export const H = 390;
export const Z = 0.5417; // 게임 확대: min(844/1180, 390/720)
export const VW = W / Z; // 화면에 보이는 월드 폭 1558
export const VH = H / Z; // 720
const CH = 0.497; // 캐릭터 요소 배율(게임에서 잰 값)

export const TEAM = { police: "#2A9BEF", robber: "#35C26B" } as const;
const INK = "#1D232B";

export type Theme = "town" | "night";

// shared/logic.js THEMES 와 client/game.js artColors 에서 옮긴 값
export const THEMES = {
  town: {
    ground: "#DDF0CA", road: "#E7EEF4", line: "#CFDAE6", plaza: "#EEF3F7", jail: "#E1E9F1", speck: "#D2EBBE",
    roofs: [["#E1EFFC", "#BCD8F2"], ["#E8E5FA", "#CEC8F0"], ["#DDF2E7", "#BCE2CC"], ["#FFF0DB", "#F0D3AE"], ["#DCECF9", "#B5D2EC"]],
    win: "#FFFFFF", winOff: "#F3F9FF",
    bush: ["#86C687", "#A6DA97", "#C9EBB4"], tree: ["#7DBE7E", "#93CF8C", "#B7E3A1", "#D6F0C2"], trunk: ["#C99A73", "#AE7F5B"],
    fog: "18,23,32", fogA: 0.5, vision: 1, night: false, ground2: "rgba(52,96,72,.17)", bin: ["#A7C8E8", "#8DB3DA"],
  },
  night: {
    ground: "#33485F", road: "#4A5A80", line: "#3B4A70", plaza: "#506089", jail: "#58698F", speck: "#3A5268",
    roofs: [["#66778F", "#55657E"], ["#6B6C90", "#58597B"], ["#5E7484", "#4C6170"]],
    win: "#FFD978", winOff: "#3A4E73",
    bush: ["#1E2C55", "#2A3A69", "#3D4F80"], tree: ["#17234A", "#22305E", "#2F3F70", "#4A5D88"], trunk: ["#5A4040", "#463232"],
    fog: "6,9,18", fogA: 0.7, vision: 0.78, night: true, ground2: "rgba(8,14,34,.32)", bin: ["#3E4C6E", "#33405E"],
  },
} as const;

/** 장면 틀. cam 은 화면 왼쪽 위의 월드 좌표. world 는 월드 좌표로, hud 는 화면 좌표로 그린다 */
export function Scene({ label, cam, world, hud }: { label: string; cam: [number, number]; world: ReactNode; hud: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-full w-full select-none" style={{ fontFamily: "Pretendard, 'Noto Sans KR', system-ui, sans-serif" }}>
      <style>{SCENE_CSS}</style>
      <g transform={`scale(${Z}) translate(${-cam[0]} ${-cam[1]})`}>{world}</g>
      {hud}
    </svg>
  );
}

// ── 지도 ──

export type Road = { x: number; y: number; w: number; h: number };

/** 바닥과 길. 길은 64칸마다 가로세로 보도 줄(굵기 3), 교차로는 줄을 지운다 */
export function Ground({ theme, cam, roads }: { theme: Theme; cam: [number, number]; roads: Road[] }) {
  const T = THEMES[theme];
  const hs = roads.filter((r) => r.w > r.h), vs = roads.filter((r) => r.w <= r.h);
  const lines = (r: Road) => {
    const out: string[] = [];
    for (let k = 64; k < r.w; k += 64) out.push(`M${r.x + k} ${r.y}V${r.y + r.h}`);
    for (let k = 64; k < r.h; k += 64) out.push(`M${r.x} ${r.y + k}H${r.x + r.w}`);
    return out.join("");
  };
  return (
    <g>
      <rect x={cam[0] - 40} y={cam[1] - 40} width={VW + 80} height={VH + 80} fill={T.ground} />
      {roads.map((r, i) => (
        <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={T.road} />
      ))}
      <path d={roads.map(lines).join("")} stroke={T.line} strokeWidth={3} fill="none" />
      {hs.flatMap((h, i) =>
        vs
          .filter((v) => !(v.x + v.w < h.x || v.x > h.x + h.w || h.y + h.h < v.y || h.y > v.y + v.h))
          .map((v, j) => <rect key={`x${i}-${j}`} x={v.x} y={h.y} width={v.w} height={h.h} fill={T.road} />),
      )}
    </g>
  );
}

/** 짧은 풀 자국(게임 bakeMap 의 speck) */
export function Grass({ theme, x, y }: { theme: Theme; x: number; y: number }) {
  return (
    <path
      d={`M${x - 9} ${y + 4}Q${x - 6} ${y - 6} ${x - 3} ${y + 4}M${x + 1} ${y + 4}Q${x + 4} ${y - 8} ${x + 7} ${y + 4}`}
      stroke={THEMES[theme].speck}
      strokeWidth={4}
      fill="none"
    />
  );
}

/** 건물(client/game.js drawBuilding). tone 은 지붕색 순서, door 는 문이 날 창 칸, ac 는 지붕 실외기 자리(0~1) */
export function Building({ theme, x, y, w, h, tone = 0, door = 1, ac }: { theme: Theme; x: number; y: number; w: number; h: number; tone?: number; door?: number; ac?: [number, number] }) {
  const T = THEMES[theme];
  const [roof, wall] = T.roofs[tone % T.roofs.length];
  const wh = Math.min(84, Math.max(46, h * 0.4)), rh = h - wh;
  const cols = Math.max(1, Math.floor((w - 24) / 40)), rows = Math.max(1, Math.floor((wh - 22) / 30));
  const gx = x + (w - (cols * 40 - 14)) / 2, gy = y + rh + (wh - 10 - (rows * 30 - 10)) / 2;
  const id = `b${Math.round(x)}-${Math.round(y)}`;
  const dh = Math.min(wh - 16, 40);
  return (
    <g>
      <rect x={x + 10} y={y + 14} width={w + 4} height={h + 4} rx={16} fill={T.night ? "rgba(8,14,34,.35)" : "rgba(70,110,160,.14)"} />
      <rect x={x} y={y} width={w} height={h} rx={14} fill={wall} />
      <rect x={x} y={y + h - 10} width={w} height={10} rx={6} fill={T.night ? "rgba(0,0,0,.18)" : "rgba(60,100,150,.10)"} />
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={rh} rx={14} />
      </clipPath>
      <rect x={x} y={y} width={w} height={rh} rx={14} fill={roof} />
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={y} width={w} height={7} fill="rgba(255,255,255,.45)" />
        <rect x={x} y={y} width={7} height={rh} fill="rgba(255,255,255,.45)" />
        <rect x={x} y={y + rh - 9} width={w} height={9} fill={T.night ? "rgba(0,0,0,.22)" : "rgba(60,100,150,.16)"} />
      </g>
      {ac && w > 120 && (
        <g>
          <rect x={x + 22 + ac[0] * (w - 90)} y={y + 22 + ac[1] * Math.max(0, rh - 70)} width={46} height={30} rx={6} fill={wall} />
          <circle cx={x + 45 + ac[0] * (w - 90)} cy={y + 37 + ac[1] * Math.max(0, rh - 70)} r={9} fill={roof} />
        </g>
      )}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, k) => {
          if (k === door && r === rows - 1 && cols > 1) return null;
          const wx = gx + k * 40, wy = gy + r * 30, lit = T.night && (k * 13 + r * 7 + Math.round(x)) % 5 < 2.7;
          return (
            <g key={`${r}-${k}`}>
              {lit && <rect x={wx - 4} y={wy - 4} width={34} height={28} rx={8} fill="rgba(255,217,120,.25)" />}
              <rect x={wx} y={wy} width={26} height={20} rx={5} fill={lit ? T.win : T.winOff} />
              {!T.night && <rect x={wx} y={wy + 14} width={26} height={6} rx={3} fill="rgba(120,170,220,.22)" />}
            </g>
          );
        }),
      )}
      {cols > 1 && <rect x={gx + door * 40 - 2} y={y + h - 10 - dh} width={30} height={dh} rx={8} fill={T.night ? "#2E3C5E" : "#A9C9E8"} />}
    </g>
  );
}

/** 게임과 같은 수풀(client/brand/map/bush.svg). 게임은 폭을 rx * 2.2 로 그린다 */
export function Bush({ theme, x, foot, rx }: { theme: Theme; x: number; foot: number; rx: number }) {
  const [lo, mid, hi] = THEMES[theme].bush;
  const s = (rx * 2.2) / 220;
  return (
    <g transform={`translate(${x - 110 * s} ${foot - 121 * s}) scale(${s})`}>
      {[[30, 99, 28], [62, 81, 40], [110, 67, 48], [160, 79, 42], [192, 99, 26]].map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} fill={lo} />
      ))}
      <path d="M6,104 Q6,92 30,90 L190,90 Q214,92 214,104 Q214,122 188,122 L32,122 Q6,122 6,104 Z" fill={lo} />
      {[[30, 92, 28], [62, 74, 40], [110, 60, 48], [160, 72, 42], [192, 92, 26]].map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} fill={mid} />
      ))}
      <path d="M10,100 Q10,88 32,86 L188,86 Q210,88 210,100 Q210,113 188,113 L32,113 Q10,113 10,100 Z" fill={mid} />
      <path d="M37.2,66 A28,28 0 0 1 66,47.6 A36,36 0 0 0 37.2,66 Z M80.2,50.4 A33.6,33.6 0 0 1 114.8,28.3 A43.2,43.2 0 0 0 80.2,50.4 Z M134,63.6 A29.4,29.4 0 0 1 164.2,44.3 A37.8,37.8 0 0 0 134,63.6 Z" fill={hi} />
    </g>
  );
}

/** 게임과 같은 나무(client/brand/map/tree.svg, 작은 나무는 tree-small.svg). 게임은 폭을 r * 2.3 으로, r 이 70 보다 작으면 작은 나무로 그리고 발밑에 그림자를 깐다 */
export function Tree({ theme, x, foot, r }: { theme: Theme; x: number; foot: number; r: number }) {
  const T = THEMES[theme];
  const [t1, t2, t3, t4] = T.tree;
  const [k1, k2] = T.trunk;
  const s = (r * 2.3) / 200;
  const small = r < 70;
  return (
    <g>
      <ellipse cx={x + r * 0.08} cy={foot - 3 + r * 0.06} rx={r * 0.8} ry={r * 0.24} fill={T.ground2} />
      <g transform={`translate(${x - 100 * s} ${foot - 236 * s}) scale(${s})`}>
        <path d={small ? "M86,236 C88,214 90,192 92,172 L108,172 C110,192 112,214 114,236 Z" : "M86,236 C88,214 90,188 92,168 L108,168 C110,188 112,214 114,236 Z"} fill={k1} />
        <path d={small ? "M100,236 C103,214 106,192 108,172 L112,172 C113,192 113,214 114,236 Z" : "M100,236 C103,214 106,188 108,168 L112,168 C113,188 113,214 114,236 Z"} fill={k2} />
        <path d={small ? "M93,202 L70,184 M107,200 L130,182" : "M93,198 L70,180 M107,196 L130,178"} stroke={k1} strokeWidth={7} strokeLinecap="round" fill="none" />
        {small ? (
          <>
            <path d="M30.0,184.0 C30.0,135.9 60.8,110.0 100.0,110.0 C139.2,110.0 170.0,135.9 170.0,184.0 Q156.0,193.0 142.0,184.0 Q128.0,193.0 114.0,184.0 Q100.0,193.0 86.0,184.0 Q72.0,193.0 58.0,184.0 Q44.0,193.0 30.0,184.0 Z" fill={t2} />
            <path d="M30.0,178.0 C30.0,129.9 60.8,104.0 100.0,104.0 C139.2,104.0 170.0,129.9 170.0,178.0 Q156.0,187.0 142.0,178.0 Q128.0,187.0 114.0,178.0 Q100.0,187.0 86.0,178.0 Q72.0,187.0 58.0,178.0 Q44.0,187.0 30.0,178.0 Z" fill={t3} />
            <path d="M52.0,128.0 C52.0,82.5 73.1,58.0 100.0,58.0 C126.9,58.0 148.0,82.5 148.0,128.0 Q136.0,137.0 124.0,128.0 Q112.0,137.0 100.0,128.0 Q88.0,137.0 76.0,128.0 Q64.0,137.0 52.0,128.0 Z" fill={t3} />
            <path d="M52.0,122.0 C52.0,76.5 73.1,52.0 100.0,52.0 C126.9,52.0 148.0,76.5 148.0,122.0 Q136.0,131.0 124.0,122.0 Q112.0,131.0 100.0,122.0 Q88.0,131.0 76.0,122.0 Q64.0,131.0 52.0,122.0 Z" fill={t4} />
            <ellipse cx={84.6} cy={73} rx={11.5} ry={11.2} fill={T.night ? "#5C6E9C" : "#F4FBEF"} opacity={0.5} />
          </>
        ) : (
          <>
            <path d="M8.0,182.0 C8.0,137.8 48.5,114.0 100.0,114.0 C151.5,114.0 192.0,137.8 192.0,182.0 Q178.9,191.0 165.7,182.0 Q152.6,191.0 139.4,182.0 Q126.3,191.0 113.1,182.0 Q100.0,191.0 86.9,182.0 Q73.7,191.0 60.6,182.0 Q47.4,191.0 34.3,182.0 Q21.1,191.0 8.0,182.0 Z" fill={t1} />
            <path d="M8.0,176.0 C8.0,131.8 48.5,108.0 100.0,108.0 C151.5,108.0 192.0,131.8 192.0,176.0 Q178.9,185.0 165.7,176.0 Q152.6,185.0 139.4,176.0 Q126.3,185.0 113.1,176.0 Q100.0,185.0 86.9,176.0 Q73.7,185.0 60.6,176.0 Q47.4,185.0 34.3,176.0 Q21.1,185.0 8.0,176.0 Z" fill={t2} />
            <path d="M30.0,132.0 C30.0,90.4 60.8,68.0 100.0,68.0 C139.2,68.0 170.0,90.4 170.0,132.0 Q156.0,141.0 142.0,132.0 Q128.0,141.0 114.0,132.0 Q100.0,141.0 86.0,132.0 Q72.0,141.0 58.0,132.0 Q44.0,141.0 30.0,132.0 Z" fill={t2} />
            <path d="M30.0,126.0 C30.0,84.4 60.8,62.0 100.0,62.0 C139.2,62.0 170.0,84.4 170.0,126.0 Q156.0,135.0 142.0,126.0 Q128.0,135.0 114.0,126.0 Q100.0,135.0 86.0,126.0 Q72.0,135.0 58.0,126.0 Q44.0,135.0 30.0,126.0 Z" fill={t3} />
            <path d="M54.0,86.0 C54.0,43.1 74.2,20.0 100.0,20.0 C125.8,20.0 146.0,43.1 146.0,86.0 Q134.5,95.0 123.0,86.0 Q111.5,95.0 100.0,86.0 Q88.5,95.0 77.0,86.0 Q65.5,95.0 54.0,86.0 Z" fill={t3} />
            <path d="M54.0,80.0 C54.0,37.1 74.2,14.0 100.0,14.0 C125.8,14.0 146.0,37.1 146.0,80.0 Q134.5,89.0 123.0,80.0 Q111.5,89.0 100.0,80.0 Q88.5,89.0 77.0,80.0 Q65.5,89.0 54.0,80.0 Z" fill={t4} />
            <ellipse cx={85.3} cy={33.8} rx={11} ry={10.6} fill={T.night ? "#5C6E9C" : "#F4FBEF"} opacity={0.5} />
          </>
        )}
      </g>
    </g>
  );
}

/** 생울타리(client/game.js drawBush 의 hedge): 수풀 덩이를 겹쳐 이은 줄. y 는 덤불 가운데, 바닥은 y + ry * 0.82 */
export function Hedge({ theme, x, y, rx, ry }: { theme: Theme; x: number; y: number; rx: number; ry: number }) {
  const foot = y + ry * 0.82;
  if (rx >= ry) {
    const n = Math.max(2, Math.round((rx * 2) / 90)), pw = ((rx * 2) / n) * 1.5;
    return (
      <g>
        <ellipse cx={x + rx * 0.105} cy={foot - 3 + Math.max(ry, 18) * 0.075} rx={rx * 1.05} ry={Math.max(ry, 18) * 0.3} fill={THEMES[theme].ground2} />
        {Array.from({ length: n }, (_, k) => (
          <Bush key={k} theme={theme} x={x - rx + pw * 0.45 + (k * (rx * 2 - pw * 0.9)) / (n - 1)} foot={foot} rx={pw / 2.2} />
        ))}
      </g>
    );
  }
  const pw = Math.max(rx * 2.6, 70), top = foot - ry * 1.5, n = Math.max(2, Math.ceil((foot - top) / (pw * 0.56 * 0.45)) + 1);
  return (
    <g>
      {Array.from({ length: n }, (_, k) => (
        <Bush key={k} theme={theme} x={x} foot={top + (k * (foot - top)) / (n - 1)} rx={pw / 2.2} />
      ))}
    </g>
  );
}

/** 쓰레기통 두 개(client/game.js drawBins). 부딪히는 칸보다 30 높게 그린다 */
export function Bins({ theme, x, y, w, h }: { theme: Theme; x: number; y: number; w: number; h: number }) {
  const [c0, c1] = THEMES[theme].bin;
  const top = y - 30, hh = h + 30, bw = w / 2;
  return (
    <g>
      <rect x={x + 3} y={top + hh - 3} width={w + 2} height={8} fill="rgba(29,35,43,.16)" />
      {[0, 1].map((k) => {
        const bx = x + k * bw + 1, iw = bw - 3;
        return (
          <g key={k}>
            <rect x={bx + 1} y={top + 12} width={iw - 2} height={hh - 12} rx={3} fill={c0} />
            {[1, 2].map((v) => <rect key={v} x={bx + (iw * v) / 3 - 1} y={top + 20} width={2} height={hh - 28} fill="rgba(0,0,0,.14)" />)}
            <rect x={bx - 1} y={top} width={iw + 2} height={15} rx={3} fill={c1} />
            <rect x={bx + iw * 0.34} y={top + hh - 3} width={iw * 0.32} height={3} fill="rgba(0,0,0,.4)" />
          </g>
        );
      })}
    </g>
  );
}

/** 게임과 같은 꽃(client/brand/map/flower.svg). 게임은 18~26 크기로 뿌린다 */
export function Flower({ x, y, size = 22 }: { x: number; y: number; size?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s} ${y + 10 - 24 * s}) scale(${s})`}>
      {[[12, 6], [17.7, 10.1], [15.5, 16.9], [8.5, 16.9], [6.3, 10.1]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={5.2} fill="#FFFFFF" />
      ))}
      <circle cx={12} cy={12} r={3.6} fill="#FFD36B" />
    </g>
  );
}

/** 감옥 마당과 감옥(client/game.js bakeMap). 문 앞 원 GATE_R 235, 감옥 r 175, 위에 "감옥" 글자판 */
export function Jail({ theme, x, y }: { theme: Theme; x: number; y: number }) {
  const T = THEMES[theme];
  const w = 60 + 78, sy = y - 175 - 62;
  return (
    <g>
      <circle cx={x} cy={y} r={235} fill={T.plaza} stroke={T.night ? "#5A6A90" : "#F6F9FB"} strokeWidth={8} />
      <circle cx={x} cy={y} r={175} fill={T.jail} />
      <circle cx={x} cy={y} r={170} fill="none" stroke={T.night ? "#C9CFDC" : "#FFFFFF"} strokeWidth={9} />
      <rect x={x - w / 2 + 4} y={sy + 6} width={w} height={50} rx={16} fill="rgba(29,35,43,.18)" />
      <rect x={x - w / 2} y={sy} width={w} height={50} rx={16} fill={INK} />
      <circle cx={x - w / 2 + 28} cy={sy + 25} r={15} fill="#E2574C" />
      <image href="/online/siren.svg" x={x - w / 2 + 19} y={sy + 14} width={18} height={22} />
      <text x={x + 16} y={sy + 36} textAnchor="middle" fontSize={30} fontWeight={800} fill="#fff">
        감옥
      </text>
    </g>
  );
}

// ── 캐릭터 ──

const VIEWS = {
  "police-front": { w: 180, h: 200, base: 0.95 },
  "police-side": { w: 158, h: 202, base: 0.95 },
  "robber-front": { w: 160, h: 145, base: 1.12 },
  "robber-side": { w: 144, h: 164, base: 1.12 },
  "robber-jailed": { w: 140, h: 116, base: 1.12 * 1.45 },
} as const;
export type View = keyof typeof VIEWS;

/** 캐릭터 한 명(client/game.js makeChar). x, foot 은 월드 좌표의 발밑. 이름표는 .tag(나는 편 색) */
export function Char({ view, x, foot, flip = false, tag, me = false, hidden = false }: { view: View; x: number; foot: number; flip?: boolean; tag?: string; me?: boolean; hidden?: boolean }) {
  const v = VIEWS[view];
  const s = v.base * CH;
  const w = v.w * s, h = v.h * s;
  const team = view.startsWith("police") ? "police" : "robber";
  const headTop = (team === "police" ? 200 : 145) * VIEWS[`${team}-front`].base;
  const font = 46 * CH, tagH = font + 10 * CH, tagW = tag ? Array.from(tag).length * font + 44 * CH : 0;
  return (
    <g opacity={hidden ? 0.6 : 1}>
      <ellipse cx={x} cy={foot + 1 * CH} rx={48 * CH} ry={13 * CH} fill="rgba(29,35,43,.16)" />
      <image href={`/online/${view}.svg`} x={x - w / 2} y={foot - h + 3 * s} width={w} height={h} transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined} />
      {tag && (
        <g transform={`translate(${x} ${foot - (headTop + 66) * CH})`}>
          <rect x={-tagW / 2} y={0} width={tagW} height={tagH} rx={tagH / 2} fill={me ? TEAM[team] : "#fff"} style={me ? undefined : { filter: "drop-shadow(0 1px 0 rgba(29,35,43,.12))" }} />
          <text y={tagH * 0.76} textAnchor="middle" fontSize={font} fontWeight={800} fill={me ? "#fff" : INK}>
            {tag}
          </text>
        </g>
      )}
    </g>
  );
}

// ── 시야(client/game.js drawFog) ──

/** 안개를 덮고, 바라보는 쪽(CONE 1.15 라디안)은 VISION 510 까지, 나머지는 NEAR 150 까지 밝힌다. 끝은 0.72R 부터 흐려진다 */
export function Fog({ theme, x, y, face, id, blockers = [] }: { theme: Theme; x: number; y: number; face: number; id: string; blockers?: [number, number, number, number][] }) {
  const T = THEMES[theme];
  const R = 510 * T.vision, NEAR = 150, CONE = 1.15;
  const reach = (a: number) => {
    let d = a - face;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    const k = Math.min(1, Math.max(0, (CONE + 0.14 - d) / 0.28));
    return NEAR + (R - NEAR) * k * k * (3 - 2 * k);
  };
  // 건물에 막히면 거기서 멈춘다(게임 castRay 를 사각형 교차로 줄였다)
  const cast = (a: number, max: number) => {
    const dx = Math.cos(a) || 1e-9, dy = Math.sin(a) || 1e-9;
    let t = max;
    for (const [bx, by, bw, bh] of blockers) {
      const tx1 = (bx - x) / dx, tx2 = (bx + bw - x) / dx, ty1 = (by - y) / dy, ty2 = (by + bh - y) / dy;
      const tn = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2)), tf = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
      if (tf >= tn && tn > 0 && tn < t) t = tn;
    }
    return t;
  };
  const pts: string[] = [];
  for (let i = 0; i < 180; i++) {
    const a = -Math.PI + (i / 180) * Math.PI * 2;
    const t = cast(a, reach(a));
    pts.push(`${(x + Math.cos(a) * t).toFixed(1)},${(y + Math.sin(a) * t).toFixed(1)}`);
  }
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-g`} cx={x} cy={y} r={R} gradientUnits="userSpaceOnUse">
          <stop offset={0.72} stopColor="#000" />
          <stop offset={1} stopColor="#fff" />
        </radialGradient>
        <filter id={`${id}-b`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={7 / Z} />
        </filter>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={x - 3000} y={y - 3000} width={6000} height={6000}>
          <rect x={x - 3000} y={y - 3000} width={6000} height={6000} fill="#fff" />
          <polygon points={pts.join(" ")} fill={`url(#${id}-g)`} filter={`url(#${id}-b)`} />
        </mask>
      </defs>
      <rect x={x - 3000} y={y - 3000} width={6000} height={6000} fill={`rgba(${T.fog},${T.fogA})`} mask={`url(#${id}-m)`} />
    </g>
  );
}

// ── 화면 위 표시. 폰 가로 844x390 실제 게임에서 잰 자리와 크기 ──

const SHADOW = "drop-shadow(0 2px 5px rgba(29,35,43,.12))";

function Box({ x, y, w, h, r, fill = "#fff", children }: { x: number; y: number; w: number; h: number; r: number; fill?: string; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} style={{ filter: SHADOW }} />
      {children}
    </g>
  );
}

// 달리기와 체력 막대의 발바닥(shell.html .bolt, viewBox 6 5 32 24)
const PAW = (
  <>
    <path d="M19.5683 17.0238C20.0045 16.2633 19.8314 15.3218 19.1817 14.9209C18.532 14.52 17.6517 14.8116 17.2156 15.5721C16.7794 16.3327 16.9525 17.2742 17.6021 17.675C18.2518 18.0759 19.1321 17.7843 19.5683 17.0238Z" />
    <path d="M10.7117 19.6607C11.179 19.0652 11.0099 18.1153 10.3341 17.5389C9.65819 16.9624 8.73145 16.9778 8.26413 17.5733C7.79681 18.1687 7.96587 19.1186 8.64174 19.6951C9.31762 20.2715 10.2444 20.2561 10.7117 19.6607Z" />
    <path d="M14.9581 15.3608C14.8268 14.4694 14.0706 13.8611 13.269 14.002C12.4675 14.143 11.9241 14.9799 12.0553 15.8713C12.1866 16.7627 12.9428 17.3711 13.7443 17.2301C14.5459 17.0891 15.0893 16.2522 14.9581 15.3608Z" />
    <path d="M10.0779 22.5396C10.4589 20.8652 11.7662 19.6425 13.107 19.0914C13.4619 18.9463 13.8331 18.8282 14.2177 18.7417C14.6123 18.6491 14.9983 18.5891 15.3766 18.5653C16.8094 18.4732 18.4663 19.0099 19.4488 20.3659C20.4271 21.7191 20.5256 23.8574 19.5579 25.1802C19.1523 25.732 18.5864 26.0819 17.9703 26.209C17.3048 26.3472 16.3963 26.141 15.7329 26.2903C15.0568 26.4501 14.3054 27.0412 13.6455 27.2089C13.0351 27.3654 12.385 27.2968 11.8074 26.974C10.4215 26.1998 9.69838 24.2021 10.0772 22.5359Z" />
    <path d="M34.7572 13.8025C35.4605 13.3308 35.6923 12.4042 35.2751 11.7329C34.8578 11.0616 33.9494 10.8998 33.2461 11.3715C32.5428 11.8432 32.3109 12.7698 32.7282 13.4411C33.1454 14.1124 34.0539 14.2742 34.7572 13.8025Z" />
    <path d="M25.7409 11.9097C26.4042 11.6009 26.6432 10.6686 26.2746 9.82749C25.906 8.98634 25.0695 8.55482 24.4062 8.86365C23.7428 9.17249 23.5039 10.1047 23.8724 10.9459C24.241 11.787 25.0776 12.2186 25.7409 11.9097Z" />
    <path d="M31.3114 10.0981C31.5601 9.2365 31.1327 8.32815 30.3567 8.06926C29.5807 7.81038 28.75 8.29899 28.5012 9.1606C28.2524 10.0222 28.6799 10.9306 29.4559 11.1895C30.2319 11.4484 31.0626 10.9597 31.3114 10.0981Z" />
    <path d="M23.9911 14.1857C25.0205 12.8688 26.6941 12.4016 28.1217 12.5522C28.4993 12.5928 28.8804 12.6654 29.2605 12.7727C29.652 12.8794 30.0225 13.0111 30.3711 13.1717C31.6925 13.7776 32.9562 15.0545 33.2791 16.7415C33.5994 18.4238 32.8089 20.3867 31.3983 21.1067C30.8083 21.4061 30.1575 21.4476 29.5533 21.2654C28.9003 21.0694 28.1712 20.4482 27.5156 20.2631C26.8442 20.0814 25.9281 20.2499 25.2681 20.083C24.6569 19.9299 24.1027 19.556 23.7307 19.0103C22.8383 17.7054 22.9909 15.4652 23.9911 14.1857Z" />
  </>
);

/** 발바닥을 화면의 (x, y) 에 w 폭으로 놓는다 */
function Paw({ x, y, w, fill }: { x: number; y: number; w: number; fill: string }) {
  const s = w / 32;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(-6 -5)`} fill={fill}>
      {PAW}
    </g>
  );
}

/** 소리 버튼(#sound). 38x38, 모서리 14, 머티리얼 볼륨 아이콘 24 */
export function SoundButton() {
  return (
    <Box x={12} y={12} w={38} h={38} r={14}>
      <path
        transform="translate(19 19)"
        d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"
        fill={INK}
      />
    </Box>
  );
}

/** 남은 시간과 남은 도둑(#clock). 75x43, 시간 20px, 아래 도둑 얼굴 9px 넷(잡힌 도둑은 흐리게) */
export function Clock({ time, out = 0 }: { time: string; out?: number }) {
  return (
    <Box x={292} y={9} w={75} h={43} r={16}>
      <text x={329.5} y={31} textAnchor="middle" fontSize={20} fontWeight={800} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
        {time}
      </text>
      {[0, 1, 2, 3].map((i) => (
        <image key={i} href="/online/robber-front.svg" x={304 + i * 14 + (i < out ? 0.8 : 0)} y={38 + (i < out ? 0.8 : 0)} width={i < out ? 7.4 : 9} height={i < out ? 7.4 : 9} opacity={i < out ? 0.28 : 1} style={i < out ? { filter: "grayscale(1)" } : undefined} />
      ))}
    </Box>
  );
}

/** 위치 공개까지 남은 시간(#reveal). 178x45, 경찰은 경광등과 "도둑 위치 공개", 도둑은 가면과 "내 위치 공개". 5초 남으면 노란 바탕(#reveal.soon) */
export function RevealChip({ team, sec, progress, soon = false }: { team: "police" | "robber"; sec: number; progress: number; soon?: boolean }) {
  const c = soon ? "#fff" : TEAM[team];
  return (
    <Box x={373} y={8} w={178} h={45} r={16} fill={soon ? "#FFD24D" : "#fff"}>
      {soon && <circle cx={395} cy={29} r={12} fill={TEAM.police} />}
      {team === "police" ? (
        <g transform="translate(388.5 20.5)" fill={c}>
          <path d="M6.79395 4.54688C9.91771 4.54696 12.4551 7.12682 12.4551 10.3027V13.5459H9.49707V10.7168C9.49707 9.19975 8.28547 7.96894 6.79492 7.96875C5.30266 7.96875 4.0918 9.20121 4.0918 10.7168V13.5459H1.13281V10.3027C1.13281 7.12677 3.66857 4.54688 6.79395 4.54688Z" />
          <path d="M5.93649 10.6226C6.31779 10.6226 6.6269 10.3083 6.6269 9.92067C6.6269 9.53301 6.31779 9.21875 5.93649 9.21875C5.5552 9.21875 5.24609 9.53301 5.24609 9.92067C5.24609 10.3083 5.5552 10.6226 5.93649 10.6226Z" />
          <path d="M0 16.354C0 16.7112 0.284829 17.0008 0.636222 17.0008H12.952C13.3034 17.0008 13.5882 16.7112 13.5882 16.354V15.6914H0V16.354Z" />
          <path d="M13.5882 13.7204C13.5882 13.3872 13.3034 13.1172 12.952 13.1172H0.636222C0.284829 13.1172 0 13.3872 0 13.7204V14.4028H13.5882V13.7204Z" />
          <rect x={6.5752} width={1.69853} height={2.5712} rx={0.849263} />
          <rect width={1.7032} height={2.56424} rx={0.851598} transform="matrix(0.83543 0.549597 -0.542586 0.84 12.5771 1.45703)" />
          <rect width={1.7032} height={2.56424} rx={0.851598} transform="matrix(-0.83543 0.549597 0.542586 0.84 2.27246 1.45703)" />
        </g>
      ) : (
        <path
          transform="translate(385 19) scale(0.8333)"
          d="M10.7 12.5C10.7 12.8 9.4 13.2 8.4 13.2C7.4 13.2 6.3 12.5 6.3 12.3C6.3 12 7 11.1 8.6 11C9.5 10.9 10.5 11.5 10.7 12.5ZM15.4 11C14.4 10.9 13.5 11.5 13.3 12.5C13.3 12.8 14.5 13.2 15.6 13.2C16.7 13.2 17.7 12.5 17.7 12.3C17.7 12.1 17 11.1 15.4 11ZM22 12C22 17.5 17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2C17.5 2 22 6.5 22 12ZM20 11.2C20 9.2 19.3 8.5 16.7 8.5C14.1 8.5 13.3 9.6 12 9.6C10.7 9.6 10 8.5 7.3 8.5C4.6 8.5 4 9.1 4 11.2C4 14.6 5.5 16.5 7.6 16.5C9.2 16.5 10.4 14.5 12 14.5C13.6 14.5 14.7 16.5 16.4 16.5C18.5 16.5 20 14.6 20 11.2Z"
          fill={c}
        />
      )}
      <text x={415} y={33} fontSize={13} fontWeight={700} fill={soon ? "#1D232B" : "#5D6F83"}>
        {team === "police" ? "도둑 위치 공개" : "내 위치 공개"}
      </text>
      <text x={526} y={36} textAnchor="end" fontSize={19} fontWeight={900} fill="#1E232A">
        {sec}
      </text>
      <text x={538} y={36} textAnchor="end" fontSize={12} fontWeight={700} fill="#1E232A" opacity={0.85}>
        초
      </text>
      <rect x={381} y={46} width={162} height={3} rx={1.5} fill={soon ? "rgba(29,35,43,.15)" : "#EEF1F4"} />
      <rect x={381} y={46} width={162 * Math.max(0, Math.min(1, progress))} height={3} rx={1.5} fill={soon ? "#1D232B" : TEAM[team]} />
    </Box>
  );
}

/** 미니맵(#mini). 112x84, 모서리 12, 흰 테두리 3. 안은 구역선과 건물 칸, 감옥, 내 자리 */
export function MiniMap({ theme, me, team, dots = [] }: { theme: Theme; me: [number, number]; team: "police" | "robber"; dots?: [number, number][] }) {
  const T = THEMES[theme];
  return (
    <g>
      <rect x={720} y={8} width={112} height={84} rx={12} fill={T.ground} stroke="#fff" strokeWidth={3} style={{ filter: SHADOW }} />
      <path d="M733 52 C731 30 752 17 776 18 C802 19 820 28 821 49 C822 70 800 82 774 81 C748 80 735 70 733 52 Z" fill="none" stroke="#E2574C" strokeWidth={1} />
      {[[742, 34, 7, 12], [753, 30, 6, 16], [770, 26, 9, 6], [786, 34, 8, 10], [800, 30, 6, 8], [748, 56, 10, 6], [764, 58, 6, 12], [784, 60, 10, 8], [802, 54, 6, 10]].map(([x, y, w, h]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} fill={T.night ? "#6A7FA8" : "#B9D6F2"} />
      ))}
      <circle cx={776} cy={50} r={6} fill="none" stroke={T.night ? "#C9CFDC" : "#8A97A6"} strokeWidth={1} />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.4} fill="#E2574C" />
      ))}
      <circle cx={me[0]} cy={me[1]} r={2.6} fill={TEAM[team]} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** 왼쪽 조이스틱(#pad, #knob). 지름 112, 바탕 rgba(30,35,42,.18), 흰 테두리 2, 투명도 .75, 손잡이 46 */
export function Joystick() {
  return (
    <g opacity={0.75}>
      <circle cx={70} cy={322} r={55} fill="rgba(30,35,42,.18)" stroke="rgba(255,255,255,.55)" strokeWidth={2} />
      <circle cx={70} cy={322} r={23} fill="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(29,35,43,.25))" }} />
    </g>
  );
}

/** 체력(#stam). 왼쪽 흰 원 28 안에 발바닥, 막대 높이 10 편 색. 판에서는 폭 234, 대기실에서는 174 */
export function Stamina({ team, value = 1, lobby = false }: { team: "police" | "robber"; value?: number; lobby?: boolean }) {
  const c = TEAM[team];
  const x0 = lobby ? 271 : 292, y0 = lobby ? 348 : 350, bw = lobby ? 174 : 234;
  return (
    <g>
      <rect x={x0 + 22} y={y0 + 7} width={bw + 4} height={14} rx={7} fill="#fff" />
      <rect x={x0 + 24} y={y0 + 9} width={bw} height={10} rx={5} fill="rgba(29,35,43,.12)" />
      <rect x={x0 + 24} y={y0 + 9} width={bw * value} height={10} rx={5} fill={c} />
      <rect x={x0 + 24} y={y0 + 16} width={bw * value} height={3} rx={1.5} fill="rgba(0,0,0,.14)" />
      <circle cx={x0 + 14} cy={y0 + 14} r={14} fill="#fff" style={{ filter: SHADOW }} />
      <Paw x={x0 + 4} y={y0 + 7} w={20} fill={c} />
    </g>
  );
}

/** 달리기(#btnRun) 72, 잡기(#btnCatch) 92. 도둑은 잡기가 없어 달리기가 오른쪽 아래 끝으로 간다 */
export function Buttons({ team, ready = false }: { team: "police" | "robber"; ready?: boolean }) {
  const run = team === "police" ? [668, 324] : [794, 342];
  return (
    <g>
      <circle cx={run[0]} cy={run[1]} r={36} fill="rgba(30,35,42,.78)" style={{ filter: SHADOW }} />
      <Paw x={run[0] - 12} y={run[1] - 17} w={24} fill="#fff" />
      <text x={run[0]} y={run[1] + 17} textAnchor="middle" fontSize={15} fontWeight={800} fill="#fff">
        달리기
      </text>
      {team === "police" && (
        <g>
          {ready && <circle cx={780} cy={328} r={48.5} fill="none" stroke="#FFD24D" strokeWidth={5} />}
          <circle cx={780} cy={328} r={46} fill={TEAM.police} style={{ filter: SHADOW }} />
          <text x={780} y={335} textAnchor="middle" fontSize={19} fontWeight={800} fill="#fff">
            잡기
          </text>
        </g>
      )}
    </g>
  );
}

/** 짧은 알림(#toast). 14px 800, 위 106, 편 색 바탕 */
export function Toast({ text, team }: { text: string; team: "police" | "robber" }) {
  const w = Array.from(text).length * 13.6 + 28;
  return (
    <g>
      <rect x={W / 2 - w / 2} y={106} width={w} height={32} rx={14} fill={TEAM[team]} style={{ filter: SHADOW }} />
      <text x={W / 2} y={127} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff">
        {text}
      </text>
    </g>
  );
}

/** 장면마다 움직임을 붙이는 키프레임. 움직임을 줄이도록 설정한 사람에게는 멈춘다 */
export const SCENE_CSS = `
.og-bob { animation: og-bob .5s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 100%; }
.og-peek { animation: og-peek 2.8s ease-in-out infinite; }
.og-ping { animation: og-ping 1.8s ease-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.og-ping2 { animation-delay: .9s; }
.og-pass { animation: og-pass 6s ease-in-out infinite alternate; }
@keyframes og-bob { from { transform: translateY(0) } to { transform: translateY(-4px) } }
@keyframes og-peek { 0%, 50%, 100% { transform: translateY(26px) } 64%, 88% { transform: translateY(0) } }
@keyframes og-ping { from { transform: scale(.4); opacity: .95 } to { transform: scale(1.6); opacity: 0 } }
@keyframes og-pass { from { transform: translateX(0) } to { transform: translateX(-160px) } }
@media (prefers-reduced-motion: reduce) {
  .og-bob, .og-peek, .og-ping, .og-pass { animation: none; }
}
`;
