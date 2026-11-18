"use client";

import GameStage, { type StageScript } from "./GameStage";
import { useSceneCopy } from "./copy";
import { BOUNDS, buildingSprites, clock, mapOf, path, type Box } from "./scenes";
import { Bush, Buttons, Clock, EdgeGlow, LockBar, MiniMap, RevealChip, SoundButton, Stamina, Toast, Tree, VanChip, ZB, ZClock, ZoneChip, Joystick, Z } from "./scene";

// /online 에 넣는 새 놀이 방식 장면 셋: 구역 축소, 좀비 모드의 물리는 순간, 구조차 탈출.
// 기존 장면(scenes.tsx)처럼 게임 에셋과 게임의 그리기 규칙으로 배치한다(docs/online-game.md).
// 값은 게임 저장소에서 옮겼다: 구역 축소는 client/zone.js 와 docs/shrink.md(네 번, 마지막 70%, 경계가 8초 동안 걸어 들어옴, 10초 전 알림),
// 좀비 모드는 client/zombie.js 와 docs/zombie.md(물리면 2초 비틀거리다 좀비, 구조차 칸 110, 타는 시간 반반 1초, 심장 소리 300 안).
// 장면은 판의 시간을 줄여 보여 준다. 시계, 칸, 알림 숫자는 같은 비율로 함께 줄인다.

