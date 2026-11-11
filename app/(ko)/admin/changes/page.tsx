"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Callout } from "@/components/admin/Callout";
import { Dropdown } from "@/components/admin/Dropdown";
import { EmptyBlock, ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { ChangeCard } from "@/components/admin/changes/ChangeCard";
import { fetchChanges, type ChangesResult } from "@/lib/admin/changesClient";
import { AREA, filterChanges, groupByDay, isChangeArea, kstDay, type ChangeArea } from "@/lib/changes/model";
import { dayLabel } from "@/lib/metrics/dashboard/calendar";
import { addDays } from "@/lib/metrics/dates";

// 변경 기록 (#313, docs/admin-ui.md "변경 기록"). 누가 언제 어느 화면의 무엇을 바꿨나를 날짜별로 본다.
// 거르기(기간, 화면, 사람, 사용자에게 닿는 것만)는 주소(?days=, ?area=, ?who=, ?impact=1)에 남겨 링크로 같은 화면을 연다.

const PERIODS = [
  { label: "7일", value: "7" },
  { label: "30일", value: "30" },
  { label: "90일", value: "90" },
] as const;
type Period = (typeof PERIODS)[number]["value"];
const ALL = "";

export default function ChangesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const daysParam = params.get("days");
  const days: Period = PERIODS.some((p) => p.value === daysParam) ? (daysParam as Period) : "30";
  const areaParam = params.get("area");
  const area: ChangeArea | null = isChangeArea(areaParam) ? areaParam : null;
  const who = params.get("who") ?? "";
  const impactOnly = params.get("impact") === "1";

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const [result, setResult] = useState<{ days: Period; data?: ChangesResult; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchChanges(Number(days))
      .then((data) => alive && setResult({ days, data }))
      .catch((e: Error) => alive && setResult({ days, error: e.message }));
    return () => {
      alive = false;
    };
  }, [days, attempt]);

  const data = result?.data;
  const loading = !result || result.days !== days;
  const all = useMemo(() => data?.changes ?? [], [data]);
  const shown = useMemo(() => filterChanges(all, { area, actor: who || null, impactOnly }), [all, area, who, impactOnly]);
  const groups = useMemo(() => groupByDay(shown), [shown]);
  // 고를 수 있는 화면과 사람은 이 기간에 기록이 있는 것만. 없는 것을 골라 빈 화면을 보지 않게
  const areas = useMemo(() => [...new Set(all.map((c) => c.area))], [all]);
  const actors = useMemo(() => [...new Set(all.map((c) => c.actor))].sort((a, b) => a.localeCompare(b, "ko")), [all]);
  const impactCount = shown.filter((c) => c.impact).length;
  const today = kstDay(new Date().toISOString());
  const dayName = (d: string) => `${dayLabel(d, true)}${d === today ? " · 오늘" : d === addDays(today, -1) ? " · 어제" : ""}`;
  const filtered = Boolean(area || who || impactOnly);

  return (
    <ScrollPage>
      <PageHeader title="변경 기록" description="누가 언제 어느 화면에서 무엇을 바꿨는지 날짜별로 봐요. 바꾸기 전 값과 바꾼 값을 나란히 보여 줘요." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SegmentedControl<Period> options={[...PERIODS]} value={days} onChange={(v) => set({ days: v === "30" ? null : v })} />
        <Dropdown<string> value={area ?? ALL} onChange={(v) => set({ area: v || null })} options={[{ label: "모든 화면", value: ALL }, ...areas.map((a) => ({ label: AREA[a].label, value: a }))]} />
        <Dropdown<string> value={who} onChange={(v) => set({ who: v || null })} options={[{ label: "모든 사람", value: ALL }, ...actors.map((a) => ({ label: a, value: a }))]} />
        <button
          type="button"
          aria-pressed={impactOnly}
          onClick={() => set({ impact: impactOnly ? null : "1" })}
          className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition ${
            impactOnly ? "border-sd-warning bg-sd-warning-weak text-sd-fg" : "border-sd-line bg-sd-surface text-sd-fg-muted hover:text-sd-fg"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-sd-warning" aria-hidden />
          사용자에게 닿는 것만
        </button>
        {filtered && (
          <button type="button" onClick={() => set({ area: null, who: null, impact: null })} className="px-1 text-[13px] font-semibold text-sd-fg-subtle hover:text-sd-fg">
            거르기 풀기
          </button>
        )}
      </div>

      {result?.error && !loading ? (
        <ErrorBlock message={result.error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : !data ? (
        <div aria-busy className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-sd-gray-200" />
          <div className="h-28 rounded-2xl bg-sd-gray-200" />
          <div className="h-28 rounded-2xl bg-sd-gray-200" />
        </div>
      ) : (
        <div className={`flex flex-col gap-5 pb-10 transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
          {data.missing.length > 0 && (
            <Callout variant="warning" title="일부 기록을 읽지 못했어요">
              읽지 못한 기록: {data.missing.join(", ")}. 나머지만 보여 줘요.
            </Callout>
          )}
          <p className="text-[13px] text-sd-fg-muted tabular-nums">
            {PERIODS.find((p) => p.value === days)?.label} 동안 {shown.length}건{impactCount > 0 && `, 그중 사용자에게 닿는 변경 ${impactCount}건`}
          </p>
          {groups.length === 0 ? (
            <EmptyBlock title={filtered ? "고른 조건에 맞는 기록이 없어요" : "이 기간에 바꾼 것이 없어요"} />
          ) : (
            groups.map((g) => (
              <section key={g.day} aria-label={dayLabel(g.day, true)}>
                <h2 className="sticky top-0 z-20 -mx-1 mb-2 flex items-baseline gap-2 bg-sd-fill/95 px-1 py-1.5 backdrop-blur">
                  <span className="text-[15px] font-bold text-sd-fg">{dayName(g.day)}</span>
                  <span className="text-[12px] tabular-nums text-sd-fg-subtle">{g.items.length}건</span>
                </h2>
                <ol>
                  {g.items.map((c) => (
                    <ChangeCard key={c.id} c={c} />
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      )}
    </ScrollPage>
  );
}
