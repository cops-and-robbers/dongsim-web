"use client";

import { useState } from "react";

// 최근 24시간 시간대별 판 수. 한 가지 값이라 한 색 세로 막대, 범례 없이 제목이 이름을 맡는다(dataviz 규칙).
// 막대는 바닥에 붙이고 위만 4px 둥글게, 막대 사이 2px 틈. 판이 없는 시간은 바닥 눈금만 남긴다.
// 판 수는 막대 위에 바로 적어 마우스를 올리지 않아도 읽힌다(중요한 값은 숨기지 않기). 올리면 그 시간도 함께 띄운다.
// 키보드로는 막대마다 초점이 가고, 화면 읽기에는 목록처럼 읽힌다. 24시간 내내 판이 없으면 막대 대신 그렇다고 적는다
const H = 132;
const LABEL = 18;

const hourLabel = (t: number) => {
  const h = new Date(t + 9 * 3_600_000).getUTCHours();
  return h === 0 ? "자정" : h === 12 ? "정오" : h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`;
};

export function HourBars({ bins }: { bins: readonly { start: number; games: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.games));
  const shown = hover === null ? null : bins[hover];
  if (!bins.some((b) => b.games)) {
    return <p className="py-10 text-center text-[13px] text-sd-fg-subtle">최근 24시간 동안 끝난 판이 없어요</p>;
  }
  return (
    <div>
      <div className="relative" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="최근 24시간 시간대별 판 수">
          {bins.map((b, i) => (
            <div
              key={b.start}
              role="listitem"
              tabIndex={0}
              aria-label={`${hourLabel(b.start)}, ${b.games}판`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {b.games > 0 && <span className="mb-1 text-[11px] font-semibold leading-none tabular-nums text-sd-fg-muted">{b.games}</span>}
              <div
                className={`w-full transition-colors ${b.games ? "rounded-t-[4px] bg-accent" : "h-[2px] bg-sd-gray-300"} ${
                  hover !== null && hover !== i && b.games ? "opacity-50" : ""
                }`}
                style={b.games ? { height: `${Math.max(6, (b.games / max) * (H - LABEL - 6))}px` } : undefined}
              />
            </div>
          ))}
        </div>
        {shown && (
          <div
            className={`pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-sd-line bg-sd-surface px-2.5 py-1.5 text-[12px] shadow-sm ${
              // 양 끝 막대에서는 말풍선이 카드 밖으로 나가지 않게 안쪽으로 붙인다
              hover! < 3 ? "" : hover! > bins.length - 4 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: `${((hover! < 3 ? hover! : hover! > bins.length - 4 ? hover! + 1 : hover! + 0.5) / bins.length) * 100}%` }}
          >
            <span className="font-medium text-sd-fg-subtle">{hourLabel(shown.start)}</span>
            <span className="ml-2 font-bold tabular-nums text-sd-fg">{shown.games}판</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-sd-fg-subtle">
        {bins
          .filter((_, i) => i % 6 === 0)
          .map((b) => (
            <span key={b.start}>{hourLabel(b.start)}</span>
          ))}
        <span>지금</span>
      </div>
    </div>
  );
}
