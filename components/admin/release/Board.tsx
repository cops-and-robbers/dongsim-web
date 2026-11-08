"use client";

import { useState, type ReactNode } from "react";
import { AlertIcon, AppStoreMark, CheckIcon, ClockIcon, DeviceIcon, ExternalLinkIcon, GooglePlayMark } from "@/components/admin/icons";
import { consoleLinks } from "@/lib/release/links";
import type { Option } from "@/lib/release/options";
import {
  PHASED_PERCENT,
  WHO_LABEL,
  langName,
  subj,
  type Action,
  type HistoryItem,
  type ReleaseBoard,
  type Platform,
  type PublishQueue,
  type Reach,
  type Rollout,
  type Step,
  type Tone,
  type Track,
} from "@/lib/release/board";
import { ago, kstDay, kstShort, since } from "@/lib/release/time";

// 출시 보드 화면 조각 (docs/admin-ui.md "출시").
// 두 스토어를 같은 크기의 카드 두 장으로 나란히 두되, 카드 안의 흐름은 스토어마다 고유하게 그린다.
// 색 원칙: 노랑은 "우리가 지금 할 수 있는 일"에만, 남(애플, 구글, 자동)을 기다리는 일은 파랑, 빨강은 반려와 읽기 실패만, 초록은 끝남.

const TONE: Record<Tone, { text: string; weak: string; solid: string; ring: string }> = {
  turn: { text: "text-sd-warning", weak: "bg-sd-warning-weak", solid: "bg-sd-warning", ring: "ring-sd-warning" },
  wait: { text: "text-sd-info", weak: "bg-sd-info-weak", solid: "bg-sd-info", ring: "ring-sd-info" },
  bad: { text: "text-sd-critical", weak: "bg-sd-critical-weak", solid: "bg-sd-critical", ring: "ring-sd-critical" },
  done: { text: "text-sd-positive", weak: "bg-sd-positive-weak", solid: "bg-sd-positive", ring: "ring-sd-positive" },
  idle: { text: "text-sd-fg-subtle", weak: "bg-sd-fill", solid: "bg-sd-gray-400", ring: "ring-sd-gray-400" },
};

export const STORE: Record<Platform, { name: string; os: string; console: string; Mark: (p: { className?: string }) => ReactNode }> = {
  ios: { name: "App Store", os: "iOS", console: "App Store Connect", Mark: AppStoreMark },
  android: { name: "Google Play", os: "Android", console: "Play Console", Mark: GooglePlayMark },
};

/** 스토어 콘솔로 나가는 링크. 새 탭으로 연다(보드를 열어 둔 채 콘솔에서 일하고 돌아온다) */
export function ConsoleLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        primary
          ? "inline-flex h-9 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-sd-inverted-bg px-3.5 text-[13.5px] font-semibold text-sd-inverted-fg transition hover:opacity-90 active:opacity-80"
          : "inline-flex flex-none items-center gap-1 text-[13px] font-semibold text-sd-fg-muted underline-offset-2 transition hover:text-sd-fg hover:underline"
      }
    >
      {children}
      <ExternalLinkIcon className={primary ? "size-[15px]" : "size-3.5"} />
    </a>
  );
}

/** 상태 알약. store 를 주면 스토어 마크와 이름을 붙인다(머리에서 두 스토어를 한 줄로 볼 때) */
export function StatusPill({ tone, label, store }: { tone: Tone; label: string; store?: Platform }) {
  const t = TONE[tone];
  const Mark = store ? STORE[store].Mark : null;
  return (
    <span className={`inline-flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${t.weak} ${tone === "idle" ? "text-sd-fg-muted" : t.text}`}>
      {Mark ? <Mark className="size-3.5" /> : <span aria-hidden className={`size-1.5 rounded-full ${t.solid}`} />}
      {store && <span className="text-sd-fg">{STORE[store].name}</span>}
      {label}
    </span>
  );
}

// ---------- 스토어 카드 ----------

/** 조작 버튼을 켤지와 누를 때 할 일. 화면(page.tsx)이 넘긴다 */
export type ActControl = { writable: boolean; readOnlyReason?: string; onPick: (o: Option) => void };

