"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { frameOf, initial, play, setMood, step, suddenlyNear, type PetState } from "@/lib/admin/pet/brain";
import { PET_EVENT, PET_SAY_EVENT, petSay, type PetSignal } from "@/lib/admin/pet/signal";
import { sheetStyle, useSheet } from "@/components/admin/pet/PetSprite";

/**
 * 치즈 조각 펫 (#163). 지표 화면 아래를 돌아다니고, 마우스를 따라가고, 챗봇 상태에 따라 동작이 바뀐다.
 * 그림은 public/admin/pet/cheese-sheet.png (scripts/pet/cheese.py 로 만든 28x28 칸 스프라이트 시트), 판단은 lib/admin/pet/brain.ts.
 *
 * - React 상태로 프레임마다 다시 그리지 않는다. requestAnimationFrame 한 줄이 위치와 배경 위치를 직접 바꾼다
 * - 펫 몸만 포인터를 받는다. 짧게 누르면 물어보기 패널이 열리고(onTap, 없으면 하트), 꾹(0.25초) 누르면 들려서 포인터를 따라오고, 놓으면 떨어져 착지한다
 * - 물어보기 패널(data-pet-avoid)을 가리지 않는다. 옆 패널이면 그 왼쪽까지만 다니고, 휴대폰의 아래 시트면 그 위에 올라선다(petBounds)
 * - 치우고 싶으면 오른쪽 아래 "증거물 보관함"에 넣는다. 들고 있는 동안만 상자가 보이고, 넣으면 상자 속에서 졸며 더는 따라다니지 않는다.
 *   상자를 누르면 손을 흔들며 나온다. 물어보기 패널 아래 버튼으로도 넣고 꺼낸다(키보드 사용자, 움직이는 요소를 멈출 수단 WCAG 2.2.2).
 *   처음엔 치즈 위에 닫기(×) 버튼을 뒀는데, 만지다 눌려 사라진 뒤 다시 부르는 곳을 몰라 "아예 안 나온다"가 됐고 × 자체도 별로라는 의견이 있었다(2026-10-09)
 * - 움직임 줄이기 설정이면 걷지 않고 대기 첫 프레임만 보인다. 옮기기는 되지만 떨어지는 장면 없이 바로 바닥에 놓인다.
 *   터치 기기에서는 마우스를 따라가지 않지만 꾹 눌러 옮기기는 된다
 * - 머리 위 말풍선(petSay)은 알림 한 줄만 띄운다. 물어보기 창을 닫아 둔 사이 답이 오면 "답 찾았어요", 처음 온 사람에게 한 번 "누르면 물어볼 수 있어요".
 *   화면 끝에서는 말풍선이 밖으로 나가지 않게 옆으로 밀고, 꼬리는 치즈 머리를 계속 가리킨다
 * - 그림은 왼쪽을 본다. 오른쪽으로 갈 때 좌우를 뒤집는다(처음엔 반대로 뒤집어 뒷걸음질쳤다)
 * - body 에 포털로 붙인다. 화면 안쪽에 transform 이 걸린 조상이 있으면 fixed 가 화면이 아니라 그 조상 기준이 된다
 * - 층은 z-[55]. 어드민 본문 판(AdminShell)이 fixed z-50 이라 그보다 낮으면 판 뒤로 숨는다(포털로 옮긴 직후 z-40 이라 안 보였다).
 *   편집 창(z-60), 확인 창과 토스트(z-70) 보다는 아래라 창을 가리지 않는다
 */

const SCALE = 3;
const HOLD_MS = 250;
const DRAG_FROM = 8; // 꾹 누르기 전에 이만큼 끌면 바로 든다(px)
const GRAVITY = 2600; // 떨어질 때 px/초²
const BOX_MARGIN = 24; // 상자 둘레 이만큼까지는 상자 위로 친다(px)
const RUN_OUT = 240; // 패널이 덮었을 때 비켜 나오는 빠르기(px/초)
export const PET_BOXED_KEY = "cheese-pet-boxed";
export const PET_BOX_EVENT = "cheese-pet-box";
// 처음 온 사람에게 "누르면 물어볼 수 있어요"를 한 번만 보여 줬는지
const HINT_KEY = "cheese-pet-hint-seen";

