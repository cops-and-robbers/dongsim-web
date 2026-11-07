"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { PhoneFrame } from "@/components/game/PhoneMockup";
import { AppScreen } from "@/components/game/mockups/AppScreen";
import { DemoHome } from "@/components/demo/scenes/DemoHome";
import { DemoCommunityList } from "@/components/demo/scenes/DemoCommunityList";
import { DemoTabBar } from "@/components/demo/DemoTabBar";
import { appColors } from "@/lib/app-tokens";
import { appVersionOutcome, evidenceLayout, evidenceUrls, versionSamples, type AppConfigValues, type VersionOutcome } from "@/lib/admin/appConfig";

// 앱 설정 옆의 폰. 고르는 값이 앱의 어느 화면, 어느 자리에 나오는지 실제 앱 화면으로 보여 준다.
// 화면은 사이트 데모(components/demo)의 실측 장면을 그대로 쓰고, 없는 화면은 앱 코드를 옮겼다.
// 저장 전 값으로 그리고, 안의 버튼을 눌러 사용자가 겪을 일을 따라가 볼 수 있다.

export type PreviewScene = "maintenance" | "version" | "community-ad" | "game-end-ad" | "banner" | "evidence";

// 고른 값이 나오는 자리 표시. 앱에는 없는 관리자용 테두리다
const SPOT = "rounded-[14px] outline outline-[3px] outline-offset-[3px] outline-[#339DFF]";

const noop = () => {};