export function StoreCard({ track, reach, now, act }: { track: Track; reach: Reach; now: number; act: ActControl }) {
  const store = STORE[track.platform];
  return (
    <section aria-label={store.name} className="flex flex-col overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
      <header className="flex items-center gap-3 px-5 pb-1 pt-5">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-sd-fill text-sd-fg">
          <store.Mark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-tight text-sd-fg">{store.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-sd-fg-subtle">
            <DeviceIcon type={track.platform === "ios" ? "IOS" : "ANDROID"} className="size-3" />
            {store.os}
          </p>
        </div>
        {track.ok && <StatusPill tone={track.status.tone} label={track.status.label} />}
      </header>

      {!track.ok ? (
        <div className="m-5 mt-4 rounded-xl bg-sd-critical-weak px-4 py-3.5">
          <p className="text-[14px] font-semibold text-sd-critical">{store.os} 상태를 읽지 못했어요</p>
          <p className="mt-1 text-[13px] leading-relaxed text-sd-fg">{track.error}</p>
          <div className="mt-2.5">
            <ConsoleLink href={track.href}>{store.console} 열기</ConsoleLink>
          </div>
        </div>
      ) : (
        <>
          <Versions track={track} />
          {track.action ? <ActionBox action={track.action} options={track.options ?? []} act={act} /> : <Calm track={track} />}
          {track.staleSince && (
            <p className="mx-5 mt-2 text-[12px] text-sd-fg-subtle">
              심사 상태는 {ago(track.staleSince, now)}에 읽은 값이에요. 구글이 출시 목록을 자주 읽지 못하게 해서 몇 분마다 새로 읽어요.
            </p>
          )}
          <Flow track={track} reach={reach} now={now} />
          {track.platform === "android" && track.queue && <QueueBox queue={track.queue} />}
        </>
      )}
    </section>
  );
}

function Versions({ track }: { track: Extract<Track, { ok: true }> }) {
  const next = track.inflight;
  const live = track.live ? `${track.live.version}${track.live.build ? ` (${track.live.build})` : ""}` : "-";
  return (
    <div className="flex items-end justify-between gap-3 px-5 pt-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-sd-fg-subtle">{next ? "진행 중" : "지금 나가 있음"}</p>
        <p className="text-[28px] font-bold leading-tight tracking-tight text-sd-fg tabular-nums">
          {next ? next.version || `빌드 ${next.build}` : (track.live?.version ?? "-")}
        </p>
      </div>
      {next && track.live && track.live.version !== next.version && (
        <p className="pb-1.5 text-right text-[12.5px] leading-snug text-sd-fg-subtle">
          지금 나가 있음
          <br />
          <span className="font-semibold text-sd-fg-muted tabular-nums">{live}</span>
        </p>
      )}
    </div>
  );
}

/** 이 스토어에서 지금 할 수 있는 일(또는 기다리는 일) */
function ActionBox({ action, options, act }: { action: Action; options: Option[]; act: ActControl }) {
  const t = TONE[action.tone];
  const primary = options.filter((o) => o.primary);
  const rest = options.filter((o) => !o.primary);
  return (
    <div className={`mx-5 mt-4 rounded-xl px-4 py-3.5 ${t.weak}`}>
      <div className="flex gap-2.5">
        <span className={`mt-0.5 flex-none ${t.text}`}>
          {action.tone === "wait" ? <ClockIcon className="size-[18px]" /> : <AlertIcon className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-sd-fg [text-wrap:balance]">{action.title}</p>
          {action.reason && <p className="mt-1 text-[13px] leading-relaxed text-sd-fg-muted">{action.reason}</p>}
          {options.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {primary.map((o) => (
                <OptionButton key={o.id} option={o} act={act} primary />
              ))}
              {rest.map((o) => (
                <OptionButton key={o.id} option={o} act={act} />
              ))}
              {action.action && <ConsoleLink href={action.action.href}>{action.action.label}</ConsoleLink>}
            </div>
          ) : (
            action.action && (
              <div className="mt-3">
                <ConsoleLink href={action.action.href} primary>
                  {action.action.label}
                </ConsoleLink>
              </div>
            )
          )}
          {options.length > 0 && !act.writable && act.readOnlyReason && <p className="mt-2 text-[12px] text-sd-fg-subtle">{act.readOnlyReason}</p>}
        </div>
      </div>
    </div>
  );
}

