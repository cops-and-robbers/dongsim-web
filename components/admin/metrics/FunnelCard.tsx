"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SectionCard } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Tooltip } from "@/components/admin/Tooltip";
import { CheckIcon, ChevronDownIcon } from "@/components/admin/icons";
import { useCompare } from "@/components/admin/metrics/compareContext";
import { UNKNOWN_COUNTRY, countryName } from "@/components/admin/metrics/countryName";
import { rangeLabel } from "@/lib/metrics/dashboard/calendar";
import { TEST_DEVICE_RULE } from "@/lib/metrics/testDevices";
import {
  FUNNEL_FROM,
  FUNNEL_STEPS,
  REPLAY,
  funnelByCountry,
  pickFunnel,
  weakestStep,
  type CountryPick,
  type FunnelData,
  type FunnelPlatform,
  type StepKey,
} from "@/lib/metrics/funnel";

/**
 * 신규 사용자 퍼널 (#157). 이 기간에 앱을 처음 연 사람이 7일 안에 어디까지 갔는지.
 *
 * 마케터가 묻는 것: 신규가 어디서 가장 많이 멈추나, 지난 기간보다 나아졌나, 나라나 플랫폼마다 다른가.
 * 개발자가 묻는 것: 그 단계가 어떤 앱 이벤트로 세지나(단계 이름 툴팁), 숫자가 언제까지 찬 것인가(아래 설명).
 *
 * 넣은 것과 이유
 * - 막대는 첫 실행 대비, 오른쪽 %는 바로 앞 단계 대비. 퍼널에서 묻는 "어디서 빠지나"는 앞 단계 대비라 글자로 크게 둔다
 * - 가장 많이 빠지는 단계는 % 의 색으로만 짚고, 그 숫자 툴팁에 한 줄로 밝힌다. 사람이 적으면(앞 단계 30명 미만) 짚지 않는다
 * - 다음 주에도 플레이는 셀 수 있는 날이 더 적어(둘째 주까지 지나야 한다) 막대 없이 따로 둔다. 분모가 달라서다
 * - 나라는 여러 개를 골라 합쳐 본다(분석 도구의 필터처럼 체크 목록). 처음엔 모든 나라라서 위 활성화율과 숫자가 같다.
 *   구글 플레이 자동 테스트 기기는 수집 때 뺐고(testDevices.ts), 그 기준을 아래 안내 툴팁으로 밝힌다
 * 뺀 것과 이유
 * - 닉네임 단계: 추천 닉네임을 그대로 쓰면 기록이 없다. 온보딩 완료는 로그인 수와 같아(이탈 0) 단계로 둘 이유가 없다
 * - 비교 기간의 증감 화살표: 단계마다 수십 명이라 화살표가 과장한다. 비교 기간 비율만 작게 적는다
 * - 가장 많이 빠지는 단계의 해석 문단: 원인을 짐작하는 문장이라 판단에 도움이 적었다(2026-10-06 사용자 피드백)
 * - 나라별 표: 나라 버튼과 같은 일을 하는 조작이 둘이 되고, 줄 대부분이 게임 0명인 테스트 기기 나라였다. 비교할 시장이
 *   하나뿐인 지금은 버튼 목록의 나라별 사람 수로 충분하다. 두 번째 시장이 커지면 퍼널 밖의 나라 비교 카드로 다시 만든다
 */

const MIN_SAMPLE = 30;

const PLATFORMS: { label: string; value: FunnelPlatform }[] = [
  { label: "전체", value: "all" },
  { label: "iOS", value: "iOS" },
  { label: "Android", value: "Android" },
];

/** 툴팁 문장용: "로그인한 91명 중 75명이 방에 들어갔어요" */
const WHO: Record<StepKey, string> = { open: "처음 연", login: "로그인한", room: "방에 들어간", play: "게임한" };
const DID: Record<StepKey, string> = { open: "처음 열었어요", login: "로그인했어요", room: "방에 들어갔어요", play: "게임을 했어요" };

