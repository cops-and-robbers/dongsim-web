"use client";

import { useEffect, useState } from "react";
import { slotRatio, type FrameDef } from "./frames";
import { loadImage } from "./image";

// 미리보기용 샘플 사진(#221, #224). 어드민 부스 미리보기와 프레임 올리기 확인 화면이 같이 쓴다.

/** 샘플 사진. 실제 촬영 대신 경찰과 도둑을 얹은 색 카드(두 진영이 같이 나오게) */
export function useSamplePhotos(count: number, frame: FrameDef | null) {
  const [photos, setPhotos] = useState<string[]>([]);
  const ratio = frame ? slotRatio(frame) : 0;
  useEffect(() => {
    if (!ratio) return;
    let alive = true;
    const tints = ["#dbe6ff", "#dff5e8", "#fff1d6", "#ffe3e3", "#e9e3ff", "#d9f3f7", "#f2f2f2", "#ffe9f4"];
    Promise.all(["/photobooth/cop.svg", "/photobooth/thief.svg"].map(loadImage)).then(([cop, thief]) => {
      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        const c = document.createElement("canvas");
        c.width = 900;
        c.height = Math.round(900 / ratio);
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        const g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0, tints[i % tints.length]);
        g.addColorStop(1, "#ffffff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        const h = c.height * 0.72;
        ctx.drawImage(cop, 110 + (i % 3) * 30, c.height - h - 8, (cop.width / cop.height) * h, h);
        const tw = (thief.width / thief.height) * h;
        ctx.drawImage(thief, c.width - 110 - tw - (i % 2) * 30, c.height - h - 8, tw, h);
        out.push(c.toDataURL("image/jpeg", 0.85));
      }
      if (alive) setPhotos(out);
    });
    return () => {
      alive = false;
    };
  }, [count, ratio]);
  return photos;
}

