"use client";

import GameStage, { type StageScript } from "./GameStage";
import { Bins, Building, Buttons, Ground, Hedge, Joystick, Stamina, Tree } from "./scene";

// 대기실(client/lobby.js). 지도 좌표(LOBBY_MAP), 분필 자리와 떨림(rng 씨앗), 화면 위 표시는 실제 대기실에서 그대로 옮겼다.
// 카메라와 화면 위 표시의 자리는 폰 가로 844x390 실제 대기실에서 잰 값이다(2026-11-06).

const CAM: [number, number] = [820.9, 396];
const ZX = [900, 1367, 1833, 2300], ZY = [540, 960];
const INK = "#1D232B";
const PLATE = { filter: "drop-shadow(0 2px 5px rgba(29,35,43,.12))" };

// lobby.js 의 rng 와 분필 획(stroke2)을 그대로 옮겨, 같은 씨앗이면 같은 떨림이 나온다
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stroke2(x1: number, y1: number, x2: number, y2: number, r: () => number, j: number) {
  const n = (a: number) => (r() - 0.5) * a;
  return `M${(x1 + n(6)).toFixed(1)} ${(y1 + n(6)).toFixed(1)}Q${((x1 + x2) / 2 + n(j)).toFixed(1)} ${((y1 + y2) / 2 + n(j)).toFixed(1)} ${(x2 + n(6)).toFixed(1)} ${(y2 + n(6)).toFixed(1)}`;
}

function ChalkRect({ c, x, y, w, h, seed }: { c: string; x: number; y: number; w: number; h: number; seed: number }) {
  const r = rng(seed), o = 12;
  const d = () => stroke2(x - o, y, x + w + o, y, r, 16) + stroke2(x + w, y - o, x + w, y + h + o, r, 16) + stroke2(x + w + o, y + h, x - o, y + h, r, 16) + stroke2(x, y + h + o, x, y - o, r, 16);
  const first = d(), second = d();
  return (
    <g stroke={c} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.55}>
      <path d={first} />
      <path d={second} />
    </g>
  );
}

function ChalkOval({ c, cx, cy, rx, ry, seed }: { c: string; cx: number; cy: number; rx: number; ry: number; seed: number }) {
  const r = rng(seed);
  const pts = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2, k = 1 + (r() - 0.5) * 0.02;
    return `${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`;
  });
  return <path d={`M${pts.join("L")}`} stroke={c} strokeWidth={6} strokeLinecap="round" strokeDasharray="22 26" fill="none" opacity={0.55} />;
}

function ChalkArrow({ c, x, y, dir, seed }: { c: string; x: number; y: number; dir: number; seed: number }) {
  const r = rng(seed), n = (a: number) => (r() - 0.5) * a, len = 74, tip = x + dir * len;
  const y1 = y + n(8), y2 = y + n(12), y3 = y - 20 + n(5), y4 = y + 20 + n(5);
  return (
    <path
      d={`M${x} ${y1}Q${x + (dir * len) / 2} ${y2} ${tip} ${y}M${tip - dir * 24} ${y3}L${tip} ${y}L${tip - dir * 24} ${y4}`}
      stroke={c}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={0.62}
    />
  );
}

function ChalkQuestion({ cx, top }: { cx: number; top: number }) {
  const r = rng(31), n = (a: number) => (r() - 0.5) * a;
  const d = `M${cx - 60} ${top + 58}C${cx - 56} ${top - 8} ${cx + 64} ${top - 14} ${cx + 64} ${top + 54}C${cx + 64} ${top + 108} ${cx + 2} ${top + 102} ${cx + 2} ${top + 164}`;
  const a = [n(2), n(2)], b = [n(7), n(7)];
  return (
    <g stroke="#6D6351" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} strokeWidth={10} opacity={0.85} transform={`translate(${a[0]} ${a[1]})`} />
      <path d={d} strokeWidth={4} opacity={0.4} transform={`translate(${b[0]} ${b[1]})`} />
      <ellipse cx={cx + 3} cy={top + 204} rx={11} ry={12} transform={`rotate(17 ${cx + 3} ${top + 204})`} fill="#6D6351" stroke="none" opacity={0.85} />
    </g>
  );
}