/** 어드민에서 바로 하는 조작 버튼. 운영 배포이고 기록 표가 있을 때만 켜진다 */
function OptionButton({ option, act, primary = false }: { option: Option; act: ActControl; primary?: boolean }) {
  return (
    <button
      type="button"
      disabled={!act.writable}
      onClick={() => act.onPick(option)}
      className={`inline-flex h-9 flex-none items-center justify-center whitespace-nowrap rounded-[10px] px-3.5 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        primary ? "bg-sd-inverted-bg text-sd-inverted-fg hover:opacity-90 active:opacity-80" : "bg-sd-surface text-sd-fg ring-1 ring-inset ring-sd-line hover:bg-sd-fill"
      }`}
    >
      {option.label}
    </button>
  );
}

/** 할 일이 없을 때. 조용히 한 줄 */
function Calm({ track }: { track: Extract<Track, { ok: true }> }) {
  return (
    <p className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-sd-positive-weak px-4 py-3 text-[13.5px] font-medium text-sd-fg">
      <CheckIcon className="size-4 flex-none text-sd-positive" />
      {track.live ? `${subj(track.live.version)} 모두에게 나가 있어요. 다음 빌드를 기다리는 중이에요` : "아직 나간 버전이 없어요"}
    </p>
  );
}

// ---------- 흐름 ----------

function Node({ step, current }: { step: Step; current: boolean }) {
  const t = TONE[step.tone];
  if (step.tone === "done")
    return (
      <span className="relative z-[1] flex size-6 flex-none items-center justify-center rounded-full bg-sd-positive text-white">
        <CheckIcon className="size-3.5" />
      </span>
    );
  if (step.tone === "idle" && !current) return <span className="relative z-[1] size-6 flex-none rounded-full border-2 border-sd-gray-400 bg-sd-surface" />;
  return (
    <span className={`relative z-[1] flex size-6 flex-none items-center justify-center rounded-full bg-sd-surface ring-2 ring-inset ${t.ring} ${t.text}`}>
      {step.tone === "wait" ? (
        <span className={`size-2 animate-pulse rounded-full ${t.solid}`} />
      ) : step.tone === "idle" ? (
        <span className={`size-1.5 rounded-full ${t.solid}`} />
      ) : (
        <span className="text-[12px] font-bold leading-none">!</span>
      )}
    </span>
  );
}

/** 그 단계를 누가 하나. 우리만 진하게 */
function WhoChip({ step }: { step: Step }) {
  const us = step.who === "us";
  return (
    <span className={`inline-flex h-[18px] flex-none items-center rounded-[5px] px-1.5 text-[10.5px] font-semibold ${us ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg-subtle"}`}>
      {WHO_LABEL[step.who]}
    </span>
  );
}

function stepTime(s: Step, now: number): string | null {
  if (!s.at) return null;
  return s.atKind === "since" ? since(s.at, now) : `${kstShort(s.at)} · ${ago(s.at, now)}`;
}

