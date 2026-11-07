"use client";

import { useEffect, useState } from "react";
import type { Screen } from "@/lib/event/kiosk";
import type { EventSettings } from "@/lib/event/settings";
import Backdrop from "./Backdrop";
import CaptureScreen from "./CaptureScreen";
import ClosedScreen from "./ClosedScreen";
import IntroScreen from "./IntroScreen";
import PhotoResult from "./PhotoResult";
import PreviewScreen, { type IssuedStrip } from "./PreviewScreen";
import QrScreen from "./QrScreen";
import SelectScreen from "./SelectScreen";
import { KioskProvider } from "./KioskContext";
import { composeStrip } from "./compose";
import { DEFAULT_FRAME, pickCount, slotRatio } from "./frames";
import { loadImage } from "./image";

// 어드민 미리보기용 부스 화면(#221, app/photobooth/preview). 진짜 화면 컴포넌트를 그대로 그리고, 사진만 샘플을 쓴다.
// 어드민이 보내는 값: 어느 화면인지, 고치는 중인 행사 설정, 짚을 자리(spot).

export type PreviewMessage = { type: "booth-preview"; screen: Screen; settings: EventSettings; spot: string | null; theme: "light" | "dark" };

/** 어드민 칸 이름을 화면 속 자리로. 문구는 data-copy, 동작은 data-spot */
function selectorOf(spot: string): string | null {
  if (spot.startsWith("copy.")) return `[data-copy="${spot.slice(5)}"]`;
  const map: Record<string, string> = {
    "kiosk.shots": '[data-spot="shots"]',
    "kiosk.countdown": '[data-spot="countdown"]',
    "kiosk.tapToShoot": '[data-copy="capture.hint"]',
    "kiosk.select": '[data-copy="select.title"]',
    "kiosk.receive": '[data-copy="qr.print"]',
    "kiosk.autoPrint": '[data-copy="qr.print"]',
    "kiosk.restartSec": '[data-copy="qr.restart"]',
  };
  return map[spot] ?? null;
}

export default function BoothPreview() {
  const [msg, setMsg] = useState<PreviewMessage | null>(null);
  const shots = useSamplePhotos(8);
  const issued = useIssued(shots);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as PreviewMessage | null)?.type === "booth-preview") setMsg(e.data as PreviewMessage);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "booth-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 부스 노트북과 손님 폰은 밝거나 어두울 수 있어 어드민이 고른 쪽으로 그린다
  useEffect(() => {
    if (msg) document.documentElement.classList.toggle("dark", msg.theme === "dark");
  }, [msg]);

  if (!msg || shots.length === 0) return <div className="fixed inset-0 z-100 bg-white" />;
  const { screen, settings } = msg;
  const sel = msg.spot && selectorOf(msg.spot);
  const spotCss = sel ? `${sel}{outline:6px solid #339DFF;outline-offset:8px;border-radius:10px;}` : "";
  const kiosk = settings.kiosk;
  const need = pickCount(DEFAULT_FRAME);
  const shotCount = kiosk.select ? kiosk.shots : need;

  let body;
  if (screen === "closed" || screen === "over") {
    body = <ClosedScreen name={settings.name} dateLabel={settings.dateLabel} location={settings.location} over={screen === "over"} kiosk={kiosk} />;
  } else if (screen === "result") {
    body = <PhotoResult imageUrl={issued?.url ?? null} kiosk={kiosk} name={settings.name} />;
  } else {
    body = (
      <div className="fixed inset-0 z-100 overflow-hidden bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
        <Backdrop />
        <div className="relative z-10 flex min-h-full flex-col">
          {screen === "intro" && <IntroScreen onStart={() => {}} />}
          {screen === "capture" && <CaptureScreen frame={DEFAULT_FRAME} onDone={() => {}} demo={shots[2]} />}
          {screen === "select" && <SelectScreen shots={shots.slice(0, shotCount)} frame={DEFAULT_FRAME} onFrameChange={() => {}} onDone={() => {}} onRetake={() => {}} />}
          {screen === "preview" && <PreviewScreen shots={shots} selected={[0, 2, 3, 5].slice(0, need)} frame={DEFAULT_FRAME} onRetake={() => {}} onIssued={() => {}} />}
          {screen === "qr" && issued && <QrScreen issued={issued} onRestart={() => {}} demo />}
        </div>
      </div>
    );
  }

  return (
    <KioskProvider kiosk={kiosk} name={settings.name}>
      <style>{spotCss}</style>
      {/* 손님 폰 화면은 사이트 머리, 바닥 위에 그려지니 흰 바탕을 깔아 둔다 */}
      {screen === "result" ? <div className="fixed inset-0 z-100 overflow-y-auto bg-white dark:bg-app-black">{body}</div> : body}
    </KioskProvider>
  );
}

/** 샘플 사진. 실제 촬영 대신 경찰과 도둑을 얹은 색 카드(두 진영이 같이 나오게) */
function useSamplePhotos(count: number) {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const ratio = slotRatio(DEFAULT_FRAME);
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
  }, [count]);
  return photos;
}

/** 받기 화면과 손님 폰 화면에 쓸 합성 사진 */
function useIssued(shots: string[]) {
  const [issued, setIssued] = useState<(IssuedStrip & { url: string }) | null>(null);
  useEffect(() => {
    if (shots.length < 6) return;
    let alive = true;
    let objectUrl = "";
    Promise.all([0, 2, 3, 5].map((i) => loadImage(shots[i])))
      .then((imgs) => composeStrip(imgs, DEFAULT_FRAME, { mirror: false }))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setIssued({ blob, key: "preview", url: objectUrl });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shots]);
  return issued;
}
