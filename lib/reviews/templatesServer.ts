/**
 * 리뷰 답변 문구의 읽기와 저장 (docs/admin-ui.md "리뷰"). 서버 전용이다.
 */
import { db } from "@/lib/metrics/db";
import type { Fit, ReplyTemplate, TemplateInput, TemplateList } from "./templates";

const TABLE = "review_reply_templates";
const COLUMNS = "id,title,fit,body_ko,body_en,body_ja,updated_by,updated_at";

type Row = { id: number; title: string; fit: Fit; body_ko: string; body_en: string; body_ja: string; updated_by: string; updated_at: string };

const toTemplate = (r: Row): ReplyTemplate => ({ id: r.id, title: r.title, fit: r.fit, bodies: { ko: r.body_ko, en: r.body_en, ja: r.body_ja }, updatedBy: r.updated_by, updatedAt: r.updated_at });
const toRow = (t: TemplateInput, actor: string) => ({ title: t.title.trim(), fit: t.fit, body_ko: t.bodies.ko.trim(), body_en: t.bodies.en.trim(), body_ja: t.bodies.ja.trim(), updated_by: actor, updated_at: new Date().toISOString() });

export class TemplateConflict extends Error {}

export async function listTemplates(): Promise<TemplateList> {
  const { data, error } = await db().from(TABLE).select(COLUMNS).order("created_at", { ascending: true });
  if (error) {
    console.error("[review-templates] 읽기", error.message);
    return { templates: [], writable: false, readOnlyReason: "답변 문구 표가 아직 없어요. 0023 SQL 을 실행해 주세요." };
  }
  const production = process.env.VERCEL_ENV === "production";
  return { templates: ((data ?? []) as Row[]).map(toTemplate), writable: production, readOnlyReason: production ? undefined : "답변 문구는 운영 어드민에서만 저장돼요." };
}

export async function createTemplate(input: TemplateInput, actor: string): Promise<ReplyTemplate> {
  const { data, error } = await db().from(TABLE).insert(toRow(input, actor)).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toTemplate(data as Row);
}

/** 화면이 읽은 뒤 다른 사람이 고쳤으면 덮어쓰지 않는다 */
export async function updateTemplate(id: number, updatedAt: string, input: TemplateInput, actor: string): Promise<ReplyTemplate> {
  const { data, error } = await db().from(TABLE).update(toRow(input, actor)).match({ id, updated_at: updatedAt }).select(COLUMNS).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new TemplateConflict();
  return toTemplate(data as Row);
}

export async function deleteTemplate(id: number): Promise<void> {
  const { error } = await db().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
