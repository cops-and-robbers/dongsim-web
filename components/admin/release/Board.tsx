"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { AlertIcon, AppStoreMark, ArrowRightIcon, CheckIcon, ChevronDownIcon, ClockIcon, DeviceIcon, ExternalLinkIcon, GooglePlayMark } from "@/components/admin/icons";
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
// 색은 적게 쓴다. 우리가 할 수 있는 일은 브랜드색, 기다리는 일과 끝난 일은 무채색에 가깝게, 빨강은 반려와 실패만. 할 수 있는 일은 경고가 아니라서 노랑과 경고 아이콘을 쓰지 않는다.

const TONE: Record<Tone, { text: string; weak: string; solid: string; ring: string }> = {
  turn: { text: "text-accent", weak: "bg-accent-weak", solid: "bg-accent", ring: "ring-accent" },
  wait: { text: "text-sd-fg-muted", weak: "bg-sd-fill", solid: "bg-sd-fg-subtle", ring: "ring-sd-gray-400" },
  bad: { text: "text-sd-critical", weak: "bg-sd-critical-weak", solid: "bg-sd-critical", ring: "ring-sd-critical" },
  done: { text: "text-sd-positive", weak: "bg-sd-positive-weak", solid: "bg-sd-positive", ring: "ring-sd-positive" },
  idle: { text: "text-sd-fg-subtle", weak: "bg-sd-fill", solid: "bg-sd-gray-400", ring: "ring-sd-gray-400" },
};

export const STORE: Record<Platform, { name: string; os: string; console: string; Mark: (p: { className?: string }) => ReactNode; markSize: string }> = {
  // App Store 로고는 그 자체가 타일이라 칸을 채우고, Google Play 로고는 칸 안에 놓는다
  ios: { name: "App Store", os: "iOS", console: "App Store Connect", Mark: AppStoreMark, markSize: "size-10" },
  android: { name: "Google Play", os: "Android", console: "Play Console", Mark: GooglePlayMark, markSize: "size-5" },
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

/** 상태 알약 */
export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const t = TONE[tone];
  return (
    <span className={`inline-flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${t.weak} ${tone === "idle" ? "text-sd-fg-muted" : t.text}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${t.solid}`} />
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
    <section aria-label={store.name} className="flex w-full flex-col overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
      <header className="flex items-center gap-3 px-5 pb-1 pt-5">
        <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-xl bg-sd-fill">
          <store.Mark className={store.markSize} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-tight text-sd-fg">{store.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-sd-fg-subtle">
            <DeviceIcon type={track.platform === "ios" ? "IOS" : "ANDROID"} className="size-3" />
            {store.os}
          </p>
        </div>
        {track.ok && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={track.status.label} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.18 }}>
              <StatusPill tone={track.status.tone} label={track.status.label} />
            </motion.span>
          </AnimatePresence>
        )}
      </header>

      {!track.ok ? (
        <div className="m-5 mt-4 rounded-xl bg-sd-fill px-4 py-3.5">
          <p className="text-[14px] leading-relaxed text-sd-fg">{track.error}</p>
          <div className="mt-2.5">
            <ConsoleLink href={track.href}>{store.console} 열기</ConsoleLink>
          </div>
        </div>
      ) : (
        <>
          <Versions track={track} />
          {track.action ? <ActionBox action={track.action} options={track.options ?? []} act={act} /> : <Calm track={track} />}
          <Flow track={track} reach={reach} now={now} />
          {track.platform === "android" && track.queue && <QueueBox queue={track.queue} />}
        </>
      )}
    </section>
  );
}

