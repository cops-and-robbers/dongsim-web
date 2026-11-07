"use client";

import { useEffect, useMemo, useState } from "react";
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
import { frameDefsOf, pickCount, type FrameDef } from "./frames";
import { loadImage } from "./image";
import { useSamplePhotos } from "./samplePhotos";

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
    "kiosk.frames": '[data-spot="frames"]',
    "kiosk.characters": '[data-spot="characters"]',
  };
  return map[spot] ?? null;
}

export default function BoothPreview() {
  const [msg, setMsg] = useState<PreviewMessage | null>(null);
  // 어드민이 값을 보낼 때마다 다시 만든다(그리는 중마다 새로 만들면 합성이 끝없이 다시 돈다)
  const frame = useMemo(() => (msg ? frameDefsOf(msg.settings.kiosk)[0] : null), [msg]);
  const shots = useSamplePhotos(8, frame);
  const issued = useIssued(shots, frame);

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

  if (!msg || !frame || shots.length === 0) return <div className="fixed inset-0 z-100 bg-white" />;
  const { screen, settings } = msg;
  const sel = msg.spot && selectorOf(msg.spot);
  const spotCss = sel ? `${sel}{outline:6px solid #339DFF;outline-offset:8px;border-radius:10px;}` : "";
  const kiosk = settings.kiosk;
  const need = pickCount(frame);
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
          {screen === "capture" && <CaptureScreen frame={frame} onDone={() => {}} demo={shots[2]} />}
          {screen === "select" && <SelectScreen shots={shots.slice(0, shotCount)} frame={frame} onFrameChange={() => {}} onDone={() => {}} onRetake={() => {}} />}
          {screen === "preview" && <PreviewScreen shots={shots} selected={[0, 2, 3, 5, 6, 7].slice(0, need)} frame={frame} onRetake={() => {}} onIssued={() => {}} />}
          {screen === "qr" && issued && <QrScreen issued={issued} frame={frame} onRestart={() => {}} demo />}
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

/** 받기 화면과 손님 폰 화면에 쓸 합성 사진 */
function useIssued(shots: string[], frame: FrameDef | null) {
  const [issued, setIssued] = useState<(IssuedStrip & { url: string }) | null>(null);
  useEffect(() => {
    if (!frame || shots.length < 8) return;
    let alive = true;
    let objectUrl = "";
    Promise.all([0, 2, 3, 5, 6, 7].slice(0, frame.slots.length).map((i) => loadImage(shots[i])))
      .then((imgs) => composeStrip(imgs, frame, { mirror: false }))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setIssued({ blob, key: "preview", url: objectUrl });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shots, frame]);
  return issued;
}
