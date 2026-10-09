/**
 * 치즈 펫이 지금 무엇을 할지 정한다 (#163). 화면(CheesePet.tsx)과 떼어 둔 순수 함수라 시험할 수 있다.
 *
 * 우선순위
 * 1. 한 번 하고 끝나는 동작(기쁨, 꽈당, 하트, 시무룩, 깜짝, 손 흔들기, 꾹, 깨기): 끝까지 한다
 * 2. 챗봇이 건 기분(귀 기울이기, 생각, 갸웃): 정해 둔 시각까지 이어 간다. 생각은 킁킁과 번갈아
 * 3. 오래 가만히 있으면 앉기(30초), 졸기(2분)
 * 4. 그 밖에는 마우스를 따라간다. 멀면 달리고, 가까우면 걷고, 아주 가까우면 선다
 *
 * 꾹 눌러 들고 다니는 동안(들림), 떨어지는 동안, 보관함에 들어가 있는 동안은 화면이 직접 정하고 이 함수를 부르지 않는다.
 * 내려놓으면 착지(land)가 한 번짜리로 이어진다.
 *
 * 움직임 줄이기 설정이면 걷지도 뛰지도 않고 제자리에서 대기 첫 프레임만 쓴다(화면이 처리한다).
 */

export type Anim =
  | "idle" | "walk" | "run" | "listen" | "think" | "sniff" | "happy" | "confused" | "fall"
  | "love" | "sad" | "surprise" | "wave" | "squish" | "sit" | "sleep" | "wake"
  | "lift" | "land" | "box" | "boxed";

export type SheetMeta = { cell: [number, number]; states: Record<Anim, { row: number; frames: number; ms: number; loop: boolean }> };

export const ONCE: Anim[] = ["happy", "fall", "love", "sad", "surprise", "wave", "squish", "wake", "land"];
export const SIT_AFTER = 30_000;
export const SLEEP_AFTER = 120_000;
const WALK_FROM = 50;
const RUN_FROM = 220;
const SPEED = { walk: 70, run: 170 }; // px/초

export type PetState = {
  anim: Anim;
  since: number;
  facing: 1 | -1;
  /** 챗봇이 건 기분과 끝나는 시각. think 는 기다리는 동안 계속(until 이 Infinity) */
  mood: { anim: "listen" | "think" | "confused"; until: number; since: number } | null;
};

export const initial = (now: number): PetState => ({ anim: "wave", since: now, facing: 1, mood: null });

/** 한 번 하고 끝나는 동작을 지금 시작한다. 같은 동작이 이미 돌고 있으면 처음부터 다시 하지 않는다 */
export function play(s: PetState, anim: Anim, now: number): PetState {
  if (s.anim === anim) return s;
  return { ...s, anim, since: now };
}

export function setMood(s: PetState, mood: PetState["mood"]): PetState {
  return { ...s, mood };
}

/** 이 동작이 지금 몇 번째 프레임인가. 한 번짜리가 끝났으면 null */
export function frameOf(s: PetState, now: number, meta: SheetMeta): number | null {
  const st = meta.states[s.anim];
  const i = Math.floor((now - s.since) / st.ms);
  if (st.loop) return i % st.frames;
  return i < st.frames ? i : null;
}

/**
 * 한 틱. dt 는 초. 돌려주는 dx 만큼 펫을 옮긴다.
 * idleMs 는 마지막으로 마우스, 키보드, 스크롤이 있었던 뒤 지난 시간
 */
export function step(
  s: PetState,
  input: { now: number; dt: number; mouseX: number | null; petX: number; idleMs: number },
  meta: SheetMeta,
): { state: PetState; dx: number } {
  const { now, dt, mouseX, petX, idleMs } = input;
  let state = s;
  // 1. 한 번짜리가 아직 도는 중이면 그대로
  if (ONCE.includes(state.anim) && frameOf(state, now, meta) !== null) return { state, dx: 0 };
  // 졸다가 움직임이 생기면 깬다
  if ((state.anim === "sleep" || state.anim === "sit") && idleMs < 1000) {
    return { state: state.anim === "sleep" ? play(state, "wake", now) : { ...state, anim: "idle", since: now }, dx: 0 };
  }
  // 2. 챗봇이 건 기분
  if (state.mood && now >= state.mood.until) state = { ...state, mood: null };
  if (state.mood) {
    let want: Anim = state.mood.anim;
    // 생각 중에는 4초마다 킁킁과 번갈아 (오래 기다려도 지루하지 않게). 기준은 기분이 시작된 시각
    if (want === "think") want = Math.floor((now - state.mood.since) / 4000) % 2 === 0 ? "think" : "sniff";
    return { state: state.anim === want ? state : { ...state, anim: want, since: now }, dx: 0 };
  }
  // 3. 오래 가만히
  if (idleMs >= SLEEP_AFTER) return { state: state.anim === "sleep" ? state : { ...state, anim: "sleep", since: now }, dx: 0 };
  if (idleMs >= SIT_AFTER) return { state: state.anim === "sit" ? state : { ...state, anim: "sit", since: now }, dx: 0 };
  // 4. 마우스 따라가기
  if (mouseX === null) return { state: state.anim === "idle" ? state : { ...state, anim: "idle", since: now }, dx: 0 };
  const dist = mouseX - petX;
  const facing: 1 | -1 = dist >= 0 ? 1 : -1;
  const far = Math.abs(dist);
  const anim: Anim = far > RUN_FROM ? "run" : far > WALK_FROM ? "walk" : "idle";
  const speed = anim === "run" ? SPEED.run : anim === "walk" ? SPEED.walk : 0;
  const dx = Math.sign(dist) * Math.min(far, speed * dt);
  const next = state.anim === anim && state.facing === facing ? state : { ...state, anim, facing, since: state.anim === anim ? state.since : now };
  return { state: next, dx };
}

/** 마우스가 갑자기 가까이 왔나 (0.3초 안에 200px 밖에서 60px 안으로) */
export function suddenlyNear(prevDist: number, prevAt: number, dist: number, now: number): boolean {
  return prevDist > 200 && dist < 60 && now - prevAt < 300;
}
