"use client";

import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, ClockIcon, DeviceIcon, ExternalLinkIcon, GlobeIcon } from "@/components/admin/icons";
import { STEP_LABELS, subj, topic, type Action, type HistoryItem, type Platform, type Reach, type Step, type Tone, type Track } from "@/lib/release/board";
import { consoleLinks } from "@/lib/release/links";
import { ago, kstDay, kstShort, since } from "@/lib/release/time";

// 출시 보드 화면 조각 (docs/admin-ui.md "출시").
// 색 원칙: 노랑은 "우리가 할 차례"에만, 기다리는 일은 파랑, 빨강은 반려와 읽기 실패만, 초록은 끝남.

const TONE: Record<Tone, { text: string; weak: string; solid: string; ring: string; label: string }> = {
  turn: { text: "text-sd-warning", weak: "bg-sd-warning-weak", solid: "bg-sd-warning", ring: "ring-sd-warning", label: "우리 차례" },
  wait: { text: "text-sd-info", weak: "bg-sd-info-weak", solid: "bg-sd-info", ring: "ring-sd-info", label: "기다리는 중" },
  bad: { text: "text-sd-critical", weak: "bg-sd-critical-weak", solid: "bg-sd-critical", ring: "ring-sd-critical", label: "확인 필요" },
  done: { text: "text-sd-positive", weak: "bg-sd-positive-weak", solid: "bg-sd-positive", ring: "ring-sd-positive", label: "할 일 없음" },
  idle: { text: "text-sd-fg-subtle", weak: "bg-sd-fill", solid: "bg-sd-gray-400", ring: "ring-sd-gray-400", label: "참고" },
};

export const PLATFORM_NAME: Record<Platform, string> = { ios: "iOS", android: "Android" };
const DEVICE: Record<Platform, string> = { ios: "IOS", android: "ANDROID" };

function ToneIcon({ tone, className }: { tone: Tone; className: string }) {
  if (tone === "done") return <CheckIcon className={className} />;
  if (tone === "wait") return <ClockIcon className={className} />;
  return <AlertIcon className={className} />;
}

/** 스토어 콘솔로 나가는 링크. 새 탭으로 연다 */
export function ConsoleLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        primary
          ? "inline-flex h-10 flex-none items-center justify-center gap-1.5 rounded-xl bg-sd-inverted-bg px-4 text-[14px] font-semibold text-sd-inverted-fg transition hover:opacity-90 active:opacity-80"
          : "inline-flex flex-none items-center gap-1 text-[13px] font-semibold text-sd-fg-muted underline-offset-2 transition hover:text-sd-fg hover:underline"
      }
    >
      {children}
      <ExternalLinkIcon className={primary ? "size-4" : "size-3.5"} />
    </a>
  );
}

// ---------- 다음 할 일 ----------

