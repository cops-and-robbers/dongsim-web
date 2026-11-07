"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ReactNode } from "react";
import Backdrop from "@/components/photobooth/Backdrop";
import ClosedScreen from "@/components/photobooth/ClosedScreen";
import IntroScreen from "@/components/photobooth/IntroScreen";
import { KioskProvider } from "@/components/photobooth/KioskContext";
import { EventModalCard } from "@/components/home/EventModal";
import type { EventSettings } from "@/lib/event/settings";

// 행사 설정이 사용자에게 어떻게 보이는지 (#219, docs/admin-ui.md "행사").
// 손으로 그린 그림이 아니라 실제 화면 컴포넌트(부스 닫힘 화면, 홈 팝업 카드)를 실제 크기(1280x800)로 그리고 상자에 맞춰 줄인다.
// 고치는 칸에 초점이 가면 그 값이 들어가는 자리(data-spot)에 파란 테두리를 그린다. "어디가 바뀌나"를 글로 읽지 않아도 보이게.
// 부스 노트북과 사용자 브라우저는 밝거나 어두울 수 있어 둘 다 볼 수 있게 하고, 기본은 밝게(어드민이 다크여도).

export type PreviewScene = "booth-before" | "booth-open" | "booth-after" | "popup" | "home";
export type Spot = keyof EventSettings | null;

export const SCENE_LABEL: Record<PreviewScene, string> = {
  "booth-before": "부스 준비 중",
  "booth-open": "부스 열림",
  "booth-after": "부스 감사 인사",
  popup: "홈 팝업",
  home: "홈 (팝업 없음)",
};

const W = 1280;
const H = 800;

/** 고친 칸이 보이는 장면. 둘 이상이면 첫 장면으로 */
export const SCENE_OF: Partial<Record<keyof EventSettings, PreviewScene>> = {
  name: "booth-before",
  dateLabel: "booth-before",
  location: "booth-before",
  boothFrom: "booth-before",
  boothUntil: "booth-after",
  boothClosed: "booth-before",
  popup: "popup",
  popupFrom: "popup",
  popupUntil: "popup",
  popupUrl: "popup",
};

export function EventPreview({ settings, scene, spot, theme }: { settings: EventSettings; scene: PreviewScene; spot: Spot; theme: "light" | "dark" }) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    // 숨은 탭에서는 ResizeObserver 가 늦게 불린다. 처음 폭은 바로 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, [box]);
  const s = width / W;

  return (
    <div
      ref={setBox}
      className="relative w-full overflow-hidden rounded-xl shadow-[0_0_0_1px_var(--sd-line)]"
      style={{ aspectRatio: `${W} / ${H}` }}
      aria-label={`${SCENE_LABEL[scene]} 미리보기`}
      role="img"
    >
      {s > 0 && (
        // transform 이 있는 상자 안에서는 fixed 도 이 상자에 갇힌다(부스 화면이 fixed inset-0 이다)
        <div
          data-preview-spot={spot ?? undefined}
          className={`event-preview relative overflow-hidden ${theme === "dark" ? "dark" : "force-light"}`}
          style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: "top left" }}
          aria-hidden
          // 그림일 뿐이라 안의 버튼(팝업 닫기 등)에 Tab 이 들어가지 않게
          inert
        >
          <SpotStyle />
          {scene === "popup" || scene === "home" ? (
            <SiteBackdrop dark={theme === "dark"} dim={scene === "popup"}>
              {scene === "popup" && (
                <div className="w-[384px]">
                  <EventModalCard popup={{ name: settings.name, dateLabel: settings.dateLabel, location: settings.location, url: settings.popupUrl }} />
                </div>
              )}
            </SiteBackdrop>
          ) : scene === "booth-open" ? (
            <div className="absolute inset-0 flex flex-col bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
              <Backdrop />
              <div className="relative z-10 flex flex-1 flex-col">
                <KioskProvider kiosk={settings.kiosk} name={settings.name}>
                  <IntroScreen onStart={() => {}} />
                </KioskProvider>
              </div>
            </div>
          ) : (
            <ClosedScreen name={settings.name} dateLabel={settings.dateLabel} location={settings.location} over={scene === "booth-after"} kiosk={settings.kiosk} />
          )}
        </div>
      )}
    </div>
  );
}

// 줄여 그리므로 테두리를 두껍게 둔다(1280 폭을 300 ~ 450px 로 줄이면 3 ~ 4배 얇아진다). 색은 앱 설정 미리보기와 같은 파랑
function SpotStyle() {
  const keys = ["name", "dateLabel", "location", "popupUrl"];
  const css = keys
    .map((k) => `.event-preview[data-preview-spot="${k}"] [data-spot="${k}"]{outline:8px solid #339DFF;outline-offset:10px;border-radius:12px;}`)
    .join("");
  return <style>{css}</style>;
}

/** 팝업 뒤에 깔리는 사이트 홈(흐린 자리 표시). 팝업이 사이트 위에 뜬다는 것만 보이면 된다 */
function SiteBackdrop({ children, dark, dim }: { children: ReactNode; dark: boolean; dim: boolean }) {
  return (
    <div className={`absolute inset-0 ${dark ? "bg-app-black" : "bg-white"}`}>
      <div className={`flex h-16 items-center justify-between border-b px-10 ${dark ? "border-white/10" : "border-slate-100"}`}>
        <img src="/brand/header-logo.svg" alt="" className="h-7" />
        <div className={`flex items-center gap-8 text-[15px] font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <span>게임 소개</span>
          <span>체험하기</span>
          <span>온라인 게임</span>
          <span className="rounded-lg bg-brand-blue px-4 py-1.5 text-white">다운로드</span>
        </div>
      </div>
      <div className="px-24 pt-24">
        <div className={`h-14 w-[520px] rounded-xl ${dark ? "bg-white/10" : "bg-slate-100"}`} />
        <div className={`mt-5 h-6 w-[380px] rounded-lg ${dark ? "bg-white/10" : "bg-slate-100"}`} />
        <div className={`mt-3 h-6 w-[300px] rounded-lg ${dark ? "bg-white/10" : "bg-slate-100"}`} />
      </div>
      {dim && <div className="absolute inset-0 flex items-center justify-center bg-black/50">{children}</div>}
    </div>
  );
}
