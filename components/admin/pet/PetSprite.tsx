"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Anim, SheetMeta } from "@/lib/admin/pet/brain";

/**
 * 치즈 스프라이트 시트(#163)를 한 번만 받아 나눠 쓴다. 돌아다니는 펫(CheesePet)과 챗봇 패널의 치즈 얼굴이 같은 그림을 쓴다
 */
let sheet: Promise<SheetMeta> | null = null;
export function loadSheet(): Promise<SheetMeta> {
  sheet ??= fetch("/admin/pet/cheese-sheet.json").then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<SheetMeta>;
  });
  sheet.catch(() => (sheet = null));
  return sheet;
}

export function useSheet(): SheetMeta | null {
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  useEffect(() => {
    let alive = true;
    loadSheet()
      .then((m) => alive && setMeta(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return meta;
}

/** 시트 배경 스타일. scale 은 정수만(픽셀이 번지지 않게) */
export function sheetStyle(meta: SheetMeta, scale: number): CSSProperties {
  const [cw, ch] = meta.cell;
  const cols = Math.max(...Object.values(meta.states).map((s) => s.frames));
  const rows = Object.keys(meta.states).length;
  return {
    backgroundImage: "url(/admin/pet/cheese-sheet.png)",
    backgroundRepeat: "no-repeat",
    backgroundSize: `${cols * cw * scale}px ${rows * ch * scale}px`,
    imageRendering: "pixelated",
  };
}

/**
 * 제자리에서 한 동작을 하는 치즈. 챗봇 패널의 얼굴(대기, 킁킁, 갸웃, 졸기)에 쓴다.
 * play 가 false 거나 움직임 줄이기 설정이면 첫 프레임에 멈춘다. 한 번짜리 동작은 끝 프레임에 멈춘다
 */
export function PetSprite({ anim, scale = 1, play = true, className = "" }: { anim: Anim; scale?: number; play?: boolean; className?: string }) {
  const meta = useSheet();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meta) return;
    const [cw, ch] = meta.cell;
    const st = meta.states[anim];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const paint = () => {
      if (ref.current) ref.current.style.backgroundPosition = `${-i * cw * scale}px ${-st.row * ch * scale}px`;
    };
    paint();
    if (!play || reduced || st.frames < 2) return;
    const id = setInterval(() => {
      if (!st.loop && i === st.frames - 1) return;
      i = (i + 1) % st.frames;
      paint();
    }, st.ms);
    return () => clearInterval(id);
  }, [meta, anim, scale, play]);

  const size = meta ? { width: meta.cell[0] * scale, height: meta.cell[1] * scale } : { width: 28 * scale, height: 28 * scale };
  return <div ref={ref} aria-hidden className={`shrink-0 ${className}`} style={{ ...size, ...(meta ? sheetStyle(meta, scale) : {}) }} />;
}