export function AppPreview({ scene, values }: { scene: PreviewScene; values: AppConfigValues }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [replay, setReplay] = useState(0);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [tapNote, setTapNote] = useState<string | null>(null);
  const [evidenceOpened, setEvidenceOpened] = useState<number | null>(null);

  const samples = versionSamples(values);
  // 값이 바뀌어 고르던 버전이 사라지면 첫 버전을 보여 준다
  const sample = samples[sampleIndex] ?? samples[0];
  const outcome = sample ? appVersionOutcome(values, sample.version) : "upToDate";

  const evidenceCount = evidenceUrls(values).length || 2;
  const opened = Math.min(evidenceOpened ?? evidenceCount, evidenceCount);

  const restart = () => {
    setReplay((n) => n + 1);
    setTapNote(null);
  };

  return (
    <div>
      {/* 제목("사용자에게 이렇게 보여요")은 감싸는 PreviewPane 이 그린다.
          폰 영역이 창보다 크면 영역 끝에 닿아, 왼쪽 저장 줄이 생길 때마다 폰이 같이 밀린다. 창 안에 들어오게 줄인다.
          208 = 스크롤 틀 위아래 여백 64 + 제목 28 + 버전 버튼 62 + 설명 두 줄 54. svh 인 까닭은 DemoApp 주석과 같다 */}
      <div className="mx-auto w-full max-w-[280px] lg:max-w-[clamp(200px,calc((100svh_-_208px)*9/19),280px)]">
        <PhoneFrame clock="9:41" unbounded>
          <AppScreen playing scrollRef={screenRef} statusBar={appColors.white} className="bg-white">
            <Scene key={`${scene}-${sample?.version}-${outcome}-${replay}`} scene={scene} values={values} outcome={outcome} onTap={setTapNote} evidenceOpened={opened} />
          </AppScreen>
        </PhoneFrame>
      </div>

      {scene === "version" && samples.length > 0 && (
        <div className="mt-3 text-center">
          <p className="mb-1.5 text-[12px] font-medium text-sd-fg-subtle">이 버전의 앱으로 열어 보기</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {samples.map((s, i) => {
              const active = s.version === sample?.version;
              return (
                <button
                  key={s.version}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSampleIndex(i);
                    restart();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                    active ? "bg-accent-weak text-accent" : "bg-sd-gray-200 text-sd-fg-subtle hover:text-sd-fg-muted"
                  }`}
                >
                  {s.version}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {scene === "evidence" && (
        <div className="mt-3 text-center">
          <p className="mb-1.5 text-[12px] font-medium text-sd-fg-subtle">검거한 운영진 수</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: evidenceCount + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === opened}
                onClick={() => setEvidenceOpened(n)}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                  n === opened ? "bg-accent-weak text-accent" : "bg-sd-gray-200 text-sd-fg-subtle hover:text-sd-fg-muted"
                }`}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>
      )}

      <p aria-live="polite" className="mt-3 text-center text-[13px] leading-relaxed text-sd-fg-muted">
        {tapNote ?? captionOf(scene, values, outcome, sample?.version ?? "")}
      </p>
    </div>
  );
}

function captionOf(scene: PreviewScene, v: AppConfigValues, outcome: VersionOutcome, version: string) {
  const adsOn = v.ads_enabled === "true";
  switch (scene) {
    case "maintenance":
      return "점검으로 막히면 사용자에게 이 화면이 보여요.";
    case "version":
      if (outcome === "maintenance") return "점검 모드가 켜져 있어 앱을 새로 열면 버전과 상관없이 점검 화면이 보여요.";
      if (outcome === "forceUpdate") return `${version} 앱을 열면 이 화면에서 멈춰요. 업데이트해야 쓸 수 있어요.`;
      if (outcome === "upToDate") return `${version} 앱은 안내 없이 바로 열려요.`;
      return `${version} 앱을 열면 이 안내가 떠요. 나중에를 누르면 계속 쓸 수 있어요.`;
    case "community-ad":
      if (!adsOn) return "전체 광고가 꺼져 있어 커뮤니티에도 광고가 나오지 않아요.";
      return v.community_ads_enabled === "true" ? "모집 글 5개마다 이 자리에 광고가 나와요." : "지금 설정이면 커뮤니티에 광고가 나오지 않아요.";
    case "game-end-ad":
      if (!adsOn) return "전체 광고가 꺼져 있어 게임이 끝나도 광고가 나오지 않아요.";
      return v.game_end_ads_enabled === "true" ? "게임을 마치고 나갈 때 전면 광고가 떠요. 닫으면 다음 화면이 보여요." : "지금 설정이면 광고 없이 바로 넘어가요.";
    case "evidence":
      return "게임이 끝날 때와 검거 현황에서 이 보드가 보여요.";
    case "banner":
      if (v.banner_enabled !== "true" || !v.banner_image_url) return "지금 설정이면 홈에 배너가 보이지 않아요.";
      return v.banner_link_url ? "홈 화면 버튼 아래에 나와요. 눌러 보세요." : "홈 화면 버튼 아래에 나와요. 눌러도 이동하지 않아요.";
  }
}

function Scene({
  scene,
  values,
  outcome,
  onTap,
  evidenceOpened,
}: {
  scene: PreviewScene;
  values: AppConfigValues;
  outcome: VersionOutcome;
  onTap: (note: string) => void;
  evidenceOpened: number;
}) {
  if (scene === "evidence") return <EvidenceBoard urls={evidenceUrls(values)} opened={evidenceOpened} />;
  if (scene === "maintenance") return <MaintenanceScreen message={values.maintenance_message} spot />;
  if (scene === "version") return <VersionScene values={values} outcome={outcome} onTap={onTap} />;
  if (scene === "community-ad") {
    const show = values.ads_enabled === "true" && values.community_ads_enabled === "true";
    return (
      <Tabbed active="community">
        <DemoCommunityList onOpenPost={noop} adSlot={show ? <NativeAd /> : undefined} />
      </Tabbed>
    );
  }
  if (scene === "game-end-ad") {
    const show = values.ads_enabled === "true" && values.game_end_ads_enabled === "true";
    return <GameEndScene show={show} />;
  }
  return <Home banner={<HomeBanner values={values} onTap={onTap} />} />;
}

function Tabbed({ active, children }: { active: "home" | "community"; children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <DemoTabBar active={active} onSelect={noop} />
    </>
  );
}

function Home({ banner }: { banner?: ReactNode }) {
  return (
    <Tabbed active="home">
      <DemoHome active="none" profileIcon={1} onCreate={noop} onJoin={noop} banner={banner} />
    </Tabbed>
  );
}

// home_page.dart: 버튼 아래 16, 폭 전체, 높이 68, 라운드 12. 이미지가 깨지면 자리째 사라진다
function HomeBanner({ values, onTap }: { values: AppConfigValues; onTap: (note: string) => void }) {
  const [failed, setFailed] = useState(false);
  const url = values.banner_image_url;
  if (values.banner_enabled !== "true" || !url || failed) return null;
  const link = values.banner_link_url;
  return (
    <button
      type="button"
      onClick={() => {
        if (link) onTap(`사용자는 외부 브라우저에서 ${hostOf(link)} 주소로 이동해요.`);
      }}
      className={`mt-[16px] block h-[68px] w-full shrink-0 overflow-hidden bg-white ${SPOT} ${link ? "" : "cursor-default"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    </button>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// force_update_page.dart, maintenance_page.dart 와 같은 틀: 가운데 시작 화면 그림, 제목 24, 본문 18
function GateScreen({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  const [first, second] = message.split("\n");
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white p-[20px]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <Image src="/demo/app_splash_ko.svg" alt="" width={302} height={392} style={{ width: 240, height: "auto" }} />
        <p className="mt-[32px] text-[24px] font-bold" style={{ color: appColors.black }}>
          {title}
        </p>
        <p className="mt-[16px] text-[18px] leading-[1.45]" style={{ color: appColors.black600 }}>
          {first}
          <br />
          {second}
        </p>
        {children}
      </div>
    </div>
  );
}

function MaintenanceScreen({ message, spot = false }: { message: string; spot?: boolean }) {
  return (
    <GateScreen title="서버 점검 중" message={"더 나은 서비스를 위해 점검 중이에요\n잠시 후 다시 접속해 주세요!"}>
      {message && (
        <p className={`mt-[16px] px-[6px] py-[2px] text-[14px] ${spot ? SPOT : ""}`} style={{ color: appColors.black400 }}>
          {message}
        </p>
      )}
    </GateScreen>
  );
}

function VersionScene({ values, outcome, onTap }: { values: AppConfigValues; outcome: VersionOutcome; onTap: (note: string) => void }) {
  const [dismissed, setDismissed] = useState(false);
  const toStore = () => onTap("사용자는 스토어로 이동해요.");

  if (outcome === "maintenance") return <MaintenanceScreen message={values.maintenance_message} />;
  if (outcome === "forceUpdate") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <GateScreen title="업데이트 필요" message={"새로운 버전이 출시되었어요\n업데이트 후 이용해 주세요!"} />
        <div className="bg-white px-[20px] pb-[34px]">
          <button type="button" onClick={toStore} className="h-[56px] w-full rounded-[12px] text-[16px] font-semibold text-white" style={{ backgroundColor: appColors.blue }}>
            업데이트
          </button>
        </div>
      </div>
    );
  }
  const dialog =
    outcome === "optionalUpdate"
      ? { title: "업데이트 안내", message: "새로운 버전이 나왔어요\n업데이트할까요?" }
      : { title: "새 버전 안내", message: "더 좋아진 새 버전이 있어요\n업데이트할까요?" };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Home />
      {outcome !== "upToDate" && !dismissed && <UpdateDialog {...dialog} onLater={() => setDismissed(true)} onUpdate={toStore} />}
    </div>
  );
}

// app_dialog.dart: 마진 36, 라운드 24, 제목 20, 본문 14, 버튼 52 두 개
function UpdateDialog({ title, message, onLater, onUpdate }: { title: string; message: string; onLater: () => void; onUpdate: () => void }) {
  const [first, second] = message.split("\n");
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-[36px]">
      <div className="w-full rounded-[24px] bg-white px-[12px] pb-[16px] pt-[24px]">
        <p className="text-center text-[20px] font-bold" style={{ color: appColors.black }}>
          {title}
        </p>
        <p className="mt-[12px] text-center text-[14px]" style={{ color: appColors.black600 }}>
          {first}
          <br />
          {second}
        </p>
        <div className="mt-[20px] flex gap-[8px] px-[4px]">
          <button type="button" onClick={onLater} className="h-[52px] flex-1 rounded-[12px] text-[16px] font-semibold" style={{ backgroundColor: appColors.black100, color: appColors.black600 }}>
            나중에
          </button>
          <button type="button" onClick={onUpdate} className="h-[52px] flex-1 rounded-[12px] text-[16px] font-semibold text-white" style={{ backgroundColor: appColors.blue }}>
            업데이트
          </button>
        </div>
      </div>
    </div>
  );
}

// 앱 event_result_board.dart 를 옮겼다. 앱에 든 사진은 이 저장소에 없어 자리만 그린다
function EvidenceBoard({ urls, opened }: { urls: string[]; opened: number }) {
  const [loaded, setLoaded] = useState<{ url: string; ratio: number } | null>(null);
  const first = urls[0];
  useEffect(() => {
    if (!first) return;
    const image = new window.Image();
    image.onload = () => setLoaded({ url: first, ratio: image.naturalWidth / image.naturalHeight });
    image.src = first;
    return () => {
      image.onload = null;
    };
  }, [first]);

  const count = urls.length || 2;
  const ratio = loaded && loaded.url === first ? loaded.ratio : 9 / 16;
  const layout = evidenceLayout(ratio, count);
  const fullWidthTilt = layout.arrangement === "single" || layout.arrangement === "stacked";
  const tilt = fullWidthTilt ? 0.02 : 0.05;
  const slot = (i: number) => (
    <div
      key={i}
      className={`relative shrink-0 overflow-hidden rounded-[8px] ${SPOT}`}
      style={{
        width: layout.width,
        height: layout.height,
        transform: `rotate(${i === 0 ? -tilt : i === count - 1 ? tilt : 0}rad)`,
        backgroundColor: appColors.black100,
      }}
    >
      {i < opened &&
        (urls[i] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[i]} alt={`증거 사진 ${i + 1}번`} className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-full items-center justify-center text-[13px] font-semibold" style={{ color: appColors.black400 }}>
            앱 사진 {i + 1}
          </span>
        ))}
      {i >= opened && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="flex rounded-full bg-white p-[6px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill={appColors.black400}>
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </span>
        </span>
      )}
    </div>
  );
  const indexes = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-[36px]">
      <div className="w-full rounded-[24px] bg-white p-[20px]">
        <p className="text-center text-[20px] font-semibold" style={{ color: appColors.black }}>
          수사 종료
        </p>
        <div className="my-[16px] flex flex-col items-center gap-[16px]">
          {layout.arrangement === "stacked" && indexes.map(slot)}
          {layout.arrangement === "twoOverOne" && (
            <>
              <div className="flex gap-[16px]">{indexes.slice(0, 2).map(slot)}</div>
              {slot(2)}
            </>
          )}
          {(layout.arrangement === "sideBySide" || layout.arrangement === "single") && <div className="flex gap-[16px]">{indexes.map(slot)}</div>}
        </div>
        <p className="text-center text-[20px] font-semibold" style={{ color: appColors.blue }}>
          운영진 {opened}명 검거
        </p>
        <div className="mt-[20px] flex h-[48px] items-center justify-center rounded-[12px] text-[16px] font-semibold text-white" style={{ backgroundColor: appColors.blue }}>
          홈으로
        </div>
      </div>
    </div>
  );
}

// 커뮤니티 네이티브 광고 자리. 실제 내용은 광고 네트워크가 정해서 모양만 보여 준다
function NativeAd() {
  return (
    <div className={`bg-white px-[16px] py-[14px] ${SPOT}`}>
      <span className="rounded-[4px] px-[6px] py-[2px] text-[11px] font-semibold" style={{ backgroundColor: appColors.black100, color: appColors.black600 }}>
        광고
      </span>
      <div className="mt-[10px] flex items-center gap-[12px]">
        <div className="h-[56px] w-[56px] shrink-0 rounded-[10px]" style={{ backgroundColor: appColors.black100 }} />
        <div className="min-w-0 flex-1 space-y-[8px]">
          <div className="h-[12px] w-3/4 rounded-full" style={{ backgroundColor: appColors.black100 }} />
          <div className="h-[12px] w-1/2 rounded-full" style={{ backgroundColor: appColors.black100 }} />
        </div>
      </div>
    </div>
  );
}

// game_page.dart: 먼저 다음 화면으로 넘어가고 그 위에 전면 광고가 뜬다. 닫으면 넘어간 화면이 보인다
function GameEndScene({ show }: { show: boolean }) {
  const [closed, setClosed] = useState(false);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Home />
      {show && !closed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ backgroundColor: appColors.black900 }}>
          <button
            type="button"
            aria-label="광고 닫기"
            onClick={() => setClosed(true)}
            className="absolute right-[20px] top-[20px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white/15 text-[20px] text-white"
          >
            ×
          </button>
          <div className="h-[280px] w-[300px] rounded-[16px] bg-white/10" />
          <p className="mt-[20px] text-[22px] font-bold text-white">전면 광고</p>
          <p className="mt-[8px] text-[15px] text-white/70">광고 내용은 광고마다 달라요</p>
        </div>
      )}
    </div>
  );
}