/** 바닥 분필 캐릭터(chalkCharacter): 흔들린 면을 옅게 깔고, 비스듬히 문지른 자국과 윤곽선을 얹는다 */
function ChalkCharacter({ view, cx, foot, h, outline, seed, w0, h0 }: { view: string; cx: number; foot: number; h: number; outline: string; seed: number; w0: number; h0: number }) {
  const w = (h * w0) / h0, id = `chalk-${view}`;
  return (
    <g>
      <defs>
        <filter id={`${id}-f`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={(0.035 * h0) / h} numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={h * 0.01} />
        </filter>
        <filter id={`${id}-l`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={(0.035 * h0) / h} numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={h * 0.012} result="d" />
          <feMorphology in="d" operator="dilate" radius={h * 0.005} result="big" />
          <feComposite in="big" in2="d" operator="out" result="edge" />
          <feFlood floodColor={outline} />
          <feComposite in2="edge" operator="in" />
        </filter>
        <pattern id={`${id}-p`} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width={9} height={5} fill="#fff" />
        </pattern>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={cx - w} y={foot - h * 1.2} width={w * 2} height={h * 1.4}>
          <rect x={cx - w} y={foot - h * 1.2} width={w * 2} height={h * 1.4} fill={`url(#${id}-p)`} />
        </mask>
      </defs>
      <image href={`/online/${view}.svg`} x={cx - w / 2} y={foot - h} width={w} height={h} opacity={0.22} filter={`url(#${id}-f)`} />
      <image href={`/online/${view}.svg`} x={cx - w / 2} y={foot - h} width={w} height={h} opacity={0.5} filter={`url(#${id}-f)`} mask={`url(#${id}-m)`} />
      <image href={`/online/${view}.svg`} x={cx - w / 2} y={foot - h} width={w} height={h} opacity={0.85} filter={`url(#${id}-l)`} />
    </g>
  );
}

/** 대기실 이름표(.wtag): 30px, 패딩 4 14 6, 발밑에서 132 위. 나는 검은 바탕에 옅은 "방장 나", 칸을 고르면 편 색 */
function LobbyTag({ x, foot, name, extra = [], me = false, side }: { x: number; foot: number; name: string; extra?: string[]; me?: boolean; side?: "cop" | "rob" }) {
  const tw = Array.from(name).length * 30 + extra.reduce((n, e) => n + Array.from(e).length * 20 + 7, 0) + 28;
  const y = foot - 132;
  const bg = me ? (side === "cop" ? "#2A9BEF" : side === "rob" ? "#1F9A52" : INK) : "#fff";
  return (
    <g transform={`translate(${x - tw / 2} ${y})`}>
      <rect y={3} width={tw} height={43} rx={21.5} fill="rgba(29,35,43,.14)" />
      <rect width={tw} height={43} rx={21.5} fill={bg} />
      <text x={14} y={32} fontSize={30} fontWeight={800} fill={me ? "#fff" : INK}>
        {name}
        {extra.map((e) => (
          <tspan key={e} dx={7} fontSize={20} fill={me ? (side ? "#fff" : "#C9CED6") : "#545E6E"}>
            {e}
          </tspan>
        ))}
      </text>
    </g>
  );
}


/** 대기실: 방장(나)이 가운데서 도둑 칸으로 걸어가고, 친구들은 이미 편을 골랐다 */
export function LobbyScene() {
  // 건물과 쓰레기통은 부딪히는 칸보다 위로 높게 그린다(RISE 70, BIN_RISE 30)
  const buildings: [number, number, number, number][] = [
    [560, 240, 300, 210], [900, 220, 380, 240], [1440, 240, 310, 210], [1920, 220, 380, 240], [2340, 240, 300, 210],
    [560, 1060, 320, 210], [930, 1060, 340, 220], [1930, 1060, 360, 210], [2340, 1060, 300, 210],
  ];
  const trees: [number, number, number][] = [[1465, 510, 72], [1770, 1010, 76], [2320, 510, 70], [1290, 1010, 72], [880, 510, 68], [2310, 1000, 70]];
  const hedges: [number, number, number][] = [[1100, 496, 84], [2110, 498, 88], [700, 1002, 70], [2100, 1004, 84], [1560, 1000, 62], [852, 660, 42], [852, 840, 42], [2348, 660, 42], [2348, 840, 42]];
  const roads = [{ x: 0, y: 540, w: 3200, h: 420 }, { x: 1324, y: 0, w: 86, h: 1500 }, { x: 1790, y: 0, w: 86, h: 1500 }];
  // 방장(나)이 가운데서 도둑 칸으로 걸어 들어가면 회색에서 도둥이가 되고, 칸 숫자가 바뀐다(lobby.js morph)
  const ENTER = 1.9;
  const script: StageScript = {
    length: 7,
    still: 1.2,
    cast: [
      { id: "me", team: "robber", x: 1560, y: 820 },
      { id: "a", team: "police", x: 1060, y: 800 },
      { id: "b", team: "police", x: 1236, y: 890 },
      { id: "c", team: "robber", x: 2140, y: 860 },
    ],
    move(t, api) {
      if (t > ENTER && api.once("morph")) api.pop("me", -0.42);
      const me = t < 0.5 ? { x: 1560, y: 820 } : t < ENTER ? { x: 1560 + (t - 0.5) * 230, y: 820 + (t - 0.5) * 8 } : t < 2.6 ? { x: 1560 + (ENTER - 0.5) * 230 + (t - ENTER) * 120, y: 831 } : { x: 1560 + (ENTER - 0.5) * 230 + 0.7 * 120, y: 831 };
      return { me: { ...me, shade: t < ENTER + 0.14 }, a: { x: 1060, y: 800 }, b: { x: 1236, y: 890 }, c: { x: 2140, y: 860 } };
    },
  };
  return (
    <GameStage
      label="대기실에서 친구들이 경찰 칸과 도둑 칸으로 걸어가 편을 고르는 장면"
      theme="town"
      bounds={[400, 0, 2500, 1500]}
      cam={CAM}
      fog={false}
      script={script}
      map={
        <>
          <Ground theme="town" cam={[420, 0]} roads={roads} />
          <rect x={ZX[0]} y={ZY[0]} width={ZX[1] - ZX[0]} height={ZY[1] - ZY[0]} fill="rgba(42,155,239,.045)" />
          <rect x={ZX[2]} y={ZY[0]} width={ZX[3] - ZX[2]} height={ZY[1] - ZY[0]} fill="rgba(53,194,107,.045)" />
          <defs>
            <filter id="lobby-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={1} seed={77} result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="a" />
              <feComposite in="SourceGraphic" in2="a" operator="in" />
            </filter>
          </defs>
          <g filter="url(#lobby-grain)">
            <ChalkRect c="#1C72B8" x={ZX[0] + 8} y={ZY[0] + 10} w={ZX[1] - ZX[0] - 22} h={ZY[1] - ZY[0] - 20} seed={5} />
            <ChalkRect c="#1C8A4B" x={ZX[2] + 14} y={ZY[0] + 10} w={ZX[1] - ZX[0] - 22} h={ZY[1] - ZY[0] - 20} seed={11} />
            <ChalkOval c="#6D6351" cx={1600} cy={750} rx={196} ry={190} seed={8} />
            <ChalkArrow c="#1C72B8" x={ZX[1] + 36} y={620} dir={-1} seed={21} />
            <ChalkArrow c="#1C8A4B" x={ZX[2] - 36} y={620} dir={1} seed={22} />
            <ChalkCharacter view="police-front" cx={(ZX[0] + ZX[1]) / 2} foot={950} h={334} outline="#1C5F9E" seed={3} w0={180} h0={200} />
            <ChalkCharacter view="robber-front" cx={(ZX[2] + ZX[3]) / 2} foot={950} h={290} outline="#3F444D" seed={9} w0={160} h0={145} />
            <ChalkQuestion cx={1600} top={640} />
          </g>
        </>
      }
      sprites={[
        ...hedges.map(([x, y, rx]) => ({ y: y + 30 * 0.82, node: <Hedge theme="town" x={x} y={y} rx={rx} ry={30} /> })),
        { y: 452 + 64, node: <Bins theme="town" x={1620} y={452} w={92} h={64} /> },
        ...buildings.map(([x, y, w, h], i) => ({ y: y + h, node: <Building theme="town" x={x} y={y - 70} w={w} h={h + 70} tone={(i * 7 + 411) % 5} door={1} ac={i % 2 ? [0.5, 0.3] : undefined} /> })),
        ...trees.map(([x, y, r]) => ({ y: y + 20, node: <Tree theme="town" x={x + 14} foot={y + 20} r={r} /> })),
      ]}
      overlay={(t, A) => {
        const tag = (id: string, name: string, extra?: string[], me?: boolean, side?: "cop" | "rob") => (A[id] ? <LobbyTag key={id} x={A[id].x} foot={A[id].y} name={name} extra={extra} me={me} side={side} /> : null);
        return (
          <>
            {/* 칸마다 들어온 사람/자리(.wcount) */}
            <text x={ZX[0] + 34} y={ZY[0] + 26 + 46} fontSize={50} fontWeight={800} fill={INK} opacity={0.8}>
              2/2
            </text>
            <text x={ZX[2] + 34} y={ZY[0] + 26 + 46} fontSize={50} fontWeight={800} fill={INK} opacity={0.8}>
              {t > ENTER ? "2/4" : "1/4"}
            </text>
            {tag("a", "하늘")}
            {tag("b", "도윤")}
            {tag("c", "서아")}
            {tag("me", "찬빈", ["방장", "나"], true, t > ENTER ? "rob" : undefined)}
          </>
        );
      }}
      hud={() => (
        <>
          {/* 방 코드(.lp.code) 143x53 */}
          <rect x={14} y={10} width={143} height={53} rx={14} fill="#fff" style={PLATE} />
          <text x={26} y={29} fontSize={11} fontWeight={700} fill="#545E6E">
            방 코드
            <tspan dx={4} fontWeight={800} fill={INK}>
              4/6
            </tspan>
          </text>
          <text x={26} y={51} fontSize={20} fontWeight={900} fill={INK} letterSpacing={1.2}>
            K7Q2M
          </text>
          <g transform="translate(125 26)" fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 6.5V4.2c0-.7.5-1.2 1.2-1.2h7.6c.7 0 1.2.5 1.2 1.2v7.6c0 .7-.5 1.2-1.2 1.2h-2.3" />
            <rect x={3} y={7} width={10} height={10} rx={1.4} />
          </g>
          {/* 친구 부르기(.bt.main) 96x44, 정해진 말(.bt.ic) 44, 안내(.line), 인원, 나가기 */}
          <rect x={165} y={13} width={96} height={44} rx={14} fill="#CFA93C" />
          <rect x={165} y={10} width={96} height={44} rx={14} fill="#F7D774" />
          <text x={213} y={37} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>
            친구 부르기
          </text>
          <rect x={270} y={10} width={44} height={44} rx={14} fill="#fff" style={PLATE} />
          <path
            transform="translate(281 21) scale(0.9167)"
            d="M4.4 5.6c4-1.1 11-1.2 15.2 0 .6 2.7.6 6.3 0 9-2 .6-4.8.8-7.3.8L7.8 19.3l.2-4C6.6 15.2 5.3 15 4.4 14.7c-.6-2.8-.6-6.3 0-9.1Z"
            fill="none"
            stroke={INK}
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={418} y={14} width={179} height={36} rx={12} fill="rgba(29,35,43,.86)" />
          <text x={507.5} y={37} textAnchor="middle" fontSize={14} fontWeight={700} fill="#fff">
            하고 싶은 편으로 걸어가요
          </text>
          <rect x={702} y={10} width={54} height={44} rx={14} fill="#fff" style={PLATE} />
          <text x={729} y={37} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>
            인원
          </text>
          <rect x={763} y={10} width={67} height={44} rx={14} fill="#fff" style={PLATE} />
          <text x={796.5} y={37} textAnchor="middle" fontSize={14} fontWeight={800} fill="#545E6E">
            나가기
          </text>
          {/* 시작하기(#startBtn) 150x56: 편을 고른 친구가 있어 방장이 누를 수 있다 */}
          <rect x={582} y={320} width={150} height={56} rx={16} fill="#CFA93C" />
          <rect x={582} y={316} width={150} height={56} rx={16} fill="#F7D774" />
          <text x={657} y={350} textAnchor="middle" fontSize={17} fontWeight={800} fill={INK}>
            시작하기
          </text>
          <Joystick />
          <Stamina team="police" value={1} lobby />
          <Buttons team="robber" />
        </>
      )}
    />
  );
}