const readBoxed = () => {
  try {
    return localStorage.getItem(PET_BOXED_KEY) === "1";
  } catch {
    return false;
  }
};

const subscribeBoxed = (cb: () => void) => {
  window.addEventListener(PET_BOX_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PET_BOX_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** 치즈가 보관함에 들어가 있는지. 다른 탭에서 넣고 꺼낸 것도 따라간다 */
export const usePetBoxed = () => useSyncExternalStore(subscribeBoxed, readBoxed, () => false);

/**
 * 치즈가 다닐 수 있는 곳. 물어보기 패널(data-pet-avoid)을 가리지 않게 피한다.
 * 오른쪽 패널이면 그 왼쪽까지만(maxX), 아래에서 올라온 시트(휴대폰)면 그 윗변이 바닥(floor)이다.
 * right 는 보관함을 둘 오른쪽 여백(패널이 있으면 그 왼쪽에 둔다)
 */
function petBounds(W: number) {
  const vw = window.innerWidth;
  let maxX = vw - W;
  let floor = 0;
  let right = 0;
  const el = document.querySelector<HTMLElement>("[data-pet-avoid]");
  const r = el?.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) {
    if (r.left < W) floor = Math.max(0, window.innerHeight - r.top);
    else {
      maxX = Math.max(0, r.left - W);
      right = vw - r.left;
    }
  }
  return { maxX, floor, right };
}

type Drag = { phase: "idle" | "press" | "drag" | "fall"; timer: ReturnType<typeof setTimeout> | null; sx: number; sy: number; lx: number; ly: number; over: boolean };

export function CheesePet({ onTap }: { onTap?: () => void } = {}) {
  const meta = useSheet();
  const boxed = usePetBoxed();
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLButtonElement>(null);
  const boxSpriteRef = useRef<HTMLDivElement>(null);
  const boxWrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PetState | null>(null);
  // x 가 음수면 아직 자리를 안 잡았다. y 는 바닥에서 띄운 높이
  const pos = useRef({ x: -1, y: 0, vy: 0 });
  const drag = useRef<Drag>({ phase: "idle", timer: null, sx: 0, sy: 0, lx: 0, ly: 0, over: false });
  const lastActive = useRef(0);
  const [say, setSay] = useState<string | null>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  // 화면이 다시 그려질 때마다 onTap 이 새로 만들어져도 알림 타이머가 끊기지 않게, 처음 값만 본다
  const tappable = useRef(!!onTap);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSay = (e: Event) => {
      const { text, ms } = (e as CustomEvent<{ text: string; ms: number }>).detail;
      setSay(text);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setSay(null), ms);
    };
    window.addEventListener(PET_SAY_EVENT, onSay);
    // 치즈를 누르면 물어볼 수 있다는 걸 처음 한 번만 알린다
    let hint: ReturnType<typeof setTimeout> | null = null;
    const cw0 = 28 * SCALE;
    if (tappable.current) {
      try {
        if (!localStorage.getItem(HINT_KEY))
          hint = setTimeout(() => {
            // 물어보기 창이 이미 열려 있으면 알릴 필요가 없다. 다음에 닫혀 있을 때 알린다
            const b = petBounds(cw0);
            if (b.maxX < window.innerWidth - cw0 || b.floor > 0) return;
            try {
              localStorage.setItem(HINT_KEY, "1");
            } catch {
              // 못 남겨도 이번에는 보여 준다
            }
            petSay("누르면 물어볼 수 있어요", 7000);
          }, 2500);
      } catch {
        // 저장이 막혀 있으면 알리지 않는다(매번 뜨면 성가시다)
      }
    }
    return () => {
      window.removeEventListener(PET_SAY_EVENT, onSay);
      if (timer) clearTimeout(timer);
      if (hint) clearTimeout(hint);
    };
  }, []);

  // 돌아다니는 치즈
  useEffect(() => {
    if (!meta || boxed) return;
    const [cw, ch] = meta.cell;
    const W = cw * SCALE;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const now0 = performance.now();
    stateRef.current = reduced ? { ...initial(now0), anim: "idle" } : initial(now0);
    const p = pos.current;
    const d0 = drag.current;
    // 처음 자리는 오른쪽 아래. 물어보기 창이 열려 있으면 그 왼쪽
    if (p.x < 0) p.x = Math.max(16, Math.min(window.innerWidth - W - 32, petBounds(W).maxX - 8));
    p.y = 0;
    p.vy = 0;
    drag.current.phase = "idle";
    lastActive.current = now0;
    let mouseX: number | null = null;
    let prev = { dist: 9999, at: 0 };

    const onMove = (e: MouseEvent) => {
      lastActive.current = performance.now();
      if (touch || reduced) return;
      mouseX = e.clientX - W / 2;
      const dist = Math.abs(mouseX - p.x);
      const s = stateRef.current!;
      if (drag.current.phase === "idle" && suddenlyNear(prev.dist, prev.at, dist, lastActive.current) && !s.mood) {
        stateRef.current = play(s, "surprise", lastActive.current);
      }
      prev = { dist, at: lastActive.current };
    };
    const onActive = () => (lastActive.current = performance.now());
    const onSignal = (e: Event) => {
      const sig = (e as CustomEvent<PetSignal>).detail;
      const t = performance.now();
      lastActive.current = t;
      let s = stateRef.current!;
      if (sig === "typing") s = setMood(s, { anim: "listen", until: t + 2000, since: t });
      if (sig === "asking") s = setMood(s, { anim: "think", until: Infinity, since: t });
      if (sig === "unverified") s = setMood(s, { anim: "confused", until: t + 4000, since: t });
      // 들고 있는 동안은 기분만 바꿔 두고, 한 번짜리 동작은 내려놓은 뒤로 미루지 않고 버린다
      const free = drag.current.phase === "idle";
      if (sig === "answered") s = free ? play(setMood(s, null), "happy", t) : setMood(s, null);
      if (sig === "error") s = free ? play(setMood(s, null), "fall", t) : setMood(s, null);
      if (sig === "liked" && free) s = play(s, "love", t);
      if (sig === "disliked" && free) s = play(s, "sad", t);
      stateRef.current = s;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onActive);
    window.addEventListener("scroll", onActive, true);
    window.addEventListener(PET_EVENT, onSignal);

    let raf = 0;
    let last = now0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const d = drag.current;
      let s = stateRef.current!;
      const b = petBounds(W);
      if (d.phase === "fall") {
        p.vy += GRAVITY * dt;
        p.y = Math.max(b.floor, p.y - p.vy * dt);
        if (p.y === b.floor) {
          d.phase = "idle";
          p.vy = 0;
          s = play(s, "land", t);
        }
      } else if (d.phase !== "drag") {
        // 바닥이 내려갔으면(시트를 닫음) 떨어지고, 올라갔으면(시트를 엶) 그 위로 올라선다
        if (p.y > b.floor + 2 && !reduced) {
          d.phase = "fall";
          p.vy = 0;
        } else p.y = b.floor;
        if (reduced) p.x = Math.min(p.x, b.maxX);
        else if (p.x > b.maxX + 1) {
          // 패널이 열리며 치즈를 덮으면 패널 왼쪽 끝으로 달려 나온다. 생각 중이어도 패널 위에 앉아 입력창을 가리지 않게 먼저 비킨다
          s = { ...s, anim: "run", facing: -1, since: s.anim === "run" ? s.since : t };
          p.x = Math.max(b.maxX, p.x - RUN_OUT * dt);
        } else {
          // 마우스가 패널 위에 있어도 패널 앞까지만 따라간다
          const target = mouseX === null ? null : Math.min(mouseX, b.maxX);
          const r = step(s, { now: t, dt, mouseX: target, petX: p.x, idleMs: t - lastActive.current }, meta);
          s = r.state;
          p.x += r.dx;
        }
      }
      // 들고 있을 때는 패널 위로도 간다(패널 왼쪽에 놓인 보관함까지 끌어 가거나 아무 데나 놓을 수 있게)
      p.x = Math.min(Math.max(0, p.x), window.innerWidth - W);
      stateRef.current = s;
      const st = meta.states[s.anim];
      const frame = reduced ? 0 : (frameOf(s, t, meta) ?? st.frames - 1);
      if (wrapRef.current) wrapRef.current.style.transform = `translate(${Math.round(p.x)}px, ${-Math.round(p.y)}px)`;
      // 말풍선은 치즈 머리 위 가운데. 화면 밖으로 나가면 안쪽으로 밀고 꼬리만 머리에 둔다
      const bub = bubbleRef.current;
      if (bub) {
        const bw = bub.offsetWidth;
        const left = Math.min(Math.max(W / 2 - bw / 2, 6 - p.x), window.innerWidth - 6 - p.x - bw);
        bub.style.left = `${Math.round(left)}px`;
        if (tailRef.current) tailRef.current.style.left = `${Math.round(Math.min(Math.max(W / 2 - left, 12), bw - 12))}px`;
      }
      if (spriteRef.current) {
        spriteRef.current.style.backgroundPosition = `${-frame * cw * SCALE}px ${-st.row * ch * SCALE}px`;
        spriteRef.current.style.transform = s.facing === 1 ? "scaleX(-1)" : "";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (d0.timer) clearTimeout(d0.timer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onActive);
      window.removeEventListener("scroll", onActive, true);
      window.removeEventListener(PET_EVENT, onSignal);
    };
  }, [meta, boxed]);

  // 상자: 비었으면 한 장, 치즈가 들어 있으면 두 장을 번갈아(조는 숨소리). 물어보기 패널이 열리면 그 왼쪽(휴대폰은 시트 위)으로 비킨다
  useEffect(() => {
    if (!meta || (!boxed && !dragging)) return;
    const [cw, ch] = meta.cell;
    const st = meta.states[boxed ? "boxed" : "box"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const i = reduced ? 0 : Math.floor((t - t0) / st.ms) % st.frames;
      if (boxSpriteRef.current) boxSpriteRef.current.style.backgroundPosition = `${-i * cw * SCALE}px ${-st.row * ch * SCALE}px`;
      const b = petBounds(cw * SCALE);
      if (boxWrapRef.current) {
        boxWrapRef.current.style.right = `${b.right + 16}px`;
        boxWrapRef.current.style.bottom = `${b.floor}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [meta, boxed, dragging]);

  if (!meta) return null;
  const [cw, ch] = meta.cell;
  const W = cw * SCALE;
  const H = ch * SCALE;
  const sheet = sheetStyle(meta, SCALE);

  const overBox = (x: number, y: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    return !!r && x > r.left - BOX_MARGIN && x < r.right + BOX_MARGIN && y > r.top - BOX_MARGIN && y < r.bottom + BOX_MARGIN;
  };

  // 포인터 한가운데에 치즈 몸 가운데가 오게
  const moveTo = (x: number, y: number) => {
    const p = pos.current;
    const nx = Math.min(Math.max(0, x - W / 2), window.innerWidth - W);
    const s = stateRef.current!;
    if (Math.abs(nx - p.x) > 1) stateRef.current = { ...s, facing: nx > p.x ? 1 : -1 };
    p.x = nx;
    p.y = Math.min(Math.max(0, window.innerHeight - y - H / 2), window.innerHeight - H);
    const d = drag.current;
    d.over = overBox(x, y);
    if (boxRef.current) boxRef.current.style.transform = d.over ? "scale(1.15)" : "";
  };

  const lift = () => {
    const d = drag.current;
    if (d.timer) clearTimeout(d.timer);
    d.timer = null;
    d.phase = "drag";
    const s = stateRef.current!;
    stateRef.current = { ...s, anim: "lift", since: performance.now() };
    setDragging(true);
    moveTo(d.lx, d.ly);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (e.button !== 0 || d.phase !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastActive.current = performance.now();
    Object.assign(d, { phase: "press", sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, over: false });
    d.timer = setTimeout(lift, HOLD_MS);
  };

  const onMovePointer = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.phase === "idle" || d.phase === "fall") return;
    lastActive.current = performance.now();
    d.lx = e.clientX;
    d.ly = e.clientY;
    if (d.phase === "press" && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_FROM) lift();
    else if (d.phase === "drag") moveTo(e.clientX, e.clientY);
  };

  const onUp = (cancelled: boolean) => {
    const d = drag.current;
    const now = performance.now();
    if (d.phase === "press") {
      if (d.timer) clearTimeout(d.timer);
      d.timer = null;
      d.phase = "idle";
      if (cancelled) return;
      // 짧게 누르면 물어보기 패널을 연다(지표 화면). 패널이 없는 화면이면 하트
      if (onTap) {
        onTap();
        stateRef.current = play(stateRef.current!, "wave", now);
      } else stateRef.current = play(stateRef.current!, "love", now);
      return;
    }
    if (d.phase !== "drag") return;
    setDragging(false);
    if (boxRef.current) boxRef.current.style.transform = "";
    if (d.over && !cancelled) {
      d.phase = "idle";
      setPetBoxed(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      d.phase = "idle";
      pos.current.y = 0;
      stateRef.current = { ...stateRef.current!, anim: "idle", since: now };
      return;
    }
    d.phase = "fall";
    pos.current.vy = 0;
  };

  const showBox = boxed || dragging;
  return createPortal(
    <>
      {!boxed && (
        <div ref={wrapRef} className="pointer-events-none fixed bottom-0 left-0 z-[55]" style={{ width: W, height: H }}>
          {say && (
            <button
              ref={bubbleRef}
              type="button"
              onClick={() => {
                setSay(null);
                onTap?.();
              }}
              className="pointer-events-auto absolute bottom-full mb-2 whitespace-nowrap rounded-lg border-2 border-sd-fg bg-sd-surface px-2.5 py-1 text-[12px] font-semibold text-sd-fg shadow-sm"
            >
              {say}
              <span ref={tailRef} aria-hidden className="absolute top-full -mt-[5px] h-2 w-2 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-sd-fg bg-sd-surface" />
            </button>
          )}
          <div
            ref={spriteRef}
            title={onTap ? "누르면 물어볼 수 있어요. 꾹 누르면 옮겨요" : "꾹 눌러서 옮길 수 있어요"}
            className={`pointer-events-auto h-full w-full touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={sheet}
            onPointerDown={onDown}
            onPointerMove={onMovePointer}
            onPointerUp={() => onUp(false)}
            onPointerCancel={() => onUp(true)}
          />
        </div>
      )}
      {showBox && (
        <div ref={boxWrapRef} className="fixed right-4 bottom-0 z-[55] flex flex-col items-center">
          {dragging && <span className="mb-1 rounded bg-sd-surface/90 px-1.5 text-xs text-sd-fg-muted">여기 넣어 두기</span>}
          <button
            ref={boxRef}
            type="button"
            disabled={!boxed}
            aria-label="보관함에서 치즈 꺼내기"
            title={boxed ? "눌러서 치즈 꺼내기" : undefined}
            className="block transition-transform duration-150 enabled:cursor-pointer"
            style={{ width: W, height: H }}
            onClick={() => {
              const r = boxRef.current?.getBoundingClientRect();
              if (r) pos.current.x = r.left;
              setPetBoxed(false);
            }}
          >
            <div ref={boxSpriteRef} className="h-full w-full" style={sheet} />
          </button>
        </div>
      )}
    </>,
    document.body,
  );
}

/** 보관함에 넣거나 꺼낸다 (상자, 물어보기 패널의 버튼) */
export function setPetBoxed(box: boolean) {
  try {
    if (box) localStorage.setItem(PET_BOXED_KEY, "1");
    else localStorage.removeItem(PET_BOXED_KEY);
  } catch {
    // 저장이 막혀도 이번 화면에서는 따른다
  }
  window.dispatchEvent(new Event(PET_BOX_EVENT));
}
