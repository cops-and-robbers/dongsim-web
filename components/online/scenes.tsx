"use client";

import GameStage, { type StageScript } from "./GameStage";
import { Building, Bush, Buttons, Clock, Flower, Grass, Ground, Jail, Joystick, MiniMap, RevealChip, SoundButton, Stamina, Toast, Tree, W, H, Z, type Road, type Theme } from "./scene";

// /online 에 넣는 게임 장면 네 개. 실제 판에서 나오는 순간을 게임 에셋과 게임의 그리기 규칙으로 배치하고,
// 캐릭터는 대본대로 옮기면 게임 코드(걸음걸이, 방향, 잡기, 갇힘, 탈옥)가 움직인다(docs/online-game.md).
// 숫자는 게임 값이다: 달리기 230, 전력 질주 경찰 322 도둑 316, 잡는 거리 74, 구출 2.2초, 위치 공개 35초마다.

/** 대본의 동선: [초, x, y] 사이를 곧게 잇는다 */
function path(t: number, keys: [number, number, number][]): { x: number; y: number } {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, x0, y0] = keys[i - 1], [t1, x1, y1] = keys[i], k = (t - t0) / (t1 - t0);
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l[1], y: l[2] };
}
const clock = (left: number) => `${Math.floor(Math.max(0, left) / 60)}:${String(Math.floor(Math.max(0, left) % 60)).padStart(2, "0")}`;

type Box = [number, number, number, number, number];
/** 지도 층: 바닥, 길, 풀, 꽃. 건물, 나무, 수풀은 캐릭터와 앞뒤를 가리도록 따로 쌓는다 */
function mapOf(theme: Theme, roads: Road[], grass: number[][], flowers: number[][], extra?: React.ReactNode) {
  return (
    <>
      <Ground theme={theme} cam={[-300, -300]} roads={roads} />
      {extra}
      {grass.map(([x, y]) => <Grass key={`g${x}${y}`} theme={theme} x={x} y={y} />)}
      {flowers.map(([x, y, s]) => <Flower key={`f${x}${y}`} x={x} y={y} size={s} />)}
    </>
  );
}
const buildingSprites = (theme: Theme, bs: Box[]) =>
  bs.map(([x, y, w, h, tone]) => ({ y: y + h, node: <Building theme={theme} x={x} y={y} w={w} h={h} tone={tone} door={1} ac={[0.55, 0.3]} /> }));
const BOUNDS: [number, number, number, number] = [-300, -300, 2400, 1400];