const fmt = (n: number) => n.toLocaleString("ko-KR");
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "-");
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** 고른 나라를 짧게: "모든 나라", "한국, 일본", "한국, 일본 외 2곳" */
function selectionLabel(pick: CountryPick): string {
  if (pick === "all") return "모든 나라";
  if (pick.length === 0) return "고른 나라 없음";
  const names = pick.map(countryName);
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}곳`;
}

export function FunnelCard({ current, previous, rangeEnd }: { current: FunnelData; previous: FunnelData; rangeEnd: string }) {
  const cmp = useCompare();
  const [platform, setPlatform] = useState<FunnelPlatform>("all");
  const [pick, setPick] = useState<CountryPick>("all");
  const f = pickFunnel(current, { platform, countries: pick });
  const before = pickFunnel(previous, { platform, countries: pick });
  // 고를 수 있는 나라: 이 기간에 처음 연 사람이 있는 나라(플랫폼을 바꿔도 목록은 그대로) + 이미 고른 나라
  const byCountry = funnelByCountry(current, platform);
  const known = funnelByCountry(current, "all").map((x) => x.country);
  const choices = [...new Set([...known, ...(pick === "all" ? [] : pick)])];
  const openOf = new Map(byCountry.map((x) => [x.country, x.steps.open]));
  // 처음 연 사람이 많은 순. 국가 미상은 수가 커도 대부분 테스트 기기라 맨 아래에 둔다
  const ordered = [...choices].sort(
    (a, b) =>
      Number(a === UNKNOWN_COUNTRY) - Number(b === UNKNOWN_COUNTRY) ||
      (openOf.get(b) ?? 0) - (openOf.get(a) ?? 0) ||
      countryName(a).localeCompare(countryName(b), "ko"),
  );

  const open = f.steps[0].users;
  const weakest = weakestStep(f.steps, MIN_SAMPLE);
  const when = (r: { start: string; end: string }) => rangeLabel({ from: r.start, to: r.end }, rangeEnd);
  const where = selectionLabel(pick);
  const selected = pick === "all" ? choices : pick;
  // "모든 나라"에서 하나를 빼면 나머지를 고른 것이 되고, 다시 다 고르면 "모든 나라"로 돌아간다
  const toggle = (c: string) => {
    const next = selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c];
    setPick(sameSet(next, choices) ? "all" : next);
  };

  return (
    <SectionCard title="신규 사용자 퍼널">
      {/* 제목 줄에 두면 폰에서 넘친다. 본문 맨 위에 둔다 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CountryFilter
          options={ordered}
          counts={openOf}
          selected={selected}
          isAll={pick === "all"}
          label={where}
          onToggle={toggle}
          onSet={setPick}
        />
        <SegmentedControl options={PLATFORMS} value={platform} onChange={setPlatform} />
      </div>

      {!f.cohorts ? (
        <Empty>
          {rangeEnd < FUNNEL_FROM
            ? "6월 17일부터 볼 수 있어요. 그 전에는 로그인 기록이 없어 단계를 셀 수 없어요."
            : "이 기간에 처음 연 사람은 아직 7일이 안 지났어요. 처음 연 날부터 7일이 지나면 숫자가 들어와요. 기간을 4주로 늘리면 지난 날까지 볼 수 있어요."}
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {pick !== "all" && pick.length === 0 ? (
            <Empty>나라를 하나 이상 골라 주세요.</Empty>
          ) : open === 0 ? (
            <Empty>
              {when(f.cohorts)}에 {where}에서 처음 연 사람이 없어요.
            </Empty>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-sd-fg-muted">
                {when(f.cohorts)}에 {where}에서 앱을 처음 연 사람이 7일 안에 어디까지 갔는지예요. 막대는 첫 실행 대비, 오른쪽 숫자는 바로 앞 단계 대비예요.
              </p>

              <ol className="flex flex-col gap-4">
                {f.steps.map((s, i) => {
                  const def = FUNNEL_STEPS[i];
                  const prevStep = i > 0 ? f.steps[i - 1] : null;
                  const isWeak = s.key === weakest;
                  const b = before.steps[i];
                  const bBase = i > 0 ? before.steps[i - 1].users : 0;
                  const showBefore = cmp.on && i > 0 && before.cohorts && bBase >= MIN_SAMPLE;
                  return (
                    <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[132px_minmax(0,1fr)_64px_96px]">
                      <StepName name={def.label} means={def.means} events={def.events} />
                      <div className="order-last col-span-3 h-2.5 overflow-hidden rounded-full bg-sd-gray-200 sm:order-none sm:col-span-1" aria-hidden>
                        <div
                          className="h-full rounded-full bg-chart-1 transition-[width] duration-300"
                          style={{ width: `${Math.max(s.users > 0 ? 1.5 : 0, (s.users / open) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right text-[14px] font-semibold tabular-nums text-sd-fg">{fmt(s.users)}명</span>
                      <span className="flex flex-col items-end text-right">
                        {prevStep ? (
                          <Tooltip
                            content={`${WHO[prevStep.key]} ${fmt(prevStep.users)}명 중 ${fmt(s.users)}명이 ${DID[s.key]}. ${fmt(Math.max(0, prevStep.users - s.users))}명은 여기서 멈췄어요.${isWeak ? " 앞 단계 대비 가장 많이 빠지는 단계예요." : ""}`}
                            className={`inline-flex items-center gap-1.5 text-[15px] font-bold tabular-nums ${isWeak ? "text-sd-warning" : "text-sd-fg"}`}
                          >
                            {isWeak && <span className="h-1.5 w-1.5 rounded-full bg-sd-warning" aria-hidden />}
                            {pct(s.users, prevStep.users)}
                          </Tooltip>
                        ) : (
                          <span className="text-[12px] text-sd-fg-subtle">기준</span>
                        )}
                        {showBefore && (
                          <span className="text-[11px] text-sd-fg-subtle tabular-nums">
                            {cmp.word} {pct(b.users, bBase)}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* 분모가 다른 단계라 막대 없이 따로 둔다 */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 border-t border-dashed border-sd-line pt-4 sm:grid-cols-[132px_minmax(0,1fr)_64px_96px]">
                <StepName name={REPLAY.label} means="처음 연 날부터 8~14일째에 다시 게임을 한 사람. 둘째 주까지 다 지난 날만 세요." events={REPLAY.events} />
                {f.replay ? (
                  <>
                    <span className="order-last col-span-3 text-[12px] text-sd-fg-muted tabular-nums sm:order-none sm:col-span-1">
                      첫 주에 게임한 {fmt(f.replay.of)}명 중{f.replay.days.end < f.cohorts.end ? `, ${when(f.replay.days)}에 처음 연 사람만` : ""}
                    </span>
                    <span className="text-right text-[14px] font-semibold tabular-nums text-sd-fg">{fmt(f.replay.users)}명</span>
                    <span className="text-right text-[15px] font-bold tabular-nums text-sd-fg">{pct(f.replay.users, f.replay.of)}</span>
                  </>
                ) : (
                  <span className="col-span-2 text-right text-[12px] text-sd-fg-subtle sm:col-span-3 sm:text-left">둘째 주까지 지난 날이 아직 없어요</span>
                )}
              </div>

              <ul className="flex flex-col gap-1 text-[12px] leading-relaxed text-sd-fg-subtle">
                {open < MIN_SAMPLE && <li>처음 연 사람이 {MIN_SAMPLE}명보다 적어 비율이 크게 흔들려요. 가장 많이 빠지는 단계도 짚지 않았어요.</li>}
                {f.waiting && <li>{when(f.waiting)}에 처음 연 사람은 아직 7일이 안 지나서 넣지 않았어요.</li>}
                {pick === "all" && <li>모든 나라에서 처음 연 사람이라 위 활성화율과 같은 기준이에요. 나라는 위 나라 버튼에서 골라 볼 수 있어요.</li>}
                <li>
                  <Tooltip content={TEST_DEVICE_RULE} className="text-left underline decoration-sd-line decoration-dotted underline-offset-2">
                    구글 플레이 자동 테스트 기기로 보이는 기록은 뺐어요.
                  </Tooltip>
                </li>
                {weakest && <li>노란 숫자는 앞 단계 대비 가장 많이 빠지는 단계예요.</li>}
                {pick !== "all" && pick.includes(UNKNOWN_COUNTRY) && <li>국가 미상은 GA4 가 나라를 알아내지 못한 기록이에요.</li>}
              </ul>
            </>
          )}

        </div>
      )}
    </SectionCard>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] leading-relaxed text-sd-fg-subtle">{children}</p>;
}