export function NextCard({ next, notes }: { next: Action; notes: Action[] }) {
  const t = TONE[next.tone];
  return (
    <section aria-labelledby="release-next" className="overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
      <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6 ${t.weak}`}>
        <span className={`flex size-11 flex-none items-center justify-center rounded-full bg-sd-surface ${t.text}`}>
          <ToneIcon tone={next.tone} className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${t.text}`}>
            다음 할 일 · {t.label}
            {next.platform && (
              <span className="inline-flex items-center gap-1 text-sd-fg-muted">
                · <DeviceIcon type={DEVICE[next.platform]} className="size-3.5" />
                {PLATFORM_NAME[next.platform]}
              </span>
            )}
          </p>
          <h2 id="release-next" className="mt-1 text-[19px] font-bold leading-snug tracking-tight text-sd-fg [text-wrap:balance] sm:text-[21px]">
            {next.title}
          </h2>
          {next.reason && <p className="mt-1.5 text-[14px] leading-relaxed text-sd-fg-muted">{next.reason}</p>}
        </div>
        {next.action && (
          <ConsoleLink href={next.action.href} primary>
            {next.action.label}
          </ConsoleLink>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="divide-y divide-sd-hairline border-t border-sd-hairline">
          {notes.map((n) => (
            <li key={n.title} className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <div className="flex min-w-0 flex-1 gap-2.5">
                <span aria-hidden className={`mt-[7px] size-2 flex-none rounded-full ${TONE[n.tone].solid}`} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-sd-fg">{n.title}</p>
                  {n.reason && <p className="mt-0.5 text-[13px] leading-relaxed text-sd-fg-subtle">{n.reason}</p>}
                </div>
              </div>
              {n.action && (
                <div className="pl-[18px] sm:pl-0">
                  <ConsoleLink href={n.action.href}>{n.action.label}</ConsoleLink>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- 진행 상황 ----------

function stepTime(s: Step, now: number): string | null {
  if (!s.at) return null;
  return s.atKind === "since" ? since(s.at, now) : `${kstShort(s.at)} · ${ago(s.at, now)}`;
}

function Node({ step, current }: { step: Step; current: boolean }) {
  const t = TONE[step.tone];
  if (step.tone === "done")
    return (
      <span className="relative z-[1] flex size-7 flex-none items-center justify-center rounded-full bg-sd-positive text-white">
        <CheckIcon className="size-4" />
      </span>
    );
  if (current || step.tone === "bad" || step.tone === "turn" || step.tone === "wait")
    return (
      <span className={`relative z-[1] flex size-7 flex-none items-center justify-center rounded-full bg-sd-surface ring-2 ring-inset ${t.ring} ${t.text}`}>
        {step.tone === "wait" ? (
          <span className={`size-2.5 animate-pulse rounded-full ${t.solid}`} />
        ) : step.tone === "idle" ? (
          <span className={`size-2 rounded-full ${t.solid}`} />
        ) : (
          <span className="text-[13px] font-bold leading-none">!</span>
        )}
      </span>
    );
  return <span className="relative z-[1] size-7 flex-none rounded-full border-2 border-sd-gray-400 bg-sd-surface" />;
}

/** 아직 오지 않은 단계의 "제출 전", "심사 전" 은 단계 이름과 같은 말이라 쓰지 않는다. 설명이 있는 것(나라별 확인 불가)만 */
const showState = (s: Step, current: boolean) => current || s.tone !== "idle" || !!s.detail;

function stateClass(step: Step, current: boolean) {
  if (step.tone === "done") return "text-sd-fg";
  if (step.tone === "idle") return current ? "text-sd-fg-muted" : "text-sd-fg-subtle";
  return TONE[step.tone].text;
}

/** 줄 머리 한 줄. 진행 중인 버전이 있거나 기다리는 단계가 있으면 "진행 중", 아니면 "출시 완료" */
function headline(track: Extract<Track, { ok: true }>): string {
  if (track.inflight && !track.inflight.version) return `빌드 ${track.inflight.build} 준비됨`;
  const v = track.inflight?.version || track.live?.version;
  if (!v) return "버전 없음";
  const busy = track.steps.some((s) => s.tone === "turn" || s.tone === "wait" || s.tone === "bad");
  return track.inflight || busy ? `${v} 진행 중` : `${v} 출시 완료`;
}

export function TrackRow({ track, now }: { track: Track; now: number }) {
  const name = PLATFORM_NAME[track.platform];
  const head = (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-lg bg-sd-fill text-sd-fg">
        <DeviceIcon type={DEVICE[track.platform]} className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-sd-fg">{name}</p>
        {track.ok && (
          <>
            <p className="text-[13px] font-medium text-sd-fg-muted">
              {headline(track)}
            </p>
            <p className="text-[12px] text-sd-fg-subtle">나가 있음 {track.live ? `${track.live.version}${track.live.build ? ` (${track.live.build})` : ""}` : "-"}</p>
            <div className="mt-1.5">
              <ConsoleLink href={track.steps[track.current]?.href ?? consoleLinks()[track.platform === "ios" ? "iosVersions" : "playPublishing"]}>
                {track.platform === "ios" ? "App Store Connect" : "Play Console"}
              </ConsoleLink>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!track.ok)
    return (
      <div className="flex flex-col gap-3 px-5 py-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="lg:w-44 lg:flex-none">{head}</div>
        <div className="flex flex-1 flex-col gap-2 rounded-xl bg-sd-critical-weak px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[13.5px] leading-relaxed text-sd-fg">
            <b className="font-semibold text-sd-critical">{name} 상태를 읽지 못했어요.</b> {track.error}
          </p>
          <ConsoleLink href={track.href}>{track.platform === "ios" ? "App Store Connect" : "Play Console"} 열기</ConsoleLink>
        </div>
      </div>
    );

  return (
    <div className="px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-44 lg:flex-none">{head}</div>

        {/* 넓은 화면: 가로 단계 */}
        <ol className="hidden flex-1 grid-cols-5 sm:grid" aria-label={`${name} 단계`}>
          {track.steps.map((s, i) => {
            const current = i === track.current;
            const time = stepTime(s, now);
            return (
              <li key={s.key} className="relative flex min-w-0 flex-col items-center px-1.5 text-center" aria-current={current ? "step" : undefined} title={s.detail}>
                {i < track.steps.length - 1 && <span aria-hidden className={`absolute left-1/2 top-[13px] h-[2px] w-full ${s.tone === "done" ? "bg-sd-positive" : "bg-sd-gray-300"}`} />}
                <Node step={s} current={current} />
                <p className="mt-2 text-[11.5px] font-medium text-sd-fg-subtle">{STEP_LABELS[s.key]}</p>
                {showState(s, current) && (
                  <p className={`mt-0.5 text-[13.5px] font-semibold leading-snug ${stateClass(s, current)}`} title={s.detail}>
                    {s.state}
                  </p>
                )}
                {time && <p className="mt-0.5 text-[11.5px] tabular-nums text-sd-fg-subtle">{time}</p>}
              </li>
            );
          })}
        </ol>

        {/* 폰: 세로 단계 */}
        <ol className="space-y-0 sm:hidden" aria-label={`${name} 단계`}>
          {track.steps.map((s, i) => {
            const current = i === track.current;
            const time = stepTime(s, now);
            return (
              <li key={s.key} className="relative flex gap-3 pb-3 last:pb-0" aria-current={current ? "step" : undefined}>
                {i < track.steps.length - 1 && <span aria-hidden className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-[2px] ${s.tone === "done" ? "bg-sd-positive" : "bg-sd-gray-300"}`} />}
                <Node step={s} current={current} />
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 pt-1">
                  <p className="min-w-0 text-[14px]">
                    <span className="text-sd-fg-subtle">{STEP_LABELS[s.key]}</span>{" "}
                    {showState(s, current) && <b className={`font-semibold ${stateClass(s, current)}`}>{s.state}</b>}
                  </p>
                  {time && <span className="flex-none text-[11.5px] tabular-nums text-sd-fg-subtle">{time}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

    </div>
  );
}

// ---------- 사용자에게 보이나 ----------

export function ReachCard({ reach, ios }: { reach: Reach; ios: Track }) {
  if (!reach)
    return <p className="px-5 py-5 text-[14px] text-sd-fg-subtle">App Store 공개 조회가 안 돼 나라별로 보지 못했어요. 잠시 뒤 다시 읽어 주세요.</p>;
  const live = ios.ok ? ios.live?.version : undefined;
  const target = reach.target;
  const fresh = reach.countries.filter((c) => c.version === target).length;
  const released = fresh > 0 || target === live;
  let headline: ReactNode;
  if (!target) headline = "iOS 상태를 못 읽어 견줄 버전이 없어요.";
  else if (fresh === reach.countries.length) headline = <><b className="font-semibold text-sd-positive">5개 나라 모두</b> {subj(target)} 보여요.</>;
  else if (released) headline = <><b className="font-semibold text-sd-info">{fresh}/{reach.countries.length}개 나라</b>에 {subj(target)} 보여요. 애플은 나라마다 반영에 최대 24시간이 걸려요.</>;
  else headline = <>지금은 나라마다 {subj(live ?? "이전 버전")} 보여요. {topic(target)} 출시한 뒤 여기서 나라별로 확인해요.</>;

  return (
    <div className="p-5">
      <p className="text-[14px] leading-relaxed text-sd-fg">{headline}</p>
      <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {reach.countries.map((c) => {
          const ok = c.version === target;
          return (
            <li key={c.code} className={`rounded-[10px] px-2.5 py-2 ${ok ? "bg-sd-positive-weak" : "bg-sd-fill"}`}>
              <p className="text-[11.5px] text-sd-fg-subtle">{c.label}</p>
              <p className={`mt-0.5 flex items-center gap-1 text-[14px] font-bold tabular-nums ${ok ? "text-sd-positive" : "text-sd-fg"}`}>
                {ok && <CheckIcon className="size-3.5 flex-none" />}
                {c.version ?? "안 보임"}
              </p>
            </li>
          );
        })}
      </ul>
      {reach.euBlocked && (
        <p className="mt-3 flex gap-2 rounded-[10px] bg-sd-warning-weak px-3 py-2.5 text-[13px] leading-relaxed text-sd-fg">
          <AlertIcon className="mt-0.5 size-4 flex-none text-sd-warning" />
          <span>
            <b className="font-semibold">EU 에서는 앱이 보이지 않아요</b> (독일 App Store 조회 기준). EU 는 판매자(Trader) 신고가 끝나야 팔 수 있어요.
          </span>
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-sd-fg-subtle">
        <GlobeIcon className="size-3.5" />
        애플 공개 조회 기준. Play 는 나라별로 보이는 버전을 알려 주지 않아요.
      </p>
    </div>
  );
}

// ---------- 최근 출시 ----------

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr className="text-left text-[12px] text-sd-fg-subtle">
          <th className="px-5 py-2.5 font-medium">버전</th>
          <th className="px-2 py-2.5 font-medium">
            <span className="inline-flex items-center gap-1">
              <DeviceIcon type="IOS" className="size-3.5" /> iOS
            </span>
          </th>
          <th className="px-5 py-2.5 font-medium">
            <span className="inline-flex items-center gap-1">
              <DeviceIcon type="ANDROID" className="size-3.5" /> Android
            </span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-sd-hairline border-t border-sd-hairline">
        {items.map((h) => (
          <tr key={h.version}>
            <td className="px-5 py-2.5 font-semibold tabular-nums text-sd-fg">{h.version}</td>
            <td className="px-2 py-2.5 text-sd-fg-muted">{h.ios ? kstDay(h.ios) : <span className="text-sd-fg-subtle">-</span>}</td>
            <td className="px-5 py-2.5 text-sd-fg-muted">{h.android ? kstDay(h.android) : <span className="text-sd-fg-subtle">-</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