/** 대표 장면: 낮 동네. 경찰(나)이 길을 걷다 수풀에서 뛰쳐나온 도둑을 보고 쫓아가 잡는다 */
export function ChaseScene() {
  const roads = [{ x: -300, y: 336, w: 2400, h: 120 }, { x: 1190, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[110, 40, 430, 236, 0], [1350, 30, 300, 256, 1], [170, 540, 380, 220, 3], [1340, 540, 300, 210, 2], [1450, 860, 320, 220, 0]];
  const script: StageScript = {
    length: 8,
    still: 2.9,
    cast: [
      { id: "me", team: "police", x: 380, y: 396, tag: "나", me: true },
      { id: "r", team: "robber", x: 1050, y: 452, tag: "치즈손" },
    ],
    move(t, api) {
      const me = path(t, [[0, 380, 396], [1.7, 760, 396], [2.3, 900, 400], [3.4, 1170, 470], [4.1, 1238, 640]]);
      const r = path(t, [[1.6, 1050, 452], [2.3, 1180, 430], [3.0, 1245, 480], [4.1, 1248, 700]]);
      if (t > 4.08 && api.once("catch")) { api.act("me", "catch", 1); api.act("r", "jail"); }
      return {
        me: { ...me, face: t < 1.6 ? 0.05 : undefined },
        // 잡힌 도둑은 0.7초 뒤 감옥으로 옮겨진다(게임 arrest 의 caughtT)
        r: { ...r, inBush: t < 1.65, state: t > 4.08 ? "caught" : "free", hidden: t > 4.08 + 0.7 },
      };
    },
  };
  return (
    <GameStage
      label="경찰이 수풀에서 뛰쳐나온 도둑을 쫓아가 잡는 장면"
      theme="town"
      bounds={BOUNDS}
      map={mapOf("town", roads, [[640, 300], [920, 560], [700, 650], [990, 250], [60, 500], [1500, 400]], [[880, 280, 22], [1080, 600, 20], [620, 560, 24], [40, 300, 20], [960, 690, 22], [1520, 330, 22]])}
      sprites={[
        ...buildingSprites("town", bs),
        { y: 310, node: <Tree theme="town" x={900} foot={310} r={70} /> },
        { y: 690, node: <Tree theme="town" x={760} foot={690} r={66} /> },
        { y: 330, node: <Tree theme="town" x={1480} foot={330} r={60} /> },
        { y: 470, node: <Bush theme="town" x={1060} foot={470} rx={78} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      hud={(t) => (
        <>
          <SoundButton />
          <Clock time={clock(127 - t)} out={t > 4.1 ? 2 : 1} />
          <RevealChip team="police" sec={Math.ceil(14 - t)} progress={(14 - t) / 35} soon={14 - t <= 5} />
          <MiniMap theme="town" team="police" me={[786 + t * 3, 40 + t * 2]} />
          <Joystick />
          <Stamina team="police" value={t > 2.3 && t < 4.1 ? 0.95 - (t - 2.3) * 0.32 : t >= 4.1 ? 0.4 + (t - 4.1) * 0.12 : 0.95} />
          <Buttons team="police" ready={t > 3.1 && t < 4.1} />
          {t > 4.1 && t < 6.4 && <Toast team="police" text="치즈손을 잡았어요" />}
        </>
      )}
    />
  );
}

/** 밤 골목: 도둑(나)은 수풀 안에 숨어 있고(반투명), 경찰이 시야 안으로 들어왔다가 지나간다 */
export function HideScene() {
  const roads = [{ x: -300, y: 330, w: 2400, h: 120 }, { x: 410, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[30, 30, 330, 240, 0], [580, 20, 400, 250, 1], [1060, 30, 340, 236, 2], [1000, 520, 400, 230, 0], [40, 520, 330, 220, 1]];
  const script: StageScript = {
    length: 8,
    still: 3.6,
    cast: [
      { id: "me", team: "robber", x: 779, y: 540, tag: "나", me: true },
      { id: "c", team: "police", x: 1700, y: 392 },
    ],
    move(t) {
      return {
        // 길 쪽(오른쪽 위)을 보고 있다. 경찰은 길로만 지나가 수풀에서 120 넘게 떨어져 있으니 숨은 도둑을 못 본다(게임 BUSH_SEE)
        me: { x: 779, y: 540, inBush: true, face: -0.5 },
        c: path(t, [[0.4, 1700, 392], [3.0, 1150, 392], [3.9, 1080, 392], [6.6, 300, 392]]),
      };
    },
  };
  return (
    <GameStage
      label="밤 골목 수풀에 숨은 도둑 앞으로 경찰이 지나가는 장면"
      theme="night"
      bounds={BOUNDS}
      map={mapOf("night", roads, [[640, 520], [880, 600], [600, 690]], [[760, 610, 20], [920, 680, 22]])}
      sprites={[
        ...buildingSprites("night", bs),
        { y: 700, node: <Tree theme="night" x={600} foot={700} r={70} /> },
        { y: 562, node: <Bush theme="night" x={779} foot={562} rx={96} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      hud={(t) => (
        <>
          <SoundButton />
          <Clock time={clock(102 - t)} out={1} />
          <RevealChip team="robber" sec={Math.ceil(22 - t)} progress={(22 - t) / 35} />
          <MiniMap theme="night" team="robber" me={[760, 44]} />
          <Joystick />
          <Stamina team="robber" value={0.62 + t * 0.04} />
          <Buttons team="robber" />
        </>
      )}
    />
  );
}

/** 위치 공개: 시간이 다 되면 도둑 자리가 빨간 표시로 드러나고, 경찰(나)이 그쪽으로 달려간다 */
export function RevealScene() {
  const roads = [{ x: -300, y: 336, w: 2400, h: 120 }, { x: 330, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[470, 30, 400, 240, 2], [1000, 40, 360, 236, 0], [30, 540, 260, 210, 1], [1180, 560, 380, 220, 3]];
  const REVEAL = 1.6;
  const script: StageScript = {
    length: 7.5,
    still: 2.6,
    cast: [
      { id: "me", team: "police", x: 600, y: 396, tag: "나", me: true },
      { id: "r", team: "robber", x: 1010, y: 610 },
    ],
    move(t) {
      // 건물 사이 빈 땅으로만 다닌다. 도둑은 수풀에서 아래로 빠지고 경찰이 뒤를 쫓는다
      const me = path(t, [[0, 600, 396], [REVEAL, 760, 396], [REVEAL + 0.5, 780, 400], [4.2, 960, 540], [5.0, 1030, 650], [6.6, 1010, 900]]);
      const r = path(t, [[3.6, 1010, 610], [4.3, 1060, 720], [6.6, 1000, 1040]]);
      return { me, r: { ...r, inBush: t < 3.65 } };
    },
  };
  // 게임 drawPings: 화면 안이면 퍼지는 고리와 빨간 점, 밖이면 가장자리 화살표
  const pingAt = { x: 1010, y: 610 };
  return (
    <GameStage
      label="도둑 위치가 공개돼 빨간 표시가 뜨고 경찰이 그쪽으로 달려가는 장면"
      theme="town"
      bounds={BOUNDS}
      map={mapOf("town", roads, [[600, 560], [900, 620], [140, 300], [1440, 300]], [[700, 600, 22], [980, 660, 20], [120, 260, 24], [1500, 270, 20]])}
      sprites={[
        ...buildingSprites("town", bs),
        { y: 250, node: <Tree theme="town" x={160} foot={250} r={70} /> },
        { y: 330, node: <Tree theme="town" x={1470} foot={330} r={64} /> },
        { y: 640, node: <Bush theme="town" x={1010} foot={640} rx={84} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      overlay={(t) =>
        t > REVEAL && t < REVEAL + 4 ? (
          <g opacity={1 - ((t - REVEAL) / 4) * 0.6}>
            <circle cx={pingAt.x} cy={pingAt.y} r={20 + (((t - REVEAL) * 1.6) % 1) * 60} fill="none" stroke="#E2574C" strokeWidth={4 / Z} opacity={1 - (((t - REVEAL) * 1.6) % 1)} />
            <circle cx={pingAt.x} cy={pingAt.y} r={9 + 2 / Z} fill="#E2574C" />
          </g>
        ) : null
      }
      hud={(t) => {
        const left = t < REVEAL ? REVEAL - t : 35 - (t - REVEAL);
        return (
          <>
            {t > REVEAL && t < REVEAL + 4 && (
              <g opacity={1 - ((t - REVEAL) / 4) * 0.5}>
                <path d="M18 0L-10 -13L-10 13Z" fill="#E2574C" transform={`translate(${W - 34} 130) rotate(-20)`} />
                <path d="M18 0L-10 -13L-10 13Z" fill="#E2574C" transform={`translate(34 ${H / 2 - 20}) rotate(180)`} />
              </g>
            )}
            <SoundButton />
            <Clock time={clock(95 - t)} out={1} />
            <RevealChip team="police" sec={Math.ceil(left)} progress={left / 35} soon={t < REVEAL} />
            <MiniMap theme="town" team="police" me={[756 + t * 4, 46 + t * 2]} dots={t > REVEAL && t < REVEAL + 4 ? [[790, 58], [812, 34], [742, 70]] : []} />
            {t > REVEAL && t < REVEAL + 2.6 && <Toast team="police" text="도둑 위치가 공개됐어요. 빨간 표시가 있는 곳으로 가요" />}
            <Joystick />
            <Stamina team="police" value={t > REVEAL ? Math.max(0.3, 0.9 - (t - REVEAL) * 0.12) : 0.9} />
            <Buttons team="police" ready={t > 5.4 && t < 6.2} />
          </>
        );
      }}
    />
  );
}

/** 감옥: 도둑(나)이 감옥 문 앞에 서면 고리가 2.2초 동안 차오르고, 다 차면 갇힌 동료가 튀어나와 달아난다 */
export function JailScene() {
  const J = { x: 560, y: 360 };
  const roads = [{ x: 1080, y: -300, w: 110, h: 1400 }, { x: -300, y: 650, w: 2400, h: 110 }];
  const bs: Box[] = [[1260, 60, 300, 240, 1]];
  const ARRIVE = 1.7, FREE = ARRIVE + 2.2;
  const slot = (i: number) => {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    return { x: J.x + Math.cos(a) * 74, y: J.y + Math.sin(a) * 60 };
  };
  const s0 = slot(0), s1 = slot(1);
  const script: StageScript = {
    length: 9,
    still: 3.2,
    cast: [
      { id: "me", team: "robber", x: 1250, y: 470, tag: "나", me: true },
      { id: "j0", team: "robber", x: s0.x, y: s0.y, tag: "치즈손", jailed: true },
      { id: "j1", team: "robber", x: s1.x, y: s1.y, tag: "살금이", jailed: true },
      { id: "c", team: "police", x: 60, y: 120, tag: "번개발" },
    ],
    move(t, api) {
      if (t > FREE && api.once("free")) { api.act("j0", "escape"); api.act("j1", "escape"); }
      const me = path(t, [[0, 1250, 470], [ARRIVE, 790, 400], [FREE + 0.2, 790, 400], [FREE + 2.2, 1150, 620], [9, 1500, 700]]);
      const j0 = path(t, [[FREE + 0.5, s0.x, s0.y], [FREE + 2.4, 960, 700], [9, 1300, 760]]);
      const j1 = path(t, [[FREE + 0.55, s1.x, s1.y], [FREE + 2.5, 420, 760], [9, 120, 800]]);
      const c = path(t, [[1.0, 60, 120], [FREE + 0.3, 380, 260], [FREE + 2.4, 700, 520], [9, 900, 640]]);
      return {
        me: { ...me, face: t > ARRIVE && t < FREE + 0.2 ? Math.PI - 0.15 : undefined },
        j0: { ...j0, state: t > FREE ? "free" : "jailed" },
        j1: { ...j1, state: t > FREE ? "free" : "jailed" },
        c,
      };
    },
  };
  return (
    <GameStage
      label="감옥 문 앞에 선 도둑이 갇힌 동료를 꺼내 함께 달아나는 장면"
      theme="town"
      bounds={BOUNDS}
      map={mapOf("town", roads, [[960, 200], [1300, 420], [120, 120], [940, 560]], [[980, 250, 22], [1320, 470, 20], [90, 160, 22], [900, 600, 24]], <Jail theme="town" x={J.x} y={J.y} />)}
      sprites={[
        ...buildingSprites("town", bs),
        { y: 160, node: <Tree theme="town" x={960} foot={160} r={64} /> },
        { y: 900, node: <Tree theme="town" x={160} foot={900} r={70} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      overlay={(t) => {
        // 게임 drawFog 의 문 앞 원: 갇힌 친구가 있으면 옅은 초록, 구출 중이면 같은 원이 차오른다
        if (t > FREE) return null;
        const p = t < ARRIVE ? 0 : Math.min(1, (t - ARRIVE) / 2.2), C = 2 * Math.PI * 235;
        return (
          <g>
            <circle cx={J.x} cy={J.y} r={235} fill="none" stroke={p > 0 ? "rgba(255,255,255,.8)" : "rgba(53,194,107,.45)"} strokeWidth={(p > 0 ? 10 : 6) / Z} />
            {p > 0 && <circle cx={J.x} cy={J.y} r={235} fill="none" stroke="#35C26B" strokeWidth={10 / Z} strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} transform={`rotate(-90 ${J.x} ${J.y})`} />}
          </g>
        );
      }}
      hud={(t) => (
        <>
          <SoundButton />
          <Clock time={clock(48 - t)} out={t > FREE ? 0 : 2} />
          <RevealChip team="robber" sec={Math.ceil(Math.max(1, 9 - t))} progress={Math.max(0, 9 - t) / 35} soon={9 - t <= 5} />
          <MiniMap theme="town" team="robber" me={[780 + t * 3, 52 + t]} />
          {t > FREE && t < FREE + 2.2 && <Toast team="robber" text="동료 2명을 구했어요" />}
          <Joystick />
          <Stamina team="robber" value={t < ARRIVE ? 0.8 - t * 0.2 : Math.min(1, 0.46 + (t - ARRIVE) * 0.08)} />
          <Buttons team="robber" />
        </>
      )}
    />
  );
}
