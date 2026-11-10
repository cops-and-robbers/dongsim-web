"use client";

import { useEffect, useRef, useState } from "react";
import { drawSheet, loadFonts, preloadText, textsOf, type DrawReport, type Fonts } from "@/lib/qr-print/draw";
import { PAGE, type Sheet } from "@/lib/qr-print/layout";

/**
 * 인쇄물 미리보기. PDF 와 같은 그리기 함수를 화면 크기로 부른다.
 * 캔버스 픽셀은 화면 폭 x 기기 배율로 맞춰 흐리지 않게 한다.
 */
export function Preview({ sheet, siteUrl, onFonts, onReport }: { sheet: Sheet; siteUrl: string; onFonts?: (f: Fonts) => void; onReport?: (r: DrawReport) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [fonts, setFonts] = useState<Fonts | null>(null);

  useEffect(() => {
    let alive = true;
    void loadFonts().then((f) => {
      if (!alive) return;
      setFonts(f);
      onFonts?.(f);
    });
    return () => {
      alive = false;
    };
  }, [onFonts]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !fonts || width <= 0) return;
    let alive = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.round(width * dpr);
    const scale = px / PAGE.width;
    // 그리는 동안 바로 앞 그림을 지우지 않게, 다른 캔버스에 다 그린 뒤 한 번에 옮긴다
    const off = document.createElement("canvas");
    off.width = px;
    off.height = Math.round(PAGE.height * scale);
    const ctx = off.getContext("2d");
    if (!ctx) return;
    void (async () => {
      await preloadText(fonts, textsOf(sheet));
      const report = await drawSheet(ctx, scale, { sheet, siteUrl, fonts });
      if (!alive) return;
      onReport?.(report);
      c.width = off.width;
      c.height = off.height;
      c.getContext("2d")?.drawImage(off, 0, 0);
    })();
    return () => {
      alive = false;
    };
  }, [sheet, siteUrl, fonts, width, onReport]);

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-lg bg-sd-fill shadow-sm ring-1 ring-sd-line" style={{ aspectRatio: `${PAGE.width} / ${PAGE.height}` }}>
      <canvas ref={canvas} role="img" aria-label="인쇄물 미리보기" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
