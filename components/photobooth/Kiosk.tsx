"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { KioskConfig } from "@/lib/event/kiosk";
import Backdrop from "./Backdrop";
import CaptureScreen from "./CaptureScreen";
import { frameDefsOf, pickCount, type FrameDef } from "./frames";
import { KioskProvider } from "./KioskContext";
import IntroScreen from "./IntroScreen";
import PreviewScreen, { type IssuedStrip } from "./PreviewScreen";
import QrScreen from "./QrScreen";
import SelectScreen from "./SelectScreen";

type Phase = "intro" | "capture" | "select" | "preview" | "qr";

/** 시작 화면에 머무는 동안 서버에서 설정을 다시 읽는 간격. 어드민에서 저장한 값과 "부스 지금 닫기"가 이만큼 안에 들어간다 */
const REFRESH_MS = 30_000;

/**
 * 부스 데스크탑 전용 전체화면 키오스크 - 사이트 헤더/푸터를 덮는다.
 * 흐름과 문구는 어드민 행사 설정(#221). 부스 노트북은 하루 종일 켜 두니, 시작 화면에 있을 때만 설정을 다시 읽는다
 * (찍는 도중에 장수나 받는 방법이 바뀌지 않게). 닫았으면 페이지가 닫힘 화면으로 바뀐다.
 */
export default function Kiosk({ kiosk, name }: { kiosk: KioskConfig; name: string }) {
  const router = useRouter();
  // 행사가 고른 첫 프레임으로 시작한다. 손님이 고르기 화면에서 바꿀 수 있다
  const [frame, setFrame] = useState<FrameDef>(() => frameDefsOf(kiosk)[0]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [issued, setIssued] = useState<IssuedStrip | null>(null);

  useEffect(() => {
    if (phase !== "intro") return;
    router.refresh();
    const id = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [phase, router]);

  const reset = () => {
    // 손님이 바뀌면 행사의 첫 프레임으로. 그사이 어드민에서 프레임을 바꿨으면 새 목록을 따른다
    setFrame(frameDefsOf(kiosk)[0]);
    setShots([]);
    setSelected([]);
    setIssued(null);
  };

  return (
    <KioskProvider kiosk={kiosk} name={name}>
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
              // 고르기를 끈 행사는 찍은 사진이 그대로 프레임에 들어간다
              if (kiosk.select) setPhase("select");
              else {
                setSelected(s.slice(0, pickCount(frame)).map((_, i) => i));
                setPhase("preview");
              }
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
            onIssued={(r) => {
              setIssued(r);
              setPhase("qr");
            }}
          />
        )}

        {phase === "qr" && issued && (
          <QrScreen
            issued={issued}
            frame={frame}
            onRestart={() => {
              reset();
              setPhase("intro");
            }}
          />
        )}
      </div>
    </div>
    </KioskProvider>
  );
}