const ease = (k: number) => k * k * (3 - 2 * k);
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.ceil(Math.max(0, s)) % 60).padStart(2, "0")}`;

// ───── 구역 축소 ─────

// 구역은 감옥 가운데로 줄어든다(zone.js zonePath). 장면의 감옥은 화면 아래 멀리 있어 경계가 크게 휜 선으로 보인다
const C = { x: 820, y: 1500 };
const R0 = 1448;
const zoneR = (a: number) => R0 * (1 + 0.035 * Math.sin(5 * a + 0.4) + 0.025 * Math.sin(3 * a + 1.3));
const ZONE_N = 96;
function zonePts(k: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < ZONE_N; i++) {
    const a = (i / ZONE_N) * Math.PI * 2, r = zoneR(a) * k;
    pts.push([C.x + Math.cos(a) * r, C.y + Math.sin(a) * r]);
  }
  return pts;
}
const zoneD = (k: number) => `M${zonePts(k).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
const inZone = (k: number, x: number, y: number) => Math.hypot(x - C.x, y - C.y) < zoneR(Math.atan2(y - C.y, x - C.x)) * k;

/** 구역 축소: 10초 전 알림이 뜨고, 흰 선 밖에 있던 도둑(나)이 화살표를 따라 안으로 뛰어 들어간다. 이어서 빨간 경계가 8초 동안 흰 선까지 걸어 들어온다 */
export function ShrinkScene() {
  const c = useSceneCopy();
  // 세 번째 축소(85% → 77.5%). 판 시간은 장면보다 2.27배 빠르게 흐른다(10초 전 알림에서 축소 시작까지 4.4초, 8초 걷기는 3.5초)
  const FROM = 0.85, TO = 0.775, NEXT = 0.7, SPEED = 10 / 4.4, START = 4.4, MOVE = 8 / SPEED, DONE = START + MOVE;
  const roads = [{ x: -300, y: 470, w: 3400, h: 120 }, { x: 1190, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[60, 60, 360, 230, 0], [1380, 70, 320, 230, 1], [180, 680, 380, 220, 3], [1360, 680, 320, 210, 2]];
  const meAt = (t: number) => path(t, [[0.5, 700, 340], [2.2, 770, 640]]);
  const script: StageScript = {
    length: 10.5,
    still: 1.1,
    cast: [
      { id: "me", team: "robber", x: 700, y: 340, tag: c.me, me: true },
      { id: "r", team: "robber", x: 430, y: 420, tag: c.names.sneak },
    ],
    move(t) {
      return {
        me: { ...meAt(t), face: t < 0.5 ? Math.PI / 2 : undefined },
        r: path(t, [[0.9, 430, 420], [2.7, 620, 650]]),
      };
    },
  };
  const kAt = (t: number) => (t < START ? FROM : t < DONE ? FROM + (TO - FROM) * ease((t - START) / MOVE) : TO);
  const nextAt = (t: number) => (t < DONE ? TO : NEXT);
  return (
    <GameStage
      label={c.label.shrink}
      theme="town"
      bounds={BOUNDS}
      map={mapOf("town", roads, [[620, 300], [940, 650], [160, 420], [1500, 420], [900, 380]], [[860, 330, 22], [1060, 720, 20], [600, 660, 24], [1540, 380, 20]])}
      sprites={[
        ...buildingSprites("town", bs),
        { y: 330, node: <Tree theme="town" x={980} foot={330} r={70} /> },
        { y: 760, node: <Tree theme="town" x={900} foot={760} r={64} /> },
        { y: 420, node: <Tree theme="town" x={560} foot={420} r={60} /> },
        { y: 650, node: <Bush theme="town" x={1080} foot={650} rx={80} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      overlay={(t, agents) => {
        // 게임 drawZone: 지금 구역 밖은 옅은 붉은 막, 지금 경계는 붉은 띠와 빨간 점선(줄어드는 동안 안쪽으로 흐른다), 다음 구역은 어두운 테를 두른 흰 선
        const k = kAt(t), next = nextAt(t), moving = t >= START && t < DONE, me = agents.me;
        const warn = me && !inZone(next, me.x, me.y);
        const arrow = (() => {
          if (!me || !warn) return null;
          const a = Math.atan2(C.y - me.y, C.x - me.x), r = 92 + Math.sin(t * 6) * 5, s = 26;
          return (
            <g transform={`translate(${me.x + Math.cos(a) * r} ${me.y - 30 + Math.sin(a) * r}) rotate(${(a * 180) / Math.PI})`}>
              <path d={`M${s} 0L${-s * 0.7} ${-s * 0.8}L${-s * 0.25} 0L${-s * 0.7} ${s * 0.8}Z`} fill="#FFB800" stroke="rgba(29,35,43,.35)" strokeWidth={6} strokeLinejoin="round" paintOrder="stroke" />
            </g>
          );
        })();
        return (
          <g>
            <path d={`M-400 -400H2200V1200H-400Z ${zoneD(k)}`} fill="rgba(226,87,76,.11)" fillRule="evenodd" />
            <path d={zoneD(k)} fill="none" stroke={moving ? "rgba(226,87,76,.26)" : "rgba(226,87,76,.14)"} strokeWidth={30} strokeLinejoin="round" />
            <path d={zoneD(k)} fill="none" stroke="#E2574C" strokeWidth={8} strokeDasharray="40 26" strokeDashoffset={moving ? -(t - START) * SPEED * 90 : 0} />
            <path d={zoneD(next)} fill="none" stroke="rgba(29,35,43,.32)" strokeWidth={10} />
            <path d={zoneD(next)} fill="none" stroke="#fff" strokeWidth={5} />
            {arrow}
          </g>
        );
      }}
      hud={(t) => {
        const g = t * SPEED, me = meAt(t), warn = !inZone(nextAt(t), me.x, me.y);
        const left = START - t > 0 ? (START - t) * SPEED : 0;
        const moving = t >= START && t < DONE;
        const chip = t < START
          ? { label: c.zone.next, value: fmt(left), state: (left <= 3 ? "hot" : "soon") as "hot" | "soon", done: 2, fill: 1 - left / 25 }
          : moving
            ? { label: c.zone.moving, value: "3/4", state: "moving" as const, done: 2, fill: (t - START) / MOVE }
            : { label: c.zone.next, value: fmt(25 - (t - DONE) * SPEED), state: "" as const, done: 3, fill: (t - DONE) * SPEED / 25 };
        return (
          <>
            <SoundButton />
            <Clock time={clock(83 - g)} out={1} />
            <RevealChip team="robber" sec={Math.ceil(Math.max(1, 31 - g))} progress={Math.max(0, 31 - g) / 35} />
            <MiniMap theme="town" team="robber" me={[770, 36 + Math.min(1, t / 2) * 8]} zone={{ k: kAt(t), next: nextAt(t), id: "shrink" }} />
            <ZoneChip {...chip} />
            {t > 0.15 && t < 2.6 && <Toast text={c.zone.soon(10)} fill={ZB.danger} />}
            {t > DONE + 0.1 && t < DONE + 2.4 && <Toast text={c.zone.shrunk(3, 4)} fill="#fff" ink="#1D232B" />}
            {warn && <LockBar text={c.zone.goIn} warn />}
            <Joystick />
            <Stamina team="robber" value={t < 0.5 ? 0.9 : Math.max(0.5, 0.9 - (t - 0.5) * 0.22) + Math.max(0, t - 2.2) * 0.05} />
            <Buttons team="robber" />
          </>
        );
      }}
    />
  );
}

// ───── 좀비 모드 ─────

/** 좀비 냥파가 튀어 오르는 순간의 민트 가루(zombie.js sparks 의 burst) */
function Burst({ x, y, k }: { x: number; y: number; k: number }) {
  if (k <= 0 || k >= 1) return null;
  return (
    <g opacity={1 - k}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.3, r = 20 + k * (70 + (i % 3) * 22);
        return <circle key={i} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r * 0.8 - k * 30} r={(i % 2 ? 9 : 6) * (1 - k * 0.5)} fill={i % 3 ? "#6EB69B" : "#C9F0DF"} />;
      })}
    </g>
  );
}

/** 좀비 냥파 양쪽 볼트에서 튀는 노란 불꽃(zombie.js sparks) */
function BoltSparks({ x, y, k }: { x: number; y: number; k: number }) {
  if (k <= 0 || k >= 1) return null;
  return (
    <g opacity={1 - k}>
      {[-1, 1].flatMap((side) =>
        Array.from({ length: 5 }, (_, i) => {
          const a = side < 0 ? Math.PI * (0.75 + i * 0.12) : Math.PI * (0.25 - i * 0.12) - 0.2, r = 8 + k * (34 + (i % 2) * 12);
          return <circle key={`${side}${i}`} cx={x + side * 38 + Math.cos(a) * r} cy={y - 46 - Math.sin(a) * r * 0.9} r={4.5 * (1 - k * 0.6)} fill="#FFE58A" />;
        }),
      )}
    </g>
  );
}

// 심장 소리: 안 보이는 좀비가 300 안이면 세 단계(zombie.js heart). 단계가 높을수록 가장자리가 진하게 뛴다
const heartK = (d: number, t: number) => {
  const lv = d < 120 ? 3 : d < 210 ? 2 : d < 300 ? 1 : 0;
  if (!lv) return 0;
  const period = [0, 0.95, 0.7, 0.48][lv], beat = 1 - ((t % period) / period);
  return [0, 0.35, 0.6, 0.9][lv] * (0.75 + 0.25 * beat * beat);
};

/** 물리면 좀비: 밤길에서 친구(치즈손)가 좀비 냥파에게 물려 2초 동안 도둥이에서 냥파로 변하고(냄비가 튕겨 나가고 눌렸다가 튀어 오른다), 생존자(나)는 돌아서 달아난다 */
export function BiteScene() {
  const c = useSceneCopy();
  const BITE = 2.45, TURN = BITE + 2, RUN = TURN + 0.4;
  const roads = [{ x: -300, y: 380, w: 3400, h: 120 }, { x: 1400, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[60, 60, 340, 240, 0], [560, 40, 380, 250, 1], [1020, 60, 330, 236, 2], [200, 600, 360, 230, 1], [820, 590, 380, 230, 0]];
  const meAt = (t: number) => path(t, [[RUN, 1000, 440], [9, 1700, 450]]);
  const friendAt = (t: number) => path(t, [[0, 320, 452], [BITE, 885, 452], [TURN + 0.3, 885, 452], [9, 1400, 452]]);
  const zAt = (t: number) => path(t, [[0, 40, 440], [BITE - 0.05, 770, 444], [BITE + 0.9, 770, 444], [9, 1340, 436]]);
  const script: StageScript = {
    length: 9,
    still: BITE + 1,
    cast: [
      { id: "me", team: "robber", x: 1000, y: 440, tag: c.me, me: true, survivor: true, zmode: true },
      { id: "f", team: "robber", x: 300, y: 452, tag: c.names.cheese, zmode: true },
      { id: "z", team: "police", zombie: true, x: 40, y: 440, tag: c.names.flash, zmode: true },
    ],
    move(t, api) {
      if (t > BITE && api.once("bite")) api.act("z", "catch", 1);
      if (t > TURN && api.once("turn")) api.turn("f");
      return {
        me: { ...meAt(t), face: t < RUN ? Math.PI : undefined },
        f: { ...friendAt(t), state: t > BITE && t < TURN ? "turning" : undefined },
        z: zAt(t),
      };
    },
  };
  return (
    <GameStage
      label={c.label.bite}
      theme="night"
      bounds={BOUNDS}
      map={mapOf("night", roads, [[480, 330], [980, 560], [1300, 340], [140, 540]], [[620, 560, 20], [1240, 560, 22], [1320, 300, 20]])}
      sprites={[
        ...buildingSprites("night", bs),
        { y: 330, node: <Tree theme="night" x={470} foot={330} r={64} /> },
        { y: 580, node: <Bush theme="night" x={680} foot={580} rx={84} /> },
        { y: 340, node: <Tree theme="night" x={1250} foot={340} r={60} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      overlay={(t) => {
        const f = friendAt(t);
        return (
          <g>
            <Burst x={f.x} y={f.y - 40} k={(t - TURN) / 0.9} />
            <Burst x={f.x} y={f.y - 20} k={(t - TURN - 0.1) / 0.7} />
            <BoltSparks x={f.x} y={f.y} k={(t - TURN) / 0.5} />
          </g>
        );
      }}
      hud={(t) => {
        const g = t * 1.6, me = meAt(t), turned = t > TURN;
        // 내가 돌아서 달아나면 좀비는 시야 밖이다. 가까워진 만큼 가장자리가 뛴다
        const d = Math.min(Math.hypot(zAt(t).x - me.x, zAt(t).y - me.y), turned ? Math.hypot(friendAt(t).x - me.x, friendAt(t).y - me.y) : 1e9);
        return (
          <>
            <EdgeGlow color="rgba(194,65,122,.7)" k={t > RUN + 0.3 ? heartK(d, t) : 0} />
            <SoundButton />
            <ZClock time={clock(118 - g)} free={turned ? 3 : 4} zombies={turned ? 2 : 1} />
            <VanChip van={false} label={c.revealRob} n={Math.ceil(Math.max(1, 26 - g))} progress={Math.max(0, 26 - g) / 45} />
            <MiniMap theme="night" team="robber" zombie meColor={ZB.survivor} me={[786 + Math.max(0, t - RUN) * 3, 46]} />
            {t > BITE + 0.05 && t < BITE + 2.2 && <Toast text={c.zb.infected(c.names.cheese)} fill={ZB.danger} />}
            <Joystick />
            <Stamina team="robber" color={ZB.survivor} value={t < RUN ? 0.92 : Math.max(0.35, 0.92 - (t - RUN) * 0.14)} />
            <Buttons team="robber" />
          </>
        );
      }}
    />
  );
}

/** 구조차: 무전으로 알던 정류장에 노란 구조차가 서고, 생존자(나)가 차 옆에서 1초 버텨 올라탄다. 뒤따르던 좀비는 한발 늦는다 */
export function VanScene() {
  const c = useSceneCopy();
  const OPEN = 1.4, ARRIVE = 3.6, BOARD = ARRIVE + 1.1;
  const S = { x: 1500, y: 440 };
  const roads = [{ x: -300, y: 380, w: 3400, h: 120 }, { x: 980, y: -300, w: 110, h: 1400 }];
  const bs: Box[] = [[80, 40, 360, 250, 2], [520, 60, 360, 236, 0], [1180, 40, 380, 250, 1], [300, 590, 400, 230, 0], [1240, 600, 360, 220, 2]];
  const meAt = (t: number) => path(t, [[0, 640, 440], [ARRIVE, 1408, 450]]);
  const zAt = (t: number) => path(t, [[0, 300, 452], [ARRIVE, 1150, 452], [BOARD + 0.2, 1330, 450], [BOARD + 1.2, 1380, 448]]);
  const script: StageScript = {
    length: 9.5,
    still: ARRIVE + 0.6,
    cast: [
      { id: "me", team: "robber", x: 640, y: 440, tag: c.me, me: true, survivor: true, zmode: true },
      { id: "z", team: "police", zombie: true, x: 300, y: 452, zmode: true },
    ],
    move(t) {
      return {
        me: { ...meAt(t), hidden: t > BOARD, face: t > ARRIVE ? 0 : undefined },
        z: zAt(t),
      };
    },
  };
  // 길 폭에 맞춘 노란 칸(가로 길이라 폭은 STOP_R 110 의 두 배, 높이는 길 폭 - 12)과 노란 구조차
  const STOP_W = 220, STOP_H = 108, VW = 120, VH = (120 * 141) / 192;
  return (
    <GameStage
      label={c.label.van}
      theme="night"
      bounds={BOUNDS}
      map={mapOf("night", roads, [[780, 330], [1150, 560], [200, 330], [1700, 560]], [[860, 560, 22], [240, 560, 20], [1660, 320, 22]])}
      sprites={[
        ...buildingSprites("night", bs),
        { y: 340, node: <Tree theme="night" x={940} foot={340} r={60} /> },
        { y: 570, node: <Bush theme="night" x={1140} foot={570} rx={80} /> },
        { y: 320, node: <Tree theme="night" x={1690} foot={320} r={66} /> },
      ]}
      blockers={bs.map(([x, y, w, h]) => [x, y, w, h])}
      script={script}
      overlay={(t) => {
        const open = t >= OPEN, me = meAt(t), board = t > ARRIVE && t < BOARD ? Math.min(1, (t - ARRIVE) / 1.0) : 0;
        const r = 18 + 6 / Z, C2 = 2 * Math.PI * r;
        return (
          <g>
            <g opacity={open ? 1 : 0.55}>
              <rect x={S.x - STOP_W / 2} y={S.y - STOP_H / 2} width={STOP_W} height={STOP_H} rx={18} fill="rgba(255,200,61,.2)" stroke="#FFC83D" strokeWidth={4} strokeDasharray={open ? undefined : "12 9"} />
            </g>
            {open && <image href="/online/van.svg" x={S.x - VW / 2} y={S.y - VH * 0.72 - Math.max(0, 1 - (t - OPEN) / 0.35) * 40} width={VW} height={VH} opacity={Math.min(1, (t - OPEN) / 0.25)} />}
            {board > 0 && (
              <g>
                <circle cx={me.x} cy={me.y - 120} r={r} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={6 / Z} />
                <circle cx={me.x} cy={me.y - 120} r={r} fill="none" stroke="#FFC83D" strokeWidth={6 / Z} strokeLinecap="round" strokeDasharray={`${C2 * board} ${C2}`} transform={`rotate(-90 ${me.x} ${me.y - 120})`} />
              </g>
            )}
          </g>
        );
      }}
      hud={(t) => {
        const g = t * 1.5, me = meAt(t), z = zAt(t), d = Math.hypot(z.x - me.x, z.y - me.y);
        const coming = Math.max(0, (OPEN - t) * (3 / OPEN));
        const gone = t > BOARD;
        return (
          <>
            <EdgeGlow color="rgba(194,65,122,.7)" k={!gone && d > 150 ? heartK(d, t) : 0} />
            <SoundButton />
            <ZClock time={clock(41 - g)} free={gone ? 1 : 2} escaped={gone ? 1 : 0} zombies={4} />
            {t < OPEN ? <VanChip label={c.zb.vanComing} n={Math.max(1, Math.ceil(coming))} progress={coming / 20} /> : <VanChip label={c.zb.vanHere} here />}
            <MiniMap theme="night" team="robber" zombie meColor={ZB.survivor} me={[748 + Math.min(t, ARRIVE) * 11, 50]} vans={[[792, 50]]} />
            {t > OPEN && t < OPEN + 2 && <Toast text={c.zb.vanOpen} fill={ZB.survivor} />}
            {gone && t < BOARD + 2.6 && <Toast text={c.zb.escaped} fill={ZB.survivor} />}
            <Joystick />
            <Stamina team="robber" color={ZB.survivor} value={t < ARRIVE ? Math.max(0.3, 0.95 - t * 0.17) : 0.34 + (t - ARRIVE) * 0.06} />
            <Buttons team="robber" />
          </>
        );
      }}
    />
  );
}
