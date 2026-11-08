/**
 * 어드민 "동심지키미 소개" 경로가 같이 쓰는 것 (#250).
 * 권한 확인과 운영 배포에서만 바꾸는 규칙은 행사 화면과 같다(lib/event/adminApi.ts).
 */
import { NextResponse } from "next/server";
import { LOCALES, RECORD_KINDS, type CompanyRecord, type CreditPerson, type PersonDraft, type RecordDraft, type RecordKind, type Translated } from "@/lib/company/model";

export type Candidate = { id: number; day: string; label: string; category: "event" | "test" };
export type AuditRow = { id: number; action: "create" | "update" | "delete"; target: "record" | "person"; targetId: number; actor: string; at: string };

export type CompanyBundle = {
  records: CompanyRecord[];
  people: CreditPerson[];
  candidates: Candidate[];
  audit: AuditRow[];
  writable: boolean;
};

const text = (v: unknown) => (typeof v === "string" ? v : "");

function translated(v: unknown): Translated {
  const source = (v ?? {}) as Record<string, unknown>;
  return Object.fromEntries(LOCALES.map((l) => [l, text(source[l])])) as Translated;
}

const positive = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v > 0;

/** 보낸 몸통을 저장 값으로. 모양이 틀리면 null */
export function parseRecord(v: unknown): RecordDraft | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if (!RECORD_KINDS.includes(b.kind as RecordKind)) return null;
  if (b.precision !== "day" && b.precision !== "month") return null;
  if (b.eventId !== null && b.eventId !== undefined && !positive(b.eventId)) return null;
  const attendees = Array.isArray(b.attendees) ? b.attendees : [];
  if (!attendees.every(positive)) return null;
  return {
    kind: b.kind as RecordKind,
    occurredOn: text(b.occurredOn),
    precision: b.precision,
    title: translated(b.title),
    badge: translated(b.badge),
    visible: b.visible !== false,
    eventId: (b.eventId as number | null | undefined) ?? null,
    attendees: attendees as number[],
  };
}

export function parsePerson(v: unknown): PersonDraft | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if (b.role !== "qa" && b.role !== "infra") return null;
  return { name: text(b.name), role: b.role, github: text(b.github), priorCount: typeof b.priorCount === "number" ? b.priorCount : -1, visible: b.visible !== false };
}

export const parseNewNames = (v: unknown): string[] => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);

export function parseVersion(req: Request): number | null {
  const version = Number(new URL(req.url).searchParams.get("version"));
  return Number.isInteger(version) && version > 0 ? version : null;
}

export function parseId(req: Request): number | null {
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** 표가 아직 없을 때(SQL 을 실행하기 전) 화면에 알려 줄 말 */
export function companyError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[company]", message);
  if (/company_|credit_people|qa_attendance/.test(message) && /does not exist|schema cache/.test(message)) {
    return NextResponse.json({ error: "동심지키미 소개 표가 아직 없어요. supabase/migrations/0019_company_profile.sql 을 Supabase 에서 실행해 주세요." }, { status: 503 });
  }
  return NextResponse.json({ error: "동심지키미 소개를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
}