/** 단계 이름. 툴팁에 무엇을 세는지와 GA4 이벤트 이름(개발자용)을 같이 둔다 */
function StepName({ name, means, events }: { name: string; means: string; events: readonly string[] }) {
  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-1">
          <span>{means}</span>
          <span className="text-sd-fg-muted">
            GA4 이벤트: <span className="font-mono text-[11px]">{events.join(", ")}</span>
          </span>
        </span>
      }
      className="justify-self-start text-left text-[13px] font-medium text-sd-fg underline decoration-sd-line decoration-dotted underline-offset-4"
    >
      {name}
    </Tooltip>
  );
}

/** 체크 표시 네모. 목록과 표가 같은 모양을 쓴다 */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? "border-accent bg-accent text-accent-fg" : "border-sd-line bg-sd-surface"
      }`}
      aria-hidden
    >
      {checked && <CheckIcon className="h-3 w-3" />}
    </span>
  );
}

/**
 * 나라 필터. 누르면 체크 목록이 열리고, 고르는 즉시 퍼널이 바뀐다(적용 버튼 없음).
 * 위에 빠른 선택(기본, 모두, 모두 빼기), 아래에 처음 연 사람이 많은 순서로 나라
 */
function CountryFilter({
  options,
  counts,
  selected,
  isAll,
  label,
  onToggle,
  onSet,
}: {
  options: string[];
  counts: Map<string, number>;
  selected: readonly string[];
  isAll: boolean;
  label: string;
  onToggle: (c: string) => void;
  onSet: (pick: CountryPick) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const koreaOnly = !isAll && sameSet(selected, ["KR"]);
  const quick = (text: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={active}
      className="rounded-lg px-2 py-1 text-[12px] font-semibold text-sd-fg-muted transition-colors hover:bg-sd-gray-200 disabled:text-sd-fg-subtle disabled:hover:bg-transparent"
    >
      {text}
    </button>
  );

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 max-w-[280px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
          open ? "bg-sd-gray-300 text-sd-fg" : "bg-sd-gray-200 text-sd-fg hover:bg-sd-gray-300"
        }`}
      >
        <span className="shrink-0 text-sd-fg-muted">나라</span>
        <span className="truncate">{label}</span>
        {!isAll && selected.length > 0 && <span className="shrink-0 rounded-md bg-sd-surface px-1.5 text-[11px] tabular-nums text-sd-fg-muted">{selected.length}</span>}
        <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-sd-fg-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-sd-line bg-sd-surface shadow-xl">
          <div className="flex items-center gap-1 border-b border-sd-hairline px-2 py-1.5">
            {quick("모든 나라", isAll, () => onSet("all"))}
            {quick("한국만", koreaOnly, () => onSet(["KR"]))}
            {quick("모두 빼기", !isAll && selected.length === 0, () => onSet([]))}
          </div>
          <ul role="listbox" aria-multiselectable="true" aria-label="볼 나라" className="max-h-[300px] overflow-y-auto p-1.5">
            {options.map((c) => {
              const on = selected.includes(c);
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => onToggle(c)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-sd-gray-200"
                  >
                    <Checkbox checked={on} />
                    <span className="min-w-0 flex-1 truncate text-sd-fg">
                      {countryName(c)}
                    </span>
                    <span className="shrink-0 tabular-nums text-sd-fg-subtle">{fmt(counts.get(c) ?? 0)}명</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-sd-hairline px-3 py-2 text-[11px] text-sd-fg-subtle">숫자는 이 기간에 그 나라에서 처음 연 사람이에요.</p>
        </div>
      )}
    </div>
  );
}
