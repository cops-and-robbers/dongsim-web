/**
 * 개요의 지금 할 일 (docs/admin-ui.md "지금 할 일"). 순수 함수만 둔다.
 * 따로 입력하는 할 일이 아니라, 이미 있는 기능에서 처리를 기다리는 것만 모은다.
 */
import type { CardKey, CardResult, LiveValues } from "./cards";

export type TaskTone = "urgent" | "soon" | "info";
export type Task = { id: string; card: CardKey; title: string; detail: string; tone: TaskTone; href: string };

/** 할 일을 만들려면 화면에 없어도 서버에서 읽어야 하는 카드 */
export const TASK_SOURCES: CardKey[] = ["rel", "chk", "ev", "frame", "draft"];

/** 스토어 점검 기한은 이 안으로 들어와야 할 일이다 */
export const DUE_DAYS = 30;
/** 행사는 이 안으로 다가와야 준비를 할 일로 띄운다 */
export const EVENT_DAYS = 14;

const RANK: Record<TaskTone, number> = { urgent: 0, soon: 1, info: 2 };

/** 한국 날짜끼리 며칠 차이인지 */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;
const when = (d: number) => (d === 0 ? "오늘" : d === 1 ? "내일" : `${d}일 뒤`);

export function tasksOf(cards: Partial<Record<CardKey, CardResult>>, pending: LiveValues["pending"], today: string): Task[] {
  const out: Task[] = [];
  if (pending?.reports) out.push({ id: "rep", card: "rep", title: `미처리 신고 ${pending.reports}건`, detail: "신고 내용을 보고 처리해 주세요.", tone: "urgent", href: "/admin/reports?status=PENDING" });
  if (pending?.bugs) out.push({ id: "bug", card: "bug", title: `미처리 버그 ${pending.bugs}건`, detail: "제보를 확인하고 상태를 바꿔 주세요.", tone: "soon", href: "/admin/bugs?status=PENDING" });
  if (pending?.reviews) out.push({ id: "rv", card: "rv", title: `답글을 기다리는 리뷰 ${pending.reviews}개`, detail: "답변 문구로 시작하면 빨라요.", tone: "soon", href: "/admin/reviews" });

  const rel = cards.rel;
  if (rel?.kind === "stage" && rel.next) out.push({ id: "rel", card: "rel", title: rel.next.title, detail: rel.next.reason ?? "출시 화면에서 다음 단계를 확인해 주세요.", tone: rel.next.tone === "bad" ? "urgent" : "soon", href: "/admin/release" });

  const chk = cards.chk;
  if (chk?.kind === "due" && chk.title && chk.daysLeft !== null && chk.daysLeft <= DUE_DAYS) {
    const late = chk.daysLeft < 0;
    out.push({ id: "chk", card: "chk", title: chk.title, detail: late ? `기한이 ${-chk.daysLeft}일 지났어요.` : `기한까지 ${chk.daysLeft}일 남았어요.`, tone: late || chk.daysLeft <= 7 ? "urgent" : "soon", href: "/admin/store-check" });
  }

  const ev = cards.ev ?? cards.frame;
  if (ev?.kind === "event" && ev.label && ev.day) {
    const d = daysBetween(today, ev.day);
    if (d >= 0 && d <= EVENT_DAYS) {
      const left = ev.total - ev.done;
      if (left > 0) out.push({ id: "ev", card: "ev", title: `${ev.label} 준비가 ${left}개 남았어요`, detail: `${md(ev.day)}, ${when(d)}예요. ${ev.next ?? ""}`.trim(), tone: d <= 3 ? "urgent" : "soon", href: "/admin/events" });
      if (ev.builtinFrame) out.push({ id: "frame", card: "frame", title: `${ev.label}에 쓸 프레임을 골라 주세요`, detail: `아직 기본 프레임이에요. ${md(ev.day)}, ${when(d)}예요.`, tone: d <= 3 ? "urgent" : "soon", href: "/admin/events" });
    }
  }

  const draft = cards.draft;
  if (draft?.kind === "count" && draft.count) out.push({ id: "draft", card: "draft", title: `보내지 않은 스토어 초안 ${draft.count}칸`, detail: draft.detail ? `${draft.detail}. 다 고쳤으면 스토어로 보내 주세요.` : "다 고쳤으면 스토어로 보내 주세요.", tone: "info", href: "/admin/store-page" });

  return out.sort((a, b) => RANK[a.tone] - RANK[b.tone]);
}

/** 일마다 먼저 챙길 처음부터 있는 역할. 카드를 고르지 않은 일(답글 대기 리뷰 등)도 주인이 있게 한다 */
export const TASK_ROLES: Record<string, string[]> = { rep: ["ops"], bug: ["dev"], rv: ["ops", "mkt"], rel: ["dev"], chk: ["ops", "dev"], ev: ["ops", "des"], frame: ["des"], draft: ["des", "mkt"] };

/** 내 역할 카드와 이어졌거나 내 역할이 챙기는 일을 위에 둔다. 역할이 없으면 모두 내 일이다 */
export function splitTasks(tasks: Task[], me: { cards: CardKey[]; roles: string[] } | null): { mine: Task[]; others: Task[] } {
  if (!me) return { mine: tasks, others: [] };
  const isMine = (t: Task) => me.cards.includes(t.card) || (TASK_ROLES[t.id] ?? []).some((r) => me.roles.includes(r));
  return { mine: tasks.filter(isMine), others: tasks.filter((t) => !isMine(t)) };
}
