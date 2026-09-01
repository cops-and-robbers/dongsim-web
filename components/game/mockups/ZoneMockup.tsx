"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW } from "./AppScreen";
import { FakeMap, ZoneCircle } from "./parts";
import { MOCKUP_TEXT } from "./text";

// 구역 그리기 - 플레이그라운드 설정 화면 (setup_playground_page.dart).
// 방 생성은 앱에서도 라이트 전용이라 테마와 무관하게 같은 모습이다.
//
// 실측값: 상단 진행 표시 1/3(파랑), 토글 350x40(black100 필, 선택 세그 흰 필),
// 설명 16px Medium 좌측 24. 지도 박스는 고정 360 이고 그 안에 좌하단 내 위치
// 버튼(40, 라운드 12), 우하단 반경 칩(110x40, 파랑). 슬라이더는 지도 아래
// 흰 배경 좌우 20 이다 (zone_setting_widget.dart).
export function ZoneMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[useLocale()].zone;

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      statusBar="#FFFFFF"
      className="bg-white"
    >
      {/* 상단 바: 뒤로 + 진행 표시 1/3 */}
      <div className="flex h-[56px] shrink-0 items-center gap-[12px] bg-white pl-[16px] pr-[20px]">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M15 5 L8 12 L15 19"
            stroke={appColors.black}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div className="flex flex-1 gap-[8px]">
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.blue }}
          />
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.black100 }}
          />
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.black100 }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="h-[20px] shrink-0" />

        {/* 거리/핀 토글 */}
        <div className="flex shrink-0 justify-center">
          <div
            className="flex h-[40px] w-[350px] items-center rounded-full p-[5px]"
            style={{ backgroundColor: appColors.black100 }}
          >
            <span
              className="flex h-full flex-1 items-center justify-center rounded-full bg-white text-[14px]"
              style={{ color: appColors.black800 }}
            >
              {t.toggleDistance}
            </span>
            <span
              className="flex h-full flex-1 items-center justify-center text-[14px]"
              style={{ color: appColors.black400 }}
            >
              {t.togglePin}
            </span>
          </div>
        </div>

        <div className="h-[20px] shrink-0" />
        <p
          className="shrink-0 px-[24px] text-[16px] font-medium"
          style={{ color: appColors.black }}
        >
          {t.desc}
        </p>
        <div className="h-[16px] shrink-0" />

        {/* 지도 박스: 고정 360 (mapHeight 기본값) */}
        <div className="relative h-[360px] w-full shrink-0 overflow-hidden">
          <FakeMap />
          <ZoneCircle size={300} />
          <span
            className="absolute left-1/2 top-1/2 size-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: appColors.blue }}
          />
          {/* 내 위치 버튼 40, 라운드 12, 좌하단 20/16 */}
          <span className="absolute bottom-[16px] left-[20px] flex size-[40px] items-center justify-center rounded-[12px] bg-white shadow-sm">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" fill={appColors.black400} />
              <circle
                cx="12"
                cy="12"
                r="7"
                fill="none"
                stroke={appColors.black400}
                strokeWidth="2"
              />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke={appColors.black400}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {/* 반경 칩 110x40 라운드 12, 우하단 20/16 (InfoRadiusChip 기본값) */}
          <div
            className="absolute bottom-[16px] right-[20px] flex h-[40px] w-[110px] items-center rounded-[12px] px-[14px]"
            style={{ backgroundColor: appColors.blue }}
          >
            <span className="text-[14px] text-white">{t.radiusPrefix}</span>
            <span className="ml-auto text-[16px] font-semibold text-white">
              {t.radiusValue}
            </span>
          </div>
        </div>

        <div className="h-[20px] shrink-0" />

        {/* 반경 슬라이더 (활성 blue800 · 비활성 blue100 · 썸 파랑) */}
        <div className="shrink-0 px-[20px]">
          <div className="relative h-[20px]">
            <span
              className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full"
              style={{ backgroundColor: appColors.blue100 }}
            />
            <span
              className="absolute left-0 top-1/2 h-[4px] w-[45%] -translate-y-1/2 rounded-full"
              style={{ backgroundColor: appColors.blue800 }}
            />
            <span
              className="absolute left-[45%] top-1/2 size-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: appColors.blue }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-white" />

        {/* 완료 버튼 (아래 34는 홈 인디케이터 영역) */}
        <div className="shrink-0 bg-white px-[20px] pb-[54px] pt-[20px]">
          <span
            className="flex h-[56px] items-center justify-center rounded-full text-[16px] font-semibold text-white"
            style={{ backgroundColor: appColors.blue }}
          >
            {t.button}
          </span>
        </div>
      </div>
    </AppScreen>
  );
}
