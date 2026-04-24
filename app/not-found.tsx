"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import Container from "@/components/ui/Container";
import JailedRobberIcon from "@/components/characters/JailedRobberIcon";

type Phase = "idle" | "dragging" | "returning" | "captured";

export default function NotFound() {
  const router = useRouter();
  const charRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);

  const isCaptured = phase === "captured";
  const isDragging = phase === "dragging";
  const disabled = phase === "captured";

  const computeZoneHit = () => {
    if (!charRef.current || !zoneRef.current) return null;
    const c = charRef.current.getBoundingClientRect();
    const z = zoneRef.current.getBoundingClientRect();
    const cx = c.left + c.width / 2;
    const cy = c.top + c.height / 2;
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;
    const distance = Math.hypot(cx - zx, cy - zy);
    const hitRadius = z.width * 0.5;
    return {
      inside: distance < hitRadius,
      dx: zx - cx,
      dy: zy - cy,
    };
  };

  const capture = (hit: { dx: number; dy: number }) => {
    setPhase("captured");
    setIsNear(false);
    setPos((p) => ({ x: p.x + hit.dx, y: p.y + hit.dy }));
    window.setTimeout(() => router.push("/"), 650);
  };

  const snapBack = () => {
    setPhase("returning");
    setIsNear(false);
    setPos({ x: 0, y: 0 });
    window.setTimeout(() => setPhase("idle"), 500);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    setPhase("dragging");
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== "dragging") return;
    const newPos = {
      x: dragStart.current.posX + (e.clientX - dragStart.current.clientX),
      y: dragStart.current.posY + (e.clientY - dragStart.current.clientY),
    };
    setPos(newPos);
    const hit = computeZoneHit();
    if (hit) setIsNear(hit.inside);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== "dragging") return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const hit = computeZoneHit();
    if (hit && hit.inside) {
      capture(hit);
    } else {
      snapBack();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const hit = computeZoneHit();
    if (!hit) return;
    capture(hit);
  };

  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-white py-16 transition-colors duration-500 sm:py-20 dark:bg-app-black">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center">
          <div className="relative flex w-full items-center justify-between gap-4 sm:gap-8 md:gap-12">
            <div
              ref={charRef}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label="도둑을 드래그해서 플레이 구역으로 옮기기"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={handleKeyDown}
              className={`relative flex h-24 w-24 shrink-0 touch-none select-none items-center justify-center rounded-full outline-none ease-out focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brand-blue sm:h-32 sm:w-32 md:h-40 md:w-40 dark:focus-visible:outline-brand-green ${
                isDragging
                  ? "cursor-grabbing"
                  : disabled
                    ? "cursor-default"
                    : "cursor-grab"
              }`}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isCaptured ? 0.55 : 1})`,
                transition: isDragging
                  ? "none"
                  : "transform 500ms cubic-bezier(0.22,1,0.36,1), opacity 250ms ease-out",
                zIndex: isDragging || isCaptured ? 10 : 1,
                opacity: isCaptured ? 0.6 : 1,
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-brand-blue/10 blur-2xl dark:bg-brand-green/12"
              />
              <div className="nf-bounce relative flex h-full w-full items-center justify-center">
                <JailedRobberIcon className="h-full w-full pointer-events-none" />
              </div>
              {phase === "idle" && (
                <span className="nf-hint pointer-events-none absolute -bottom-8 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-md dark:bg-white dark:text-app-black">
                  드래그해서 옮기기
                </span>
              )}
              {isCaptured && (
                <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-full bg-brand-blue px-3 py-1 text-[11px] font-bold text-white shadow-lg dark:bg-brand-green dark:text-app-black">
                  잡았다!
                </span>
              )}
            </div>

            <div
              ref={zoneRef}
              aria-hidden="true"
              className="relative flex h-24 w-24 shrink-0 items-center justify-center transition-transform duration-300 sm:h-32 sm:w-32 md:h-40 md:w-40"
              style={{ transform: isNear ? "scale(1.06)" : "scale(1)" }}
            >
              <svg
                viewBox="0 0 200 200"
                className={`nf-spin absolute inset-0 h-full w-full transition-colors duration-200 ${
                  isNear
                    ? "text-brand-blue dark:text-brand-green"
                    : "text-brand-blue/45 dark:text-brand-green/45"
                }`}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="currentColor"
                  fillOpacity={isNear ? "0.14" : "0.08"}
                  stroke="currentColor"
                  strokeWidth={isNear ? "3" : "2"}
                  strokeDasharray="8 8"
                />
              </svg>
              <span className="relative text-[10px] font-bold uppercase tracking-[0.24em] text-brand-blue sm:text-[11px] dark:text-brand-green">
                Play Zone
              </span>
            </div>
          </div>

          <p className="mt-14 font-mono text-[11px] font-semibold tracking-[0.28em] text-brand-blue dark:text-brand-green">
            404 · OUT OF ZONE
          </p>
          <h1 className="mt-3 text-balance text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
            여긴 플레이 구역 밖이에요
          </h1>
          <p className="mt-3 text-pretty text-center text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            {isCaptured
              ? "홈으로 이동하고 있어요..."
              : "도둑을 플레이 구역으로 옮겨 주세요."}
          </p>
        </div>
      </Container>
    </section>
  );
}
