"use client";

import { MoonIcon, SunIcon } from "@/components/admin/icons/functional";
import { useUserCountries } from "@/lib/admin/userCountriesClient";
import { DAY_SHIFT_LABEL, DEFAULT_REGIONS, MAJOR_SHARE, localTime, overlapsActive, regionShares, type Region } from "@/lib/admin/worldClock";

// 고른 시각(at), 또는 구간(from ~ at)이 우리 사용자들에게 언제인지 (docs/admin-ui.md "나라별 시각").
// 결론 한 줄이 먼저 판단을 말하고, 아래 칸이 사용자가 많은 지역의 현지 시각을 해/달과 말(새벽, 낮)로 보여 준다.
// 주요 지역(5% 이상)의 노는 시간과 겹치면 그 칸을 노랗게 칠하고 결론에서 이름을 부른다.

const MAX_CHIPS = 6;

/** 받침이 있으면 "은", 없으면 "는" */
const topic = (word: string) => {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 ? "은" : "는";
};

type Chip = Region & { share?: number; busy: boolean };

export function WorldClock({ at, from }: { at: number; from?: number }) {
  const data = useUserCountries();
  const shares = data ? regionShares(data.countries) : [];
  const known = shares.length > 0;
  const range = from !== undefined && from < at ? from : undefined;

  // 작은 지역은 겹쳐도 칠하지 않는다. 결론 문장과 칸의 색이 같은 말을 하게
  // 불러오는 동안은 칠하지 않는다. 결론이 아직 없는데 칸만 노랗게 뜨지 않게
  const isBusy = (r: Region & { share?: number }) =>
    data !== undefined && (r.share === undefined || r.share >= MAJOR_SHARE) && overlapsActive(r.timeZone, at, range);
  const chips: Chip[] = (known ? shares.slice(0, MAX_CHIPS) : [...DEFAULT_REGIONS]).map((r) => ({ ...r, busy: isBusy(r) }));
  // 비율을 못 읽었으면 주요 지역 기준으로라도 판단한다
  const busy = chips.filter((r) => r.busy);
  const when = range !== undefined ? "점검하는 동안" : "이 시각에";

  return (
    <div>
      <p aria-live="polite" className="flex items-start gap-2 text-[14px] leading-relaxed text-sd-fg">
        <span aria-hidden className={`mt-[7px] size-2 flex-none rounded-full ${data === undefined ? "bg-sd-gray-400" : busy.length ? "bg-sd-warning" : "bg-sd-positive"}`} />
        {data === undefined ? (
          <span className="text-sd-fg-subtle">사용자가 많은 지역을 불러오는 중이에요.</span>
        ) : busy.length ? (
          <span>
            <b className="font-semibold">{busy.map((r) => r.label).join(", ")}</b>
            {topic(busy[busy.length - 1].label)} {when} 한창 노는 시간이라 쓰는 사람이 있을 수 있어요.
          </span>
        ) : (
          <span>{when} {known ? "사용자가 많은 지역은" : "주요 지역은"} 모두 쉬는 시간이에요.</span>
        )}
      </p>

      <ul className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {chips.map((r) => (
          <RegionChip key={r.id} region={r} at={at} />
        ))}
      </ul>

      <p className="mt-2 text-[11.5px] leading-relaxed text-sd-fg-subtle">
        {range !== undefined ? "끝나는 시각" : "고른 시각"} 기준 현지 시각
        {known ? " · 사용자가 많은 지역 순(최근 13주 새로 앱을 연 사람)" : data === null && " · 사용자 비율을 못 불러와 주요 지역만 보여요"}
      </p>
    </div>
  );
}

function RegionChip({ region, at }: { region: Chip; at: number }) {
  const t = localTime(at, region.timeZone);
  const shift = DAY_SHIFT_LABEL[t.dayShift];
  const Icon = t.awake ? SunIcon : MoonIcon;
  return (
    <li className={`min-w-0 rounded-[10px] px-2.5 py-2 ${region.busy ? "bg-sd-warning-weak" : "bg-sd-fill"}`}>
      <p className={`flex justify-between gap-2 text-[11.5px] ${region.busy ? "font-medium text-sd-warning" : "text-sd-fg-subtle"}`}>
        <span className="truncate">{region.label}</span>
        {region.share !== undefined && <span className="tabular-nums">{Math.max(1, Math.round(region.share * 100))}%</span>}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-bold tabular-nums text-sd-fg">
        <Icon className={`size-3.5 flex-none ${t.awake ? "text-sd-warning" : "text-sd-fg-subtle"}`} />
        <span className="truncate">{t.label}</span>
        {shift && <span className="flex-none text-[11px] font-medium text-sd-fg-subtle">{shift}</span>}
      </p>
      <span className="sr-only">{region.busy ? "한창 노는 시간" : t.awake ? "깨어 있는 시간" : "자는 시간"}</span>
    </li>
  );
}
