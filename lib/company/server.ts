/**
 * 회사 소개의 이력과 고마운 분들을 저장소에서 읽고 쓴다 (#250). 서버 전용이다.
 *
 * 사이트는 300초 묶어 읽고, 어드민이 저장하면 바로 버린다(COMPANY_TAG).
 * 조회 오류는 삼키지 않고 던진다. 재생성 중에 던지면 Next 가 직전 정상 페이지를 계속 내보낸다(블로그 #188 과 같은 이유).
 * 행사처럼 코드에 남은 값으로 돌리면 지운 이력이 되살아나고, 명단은 코드에 남기지도 않는다.
 * 빌드와 로컬 개발에서만 FALLBACK 으로 넘어간다(저장소가 잠깐 죽어도 배포는 되게).
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db, selectAll } from "@/lib/metrics/db";
import { EVENT_COLUMNS, toEvent } from "@/lib/metrics/events";
import { FALLBACK_RECORDS, SAMPLE_PEOPLE } from "@/lib/company/fallback";
import {
  creditHelpers,
  isCandidateEvent,
  nameKey,
  normalizePerson,
  normalizeRecord,
  publicHelpers,
  publicRecords,
  type CompanyRecord,
  type CreditHelper,
  type CreditPerson,
  type PersonDraft,
  type PublicHelper,
  type PublicRecords,
  type RecordDraft,
  type RecordKind,
  type RecordLocale,
} from "@/lib/company/model";
import type { AuditRow, Candidate, CompanyBundle } from "@/lib/company/adminApi";

export const COMPANY_TAG = "company-profile";

export class ConflictError extends Error {}
export class DuplicateNameError extends Error {}
export class DuplicateEventError extends Error {}

type RecordRow = {
  id: number;
  kind: RecordKind;
  occurred_on: string;
  precision: "day" | "month";
  title_ko: string;
  title_en: string | null;
  title_ja: string | null;
  badge_ko: string | null;
  badge_en: string | null;
  badge_ja: string | null;
  visible: boolean;
  event_id: number | null;
  version: number;
  updated_by: string;
  updated_at: string;
};

type PersonRow = {
  id: number;
  name: string;
  role: "qa" | "infra";
  github: string | null;
  prior_count: number;
  visible: boolean;
  version: number;
  updated_by: string;
  updated_at: string;
};

function toRecord(row: RecordRow, attendees: number[]): CompanyRecord {
  return {
    id: Number(row.id),
    kind: row.kind,
    occurredOn: row.occurred_on,
    precision: row.precision,
    title: { ko: row.title_ko, en: row.title_en ?? "", ja: row.title_ja ?? "" },
    badge: { ko: row.badge_ko ?? "", en: row.badge_en ?? "", ja: row.badge_ja ?? "" },
    visible: row.visible,
    eventId: row.event_id === null ? null : Number(row.event_id),
    attendees,
    version: row.version,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

const toPerson = (row: PersonRow): CreditPerson => ({
  id: Number(row.id),
  name: row.name,
  role: row.role,
  github: row.github ?? "",
  priorCount: row.prior_count,
  visible: row.visible,
  version: row.version,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
});

// 저장소는 한 번에 1,000줄까지만 준다. 잘린 참가자로 저장하면 빠진 사람이 지워지니 끝까지 읽는다
async function readRecords(): Promise<CompanyRecord[]> {
  const [records, attendance] = await Promise.all([
    selectAll<RecordRow>((from, to) => db().from("company_records").select("*").order("id").range(from, to), "이력 읽기"),
    selectAll<{ record_id: number; person_id: number }>((from, to) => db().from("qa_attendance").select("record_id, person_id").order("record_id").order("person_id").range(from, to), "참가자 읽기"),
  ]);
  const byRecord = new Map<number, number[]>();
  for (const row of attendance) {
    const id = Number(row.record_id);
    byRecord.set(id, [...(byRecord.get(id) ?? []), Number(row.person_id)]);
  }
  return records.map((row) => toRecord(row, byRecord.get(Number(row.id)) ?? []));
}

async function readPeople(): Promise<CreditPerson[]> {
  const rows = await selectAll<PersonRow>((from, to) => db().from("credit_people").select("id, name, role, github, prior_count, visible, version, updated_by, updated_at").order("id").range(from, to), "명단 읽기");
  return rows.map(toPerson);
}

type Source = { records: CompanyRecord[]; people: CreditPerson[] };

const readSource = async (): Promise<Source> => {
  const [records, people] = await Promise.all([readRecords(), readPeople()]);
  return { records, people };
};

const cachedSource = unstable_cache(readSource, ["company-profile-source"], { tags: [COMPANY_TAG], revalidate: 300 });

async function source(): Promise<Source> {
  const isDev = process.env.NODE_ENV !== "production";
  try {
    return await cachedSource();
  } catch (e) {
    if (!isDev && process.env.NEXT_PHASE !== "phase-production-build") throw e;
    console.error("[company] 저장소를 읽지 못해 대신 값으로 그려요", e);
    return { records: FALLBACK_RECORDS, people: isDev ? SAMPLE_PEOPLE : [] };
  }
}

/** 소개 페이지의 걸어온 길과 수상 이력 */
export async function companyRecords(locale: RecordLocale): Promise<PublicRecords> {
  return publicRecords((await source()).records, locale);
}

