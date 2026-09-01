"use client";

import Image from "next/image";
import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { FakeMap } from "@/components/game/mockups/parts";
import { useDemoCopy } from "../demo-copy";

// 앱의 기록 날짜 형식 그대로 (record_format.dart: yyyy.MM.dd HH:mm)
function formatRecordDate(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// 게임 종료 결과 다이얼로그 (game_over_result_dialog.dart 실측).
// 인게임 지도 위에 딤이 깔리고, 카드 뒤에서 승리한 캐릭터가 솟아올라
// 팔로 카드를 잡는다. 카드 폭 320, 타이틀 + 날짜·거리·경로 지도 + 통계 3행 + 버튼 2개.
//
// [team] 이 진영 승리 화면을 정한다 - 경찰은 체포 승리(흰 카드·파랑),
// 도둑은 생존 승리(검정 카드·초록·Moneygraphy). 앱의 isDarkMode 분기 그대로다.
export function DemoVictory({
  team = "police",
  onReplay,
  onHome,
}: {
  team?: "police" | "robber";
  onReplay: () => void;
  onHome: () => void;
}) {
  const { app } = useDemoCopy();
  const robber = team === "robber";
  const accent = robber ? appColors.green : appColors.blue;
  // 통계 순서는 앱 시안 그대로: 진행 시간 → 체포 횟수 → 남은 도둑.
  // 도둑의 승리는 라운드를 다 버틴 것 - 각본에서 팀원 하나가 잡혔으므로
  // 체포 1, 남은 도둑은 나 하나다.
  const stats = robber
    ? [
        { label: app.playtime, value: "30:00" },
        { label: app.arrestCount, value: "1" },
        { label: app.remainingRobbers, value: "1" },
      ]
    : [
        { label: app.playtime, value: "15:28" },
        { label: app.arrestCount, value: "1" },
        { label: app.remainingRobbers, value: "0" },
      ];
  // 게임이 끝난 시점 = 이 화면이 뜬 시점
  const [endedAt] = useState(() => formatRecordDate(new Date()));

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* 게임이 끝난 지도 위에 그대로 뜨는 다이얼로그라 배경도 지도다 */}
      <FakeMap night={robber} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="relative mt-[28px] w-[320px]">
          {/* 캐릭터 몸통 - 카드 뒤에서 솟아올라 머리만 보인다 (높이 118, 겹침 14) */}
          <div className="absolute inset-x-0 top-[-104px] flex justify-center overflow-hidden pb-[14px]">
            <Image
              src={`/characters/${team}-win-body.svg`}
              alt=""
              width={109}
              height={118}
              className="demo-rise"
              style={{ height: 118, width: "auto" }}
            />
          </div>

          {/* 카드 본체 - 도둑은 다크 카드다 */}
          <div
            className="relative rounded-[24px] px-[16px] pb-[18px] pt-[20px]"
            style={{ backgroundColor: robber ? appColors.black : appColors.white }}
          >
            {/* 타이틀 + 우측 공유 아이콘 (아이콘은 자리만 지키는 장식) */}
            <div className="relative flex items-center justify-center">
              <p
                className={`text-[24px] font-bold leading-none ${robber ? "font-moneygraphy" : ""}`}
                style={{ color: accent }}
              >
                {app.win}
              </p>
              <Image
                src="/demo/icon_upload.svg"
                alt=""
                width={20}
                height={20}
                className={`absolute right-[12px] ${robber ? "brightness-0 invert" : ""}`}
              />
            </div>

            <div className="mt-[12px] px-[8px]">
              <p
                className="px-[8px] text-[14px]"
                style={{ color: robber ? appColors.black200 : appColors.black600 }}
              >
                {endedAt}
              </p>
              <p className="mt-[4px] leading-none">
                <span
                  className="text-[56px] font-semibold tracking-tight"
                  style={{ color: accent }}
                >
                  {robber ? "2.05" : "1.24"}
                </span>
                <span className="ml-[6px] text-[24px] font-bold" style={{ color: accent }}>
                  Km
                </span>
              </p>

              {/* 이동 경로 지도 (record_route_map.dart: 높이 172, radius 12) */}
              <div className="relative mt-[4px] h-[172px] overflow-hidden rounded-[12px]">
                <FakeMap night={robber} />
                <svg
                  viewBox="0 0 288 172"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path
                    d="M40 140 C70 120 60 80 100 76 S160 96 186 74 S234 52 248 44"
                    fill="none"
                    stroke={accent}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="40" cy="140" r="6" fill={accent} stroke="#fff" strokeWidth="2" />
                  <circle cx="248" cy="44" r="6" fill={appColors.red} stroke="#fff" strokeWidth="2" />
                </svg>
              </div>

              {/* 통계 3행 (진행 시간 → 체포 횟수 → 남은 도둑) */}
              <div className="mt-[16px] flex flex-col gap-[12px] px-[8px]">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span
                      className="text-[16px] font-medium"
                      style={{ color: robber ? appColors.black200 : appColors.black800 }}
                    >
                      {stat.label}
                    </span>
                    <span
                      className="text-[18px] font-semibold"
                      style={{ color: robber ? appColors.white : appColors.black }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-[20px] flex gap-[8px]">
              <button
                type="button"
                onClick={onHome}
                className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] text-[16px] font-semibold transition-transform active:scale-95"
                style={
                  robber
                    ? { backgroundColor: appColors.black800, color: appColors.black300 }
                    : { backgroundColor: appColors.black100, color: appColors.black600 }
                }
              >
                {app.goHome}
              </button>
              <button
                type="button"
                onClick={onReplay}
                className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] text-[16px] font-semibold transition-transform active:scale-95"
                style={
                  robber
                    ? { backgroundColor: appColors.green, color: appColors.black }
                    : { backgroundColor: appColors.blue, color: appColors.white }
                }
              >
                {app.playAgain}
              </button>
            </div>
          </div>

          {/* 팔 - 카드 맨 앞에서 카드를 잡는다 (30x24, 상단 -12, 좌우 80) */}
          <Image
            src={`/characters/${team}-win-arm-left.svg`}
            alt=""
            width={30}
            height={24}
            className="absolute left-[80px] top-[-12px]"
          />
          <Image
            src={`/characters/${team}-win-arm-right.svg`}
            alt=""
            width={30}
            height={24}
            className="absolute right-[80px] top-[-12px]"
          />
        </div>
      </div>
    </div>
  );
}
