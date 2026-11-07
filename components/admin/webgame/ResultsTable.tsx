"use client";

import { Fragment, useState } from "react";
import { Table, Th, Td } from "@/components/admin/Table";
import { Pill } from "@/components/admin/StatusBadge";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Tooltip } from "@/components/admin/Tooltip";
import { ChevronDownIcon, InfoIcon } from "@/components/admin/icons";
import {
  RTT_BAD_MS,
  RTT_SLOW_MS,
  WINNER_LABEL,
  issuesOf,
  reasonLabel,
  rttOf,
  whenLabel,
  type WebgameResult,
} from "@/lib/admin/webgameMonitor";

// 최근 판 목록. 한 줄에 한 판, 문제는 색과 글자를 함께 둔 알약으로 보인다.
// 위에서 "살펴볼 판"만 거를 수 있고(맨 위 요약의 버튼도 이 거르기를 켠다), 처음엔 20판만 보이고 "더 보기"로 늘린다.
// 줄을 누르면 그 판의 사람별 왕복 시간과 서버 계산 간격이 펼쳐진다. 이름과 캐릭터 번호는 게임 서버가 남기지 않아 편만 보인다

export type ResultsFilter = "all" | "flagged";

const PAGE = 20;

const THEME_LABEL: Record<string, string> = {
  town: "동네",
  night: "밤 골목",
  park: "공원",
  city: "도심",
  snow: "눈 마을",
};
const TEAM_LABEL = { police: "경찰", robber: "도둑" } as const;

const CRITERIA =
  "한 사람이라도 왕복 시간의 95%가 0.25초 안에 들지 않으면 느림(노랑), 0.5초 안에 들지 않으면 아주 느림(빨강)이에요. 연결이 끊겼다가 다시 이어진 사람이 있거나, 서버 처리 사이 간격이 0.1초를 넘은 적이 있어도 살펴볼 판이에요.";

