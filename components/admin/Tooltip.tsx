"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 어드민 툴팁. 브라우저 기본 툴팁(title)을 쓰지 않는 이유:
 * - 1초쯤 늦게 뜨고, 글씨가 작고 회색이라 잘 안 읽히고, 어드민 색과 다크 모드를 따르지 않는다
 * - 키보드 초점이나 터치로는 아예 안 뜬다
 *
 * 그래서
 * - 마우스는 올리고 잠깐(120ms) 뒤, 키보드는 초점이 오면 바로, 터치는 누르면 열고 다시 누르면 닫는다
 * - 표 안(가로 스크롤 상자)에서도 잘리지 않게 body 로 띄워(portal) 화면 기준 위치를 잡는다.
 *   위에 자리가 없으면 아래로, 화면 양끝에서는 안쪽으로 밀어 넣는다
 * - 화면 읽기 프로그램은 aria-describedby 로 내용을 읽는다. Esc 로 닫는다
 * 차트 툴팁(TrendChart)과 같은 모양(테두리, 그림자, 둥근 모서리, 12px)으로 맞췄다.
 */
export function Tooltip({ content, children, className = "" }: { content: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const show = (delay: number) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
    setPos(null);
  };

  // 열린 뒤 크기를 재서 자리를 잡는다(그리기 전에 잡아 깜빡이지 않게)
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const tip = tipRef.current?.getBoundingClientRect();
    if (!t || !tip) return;
    const gap = 8;
    const below = t.top - tip.height - gap < 8;
    const top = below ? t.bottom + gap : t.top - tip.height - gap;
    const left = Math.min(Math.max(8, t.left + t.width / 2 - tip.width / 2), window.innerWidth - tip.width - 8);
    setPos({ left, top, below });
  }, [open]);

  // 스크롤하거나 바깥을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const close = () => hide();
    const onDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) hide();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <>
      {/* 버튼으로 둔다: 키보드 초점을 받고, 표 줄 클릭(Tr)이 버튼 안 클릭은 건너뛰어 상세가 같이 열리지 않는다 */}
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        className={`cursor-help rounded outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
        onPointerEnter={(e) => e.pointerType === "mouse" && show(120)}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
        // 터치는 누를 때마다 열고 닫는다(마우스로 눌러도 같다)
        onClick={() => (open ? hide() : show(0))}
        onFocus={() => show(0)}
        onBlur={hide}
      >
        {children}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[90] max-w-[240px] rounded-lg border border-sd-line bg-sd-surface px-3 py-2 text-[12px] leading-relaxed text-sd-fg shadow-lg transition-opacity duration-100"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, opacity: pos ? 1 : 0 }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
