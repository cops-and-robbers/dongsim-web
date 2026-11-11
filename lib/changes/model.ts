/**
 * 어드민 변경 기록 (#313, docs/admin-ui.md "변경 기록").
 *
 * 어드민에서 사용자에게 닿는 값을 바꾼 일을 한 모양으로 모은다. 화면은 이 모양만 안다.
 * - 바꾼 값은 "전 → 후" 줄(value), 목록은 더한 것과 뺀 것(list), 그림은 전후 그림(image)으로 나눈다.
 *   같은 "바뀜"이라도 읽는 방법이 달라서다. 목록을 문자열 둘로 비교하면 무엇이 빠졌는지 사람이 찾아야 한다
 * - 기록은 두 갈래에서 온다. 새 공통 표(admin_changes)와, 이미 따로 남던 기록(행사 저장본, 출시 조작, 회사 소개)
 *
 * 서버와 화면이 같이 쓰는 순수 함수만 둔다. 저장소는 lib/changes/server.ts.
 */

export const CHANGE_AREAS = ["app-config", "webgame", "event", "schedule", "assets", "store-page", "reviews", "team", "release", "company"] as const;
export type ChangeArea = (typeof CHANGE_AREAS)[number];

/** 화면 이름과 그 화면 주소. 메뉴 이름과 같게 둔다 */
export const AREA: Record<ChangeArea, { label: string; href: string }> = {
  "app-config": { label: "앱 설정", href: "/admin/app-config" },
  webgame: { label: "온라인 게임", href: "/admin/webgame" },
  event: { label: "행사", href: "/admin/events" },
  schedule: { label: "일정", href: "/admin/schedule" },
  assets: { label: "그림 보관함", href: "/admin/assets" },
  "store-page": { label: "스토어 페이지", href: "/admin/store-page" },
  reviews: { label: "리뷰", href: "/admin/reviews" },
  team: { label: "운영진", href: "/admin/team" },
  release: { label: "출시", href: "/admin/release" },
  company: { label: "동심지키미 소개", href: "/admin/company" },
};

export const isChangeArea = (v: unknown): v is ChangeArea => typeof v === "string" && (CHANGE_AREAS as readonly string[]).includes(v);

/** 무엇을 했나. 실행은 값이 아니라 동작(심사 제출, 출시)이라 따로 둔다 */
export type ChangeAction = "add" | "edit" | "remove" | "run";
export const ACTION_LABEL: Record<ChangeAction, string> = { add: "추가", edit: "고침", remove: "지움", run: "실행" };

export type FieldChange =
  /** 값 하나. before 가 null 이면 새로 생김, after 가 null 이면 없어짐 */
  | { kind: "value"; label: string; before: string | null; after: string | null }
  /** 목록. 순서만 바뀌었으면 moved 로 알린다 */
  | { kind: "list"; label: string; added: string[]; removed: string[]; moved?: boolean }
  /** 그림 주소. 화면이 작은 그림 둘로 보여 준다 */
  | { kind: "image"; label: string; before: string | null; after: string | null }
  /** 그림 목록(스토어 스크린샷). 더하고 뺀 그림을 작은 그림으로 보여 준다 */
  | { kind: "images"; label: string; added: Pic[]; removed: Pic[]; moved?: boolean };

export type Pic = { id: string; url: string; name?: string };

export type Change = {
  /** 출처까지 붙인 고유 값(같은 일이 두 갈래에서 겹치지 않게) */
  id: string;
  /** ISO 시각 */
  at: string;
  actor: string;
  area: ChangeArea;
  /** 무엇을 바꿨나. "서울 게임 타운", "iOS 한국어 앱 이름" */
  target: string;
  action: ChangeAction;
  fields: FieldChange[];
  /** 그 대상을 바로 여는 주소. 없으면 화면 주소 */
  href?: string;
  /** 사용자에게 바로 닿는 변경(점검, 최소 버전, 광고 끄기, 출시, 부스 닫기) */
  impact?: boolean;
  /** 실행의 결과. 값을 바꾼 일에는 없다 */
  status?: "started" | "done" | "failed";
  /** 한 줄 덧붙임(실패 사유 등) */
  note?: string;
};