function Flow({ track, reach, now }: { track: Extract<Track, { ok: true }>; reach: Reach; now: number }) {
  // 다 끝났으면 지나온 단계는 접어 둔다. 늘 보이는 일곱 줄의 체크는 읽을 거리가 아니다
  const allDone = track.status.tone === "done";
  const [open, setOpen] = useState(false);
  if (allDone && !open)
    return (
      <div className="px-5 pb-5 pt-2">
        {track.platform === "ios" && reach && <ReachChips reach={reach} />}
        <StoreNotes track={track} reach={reach} />
        <button type="button" onClick={() => setOpen(true)} className="mt-3 text-[13px] font-semibold text-sd-fg-muted underline-offset-2 transition hover:text-sd-fg hover:underline">
          지나온 단계 {track.steps.length}개 보기
        </button>
      </div>
    );
  return (
    <div className="px-5 pb-5 pt-5">
      <ol aria-label={`${STORE[track.platform].name} 출시 흐름`}>
        {track.steps.map((s, i) => {
          const current = i === track.current;
          const time = stepTime(s, now);
          const last = i === track.steps.length - 1;
          return (
            <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" aria-current={current ? "step" : undefined}>
              {!last && <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-24px)] w-[2px] ${s.tone === "done" ? "bg-sd-positive" : "bg-sd-gray-300"}`} />}
              <Node step={s} current={current} />
              <div className="min-w-0 flex-1 pt-[1px]">
                <div className="flex items-center gap-2">
                  <p className={`text-[13.5px] font-semibold ${s.tone === "idle" && !current ? "text-sd-fg-subtle" : "text-sd-fg"}`}>{s.label}</p>
                  <WhoChip step={s} />
                  {time && <span className="ml-auto flex-none text-[11.5px] tabular-nums text-sd-fg-subtle">{time}</span>}
                </div>
                {s.state ? (
                  <p className={`mt-0.5 text-[13px] font-medium ${s.tone === "done" ? "text-sd-fg-muted" : s.tone === "idle" ? "text-sd-fg-subtle" : TONE[s.tone].text}`}>{s.state}</p>
                ) : (
                  s.hint && <p className="mt-0.5 text-[12.5px] text-sd-fg-subtle">{s.hint}</p>
                )}
                {s.key === "rollout" && track.rollout && (track.platform === "ios" ? <PhasedBar rollout={track.rollout} /> : <PercentBar rollout={track.rollout} />)}
                {s.key === "reach" && reach && s.tone !== "idle" && <ReachChips reach={reach} />}
              </div>
            </li>
          );
        })}
      </ol>
      <StoreNotes track={track} reach={reach} />
    </div>
  );
}

/** 스토어마다 흐름 아래 붙는 한 줄(EU, Play 나라별) */
function StoreNotes({ track, reach }: { track: Extract<Track, { ok: true }>; reach: Reach }) {
  return (
    <>
      {track.platform === "ios" && reach?.euBlocked && (
        <p className="mt-4 flex gap-2 rounded-[10px] bg-sd-warning-weak px-3 py-2.5 text-[12.5px] leading-relaxed text-sd-fg">
          <AlertIcon className="mt-0.5 size-4 flex-none text-sd-warning" />
          <span>
            <b className="font-semibold">EU 에서는 앱이 보이지 않아요</b> (독일 App Store 조회 기준). EU 는 판매자(Trader) 신고가 끝나야 팔 수 있어요.
          </span>
        </p>
      )}
      {track.platform === "android" && <p className="mt-4 text-[12px] text-sd-fg-subtle">Play 는 나라별로 보이는 버전을 알려 주지 않아요.</p>}
    </>
  );
}

/** 애플 단계적 출시 7일. 자동 업데이트에만 적용된다 */
function PhasedBar({ rollout }: { rollout: Rollout }) {
  const day = rollout.day ?? 7;
  return (
    <div className="mt-2">
      <div className="grid grid-cols-7 gap-1">
        {PHASED_PERCENT.map((p, i) => (
          <div key={p} className="min-w-0">
            <div className={`h-1.5 rounded-full ${i < day ? (rollout.paused ? "bg-sd-warning" : rollout.percent >= 100 ? "bg-sd-positive" : "bg-sd-info") : "bg-sd-gray-300"}`} />
            <p className={`mt-1 text-center text-[10.5px] tabular-nums ${i === day - 1 ? "font-semibold text-sd-fg" : "text-sd-fg-subtle"}`}>{p}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Play 단계적 출시 비율. 우리가 정해 올린다 */
function PercentBar({ rollout }: { rollout: Rollout }) {
  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-sd-gray-300">
        <div
          className={`h-full rounded-full ${rollout.percent >= 100 ? "bg-sd-positive" : rollout.paused ? "bg-sd-warning" : "bg-sd-info"}`}
          style={{ width: `${Math.min(rollout.percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ReachChips({ reach }: { reach: NonNullable<Reach> }) {
  return (
    <ul className="mt-2 grid grid-cols-5 gap-1">
      {reach.countries.map((c) => {
        const ok = c.version === reach.target;
        return (
          <li key={c.code} className={`min-w-0 rounded-lg px-1.5 py-1.5 text-center ${ok ? "bg-sd-positive-weak" : "bg-sd-fill"}`}>
            <p className="text-[10.5px] text-sd-fg-subtle">{c.label}</p>
            <p className={`text-[12px] font-bold tabular-nums ${ok ? "text-sd-positive" : "text-sd-fg-muted"}`}>{c.version ?? "-"}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Play 관리형 게시 대기열. 승인됐지만 아직 안 나간 것들 */
function QueueBox({ queue }: { queue: PublishQueue }) {
  const items = [...(queue.release ? [queue.release] : []), ...queue.listing.map((l) => `스토어 정보: ${langName(l)} 앱 이름`)];
  return (
    <div className="mt-auto border-t border-sd-hairline bg-sd-basement/60 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-sd-fg">
          게시 대기열 <span className={`tabular-nums ${items.length ? "text-sd-warning" : "text-sd-fg-subtle"}`}>{items.length}</span>
        </p>
        <ConsoleLink href={consoleLinks().playPublishing}>게시 개요</ConsoleLink>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((it) => (
            <li key={it} className="flex items-center gap-2 text-[13px] text-sd-fg">
              <span aria-hidden className="size-1.5 flex-none rounded-full bg-sd-warning" />
              {it}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[12px] leading-relaxed text-sd-fg-subtle">
        {items.length ? "승인됐지만 아직 안 나간 변경이에요. 게시 개요에서 게시하면 나가요." : "관리형 게시라 승인된 변경은 여기 모였다가, 게시 개요에서 게시하면 나가요."}
        {queue.listing.length > 0 && " 스토어 정보는 앱 이름만 견줘요."}
      </p>
    </div>
  );
}

// ---------- 최근 출시, 공통 알림 ----------

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr className="text-left text-[12px] text-sd-fg-subtle">
          <th className="px-5 py-2.5 font-medium">버전</th>
          <th className="px-2 py-2.5 font-medium">
            <span className="inline-flex items-center gap-1">
              <AppStoreMark className="size-3.5" /> App Store
            </span>
          </th>
          <th className="px-5 py-2.5 font-medium">
            <span className="inline-flex items-center gap-1">
              <GooglePlayMark className="size-3.5" /> Google Play
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

/** 머리 아래 공통 알림(두 스토어 빌드 번호가 다름 등) */
export function Notes({ notes }: { notes: Action[] }) {
  if (!notes.length) return null;
  return (
    <ul className="space-y-1.5">
      {notes.map((n) => (
        <li key={n.title} className="rounded-xl bg-sd-fill px-4 py-2.5 text-[13px] text-sd-fg">
          <b className="font-semibold">{n.title}</b>
          {n.reason && <span className="text-sd-fg-muted"> {n.reason}</span>}
        </li>
      ))}
    </ul>
  );
}

const ACTION_NAME: Record<string, string> = {
  "ios.renameVersion": "버전 칸 이름 바꾸기",
  "ios.attachBuild": "빌드 붙이기",
  "ios.submit": "심사에 내기",
  "ios.cancelSubmission": "제출 취소",
  "ios.release": "출시",
  "ios.phasedPause": "단계적 출시 멈춤",
  "ios.phasedResume": "단계적 출시 이어 가기",
  "ios.phasedComplete": "바로 모두에게",
  "android.createRelease": "프로덕션 출시 만들고 심사에 내기",
  "android.rolloutSet": "비율 올리기",
  "android.halt": "단계적 출시 멈춤",
  "android.resume": "단계적 출시 이어 가기",
  "android.complete": "바로 모두에게",
};

/** 최근 출시 조작. 누가, 언제, 무엇을, 결과 */
export function ActionLogList({ items, now }: { items: NonNullable<ReleaseBoard["actions"]>; now: number }) {
  return (
    <ul className="divide-y divide-sd-hairline">
      {items.map((a) => {
        const Mark = a.platform === "ios" ? AppStoreMark : GooglePlayMark;
        const tone = a.status === "done" ? "text-sd-positive" : a.status === "failed" ? "text-sd-critical" : "text-sd-info";
        return (
          <li key={a.id} className="flex gap-3 px-5 py-3">
            <Mark className="mt-0.5 size-4 flex-none text-sd-fg-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-sd-fg">
                <b className="font-semibold">{ACTION_NAME[a.action] ?? a.action}</b> <span className="tabular-nums text-sd-fg-muted">{a.version}</span>{" "}
                <span className={`text-[12px] font-semibold ${tone}`}>{a.status === "done" ? "완료" : a.status === "failed" ? "실패" : "진행 중"}</span>
              </p>
              {a.message && <p className="mt-0.5 text-[12.5px] leading-relaxed text-sd-fg-subtle">{a.message}</p>}
            </div>
            <p className="flex-none text-right text-[12px] leading-snug text-sd-fg-subtle">
              {a.actor}
              <br />
              {ago(a.createdAt, now)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
