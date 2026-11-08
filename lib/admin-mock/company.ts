// 로컬에서 회사 소개 화면을 만져 보는 가짜 저장소(#250). dev 에서는 MSW 가 이 값으로 답해 실제 사이트에 닿지 않는다. 이름은 전부 지어낸 것이다.
import type { AuditRow, Candidate, CompanyBundle } from "@/lib/company/adminApi";
import { FALLBACK_RECORDS, SAMPLE_PEOPLE } from "@/lib/company/fallback";
import { nameKey, normalizePerson, normalizeRecord, validatePerson, validateRecord, type CompanyRecord, type CreditPerson, type PersonDraft, type RecordDraft } from "@/lib/company/model";

const BY = "테스트 관리자";
const at = () => new Date().toISOString();

let records: CompanyRecord[] = FALLBACK_RECORDS.map((r) => ({ ...r, updatedBy: BY, updatedAt: "2026-11-02T02:00:00.000Z" }));
let people: CreditPerson[] = SAMPLE_PEOPLE.map((p) => ({ ...p, updatedBy: BY, updatedAt: "2026-11-02T02:00:00.000Z" }));
let candidates: Candidate[] = [
  { id: 41, day: "2026-10-24", label: "노원 청소년축제 부스", category: "event" },
  { id: 37, day: "2026-10-03", label: "3차 QA", category: "test" },
  { id: 33, day: "2026-09-19", label: "서대페 부스", category: "event" },
];
let audit: AuditRow[] = [{ id: 1, action: "update", target: "record", targetId: 4, actor: BY, at: "2026-11-02T02:00:00.000Z" }];

let nextRecord = 100;
let nextPerson = 100;
let nextAudit = 2;

const note = (action: AuditRow["action"], target: AuditRow["target"], targetId: number) => {
  audit = [{ id: nextAudit++, action, target, targetId, actor: BY, at: at() }, ...audit].slice(0, 10);
};

export const mockCompany = (): CompanyBundle => ({ records, people, candidates: candidates.filter((c) => !records.some((r) => r.eventId === c.id)), audit, writable: true });

type Result = { status: number; body: unknown };
const ok = (): Result => ({ status: 200, body: mockCompany() });
const bad = (error: string, status = 400, code?: string): Result => ({ status, body: { error, code } });
const CONFLICT = "다른 분이 먼저 저장했어요. 새로 불러온 값을 보고 다시 고쳐 주세요.";

function ensure(names: string[]): number[] {
  return names.map((raw) => {
    const name = raw.trim();
    const found = people.find((p) => nameKey(p.name) === nameKey(name));
    if (found) return found.id;
    const id = nextPerson++;
    people = [...people, { id, name, role: "qa", github: "", priorCount: 0, visible: true, version: 1, updatedBy: BY, updatedAt: at() }];
    return id;
  });
}

export function mockSaveRecord(id: number | null, body: { record: RecordDraft; version: number; newNames?: string[] }): Result {
  const problem = Object.values(validateRecord(body.record))[0];
  if (problem) return bad(problem);
  const clean = normalizeRecord(body.record);
  const attendees = clean.kind === "qa" ? [...new Set([...clean.attendees, ...ensure(body.newNames ?? [])])] : [];
  if (id === null) {
    const made = nextRecord++;
    records = [...records, { ...clean, attendees, id: made, version: 1, updatedBy: BY, updatedAt: at() }];
    note("create", "record", made);
    return ok();
  }
  const current = records.find((r) => r.id === id);
  if (!current || current.version !== body.version) return bad(CONFLICT, 409);
  records = records.map((r) => (r.id === id ? { ...clean, attendees, id, version: r.version + 1, updatedBy: BY, updatedAt: at() } : r));
  note("update", "record", id);
  return ok();
}

export function mockRemoveRecord(id: number, version: number): Result {
  if (records.find((r) => r.id === id)?.version !== version) return bad(CONFLICT, 409);
  records = records.filter((r) => r.id !== id);
  note("delete", "record", id);
  return ok();
}

export function mockSavePerson(id: number | null, body: { person: PersonDraft; version: number; sameNameOk?: boolean }): Result {
  const problem = Object.values(validatePerson(body.person))[0];
  if (problem) return bad(problem);
  const clean = normalizePerson(body.person);
  if (!body.sameNameOk && people.some((p) => p.id !== id && nameKey(p.name) === nameKey(clean.name))) {
    return bad("이미 명단에 있는 이름이에요. 같은 분이면 기존 항목을 고쳐 주세요.", 409, "duplicate-name");
  }
  if (id === null) {
    const made = nextPerson++;
    people = [...people, { ...clean, id: made, version: 1, updatedBy: BY, updatedAt: at() }];
    note("create", "person", made);
    return ok();
  }
  const current = people.find((p) => p.id === id);
  if (!current || current.version !== body.version) return bad(CONFLICT, 409);
  people = people.map((p) => (p.id === id ? { ...clean, id, version: p.version + 1, updatedBy: BY, updatedAt: at() } : p));
  note("update", "person", id);
  return ok();
}

export function mockRemovePerson(id: number, version: number): Result {
  if (people.find((p) => p.id === id)?.version !== version) return bad(CONFLICT, 409);
  people = people.filter((p) => p.id !== id);
  records = records.map((r) => ({ ...r, attendees: r.attendees.filter((a) => a !== id) }));
  note("delete", "person", id);
  return ok();
}

export function mockSkipEvent(eventId: number): Result {
  candidates = candidates.filter((c) => c.id !== eventId);
  return ok();
}