/** 구성원 페이지의 고마운 분들 */
export async function companyHelpers(): Promise<PublicHelper[]> {
  const { records, people } = await source();
  return publicHelpers(people, records);
}

/** 앱 크레딧의 명단. 못 읽으면 null. 명단 때문에 크레딧 화면이 안 열리면 안 되고, 빈 명단을 CDN 이 들고 있어도 안 된다 */
export async function appCreditHelpers(): Promise<CreditHelper[] | null> {
  try {
    return creditHelpers(await companyHelpers());
  } catch (e) {
    console.error("[company] 앱 크레딧 명단을 읽지 못했어요", e);
    return null;
  }
}

// ── 어드민 ──

async function readCandidates(records: CompanyRecord[]): Promise<Candidate[]> {
  const [events, skips] = await Promise.all([
    db().from("metrics_events").select(EVENT_COLUMNS).in("category", ["event", "test"]).order("day", { ascending: false }).limit(200),
    db().from("company_record_skips").select("event_id"),
  ]);
  if (events.error) throw new Error(events.error.message);
  if (skips.error) throw new Error(skips.error.message);
  const taken = new Set([...records.map((r) => r.eventId), ...(skips.data ?? []).map((s) => Number(s.event_id))]);
  return (events.data ?? [])
    .map((row) => toEvent(row as Record<string, unknown>))
    .filter((e) => !taken.has(e.id) && isCandidateEvent(e))
    .map((e) => ({ id: e.id, day: e.day, label: e.label, category: e.category as Candidate["category"] }));
}

async function readAudit(): Promise<AuditRow[]> {
  const res = await db().from("company_audit").select("id, action, target, target_id, actor, at").order("at", { ascending: false }).limit(10);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((row) => ({ id: Number(row.id), action: row.action, target: row.target, targetId: Number(row.target_id), actor: row.actor, at: row.at }));
}

export async function readBundle(writable: boolean): Promise<CompanyBundle> {
  const [records, people, audit] = await Promise.all([readRecords(), readPeople(), readAudit()]);
  return { records, people, candidates: await readCandidates(records), audit, writable };
}

async function audit(action: AuditRow["action"], target: AuditRow["target"], targetId: number, actor: string): Promise<void> {
  const res = await db().from("company_audit").insert({ action, target, target_id: targetId, actor });
  if (res.error) console.error("[company] 고친 기록 실패", res.error.message);
}

const nullIfEmpty = (v: string) => v || null;

function recordColumns(d: RecordDraft) {
  return {
    kind: d.kind,
    occurred_on: d.occurredOn,
    precision: d.precision,
    title_ko: d.title.ko,
    title_en: nullIfEmpty(d.title.en),
    title_ja: nullIfEmpty(d.title.ja),
    badge_ko: nullIfEmpty(d.badge.ko),
    badge_en: nullIfEmpty(d.badge.en),
    badge_ja: nullIfEmpty(d.badge.ja),
    visible: d.visible,
    event_id: d.eventId,
  };
}

const expireSite = () => revalidateTag(COMPANY_TAG, { expire: 0 });

/**
 * 이력, 새 참가자, 참석 기록, 고친 기록을 저장소 함수 하나로 함께 저장한다(0019 company_save_record).
 * 나눠 쓰면 중간에 실패했을 때 이력만 남고, 늦게 도착한 요청이 다른 사람의 참가자를 덮는다
 */