const ms = (v: number | null | undefined) => (v === null || v === undefined ? "-" : `${v}ms`);
const duration = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`);
const bots = (r: WebgameResult) => Math.max(0, r.police + r.robbers - r.humans);
/** 느린 값은 색과 굵기를 함께 바꾼다. 같은 줄의 "눈여겨볼 것" 글자가 뜻을 말한다 */
const rttTone = (v: number | null) =>
  v === null ? "" : v >= RTT_BAD_MS ? "font-semibold text-sd-critical" : v >= RTT_SLOW_MS ? "font-semibold text-sd-warning" : "";
const keyOf = (r: WebgameResult, idx: number) => `${r.at}-${idx}`;

export function ResultsTable({
  results,
  now,
  filter,
  onFilterChange,
}: {
  results: readonly WebgameResult[];
  now: number;
  filter: ResultsFilter;
  onFilterChange: (f: ResultsFilter) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const rows = results.map((r, idx) => ({ r, key: keyOf(r, idx), issues: issuesOf(r) }));
  const flaggedCount = rows.filter((x) => x.issues.length).length;
  const visible = filter === "flagged" ? rows.filter((x) => x.issues.length) : rows;
  const page = visible.slice(0, shown);
  const left = visible.length - page.length;
  const toggle = (key: string) => setOpen(open === key ? null : key);
  const changeFilter = (f: ResultsFilter) => {
    setShown(PAGE);
    onFilterChange(f);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sd-hairline px-5 py-3">
        <SegmentedControl
          options={[
            { label: `전체 ${rows.length}`, value: "all" },
            { label: `살펴볼 판 ${flaggedCount}`, value: "flagged" },
          ]}
          value={filter}
          onChange={changeFilter}
        />
        <Tooltip content={CRITERIA} className="inline-flex items-center gap-1 text-[12px] text-sd-fg-subtle">
          <InfoIcon className="h-3.5 w-3.5" />
          살펴볼 판 기준
        </Tooltip>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-sd-fg-subtle">살펴볼 판이 없어요</p>
      ) : (
        <>
          {/* 폰은 표가 옆으로 넘쳐 "눈여겨볼 것"이 화면 밖으로 밀린다. 판마다 세 줄(언제와 결과, 눈여겨볼 것, 인원과 왕복)로 보여 준다 */}
          <ul className="divide-y divide-sd-hairline md:hidden">
            {page.map(({ r, key, issues }) => {
              const { median, worst } = rttOf(r);
              const isOpen = open === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(key)}
                    className={`flex w-full items-start gap-3 px-5 py-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${isOpen ? "bg-sd-pressed" : "active:bg-sd-pressed"}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline gap-2 text-[14px]">
                        <span className="font-semibold text-sd-fg">{r.winner ? WINNER_LABEL[r.winner] : "승부 없음"}</span>
                        <span className="text-[12px] text-sd-fg-subtle">{reasonLabel(r.reason)}</span>
                        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-sd-fg-subtle">{whenLabel(r.at, now)}</span>
                      </div>
                      {issues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {issues.map((i) => (
                            <Pill key={i.kind} tone={i.tone}>
                              {i.text}
                            </Pill>
                          ))}
                        </div>
                      )}
                      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] tabular-nums text-sd-fg-muted">
                        <span>
                          경찰 {r.police}, 도둑 {r.robbers}
                          {bots(r) > 0 && <span className="text-sd-fg-subtle">(봇 {bots(r)})</span>}
                        </span>
                        <span>{duration(r.sec)}</span>
                        <span>
                          {median === null ? (
                            <span className="text-sd-fg-subtle">왕복 기록 전</span>
                          ) : (
                            <>
                              왕복 {ms(median)}
                              <span className="text-sd-fg-subtle">(95%는 </span>
                              <span className={rttTone(worst) || "text-sd-fg-subtle"}>{ms(worst)}</span>
                              <span className="text-sd-fg-subtle"> 안)</span>
                            </>
                          )}
                        </span>
                      </p>
                    </div>
                    <ChevronDownIcon className={`mt-1 h-4 w-4 shrink-0 text-sd-fg-subtle transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="bg-sd-fill px-5 py-4">
                      <Detail r={r} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <Table
              head={
                <>
                  <Th>끝난 시각</Th>
                  <Th>결과</Th>
                  <Th>인원</Th>
                  <Th>걸린 시간</Th>
                  <Th>왕복 시간</Th>
                  <Th>눈여겨볼 것</Th>
                  <Th className="w-10">
                    <span className="sr-only">자세히</span>
                  </Th>
                </>
              }
            >
              {page.map(({ r, key, issues }) => {
                const { median, worst } = rttOf(r);
                const isOpen = open === key;
                return (
                  <Fragment key={key}>
                    <tr onClick={() => toggle(key)} className={`cursor-pointer transition-colors hover:bg-sd-pressed ${isOpen ? "bg-sd-pressed" : ""}`}>
                      <Td className="whitespace-nowrap tabular-nums text-sd-fg-muted">{whenLabel(r.at, now)}</Td>
                      <Td className="whitespace-nowrap">
                        <span className="font-semibold text-sd-fg">{r.winner ? WINNER_LABEL[r.winner] : "승부 없음"}</span>
                        <span className="ml-1.5 text-[12px] text-sd-fg-subtle">{reasonLabel(r.reason)}</span>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        경찰 {r.police}, 도둑 {r.robbers}
                        {bots(r) > 0 && <span className="ml-1.5 text-[12px] text-sd-fg-subtle">봇 {bots(r)}</span>}
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">{duration(r.sec)}</Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {median === null ? (
                          <span className="text-sd-fg-subtle">기록 전</span>
                        ) : (
                          <>
                            {ms(median)}
                            <span className="ml-1.5 text-[12px] text-sd-fg-subtle">
                              95%는 <span className={rttTone(worst)}>{ms(worst)}</span> 안
                            </span>
                          </>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {issues.length ? (
                            issues.map((i) => (
                              <Pill key={i.kind} tone={i.tone}>
                                {i.text}
                              </Pill>
                            ))
                          ) : (
                            <span className="text-sd-fg-subtle">없음</span>
                          )}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "자세히 접기" : "자세히 보기"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(key);
                          }}
                          className="rounded-md p-1 text-sd-fg-subtle outline-none transition hover:bg-sd-selected focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="border-b border-sd-hairline bg-sd-fill px-5 py-4">
                          <Detail r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Table>
          </div>

          {left > 0 && (
            <div className="border-t border-sd-hairline px-5 py-3">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="w-full rounded-lg py-2 text-[13px] font-semibold text-sd-fg-muted outline-none transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-accent"
              >
                {Math.min(PAGE, left)}판 더 보기
                <span className="ml-1.5 font-normal text-sd-fg-subtle">{left}판 남음</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Detail({ r }: { r: WebgameResult }) {
  const facts = [
    ["지도", `${THEME_LABEL[r.theme] ?? r.theme}, 크기 ${r.scale}배`],
    ["체포", `${r.catches}번`],
    ["구출", `${r.rescues}번`],
    ["위치 공개", `${r.reveals}번`],
    ...(r.outReveals ? [["구역 밖 공개", `${r.outReveals}번`]] : []),
  ];
  return (
    <div className="space-y-4 text-[13px]">
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        {facts.map(([k, v]) => (
          <div key={k} className="flex gap-1.5">
            <dt className="text-sd-fg-subtle">{k}</dt>
            <dd className="font-medium tabular-nums text-sd-fg">{v}</dd>
          </div>
        ))}
      </dl>

      {r.net?.length ? (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-sd-fg-muted">사람별 왕복 시간</p>
          {/* 폰: 사람마다 한 줄. 편과 보통 값을 먼저, 95%와 가장 느릴 때를 그다음에 */}
          <ul className="space-y-1.5 sm:hidden">
            {r.net.map((n, i) => (
              <li key={i} className="rounded-lg bg-sd-surface px-3 py-2 tabular-nums">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sd-fg">{TEAM_LABEL[n.team]}</span>
                  <span className="text-sd-fg">보통 {ms(n.p50)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-sd-fg-subtle">
                  <span>
                    95%는 <span className={rttTone(n.p95)}>{ms(n.p95)}</span> 안
                  </span>
                  <span>
                    가장 느릴 때 <span className={rttTone(n.max)}>{ms(n.max)}</span>
                  </span>
                  <span>잰 횟수 {n.samples}번</span>
                  {n.rejoins > 0 && <span className="font-semibold text-sd-warning">다시 연결 {n.rejoins}번</span>}
                </div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full max-w-2xl text-left tabular-nums sm:table">
            <caption className="sr-only">사람별 왕복 시간</caption>
            <thead className="text-[12px] text-sd-fg-subtle">
              <tr>
                <th className="py-1 pr-4 font-medium">편</th>
                <th className="py-1 pr-4 text-right font-medium">보통</th>
                <th className="py-1 pr-4 text-right font-medium">95%는 이 안</th>
                <th className="py-1 pr-4 text-right font-medium">가장 느릴 때</th>
                <th className="py-1 pr-4 text-right font-medium">잰 횟수</th>
                <th className="py-1 text-right font-medium">다시 연결</th>
              </tr>
            </thead>
            <tbody className="text-sd-fg">
              {r.net.map((n, i) => (
                <tr key={i} className="border-t border-sd-hairline">
                  <td className="py-1.5 pr-4">{TEAM_LABEL[n.team]}</td>
                  <td className="py-1.5 pr-4 text-right">{ms(n.p50)}</td>
                  <td className={`py-1.5 pr-4 text-right ${rttTone(n.p95)}`}>{ms(n.p95)}</td>
                  <td className={`py-1.5 pr-4 text-right ${rttTone(n.max)}`}>{ms(n.max)}</td>
                  <td className="py-1.5 pr-4 text-right text-sd-fg-muted">{n.samples}</td>
                  <td className={`py-1.5 text-right ${n.rejoins ? "font-semibold text-sd-warning" : "text-sd-fg-subtle"}`}>{n.rejoins ? `${n.rejoins}번` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sd-fg-subtle">이 판은 네트워크를 기록하기 전에 끝났어요.</p>
      )}

      {r.tick && (
        <p className="text-sd-fg-muted">
          서버 처리 사이 간격이 0.1초를 넘은 건 {r.tick.ticks.toLocaleString()}번 중{" "}
          <span className={r.tick.lateTicks ? "font-semibold text-sd-fg" : ""}>{r.tick.lateTicks}번</span>이에요. 가장 길게 벌어진 건{" "}
          {(r.tick.maxGapMs / 1000).toFixed(2)}초예요.
        </p>
      )}
    </div>
  );
}
