"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_APP_VERSION } from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";

// 크레딧 이스터에그 발동 조건 (my_page.dart 실측: 2초 안에 5탭)
const CREDITS_TAP_COUNT = 5;
const CREDITS_TAP_WINDOW_MS = 2000;
// 크레딧 화면의 밤 지도 색 - 앱 credits_page.dart의 _nightMap과 같다
const NIGHT_MAP = "#22262B";

// 마이페이지 (my_page.dart 실측). 프로필 아이콘 피커 + 계정·앱 설정·
// 이용 안내·기타 메뉴 + 공식 SNS. 아이콘을 고르면 홈 프로필도 바뀌고,
// 앱 버전을 다섯 번 누르면 크레딧이 열린다 - 앱과 같은 숨은 문이다 (#82).
export function DemoMyPage({
  profileIcon,
  onSelectIcon,
  onTask,
}: {
  profileIcon: 1 | 2;
  onSelectIcon: (id: 1 | 2) => void;
  onTask: (taskId: string) => void;
}) {
  const { app } = useDemoCopy();
  const [gamePush, setGamePush] = useState(true);
  const [communityPush, setCommunityPush] = useState(true);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  // 앱과 같은 규칙: 2초가 지나면 탭 수가 처음부터다
  const onVersionTap = () => {
    const now = Date.now();
    if (now - lastTap.current > CREDITS_TAP_WINDOW_MS) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= CREDITS_TAP_COUNT) {
      tapCount.current = 0;
      onTask("my-version");
      setCreditsOpen(true);
    }
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.white }}
    >
      {/* 상단 바 - 탭 루트라 뒤로가기 없이 가운데 제목 */}
      <div
        className="flex h-[56px] shrink-0 items-center justify-center"
        style={{ backgroundColor: appColors.white }}
      >
        <p className="text-[17px] font-semibold" style={{ color: appColors.black }}>
          {app.settingsTitle}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 프로필 아이콘 - 고르면 홈 프로필 카드도 같이 바뀐다 */}
        <SectionHeader>{app.profileIconLabel}</SectionHeader>
        <div className="flex gap-[12px] px-[24px] pt-[8px]">
          {([1, 2] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelectIcon(id);
                onTask("my-icon");
              }}
              className="rounded-full border-2 p-[4px] transition-transform active:scale-95"
              style={{
                borderColor: id === profileIcon ? appColors.blueVer2Basic : "transparent",
              }}
            >
              <Image src={`/app-icons/profile_${id}.svg`} alt="" width={48} height={48} />
            </button>
          ))}
        </div>
        <div className="h-[8px]" />

        <SectionDivider />
        <SectionHeader>{app.sectionAccount}</SectionHeader>
        <MenuRow icon="/demo/icon_nickname.svg" text={app.changeNickname} arrow />
        <ItemDivider />
        <MenuRow icon="/demo/icon_save_on.svg" iconSize={20} text={app.myScraps} arrow />
        <div className="h-[8px]" />

        <SectionDivider />
        <SectionHeader>{app.sectionApp}</SectionHeader>
        <SwitchRow
          icon="/demo/icon_game_notification.svg"
          text={app.gameNotification}
          subtitle={app.gameNotificationDesc}
          value={gamePush}
          onToggle={() => setGamePush((v) => !v)}
        />
        <ItemDivider />
        <SwitchRow
          icon="/demo/icon_noti.svg"
          text={app.communityNotification}
          subtitle={app.communityNotificationDesc}
          value={communityPush}
          onToggle={() => setCommunityPush((v) => !v)}
        />
        <ItemDivider />
        <MenuRow
          icon="/demo/icon_notification.svg"
          text={app.generalNotification}
          subtitle={
            <>
              <span className="font-semibold" style={{ color: appColors.black800 }}>
                {app.generalNotificationHighlight}
              </span>
              {app.generalNotificationDetail}
            </>
          }
        />
        <ItemDivider />
        <MenuRow icon="/demo/icon_language.svg" text={app.languageLabel} subtitle={app.languageSystem} />
        <ItemDivider />
        <MenuRow
          icon="/demo/icon_location_pin.svg"
          text={app.locationPermission}
          subtitle={app.locationPermissionDesc}
        />
        <div className="h-[4px]" />

        <SectionDivider />
        <SectionHeader>{app.sectionGuide}</SectionHeader>
        {/* 앱 버전 - 다섯 번 누르면 크레딧이 열린다 */}
        <button
          type="button"
          onClick={onVersionTap}
          className="flex w-full items-center justify-between px-[24px] py-[16px] text-left"
        >
          <span className="text-[16px]" style={{ color: appColors.black }}>
            {app.appVersionLabel}
          </span>
          <span className="text-[14px] font-semibold" style={{ color: appColors.black600 }}>
            v{DEMO_APP_VERSION}
          </span>
        </button>
        <ItemDivider />
        <MenuRow text={app.tutorialRewatch} />
        <ItemDivider />
        <MenuRow text={app.tutorialReset} />
        <ItemDivider />
        <MenuRow text={app.bugReport} />
        <ItemDivider />
        <MenuRow text={app.openSourceLicenses} />
        <ItemDivider />
        <MenuRow text={app.agreements} />
        <div className="h-[4px]" />

        <SectionDivider />
        <SectionHeader>{app.sectionEtc}</SectionHeader>
        <MenuRow text={app.logout} textColor={appColors.red} />
        <ItemDivider />
        <MenuRow text={app.deleteAccount} textColor={appColors.black600} />
        <div className="h-[8px]" />

        {/* 공식 SNS 채널 (sns_channel_row.dart: 슬레이트 원 44 + 글리프 22) */}
        <SectionDivider />
        <div className="px-[24px] py-[24px] text-center">
          <p className="text-[14px] font-semibold" style={{ color: appColors.black500 }}>
            {app.snsPrompt}
          </p>
          <div className="mt-[20px] flex items-center justify-center gap-[24px]">
            {["instagram_black", "youtube_black", "tiktok_black"].map((glyph) => (
              <span
                key={glyph}
                className="flex size-[44px] items-center justify-center rounded-full"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <Image src={`/demo/${glyph}.svg`} alt="" width={22} height={22} />
              </span>
            ))}
          </div>
        </div>
        <div className="h-[24px]" />
      </div>

      {/* 크레딧 - 앱과 같은 웹 정본(#82)을 그대로 연다. 밤 지도가 이어진다 */}
      {creditsOpen && (
        <div className="absolute inset-0 z-30 flex flex-col" style={{ backgroundColor: NIGHT_MAP }}>
          <div className="flex h-[56px] shrink-0 items-center pl-[8px]">
            <button
              type="button"
              onClick={() => setCreditsOpen(false)}
              className="flex size-[40px] items-center justify-center transition-transform active:scale-90"
            >
              <Image
                src="/demo/icon_previous.svg"
                alt=""
                width={24}
                height={24}
                className="brightness-0 invert"
              />
            </button>
          </div>
          <iframe
            src="/credits/embed"
            title=""
            className="min-h-0 w-full flex-1 border-0"
          />
        </div>
      )}
    </div>
  );
}

