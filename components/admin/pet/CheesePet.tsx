"use client";

import { useEffect, useRef, useState } from "react";
import { frameOf, initial, play, setMood, step, suddenlyNear, type PetState, type SheetMeta } from "@/lib/admin/pet/brain";
import { PET_EVENT, type PetSignal } from "@/lib/admin/pet/signal";

/**
 * 치즈 조각 펫 (#163). 지표 화면 아래를 돌아다니고, 마우스를 따라가고, 챗봇 상태에 따라 동작이 바뀐다.
 * 그림은 public/admin/pet/cheese-sheet.png (scripts/pet/cheese.py 로 만든 28x28 칸 스프라이트 시트), 판단은 lib/admin/pet/brain.ts.
 *
 * - React 상태로 프레임마다 다시 그리지 않는다. requestAnimationFrame 한 줄이 위치와 배경 위치를 직접 바꾼다
 * - 펫 몸만 클릭을 받는다(누르면 꾹, 클릭하면 하트). 나머지 화면 클릭은 가리지 않는다
 * - 움직임 줄이기 설정이면 걷지 않고 대기 첫 프레임만 보인다. 터치 기기에서는 마우스를 따라가지 않는다
 * - 숨기기: 펫에 마우스를 올리면 작은 닫기 버튼. 숨긴 상태는 이 브라우저에만 기억한다(물어보기 탭에서 다시 부를 수 있다)
 */

const SCALE = 3;
export const PET_HIDDEN_KEY = "cheese-pet-hidden";
export const PET_TOGGLE_EVENT = "cheese-pet-toggle";

const readHidden = () => {
  try {
    return localStorage.getItem(PET_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
};

export function CheesePet() {
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [hidden, setHidden] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PetState | null>(null);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHidden(readHidden());
    const onToggle = () => setHidden(readHidden());
    window.addEventListener(PET_TOGGLE_EVENT, onToggle);
    fetch("/admin/pet/cheese-sheet.json")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => undefined);
    return () => window.removeEventListener(PET_TOGGLE_EVENT, onToggle);
  }, []);

  useEffect(() => {
    if (!meta || hidden) return;
    const [cw, ch] = meta.cell;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const now0 = performance.now();
    stateRef.current = reduced ? { ...initial(now0), anim: "idle" } : initial(now0);
    let petX = Math.max(16, window.innerWidth - cw * SCALE - 32);
    let mouseX: number | null = null;
    let lastActive = performance.now();
    let prev = { dist: 9999, at: 0 };

    const onMove = (e: MouseEvent) => {
      lastActive = performance.now();
      if (touch || reduced) return;
      mouseX = e.clientX - (cw * SCALE) / 2;
      const dist = Math.abs(mouseX - petX);
      const s = stateRef.current!;
      if (suddenlyNear(prev.dist, prev.at, dist, lastActive) && !s.mood) stateRef.current = play(s, "surprise", lastActive);
      prev = { dist, at: lastActive };
    };
    const onActive = () => (lastActive = performance.now());
    const onSignal = (e: Event) => {
      const sig = (e as CustomEvent<PetSignal>).detail;
      const t = performance.now();
      lastActive = t;
      let s = stateRef.current!;
      if (sig === "typing") s = setMood(s, { anim: "listen", until: t + 2000, since: t });
      if (sig === "asking") s = setMood(s, { anim: "think", until: Infinity, since: t });
      if (sig === "answered") s = play(setMood(s, null), "happy", t);
      if (sig === "unverified") s = setMood(s, { anim: "confused", until: t + 4000, since: t });
      if (sig === "error") s = play(setMood(s, null), "fall", t);
      if (sig === "liked") s = play(s, "love", t);
      if (sig === "disliked") s = play(s, "sad", t);
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
      let s = stateRef.current!;
      if (!reduced) {
        const r = step(s, { now: t, dt, mouseX, petX, idleMs: t - lastActive }, meta);
        s = r.state;
        petX = Math.min(Math.max(0, petX + r.dx), window.innerWidth - cw * SCALE);
      }
      stateRef.current = s;
      const st = meta.states[s.anim];
      const frame = reduced ? 0 : (frameOf(s, t, meta) ?? st.frames - 1);
      if (boxRef.current) boxRef.current.style.transform = `translateX(${Math.round(petX)}px)`;
      if (spriteRef.current) {
        spriteRef.current.style.backgroundPosition = `${-frame * cw * SCALE}px ${-st.row * ch * SCALE}px`;
        spriteRef.current.style.transform = s.facing === -1 ? "scaleX(-1)" : "";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onActive);
      window.removeEventListener("scroll", onActive, true);
      window.removeEventListener(PET_EVENT, onSignal);
    };
  }, [meta, hidden]);

  if (!meta || hidden) return null;
  const [cw, ch] = meta.cell;
  const cols = Math.max(...Object.values(meta.states).map((s) => s.frames));
  const rows = Object.keys(meta.states).length;
  return (
    <div ref={boxRef} className="pointer-events-none fixed bottom-0 left-0 z-30" style={{ width: cw * SCALE, height: ch * SCALE }}>
      <div
        ref={spriteRef}
        className="group pointer-events-auto relative h-full w-full cursor-pointer"
        style={{
          backgroundImage: "url(/admin/pet/cheese-sheet.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: `${cols * cw * SCALE}px ${rows * ch * SCALE}px`,
          imageRendering: "pixelated",
        }}
        onPointerDown={() => {
          pressRef.current = setTimeout(() => {
            stateRef.current = play(stateRef.current!, "squish", performance.now());
            pressRef.current = null;
          }, 250);
        }}
        onPointerUp={() => {
          if (pressRef.current) {
            clearTimeout(pressRef.current);
            pressRef.current = null;
            stateRef.current = play(stateRef.current!, "love", performance.now());
          }
        }}
      >
        <button
          type="button"
          aria-label="치즈 숨기기"
          title="치즈 숨기기"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            try {
              localStorage.setItem(PET_HIDDEN_KEY, "1");
            } catch {
              // 저장이 막혀도 이번에는 숨긴다
            }
            setHidden(true);
          }}
          className="absolute -top-1 right-0 hidden h-5 w-5 items-center justify-center rounded-full bg-sd-surface text-[11px] text-sd-fg-subtle shadow group-hover:flex"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** 숨긴 펫을 다시 부른다 (물어보기 탭의 버튼) */
export function showPet() {
  try {
    localStorage.removeItem(PET_HIDDEN_KEY);
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event(PET_TOGGLE_EVENT));
}
