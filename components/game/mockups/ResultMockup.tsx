"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW } from "./AppScreen";
import { FakeMap } from "./parts";
import { MOCKUP_TEXT, type MockupText } from "./text";

// 게임 결과 카드 (game_over_result_dialog.dart 실측, 데모 DemoVictory 와 같은 그림).
// 팀 MVP 공개가 끝나면 지도 위에 이 카드가 뜬다. 카드 뒤에서 이긴 팀 캐릭터가
// 솟아 카드를 잡고, 날짜 · 내 이동 거리(MVP 면 왕관) · 이동 경로 지도 · 통계 3줄이 이어진다.
// 라이트 = 경찰 승리(흰 카드, 파랑) / 다크 = 도둑 승리(검정 카드, 초록, 도둑 테마).
// 두 진영이 같은 틀이다 - 이긴 팀의 MVP가 자기 기록을 보는 장면.

const RESULT = {
  police: { date: "2026.11.08 16:42", km: "1.24", stats: ["15:28", "4", "0"] },
  robber: { date: "2026.11.08 17:30", km: "2.05", stats: ["30:00", "2", "1"] },
} as const;

export function ResultCard({ team, t }: { team: "police" | "robber"; t: MockupText["result"] }) {
  const robber = team === "robber";
  const accent = robber ? appColors.green : appColors.blue;
  const data = RESULT[team];
  const labels = [t.playtime, t.arrestCount, t.remainingRobbers];

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <FakeMap night={robber} />
      <div className="fixed inset-0 flex items-center justify-center bg-black/50">
        <div className="relative mt-[40px] w-[340px]">
          {/* 캐릭터 몸통 - 카드 뒤에서 솟아 머리만 보인다 */}
          <div className="absolute inset-x-0 top-[-104px] flex justify-center overflow-hidden pb-[14px]">
            <Image
              src={`/characters/${team}-win-body.svg`}
              alt=""
              width={109}
              height={118}
              style={{ height: 118, width: "auto" }}
            />
          </div>

          <div
            className="relative rounded-[24px] px-[16px] pb-[20px] pt-[20px]"
            style={{ backgroundColor: robber ? appColors.black : appColors.white }}
          >
            <p
              className={`text-center text-[24px] font-bold leading-none ${robber ? "font-moneygraphy" : ""}`}
              style={{ color: accent }}
            >
              {t.win}
            </p>

            {/* 전체 / 개인 토글 - 전체가 선택된 상태 */}
            <div
              className="mt-[12px] flex h-[40px] rounded-full p-[5px]"
              style={{ backgroundColor: robber ? appColors.black800 : appColors.black100 }}
            >
              {[t.tabAll, t.tabMine].map((label, i) => (
                <span
                  key={label}
                  className="flex flex-1 items-center justify-center rounded-full text-[14px]"
                  style={{
                    backgroundColor:
                      i === 0 ? (robber ? appColors.black200 : appColors.white) : "transparent",
                    color:
                      i === 0
                        ? appColors.black800
                        : robber
                          ? appColors.black300
                          : appColors.black400,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-[12px] px-[8px]">
              <p
                className="px-[8px] text-[14px]"
                style={{ color: robber ? appColors.black200 : appColors.black600 }}
              >
                {data.date}
              </p>
              <div className="mt-[4px] flex items-end justify-between">
                <p className="leading-none">
                  <span className="text-[56px] font-semibold tracking-tight" style={{ color: accent }}>
                    {data.km}
                  </span>
                  <span className="ml-[6px] text-[24px] font-bold" style={{ color: accent }}>
                    Km
                  </span>
                </p>
                {/* 내가 MVP 면 거리 오른쪽에 왕관이 붙는다 */}
                <span className="flex flex-col items-center pr-[4px]">
                  <Image src="/demo/icon_crown.svg" alt="" width={52} height={52} />
                  <span
                    className="text-[12px] font-semibold leading-none"
                    style={{ color: robber ? appColors.white : appColors.black }}
                  >
                    {t.mvp}
                  </span>
                </span>
              </div>

              {/* 이동 경로 지도 (record_route_map.dart: 높이 172, radius 12) */}
              <div className="relative mt-[4px] h-[172px] overflow-hidden rounded-[12px]">
                <FakeMap night={robber} />
                <svg viewBox="0 0 288 172" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path
                    d={
                      robber
                        ? "M36 52 C78 40 96 96 130 104 S196 70 214 112 S246 150 256 138"
                        : "M40 140 C70 120 60 80 100 76 S160 96 186 74 S234 52 248 44"
                    }
                    fill="none"
                    stroke={accent}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={robber ? 36 : 40}
                    cy={robber ? 52 : 140}
                    r="6"
                    fill={accent}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={robber ? 256 : 248}
                    cy={robber ? 138 : 44}
                    r="6"
                    fill={appColors.red}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="mt-[16px] flex flex-col gap-[12px] px-[8px]">
                {labels.map((label, i) => (
                  <div key={label} className="flex items-center justify-between">
                    <span
                      className="text-[16px] font-medium"
                      style={{ color: robber ? appColors.white : appColors.black800 }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[18px] font-semibold"
                      style={{ color: robber ? appColors.white : appColors.black }}
                    >
                      {data.stats[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 팔 - 카드 맨 앞에서 카드를 잡는다 */}
          <Image
            src={`/characters/${team}-win-arm-left.svg`}
            alt=""
            width={30}
            height={24}
            className="absolute left-[90px] top-[-12px]"
          />
          <Image
            src={`/characters/${team}-win-arm-right.svg`}
            alt=""
            width={30}
            height={24}
            className="absolute right-[90px] top-[-12px]"
          />
        </div>
      </div>
    </div>
  );
}

export function ResultMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[useLocale()].result;

  return (
    <AppScreen playing={visible} scrollRef={ref} className="bg-slate-500 dark:bg-black">
      <div className="flex min-h-0 flex-1 flex-col dark:hidden">
        <ResultCard team="police" t={t} />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <ResultCard team="robber" t={t} />
      </div>
    </AppScreen>
  );
}