// 카테고리 헤더 (px24, 상24 하4, 14 semibold black600)
function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p
      className="px-[24px] pb-[4px] pt-[24px] text-[14px] font-semibold"
      style={{ color: appColors.black600 }}
    >
      {children}
    </p>
  );
}

// 카테고리 간 구분선 (h4, 화면 전체 너비, black100)
function SectionDivider() {
  return <div className="h-[4px] w-full" style={{ backgroundColor: appColors.black100 }} />;
}

// 항목 간 구분선 (h1, 좌우 20)
function ItemDivider() {
  return <div className="mx-[20px] h-px" style={{ backgroundColor: appColors.black100 }} />;
}

// 설정 메뉴 한 줄 (아이콘 슬롯 24 고정 + 주 16 + 보조 12). 데모에서는
// 구경만 하는 자리라 탭 동작이 없다 - 버전 행만 위에서 따로 만든다.
function MenuRow({
  icon,
  iconSize = 24,
  text,
  textColor,
  subtitle,
  arrow = false,
}: {
  icon?: string;
  iconSize?: number;
  text: string;
  textColor?: string;
  subtitle?: ReactNode;
  arrow?: boolean;
}) {
  return (
    <div className="flex items-center px-[24px] py-[16px]">
      {icon && (
        <span className="mr-[18px] flex size-[24px] shrink-0 items-center justify-center">
          <Image src={icon} alt="" width={iconSize} height={iconSize} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px]" style={{ color: textColor ?? appColors.black }}>
          {text}
        </span>
        {subtitle && (
          <span className="mt-[4px] block text-[12px]" style={{ color: appColors.black600 }}>
            {subtitle}
          </span>
        )}
      </span>
      {arrow && (
        <Image
          src="/demo/icon_next.svg"
          alt=""
          width={20}
          height={20}
          className="shrink-0 opacity-40"
        />
      )}
    </div>
  );
}

// 스위치 메뉴 한 줄 - 알림 두 개는 실제로 켜고 끌 수 있다
function SwitchRow({
  icon,
  text,
  subtitle,
  value,
  onToggle,
}: {
  icon: string;
  text: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center px-[24px] py-[16px]">
      <span className="mr-[18px] flex size-[24px] shrink-0 items-center justify-center">
        <Image src={icon} alt="" width={24} height={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px]" style={{ color: appColors.black }}>
          {text}
        </span>
        <span className="mt-[4px] block text-[12px]" style={{ color: appColors.black600 }}>
          {subtitle}
        </span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="relative ml-[8px] h-[26px] w-[44px] shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: value ? appColors.blueVer2Basic : appColors.black200 }}
      >
        <span
          className="absolute top-[3px] size-[20px] rounded-full bg-white transition-[left]"
          style={{ left: value ? 21 : 3 }}
        />
      </button>
    </div>
  );
}
