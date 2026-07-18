"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme, type Team } from "@/components/ThemeProvider";
import Modal from "@/components/ui/Modal";

type Outcome = "win" | "lose";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 제어된 결과(헌팅 성공/실패). 없으면 내부 토글로 미리보기. */
  outcome?: Outcome;
  /** 승/패 미리보기 토글 노출 여부(데모용). */
  showToggle?: boolean;
};

// 한 게임의 결과는 두 시나리오뿐이다.
// A) 전원 검거 - 남은 도둑 0명, 25분 조기 종료 → 경찰 승 · 도둑 패
// B) 도둑 생존 - 남은 도둑 2명, 30분 만료 → 경찰 패 · 도둑 승
const CAUGHT_ALL_STATS = [
  { label: "체포 횟수", value: "12회" },
  { label: "남은 도둑", value: "0명" },
  { label: "게임 진행 시간", value: "25분" },
];

const SURVIVED_STATS = [
  { label: "체포 횟수", value: "12회" },
  { label: "남은 도둑", value: "2명" },
  { label: "게임 진행 시간", value: "30분" },
];

export default function GameResultModal({
  open,
  onClose,
  outcome: controlledOutcome,
  showToggle = true,
}: Props) {
  const { team } = useTheme();
  const [outcome, setOutcome] = useState<Outcome>(controlledOutcome ?? "win");

  // 제어된 결과가 바뀌면 동기화(헌팅 성공/실패 반영).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (controlledOutcome) setOutcome(controlledOutcome);
  }, [controlledOutcome]);

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      labelledBy="result-title"
      contentClassName="relative w-full max-w-80"
    >
      <ResultModal
        team={team}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        showToggle={showToggle}
        onClose={onClose}
      />
    </Modal>
  );
}

// 캐릭터 파츠 규격(320px 모달 기준, 목업에서 실측). 몸통은 가로 중앙 정렬·바닥이
// 카드 상단과 살짝 겹치고, 승리 모달의 양손은 카드 상단 모서리에 −1/2로 걸친다.
const CHARACTER = {
  police: { bodyW: 180, bodyH: 140, overlap: 5, handW: 34, handH: 22, handX: 63 },
  robber: { bodyW: 160, bodyH: 100, overlap: 6, handW: 20, handH: 18, handX: 100 },
} as const;

function ResultModal({
  team,
  outcome,
  onOutcomeChange,
  showToggle,
  onClose,
}: {
  team: Team;
  outcome: Outcome;
  onOutcomeChange: (o: Outcome) => void;
  showToggle: boolean;
  onClose: () => void;
}) {
  const isRobber = team === "robber";
  const isWin = outcome === "win";
  const c = isRobber ? CHARACTER.robber : CHARACTER.police;

  // 경찰이 전원 검거하면 경찰 승 = 도둑 패(시나리오 A), 반대면 시나리오 B.
  const caughtAll = isWin !== isRobber;
  const stats = caughtAll ? CAUGHT_ALL_STATS : SURVIVED_STATS;
  const title = isWin ? "승리" : "패배";
  const titleColor = !isWin
    ? "text-brand-red"
    : isRobber
      ? "text-brand-green"
      : "text-brand-blue";

  const cardClass = isRobber
    ? "bg-app-black"
    : "bg-white ring-1 ring-slate-200";
  const dtClass = isRobber ? "text-[#93A2B3]" : "text-slate-400";
  const ddClass = isRobber ? "text-white" : "text-slate-900";

  const [leftBtn, rightBtn] = getButtons(isRobber, isWin);

  return (
    <>
      {/* 캐릭터 몸통 - 카드 뒤(z-0)에서 위로 빼꼼 */}
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-0"
          style={{ transform: `translate(-50%, ${c.overlap}px)` }}
        >
          <Image
            src={`/characters/${team}-${outcome}-body.svg`}
            alt=""
            width={c.bodyW}
            height={c.bodyH}
            unoptimized
            aria-hidden="true"
          />
        </div>

        <div
          className={`relative z-10 rounded-3xl px-3 pb-4 pt-6 shadow-2xl ${cardClass}`}
        >
          <h3
            id="result-title"
            className={`text-center text-2xl font-semibold ${titleColor}`}
          >
            {title}
          </h3>

          <dl className="mt-5 space-y-3 px-3 text-base">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <dt className={`font-medium ${dtClass}`}>{s.label}</dt>
                <dd
                  className={`font-mono font-semibold tabular-nums ${ddClass}`}
                >
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`h-12 flex-1 rounded-lg text-base font-semibold transition-opacity hover:opacity-90 ${leftBtn.className}`}
            >
              {leftBtn.label}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`h-12 flex-1 rounded-lg text-base font-semibold transition-opacity hover:opacity-90 ${rightBtn.className}`}
            >
              {rightBtn.label}
            </button>
          </div>
        </div>

        {/* 승리 모달의 양손 - 카드 상단 모서리에 걸침(z-20) */}
        {isWin && (
          <>
            <div
              className="pointer-events-none absolute top-0 z-20 -translate-y-1/2"
              style={{ left: c.handX }}
            >
              <Image
                src={`/characters/${team}-win-arm-left.svg`}
                alt=""
                width={c.handW}
                height={c.handH}
                unoptimized
                aria-hidden="true"
              />
            </div>
            <div
              className="pointer-events-none absolute top-0 z-20 -translate-y-1/2"
              style={{ right: c.handX }}
            >
              <Image
                src={`/characters/${team}-win-arm-right.svg`}
                alt=""
                width={c.handW}
                height={c.handH}
                unoptimized
                aria-hidden="true"
              />
            </div>
          </>
        )}

        {/* 데모 전용 - 승리/패배 미리보기 토글 */}
        {showToggle && (
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {(["win", "lose"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onOutcomeChange(o)}
                aria-pressed={outcome === o}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  outcome === o
                    ? "bg-white text-slate-900"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {o === "win" ? "승리" : "패배"}
              </button>
            ))}
          </div>
        )}
    </>
  );
}

function getButtons(isRobber: boolean, isWin: boolean) {
  if (isRobber) {
    return [
      { label: "홈으로", className: "bg-app-black-900 text-[#93A2B3]" },
      { label: "한 번 더", className: "bg-brand-green text-app-black" },
    ];
  }
  if (isWin) {
    return [
      { label: "한 번 더", className: "bg-[#edf0f2] text-slate-500" },
      { label: "홈으로", className: "bg-app-black text-white" },
    ];
  }
  return [
    { label: "홈으로", className: "bg-[#edf0f2] text-slate-500" },
    { label: "한 번 더", className: "bg-brand-blue text-white" },
  ];
}