function Versions({ track }: { track: Extract<Track, { ok: true }> }) {
  const next = track.inflight;
  const live = track.live?.version ?? "-";
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
  // 반려됐을 때는 사유부터 봐야 하니 콘솔 바로가기를 앞세우고, 다시 내기는 뒤로 둔다
  const rejected = action.tone === "bad";
  const primary = rejected ? [] : options.filter((o) => o.primary);
  const rest = rejected ? options : options.filter((o) => !o.primary);
  const lead = primary[0];
  return (
    <div className={`mx-5 mt-4 rounded-xl px-4 py-3.5 ${t.weak}`}>
      <div className="flex gap-2.5">
        <span className={`mt-0.5 flex-none ${t.text}`}>
          {action.tone === "wait" ? <ClockIcon className="size-[18px]" /> : action.tone === "bad" ? <AlertIcon className="size-[18px]" /> : <ArrowRightIcon className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-sd-fg [text-wrap:balance]">{action.title}</p>
          {action.reason && <p className="mt-1 text-[13px] leading-relaxed text-sd-fg-muted">{action.reason}</p>}
          {action.why && <Why text={action.why} />}
          {options.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {rejected && action.action && (
                  <ConsoleLink href={action.action.href} primary>
                    {action.action.label}
                  </ConsoleLink>
                )}
                {primary.map((o) => (
                  <OptionButton key={o.id} option={o} act={act} primary />
                ))}
                {rest.map((o) => (
                  <OptionButton key={o.id} option={o} act={act} />
                ))}
                {!rejected && action.action && <ConsoleLink href={action.action.href}>{action.action.label}</ConsoleLink>}
              </div>
              {lead && act.writable && <Assure option={lead} />}
            </>
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

/** "왜 그런가요?" 펼쳐 보는 설명. 처음엔 접어 두어 할 일 상자를 짧게 둔다 */
function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-sd-fg-muted transition hover:text-sd-fg">
        왜 그런가요?
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="inline-flex">
          <ChevronDownIcon className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 36 }} className="overflow-hidden">
            <ul className="mt-1.5 space-y-1 rounded-lg bg-sd-surface/70 px-3 py-2.5 text-[12.5px] leading-relaxed text-sd-fg-muted">
              {text.split("\n").map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="mt-[7px] size-1 flex-none rounded-full bg-sd-gray-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 버튼 아래 안심 한 줄. 누르면 바로 바뀌지 않고 확인창이 먼저 뜬다는 것까지 */
function Assure({ option }: { option: Option }) {
  const items = [
    option.reachesUsers ? "사용자에게 영향이 가요" : "사용자 영향 없음",
    option.undoable ? "되돌릴 수 있어요" : "되돌릴 수 없어요",
    option.level === 2 ? "확인창에서 번호 입력 뒤 진행" : "누르면 확인창이 먼저 떠요",
  ];
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-sd-fg-subtle">
      {!option.reachesUsers && option.undoable && <CheckIcon className="size-3.5 text-sd-positive" />}
      {items.map((it, i) => (
        <span key={it} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          {it}
        </span>
      ))}
    </p>
  );
}

/**
 * 어드민에서 바로 하는 조작 버튼. 운영 배포이고 기록 표가 있을 때만 켜진다.
 * 무게를 색으로 나눈다: 사용자에게 영향이 없는 조작은 부드러운 파랑, 영향이 가는 조작(출시, 바로 모두에게)은 진한 버튼
 */
function OptionButton({ option, act, primary = false }: { option: Option; act: ActControl; primary?: boolean }) {
  const style = !primary
    ? "bg-sd-surface text-sd-fg ring-1 ring-inset ring-sd-line hover:bg-sd-fill"
    : option.reachesUsers
      ? "bg-sd-inverted-bg text-sd-inverted-fg hover:opacity-90 active:opacity-80"
      : "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-pressed";
  return (
    <button
      type="button"
      disabled={!act.writable}
      onClick={() => act.onPick(option)}
      className={`inline-flex h-9 flex-none items-center justify-center whitespace-nowrap rounded-[10px] px-3.5 text-[13.5px] font-semibold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${style}`}
    >
      {option.label}
    </button>
  );
}

/** 할 일이 없을 때. 조용히 한 줄 */
function Calm({ track }: { track: Extract<Track, { ok: true }> }) {
  return (
    <p className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-sd-fill px-4 py-3 text-[13.5px] font-medium text-sd-fg">
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
      <span className="relative z-[1] flex size-6 flex-none items-center justify-center rounded-full bg-sd-positive text-white transition-colors duration-300">
        <CheckIcon className="size-3.5" />
      </span>
    );
  if (step.tone === "idle" && !current) return <span className="relative z-[1] size-6 flex-none rounded-full border-2 border-sd-gray-400 bg-sd-surface" />;
  return (
    <span className={`relative z-[1] flex size-6 flex-none items-center justify-center rounded-full bg-sd-surface ring-2 ring-inset ${t.ring} ${t.text}`}>
      {step.tone === "bad" ? (
        <span className="text-[12px] font-bold leading-none">!</span>
      ) : (
        <span className={`size-2 rounded-full ${t.solid} ${step.tone === "wait" ? "animate-pulse" : ""}`} />
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
  if (s.atKind === "checked") return `${ago(s.at, now)} 확인`;
  // 정확한 시각은 올렸을 때(title)만. 늘 보이는 숫자를 줄인다
  return s.atKind === "since" ? since(s.at, now) : ago(s.at, now);
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
    <motion.div className="px-5 pb-5 pt-5" initial={allDone ? { opacity: 0, height: 0 } : false} animate={{ opacity: 1, height: "auto" }} transition={{ type: "spring", stiffness: 380, damping: 36 }}>
      <ol aria-label={`${STORE[track.platform].name} 출시 흐름`}>
        {track.steps.map((s, i) => {
          const current = i === track.current;
          const time = stepTime(s, now);
          const last = i === track.steps.length - 1;
          return (
            <li key={s.key} className="relative flex gap-3 pb-3.5 last:pb-0" aria-current={current ? "step" : undefined}>
              {!last && <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-24px)] w-[2px] transition-colors duration-500 ${s.tone === "done" ? "bg-sd-positive" : "bg-sd-gray-300"}`} />}
              <Node step={s} current={current} />
              <div className="min-w-0 flex-1 pt-[1px]">
                <div className="flex items-center gap-2">
                  <p className={`text-[13.5px] font-semibold ${s.tone === "idle" && !current ? "text-sd-fg-subtle" : "text-sd-fg"}`}>{s.label}</p>
                  {s.tone !== "done" && <WhoChip step={s} />}
                  {time && (
                    <span className="ml-auto flex-none text-[11.5px] tabular-nums text-sd-fg-subtle" title={s.at ? kstShort(s.at) : undefined}>
                      {time}
                    </span>
                  )}
                </div>
                {s.state ? (
                  <p className={`mt-0.5 text-[13px] font-medium ${s.tone === "done" ? "text-sd-fg-muted" : s.tone === "idle" ? "text-sd-fg-subtle" : TONE[s.tone].text}`}>{s.state}</p>
                ) : (
                  s.hint && i <= track.current + 1 && <p className="mt-0.5 text-[12.5px] text-sd-fg-subtle">{s.hint}</p>
                )}
                {s.key === "rollout" && track.rollout && (track.platform === "ios" ? <PhasedBar rollout={track.rollout} /> : <PercentBar rollout={track.rollout} />)}
                {s.key === "reach" && reach && s.tone !== "idle" && <ReachChips reach={reach} />}
              </div>
            </li>
          );
        })}
      </ol>
      <StoreNotes track={track} reach={reach} />
    </motion.div>
  );
}

/** App Store 카드 끝의 안내. 늘 보이는 사실이라 눈에 띄는 색을 쓰지 않는다 */
function StoreNotes({ track, reach }: { track: Extract<Track, { ok: true }>; reach: Reach }) {
  if (track.platform !== "ios" || !reach?.euBlocked) return null;
  return <p className="mt-4 rounded-[10px] bg-sd-fill px-3 py-2.5 text-[12.5px] leading-relaxed text-sd-fg-muted">EU 에서는 아직 앱이 보이지 않아요. 판매자 신고를 마치면 팔 수 있어요.</p>;
}

/** 애플 단계적 출시 7일. 자동 업데이트에만 적용된다 */
function PhasedBar({ rollout }: { rollout: Rollout }) {
  const day = rollout.day ?? 7;
  return (
    <div className="mt-2">
      <div className="grid grid-cols-7 gap-1">
        {PHASED_PERCENT.map((p, i) => (
          <div key={p} className="min-w-0">
            <div className={`h-1.5 rounded-full transition-colors duration-500 ${i < day ? (rollout.paused ? "bg-sd-warning" : rollout.percent >= 100 ? "bg-sd-positive" : "bg-sd-info") : "bg-sd-gray-300"}`} />
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
          className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${rollout.percent >= 100 ? "bg-sd-positive" : rollout.paused ? "bg-sd-warning" : "bg-sd-info"}`}
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

/** 승인됐지만 아직 안 나간 변경. 있을 때만 보여 준다 */
function QueueBox({ queue }: { queue: PublishQueue }) {
  const items = [...(queue.release ? [queue.release] : []), ...queue.listing.map((l) => `스토어 정보: ${langName(l)} 앱 이름`)];
  if (items.length === 0) return null;
  return (
    <div className="mt-auto border-t border-sd-hairline px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-sd-fg">승인됐지만 아직 안 나간 변경</p>
        <ConsoleLink href={consoleLinks().playPublishing}>게시 개요</ConsoleLink>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li key={it} className="text-[13px] text-sd-fg-muted">
            {it}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] leading-relaxed text-sd-fg-subtle">게시 개요에서 게시하면 나가요. 그 밖의 변경도 거기서 볼 수 있어요.</p>
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
  "android.createRelease": "심사에 내기",
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
            <Mark className="mt-0.5 size-4 flex-none" />
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