// ── 비교 ──

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null);
const blank = (v: string | null | undefined) => (v === undefined || v === null || v === "" ? null : v);

/**
 * 같은 칸 이름을 가진 두 값 묶음에서 달라진 칸만 "전 → 후" 줄로 만든다. 빈 문자열은 없음으로 본다.
 * labels 에 없는 칸은 비교하지 않는다(내부 칸이 기록에 새지 않게). 순서는 labels 순서
 */
export function diffValues(before: Record<string, string | null | undefined> | null, after: Record<string, string | null | undefined> | null, labels: Record<string, string>): FieldChange[] {
  const out: FieldChange[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const b = blank(before?.[key]);
    const a = blank(after?.[key]);
    if (!same(b, a)) out.push({ kind: "value", label, before: b, after: a });
  }
  return out;
}

/** 두 목록에서 더한 것과 뺀 것. 같은 것만 순서가 바뀌었으면 moved */
export function diffList(label: string, before: readonly string[], after: readonly string[]): FieldChange | null {
  const b = new Set(before);
  const a = new Set(after);
  const added = after.filter((x) => !b.has(x));
  const removed = before.filter((x) => !a.has(x));
  if (added.length || removed.length) return { kind: "list", label, added, removed };
  const kept = after.filter((x) => b.has(x));
  const order = before.filter((x) => a.has(x));
  if (kept.some((x, i) => x !== order[i])) return { kind: "list", label, added: [], removed: [], moved: true };
  return null;
}

/** 두 그림 목록에서 더한 것과 뺀 것. id 로 같은 그림을 가린다 */
export function diffPics(label: string, before: readonly Pic[], after: readonly Pic[]): FieldChange | null {
  const ids = (l: readonly Pic[]) => l.map((p) => p.id);
  const d = diffList(label, ids(before), ids(after));
  if (!d || d.kind !== "list") return null;
  const pick = (l: readonly Pic[], want: string[]) => l.filter((p) => want.includes(p.id));
  return { kind: "images", label, added: pick(after, d.added), removed: pick(before, d.removed), ...(d.moved && { moved: true }) };
}

/** 무엇을 했는지 한 단어. 전이 없으면 추가, 후가 없으면 지움 */
export function actionOf(before: unknown, after: unknown): ChangeAction {
  if (before === null || before === undefined) return "add";
  if (after === null || after === undefined) return "remove";
  return "edit";
}

// ── 묶기와 거르기 ──

/** 한국 시각의 날짜(YYYY-MM-DD). 팀이 한국에서 일해 날을 한국 기준으로 나눈다 */
export const kstDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 10);
/** 한국 시각 "14:32" */
export const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(11, 16);

/** 날짜마다 묶는다. 날도, 날 안의 기록도 최근 것이 위 */
export function groupByDay(changes: readonly Change[]): { day: string; items: Change[] }[] {
  const sorted = [...changes].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const out: { day: string; items: Change[] }[] = [];
  for (const c of sorted) {
    const day = kstDay(c.at);
    const last = out.at(-1);
    if (last?.day === day) last.items.push(c);
    else out.push({ day, items: [c] });
  }
  return out;
}

export type ChangeFilter = { area?: ChangeArea | null; actor?: string | null; impactOnly?: boolean };

export function filterChanges(changes: readonly Change[], f: ChangeFilter): Change[] {
  return changes.filter((c) => (!f.area || c.area === f.area) && (!f.actor || c.actor === f.actor) && (!f.impactOnly || c.impact));
}

/** 화면이 바꾼 칸 수를 셀 때. 목록은 더하고 뺀 개수, 순서만 바뀌면 1 */
export function fieldCount(f: FieldChange): number {
  if (f.kind !== "list" && f.kind !== "images") return 1;
  return f.added.length + f.removed.length || (f.moved ? 1 : 0);
}
