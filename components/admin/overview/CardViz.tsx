import type { ReactNode } from "react";
import { AppStoreMark, GooglePlayMark } from "@/components/admin/icons";
import { changeOf, LOW_DEN, ratioOf, type CountData, type DueData, type EventData, type LimitData, type PostData, type RatioData, type StageData, type TrendData } from "@/lib/admin/overview/cards";

// 개요 카드의 그림 (docs/admin-ui.md "개요 카드"). 지표마다 읽는 법이 달라 모양도 다르다.
// 추이는 꺾은선, 비율은 고리, 기준이 있는 값은 기준선 막대, 쌓이는 일은 큰 숫자와 상태 문구다.

const n = new Intl.NumberFormat("ko-KR");
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;
const addDay = (ymd: string, d: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

export function Big({ children, tone = "fg" }: { children: ReactNode; tone?: "fg" | "critical" | "positive" | "warning" | "info" }) {
  const c = { fg: "text-sd-fg", critical: "text-sd-critical", positive: "text-sd-positive", warning: "text-sd-warning", info: "text-sd-info" }[tone];
  return <p className={`text-[26px] font-bold leading-none tracking-tight tabular-nums ${c}`}>{children}</p>;
}

export function Note({ children, tone = "subtle" }: { children: ReactNode; tone?: "subtle" | "critical" | "positive" | "warning" | "info" }) {
  const c = { subtle: "text-sd-fg-subtle", critical: "text-sd-critical", positive: "text-sd-positive", warning: "text-sd-warning", info: "text-sd-info" }[tone];
  return <p className={`mt-auto line-clamp-2 pt-2 text-[12px] leading-snug ${c}`}>{children}</p>;
}

/** 지난 기간보다 늘었으면 초록, 줄었으면 빨강. 줄어드는 게 좋은 지표는 없어서 한 방향만 둔다 */
function Change({ value, points = false }: { value: number | null; points?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < (points ? 0.0005 : 0.005);
  const text = points ? `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%p` : `${value > 0 ? "+" : ""}${Math.round(value * 100)}%`;
  return <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${flat ? "bg-sd-fill text-sd-fg-subtle" : value > 0 ? "bg-sd-positive-weak text-sd-positive" : "bg-sd-critical-weak text-sd-critical"}`}>{flat ? "그대로" : text}</span>;
}

function Spark({ now, before }: { now: number[]; before: number[] }) {
  const all = [...now, ...before];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const W = 200;
  const H = 44;
  const x = (i: number, len: number) => (len < 2 ? W / 2 : (i / (len - 1)) * (W - 4) + 2);
  const y = (v: number) => H - 4 - ((v - min) / (max - min || 1)) * (H - 10);
  const line = (a: number[]) => a.map((v, i) => `${x(i, a.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-11 w-full" aria-hidden>
      <polygon points={`2,${H} ${line(now)} ${W - 2},${H}`} className="fill-accent-weak" />
      {before.length > 1 && <polyline points={line(before)} fill="none" className="stroke-sd-line" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      <polyline points={line(now)} fill="none" className="stroke-accent" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(now.length - 1, now.length)} cy={y(now.at(-1) ?? 0)} r={3} className="fill-accent" />
    </svg>
  );
}

export function Trend({ d }: { d: TrendData }) {
  const value = d.unit === "usd" ? `$${d.total.toFixed(2)}` : n.format(Math.round(d.total));
  return (
    <>
      <div className="flex items-center gap-2">
        <Big>{value}</Big>
        <Change value={changeOf(d.total, d.previous)} />
      </div>
      <div className="mt-auto pt-1">
        <Spark now={d.daily} before={d.previousDaily} />
        <p className="mt-0.5 flex justify-between text-[11.5px] text-sd-fg-subtle">
          <span>
            {md(addDay(d.until, -6))} ~ {md(d.until)}
          </span>
          <span className="hidden sm:inline">점선은 그 앞 7일</span>
        </p>
      </div>
    </>
  );
}

function Ring({ value, dim }: { value: number; dim: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth={6} className="stroke-sd-fill" />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth={6} strokeLinecap="round" strokeDasharray={`${Math.min(value, 1) * c} ${c}`} className={dim ? "stroke-sd-line" : "stroke-accent"} />
    </svg>
  );
}

export function Ratio({ d }: { d: RatioData }) {
  const rate = ratioOf(d);
  const before = ratioOf(d.previous);
  const few = d.den < LOW_DEN;
  const unit = d.unit === "visits" ? (x: number) => `${n.format(x)}회` : (x: number) => `${n.format(x)}명`;
  if (rate === null) return <Note>아직 셀 수 있는 사람이 없어요.</Note>;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className={few ? "opacity-50" : ""}>
          <Big>{pct(rate, 1)}</Big>
          <div className="mt-1.5">{!few && <Change value={before === null ? null : rate - before} points />}</div>
        </div>
        <Ring value={rate} dim={few} />
      </div>
      <Note>{few ? `${unit(d.den)} 중이라 참고만 해요.` : `${unit(d.den)} 중 ${unit(d.num)}`}</Note>
    </>
  );
}

export function Limit({ d }: { d: LimitData }) {
  if (d.rate === null) return <Note>사용자가 적어서 구글이 아직 집계하지 않았어요.</Note>;
  const over = d.rate > d.limit;
  // 기준선이 막대의 2/3 쯤에 오게 그린다
  const scale = Math.max(d.limit * 1.5, d.rate * 1.1);
  return (
    <>
      <Big tone={over ? "critical" : "fg"}>{pct(d.rate, 2)}</Big>
      <div className="relative mt-auto pt-4">
        <div className="h-2 overflow-hidden rounded-full bg-sd-fill">
          <div className={`h-full rounded-full ${over ? "bg-sd-critical" : "bg-sd-positive"}`} style={{ width: `${Math.min(d.rate / scale, 1) * 100}%` }} />
        </div>
        <span aria-hidden className="absolute top-2.5 h-4 w-0.5 rounded bg-sd-fg-muted" style={{ left: `${(d.limit / scale) * 100}%` }} />
      </div>
      <Note tone={over ? "critical" : "positive"}>{over ? `구글 기준 ${pct(d.limit, 2)}를 넘었어요.` : `구글 기준 ${pct(d.limit, 2)} 아래예요.`}</Note>
    </>
  );
}

export function Post({ d }: { d: PostData }) {
  return (
    <>
      <div className={d.small ? "opacity-50" : ""}>
        <Big>{d.rate === null ? "-" : pct(d.rate, 1)}</Big>
      </div>
      <Note>
        {md(d.postedAt.slice(0, 10))} 게시, 본 사람 {n.format(d.reach ?? 0)}명{d.small ? ". 적어서 참고만 해요." : ""}
      </Note>
    </>
  );
}

const TONE: Record<string, string> = { done: "bg-sd-positive-weak text-sd-positive", wait: "bg-sd-fill text-sd-fg-muted", turn: "bg-accent-weak text-accent", bad: "bg-sd-critical-weak text-sd-critical", idle: "bg-sd-fill text-sd-fg-subtle" };

export function Stage({ d }: { d: StageData }) {
  return (
    <ul className="mt-auto space-y-2">
      {d.tracks.map((t) => (
        <li key={t.platform} className="flex items-center gap-2 text-[12.5px]">
          {t.platform === "ios" ? <AppStoreMark className="size-4 shrink-0" /> : <GooglePlayMark className="size-4 shrink-0" />}
          <span className={`min-w-0 truncate rounded-md px-1.5 py-0.5 font-semibold ${TONE[t.tone] ?? TONE.idle}`}>{t.label}</span>
          {t.live && <span className="ml-auto shrink-0 tabular-nums text-sd-fg-subtle">{t.live}</span>}
        </li>
      ))}
    </ul>
  );
}

export function Due({ d }: { d: DueData }) {
  if (d.daysLeft === null) return <Note tone="positive">기한이 정해진 일이 모두 끝났어요.</Note>;
  const late = d.daysLeft < 0;
  return (
    <>
      <Big tone={late ? "critical" : d.daysLeft <= 30 ? "warning" : "fg"}>{late ? `${-d.daysLeft}일 지남` : `${d.daysLeft}일 남음`}</Big>
      <Note tone={late ? "critical" : "subtle"}>
        {d.title}
        {d.open > 1 ? ` 외 ${d.open - 1}건` : ""}
      </Note>
    </>
  );
}

export function NextEvent({ d }: { d: EventData }) {
  if (!d.label || !d.day) return <Note>예정된 행사가 없어요.</Note>;
  const rate = d.total ? d.done / d.total : 0;
  return (
    <>
      <p className="truncate text-[15px] font-bold text-sd-fg">{d.label}</p>
      <p className="text-[12px] text-sd-fg-subtle">{md(d.day)}</p>
      <div className="mt-auto pt-2">
        <div className="flex items-center justify-between text-[12px] font-semibold tabular-nums text-sd-fg-muted">
          <span>준비</span>
          <span>
            {d.done}/{d.total}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sd-fill">
          <div className={`h-full rounded-full ${rate === 1 ? "bg-sd-positive" : "bg-accent"}`} style={{ width: `${rate * 100}%` }} />
        </div>
        {d.next && <p className="mt-1.5 truncate text-[12px] text-sd-warning">{d.next}</p>}
      </div>
    </>
  );
}

export function Frames({ d }: { d: EventData }) {
  if (!d.label || !d.day) return <Note>예정된 행사가 없어요.</Note>;
  return (
    <>
      <Big>{d.builtinFrame ? "기본" : `${d.frames}종`}</Big>
      <Note tone={d.builtinFrame ? "warning" : "subtle"}>
        {md(d.day)} {d.label}
        {d.builtinFrame ? ". 아직 기본 프레임이에요." : ""}
      </Note>
    </>
  );
}

export function Count({ d, empty, unit = "칸" }: { d: CountData; empty: string; unit?: string }) {
  return d.count ? (
    <>
      <Big tone="warning">
        {n.format(d.count)}
        <span className="ml-0.5 text-[16px]">{unit}</span>
      </Big>
      {d.detail && <Note>{d.detail}</Note>}
    </>
  ) : (
    <Note tone="info">{empty}</Note>
  );
}

/** 쌓이는 일. 있으면 빨강, 없으면 파랑으로 다 끝났다고 말한다(docs/admin-ui.md "색으로 상태를 말하기") */
export function Queue({ count, unit }: { count: number; unit: string }) {
  return (
    <>
      <Big tone={count ? "critical" : "info"}>
        {n.format(count)}
        <span className="ml-0.5 text-[16px]">{unit}</span>
      </Big>
      <Note tone={count ? "critical" : "info"}>{count ? "확인이 필요해요." : "모두 처리됐어요."}</Note>
    </>
  );
}