async function saveRecordRow(id: number | null, version: number, raw: RecordDraft, newNames: string[], by: string): Promise<void> {
  const d = normalizeRecord(raw);
  const newPeople = d.kind === "qa" ? newNames.map((name) => ({ name: normalizePerson({ name, role: "qa", github: "", priorCount: 0, visible: true }).name, key: nameKey(name) })) : [];
  const res = await db().rpc("company_save_record", { p_id: id, p_version: version, p_row: recordColumns(d), p_attendees: d.attendees, p_new_people: newPeople, p_actor: by });
  if (res.error) {
    if (res.error.code === "CO409" || res.error.code === "23503") throw new ConflictError("먼저 저장한 사람이 있어요.");
    if (res.error.code === "23505") throw new DuplicateEventError("이미 올린 일정이에요.");
    throw new Error(res.error.message);
  }
  expireSite();
}

export const createRecord = (raw: RecordDraft, newNames: string[], by: string) => saveRecordRow(null, 0, raw, newNames, by);
export const updateRecord = (id: number, raw: RecordDraft, version: number, newNames: string[], by: string) => saveRecordRow(id, version, raw, newNames, by);

export async function deleteRecord(id: number, version: number, by: string): Promise<void> {
  const res = await db().from("company_records").delete().eq("id", id).eq("version", version).select("id");
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.length) throw new ConflictError("먼저 저장한 사람이 있어요.");
  await audit("delete", "record", id, by);
  expireSite();
}

/** 다른 줄과 이름이 겹치면 막는다. 동명이인이면 구분값을 붙여 둘 다 둔다 */
const keyFor = (name: string, sameNameOk: boolean) => (sameNameOk ? `${nameKey(name)}#${Date.now()}` : nameKey(name));

export async function createPerson(raw: PersonDraft, sameNameOk: boolean, by: string): Promise<void> {
  const d = normalizePerson(raw);
  const made = await db()
    .from("credit_people")
    .insert({ name: d.name, name_key: keyFor(d.name, sameNameOk), role: d.role, github: nullIfEmpty(d.github), prior_count: d.priorCount, visible: d.visible, updated_by: by, updated_at: new Date().toISOString() })
    .select("id")
    .single();
  if (made.error) {
    if (made.error.code === "23505") throw new DuplicateNameError("이미 명단에 있는 이름이에요.");
    throw new Error(made.error.message);
  }
  await audit("create", "person", Number(made.data.id), by);
  expireSite();
}

export async function updatePerson(id: number, raw: PersonDraft, version: number, sameNameOk: boolean, by: string): Promise<void> {
  const d = normalizePerson(raw);
  const current = await db().from("credit_people").select("name_key").eq("id", id).maybeSingle();
  if (current.error) throw new Error(current.error.message);
  if (!current.data) throw new ConflictError("이미 지워진 분이에요.");
  // 이름을 안 고쳤으면 동명이인 구분값을 그대로 둔다
  const sameName = String(current.data.name_key).split("#")[0] === nameKey(d.name);
  const res = await db()
    .from("credit_people")
    .update({
      name: d.name,
      name_key: sameName ? current.data.name_key : keyFor(d.name, sameNameOk),
      role: d.role,
      github: nullIfEmpty(d.github),
      prior_count: d.priorCount,
      visible: d.visible,
      version: version + 1,
      updated_by: by,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("version", version)
    .select("id");
  if (res.error) {
    if (res.error.code === "23505") throw new DuplicateNameError("이미 명단에 있는 이름이에요.");
    throw new Error(res.error.message);
  }
  if (!res.data?.length) throw new ConflictError("먼저 저장한 사람이 있어요.");
  await audit("update", "person", id, by);
  expireSite();
}

/** 본인이 빼 달라고 할 때. 줄을 진짜로 지우고(참여 기록도 함께) 고친 기록에는 번호만 남긴다 */
export async function deletePerson(id: number, version: number, by: string): Promise<void> {
  const res = await db().from("credit_people").delete().eq("id", id).eq("version", version).select("id");
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.length) throw new ConflictError("먼저 저장한 사람이 있어요.");
  await audit("delete", "person", id, by);
  expireSite();
}

export async function skipCandidate(eventId: number): Promise<void> {
  const res = await db().from("company_record_skips").upsert({ event_id: eventId }, { ignoreDuplicates: true });
  if (res.error) throw new Error(res.error.message);
}
