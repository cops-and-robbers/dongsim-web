import { cityTimes, DAY_SHIFT_LABEL } from "@/lib/admin/worldClock";

// 고른 시각이 나라마다 몇 시인지 한 줄로 (docs/admin-ui.md "운영 화면 원칙").
// 서울은 기준이라 굵게, 사람들이 잘 시간인 도시는 흐리게 그린다. 시각만 보여 주고 판단은 사람이 한다.
export function WorldClock({ at, caption }: { at: number; caption?: string }) {
  const times = cityTimes(at);
  return (
    <div>
      {caption && <p className="mb-1.5 text-[12px] font-medium text-sd-fg-subtle">{caption}</p>}
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {times.map((city, i) => {
          const shift = DAY_SHIFT_LABEL[city.dayShift];
          return (
            <li
              key={city.id}
              className={`rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-sd-info-weak" : "bg-sd-fill"} ${city.night ? "opacity-60" : ""}`}
            >
              <span className={`block text-[11px] ${i === 0 ? "font-semibold text-sd-info" : "text-sd-fg-subtle"}`}>{city.label}</span>
              <span className="block text-[14px] font-semibold tabular-nums text-sd-fg">{city.time}</span>
              <span className="block h-4 text-[11px] text-sd-fg-subtle">
                {[shift, city.night ? "밤" : ""].filter(Boolean).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
