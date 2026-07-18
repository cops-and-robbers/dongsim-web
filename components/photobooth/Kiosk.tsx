"use client";

import { useState } from "react";
import Backdrop from "./Backdrop";
import CaptureScreen from "./CaptureScreen";
import { DEFAULT_FRAME, type FrameDef } from "./frames";
import IntroScreen from "./IntroScreen";
import PreviewScreen from "./PreviewScreen";
import QrScreen from "./QrScreen";
import SelectScreen from "./SelectScreen";

type Phase = "intro" | "capture" | "select" | "preview" | "qr";

/** 부스 데스크탑 전용 전체화면 키오스크 - 사이트 헤더/푸터를 덮는다. */
export default function Kiosk() {
  const [frame, setFrame] = useState<FrameDef>(DEFAULT_FRAME);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);

  const reset = () => {
    setShots([]);
    setSelected([]);
    setIssuedUrl(null);
  };

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
      <Backdrop />

      {/* phase가 바뀔 때마다 key로 리마운트 → 단계 전환이 부드럽게 페이드인 */}
      <div
        key={phase}
        className="pb-screen relative z-10 flex min-h-full flex-col"
      >
        {phase === "intro" && (
          <IntroScreen
            onStart={() => {
              reset();
              setPhase("capture");
            }}
          />
        )}

        {phase === "capture" && (
          <CaptureScreen
            frame={frame}
            onDone={(s) => {
              setShots(s);
              setPhase("select");
            }}
          />
        )}

        {phase === "select" && (
          <SelectScreen
            shots={shots}
            frame={frame}
            onFrameChange={setFrame}
            onRetake={() => {
              reset();
              setPhase("capture");
            }}
            onDone={(idx) => {
              setSelected(idx);
              setPhase("preview");
            }}
          />
        )}

        {phase === "preview" && (
          <PreviewScreen
            shots={shots}
            selected={selected}
            frame={frame}
            onRetake={() => {
              reset();
              setPhase("capture");
            }}
            onIssued={(imageUrl) => {
              setIssuedUrl(imageUrl);
              setPhase("qr");
            }}
          />
        )}

        {phase === "qr" && issuedUrl && (
          <QrScreen
            imageUrl={issuedUrl}
            onRestart={() => {
              reset();
              setPhase("intro");
            }}
          />
        )}
      </div>
    </div>
  );
}
