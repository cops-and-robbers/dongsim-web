/**
 * 회사 소개의 이력과 고마운 분들 (#250). 화면, 서버, 어드민 미리보기가 같은 계산을 쓴다.
 * 서버 전용 코드를 부르지 않는다(어드민 미리보기가 브라우저에서 저장 전 값으로 그린다).
 */

export const LOCALES = ["ko", "en", "ja"] as const;
export type RecordLocale = (typeof LOCALES)[number];

export const RECORD_KINDS = ["event", "qa", "milestone", "award", "selection"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export const KIND_LABEL: Record<RecordKind, string> = { event: "행사", qa: "QA", milestone: "회사 소식", award: "수상", selection: "선정" };

export type RecordBoard = "history" | "awards";
export const BOARD_KINDS: Record<RecordBoard, RecordKind[]> = { history: ["event", "qa", "milestone"], awards: ["award", "selection"] };
export const boardOf = (kind: RecordKind): RecordBoard => (BOARD_KINDS.awards.includes(kind) ? "awards" : "history");
export const hasBadge = (kind: RecordKind) => boardOf(kind) === "awards";

export type Precision = "day" | "month";
export type Translated = Record<RecordLocale, string>;

export const TITLE_MAX: Record<RecordLocale, number> = { ko: 50, en: 80, ja: 50 };
export const BADGE_MAX: Record<RecordLocale, number> = { ko: 24, en: 40, ja: 24 };
export const NAME_MAX = 20;
export const PRIOR_MAX = 50;

/** 저장하는 값. 번역은 비어 있으면 "" */
export type RecordDraft = {
  kind: RecordKind;
  /** YYYY-MM-DD. 월까지만 아는 날은 1일 */
  occurredOn: string;
  precision: Precision;
  title: Translated;
  badge: Translated;
  visible: boolean;
  eventId: number | null;
  /** QA 회차에 온 사람. QA 가 아니면 빈 배열 */
  attendees: number[];
};

export type CompanyRecord = RecordDraft & { id: number; version: number; updatedBy: string; updatedAt: string };

export type PersonRole = "qa" | "infra";
export type PersonDraft = { name: string; role: PersonRole; github: string; priorCount: number; visible: boolean };
export type CreditPerson = PersonDraft & { id: number; version: number; updatedBy: string; updatedAt: string };

/** 소개 페이지 한 줄 */
export type PublicRecord = { id: number; date: string; title: string; award?: string };
export type PublicRecords = { history: PublicRecord[]; awards: PublicRecord[] };

/** 소개 페이지 고마운 분들 한 사람. github 는 보여도 되는 사람에게만 들어 있다 */
export type PublicHelper = { id: number; name: string; role: "infrastructure" | "qa"; participationCount: number; github?: string };

export type ContributionTier = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";
export type CreditHelper = { name: string; role: string; tier: ContributionTier };

// ── 날짜 ──

/** 사이트에 보이는 날짜. 일까지 2026.03.24, 월까지 2026.07 */
export function formatRecordDate(occurredOn: string, precision: Precision): string {
  const [y, m, d] = occurredOn.split("-");
  return precision === "month" ? `${y}.${m}` : `${y}.${m}.${d}`;
}

export function todayKst(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

export function isRealDate(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

// ── 이력 ──

/** 걸어온 길은 오래된 순(이야기처럼 읽히게), 수상은 최신순(새 소식이 먼저). 같은 날은 넣은 순서 */
export function sortRecords<T extends { occurredOn: string; id: number }>(board: RecordBoard, rows: readonly T[]): T[] {
  const sign = board === "history" ? 1 : -1;
  return [...rows].sort((a, b) => sign * a.occurredOn.localeCompare(b.occurredOn) || a.id - b.id);
}

/** 그 언어에 번역이 없으면 줄을 뺀다. 번역 안 된 페이지를 노출하지 않는다는 사이트 규칙과 같다(docs/i18n.md) */
export function toPublicRecord(row: CompanyRecord, locale: RecordLocale): PublicRecord | null {
  const title = row.title[locale].trim();
  if (!title) return null;
  const award = hasBadge(row.kind) ? row.badge[locale].trim() : "";
  if (hasBadge(row.kind) && !award) return null;
  return { id: row.id, date: formatRecordDate(row.occurredOn, row.precision), title, ...(award ? { award } : {}) };
}

export function publicRecords(rows: readonly CompanyRecord[], locale: RecordLocale): PublicRecords {
  const board = (name: RecordBoard) =>
    sortRecords(name, rows.filter((r) => r.visible && boardOf(r.kind) === name))
      .map((r) => toPublicRecord(r, locale))
      .filter((r): r is PublicRecord => r !== null);
  return { history: board("history"), awards: board("awards") };
}

/** 영어, 일본어 중 비어 있어 그 언어 페이지에서 빠지는 언어 */
export function missingLocales(row: Pick<RecordDraft, "kind" | "title" | "badge">): RecordLocale[] {
  return LOCALES.filter((l) => !row.title[l].trim() || (hasBadge(row.kind) && !row.badge[l].trim()));
}

// 긴 대시는 사이트 어디에도 쓰지 않는다(AGENTS.md). 붙여넣은 글에서 들어와도 하이픈으로 바꾼다
const clean = (v: string) => v.replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();

export function normalizeRecord(d: RecordDraft): RecordDraft {
  const each = (t: Translated): Translated => ({ ko: clean(t.ko), en: clean(t.en), ja: clean(t.ja) });
  return { ...d, title: each(d.title), badge: hasBadge(d.kind) ? each(d.badge) : { ko: "", en: "", ja: "" }, attendees: d.kind === "qa" ? [...new Set(d.attendees)] : [] };
}

export type RecordProblems = Partial<Record<"date" | "title.ko" | "title.en" | "title.ja" | "badge.ko" | "badge.en" | "badge.ja", string>>;

/** 고칠 수 있는 말로 돌려준다. 화면과 서버가 같이 쓴다 */
export function validateRecord(raw: RecordDraft, now = Date.now()): RecordProblems {
  const d = normalizeRecord(raw);
  const out: RecordProblems = {};
  if (!isRealDate(d.occurredOn) || (d.precision === "month" && !d.occurredOn.endsWith("-01"))) out.date = "날짜를 다시 골라 주세요.";
  else if (d.occurredOn.slice(0, d.precision === "month" ? 7 : 10) > todayKst(now).slice(0, d.precision === "month" ? 7 : 10)) out.date = "아직 오지 않은 날짜는 넣을 수 없어요.";
  if (!d.title.ko) out["title.ko"] = "이름을 적어 주세요.";
  if (hasBadge(d.kind) && !d.badge.ko) out["badge.ko"] = "상 이름을 적어 주세요.";
  for (const locale of LOCALES) {
    if (Array.from(d.title[locale]).length > TITLE_MAX[locale]) out[`title.${locale}`] = `${TITLE_MAX[locale]}자까지 적을 수 있어요.`;
    if (Array.from(d.badge[locale]).length > BADGE_MAX[locale]) out[`badge.${locale}`] = `${BADGE_MAX[locale]}자까지 적을 수 있어요.`;
  }
  return out;
}

const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

/** QA 회차 제목 초안. 번역할 게 없어서 입력 칸을 미리 채운다 */
export function qaTitle(round: number): Translated {
  return {
    ko: `경찰과 도둑 ${round}차 QA 진행`,
    en: `Cops and Robbers - ${ORDINAL[round - 1] ?? `#${round}`} QA round`,
    ja: `ケイドロ 第${round}回QA実施`,
  };
}

/** 새 QA 의 회차 번호. 이미 올린 QA 다음 번호 */
export const nextQaRound = (rows: readonly { kind: RecordKind }[]) => rows.filter((r) => r.kind === "qa").length + 1;

/** 어드민 일정 중 소개 페이지에 올릴 만한 것. 지난 행사와 이름에 QA 가 든 테스트만 고른다(팀 시험, 포스터 QR 시험은 올리지 않는다) */
export function isCandidateEvent(event: { day: string; label: string; category: string }, now = Date.now()): boolean {
  if (event.day >= todayKst(now)) return false;
  return event.category === "event" || (event.category === "test" && /QA/i.test(event.label));
}

// ── 사람 ──

/** 띄어쓰기와 대소문자만 다른 이름은 같은 사람이다 */
export const nameKey = (name: string) => name.normalize("NFC").replace(/\s+/g, "").toLowerCase();

/** 붙여넣은 이름들. 쉼표, 줄바꿈, 가운뎃점, 탭으로 나누고 같은 이름은 하나만 */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of text.split(/[,，、·\n\r\t]+/)) {
    const name = clean(piece);
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function editDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  let row = y.map((_, i) => i + 1);
  row.unshift(0);
  for (let i = 1; i <= x.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= y.length; j += 1) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[y.length];
}

/** 오타로 둘로 갈리기 쉬운 이름인가. 같은 사람인지는 사람이 고른다(두 글자 이름은 한 글자만 달라도 다른 사람이라 뺀다) */
export function isSimilarName(a: string, b: string): boolean {
  const left = nameKey(a);
  const right = nameKey(b);
  return left !== right && Math.min(Array.from(left).length, Array.from(right).length) >= 3 && editDistance(left, right) === 1;
}

export type NameMatch =
  | { kind: "existing"; name: string; person: { id: number; name: string } }
  | { kind: "similar"; name: string; person: { id: number; name: string } }
  | { kind: "new"; name: string };

export function matchNames(names: readonly string[], people: readonly { id: number; name: string }[]): NameMatch[] {
  return names.map((name) => {
    const key = nameKey(name);
    const same = people.find((p) => nameKey(p.name) === key);
    if (same) return { kind: "existing", name, person: { id: same.id, name: same.name } };
    const near = people.find((p) => isSimilarName(p.name, name));
    if (near) return { kind: "similar", name, person: { id: near.id, name: near.name } };
    return { kind: "new", name };
  });
}

export const GITHUB_ID = /^[A-Za-z0-9-]{1,39}$/;

export function validatePerson(d: PersonDraft): Partial<Record<"name" | "github" | "priorCount", string>> {
  const out: Partial<Record<"name" | "github" | "priorCount", string>> = {};
  const name = clean(d.name);
  if (!name) out.name = "이름을 적어 주세요.";
  else if (Array.from(name).length > NAME_MAX) out.name = `${NAME_MAX}자까지 적을 수 있어요.`;
  if (d.github && !GITHUB_ID.test(d.github)) out.github = "GitHub 아이디를 다시 확인해 주세요.";
  if (!Number.isInteger(d.priorCount) || d.priorCount < 0 || d.priorCount > PRIOR_MAX) out.priorCount = `0에서 ${PRIOR_MAX} 사이로 적어 주세요.`;
  return out;
}

/** 붙여넣은 새 이름도 저장 전에 검사한다. 저장소 제한에 걸려 실패하면 무엇이 틀렸는지 알 수 없다 */
export function newNamesProblem(names: readonly string[]): string | undefined {
  return names.some((name) => !clean(name) || Array.from(clean(name)).length > NAME_MAX) ? `참가자 이름은 ${NAME_MAX}자까지 적을 수 있어요.` : undefined;
}

export const normalizePerson = (d: PersonDraft): PersonDraft => ({ ...d, name: clean(d.name), github: d.github.trim() });

/** 참여 횟수. 회차로 기록하기 전 횟수 + 온 회차 수 */
export const participation = (person: Pick<PersonDraft, "priorCount">, attended: number) => person.priorCount + attended;

/** 사람별로 온 회차 수. 숨긴 회차에 왔어도 참여한 건 맞으니 센다 */
export function attendanceCounts(records: readonly Pick<RecordDraft, "kind" | "attendees">[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const record of records) {
    if (record.kind !== "qa") continue;
    for (const id of record.attendees) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** GitHub 는 저장해 두어도 두 번째 참여부터 보인다. 인프라 제공자는 QA 횟수와 상관없이 보인다 */
export const showsGithub = (role: PersonRole, count: number) => role === "infra" || count >= 2;

/** 앱 크레딧 색. 앱에서 처음 정한 규칙 그대로다(1회, 2회, 3회 이상, 인프라). tier5 는 후원용으로 비워 둔다 */
export function tierOf(role: PersonRole, count: number): ContributionTier {
  if (role === "infra") return "tier4";
  return count >= 3 ? "tier3" : count === 2 ? "tier2" : "tier1";
}

/** 인프라 제공자 먼저, 그다음 참여 횟수가 많은 순, 같은 횟수 안에서는 넣은 순서 */
export function publicHelpers(people: readonly CreditPerson[], records: readonly Pick<RecordDraft, "kind" | "attendees">[]): PublicHelper[] {
  const counts = attendanceCounts(records);
  return people
    .map((person) => ({ person, count: participation(person, counts.get(person.id) ?? 0) }))
    .filter(({ person, count }) => person.visible && (person.role === "infra" || count > 0))
    .sort((a, b) => Number(b.person.role === "infra") - Number(a.person.role === "infra") || b.count - a.count || a.person.id - b.person.id)
    .map(({ person, count }) => ({
      id: person.id,
      name: person.name,
      role: person.role === "infra" ? "infrastructure" : "qa",
      participationCount: person.role === "infra" ? 1 : count,
      ...(person.github && showsGithub(person.role, count) ? { github: `https://github.com/${person.github}` } : {}),
    }));
}

export function creditHelpers(helpers: readonly PublicHelper[]): CreditHelper[] {
  return helpers.map((helper) => {
    const role: PersonRole = helper.role === "infrastructure" ? "infra" : "qa";
    return { name: helper.name, role: role === "infra" ? "Infra Provision" : "QA", tier: tierOf(role, helper.participationCount) };
  });
}
