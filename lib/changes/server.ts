/**
 * 변경 기록 저장과 모으기 (#313). 서버 전용이다.
 *
 * - recordChange: 저장하는 라우트가 성공한 뒤 부른다. 기록을 못 남겨도 저장은 이미 끝났으니 던지지 않는다
 *   (표가 아직 없을 때, 0028 마이그레이션 전에도 어드민이 멈추지 않게)
 * - loadChanges: 공통 표에 이미 따로 남던 기록 셋을 더해 한 모양으로 돌려준다.
 *   행사 저장본은 판 사이를 비교해 무엇이 바뀌었는지 만들고, 출시 조작과 회사 소개는 한 일만 있다
 */
import { db } from "@/lib/metrics/db";
import { diff as diffEvent, defaultSettings, normalize, type EventDay } from "@/lib/event/settings";
import { AREA, diffList, isChangeArea, type Change, type ChangeAction, type FieldChange } from "./model";
import { mergeFields } from "./merge";

export { mergeFields };

export type NewChange = Omit<Change, "id" | "at" | "status" | "note"> & { at?: string };

/**
 * mergeWithinMs 를 주면 같은 사람이 같은 대상을 그 시간 안에 다시 고친 것을 한 줄로 합친다.
 * 입력하는 동안 저절로 저장되는 칸(스토어 페이지 초안)이 한 글자마다 기록을 쌓지 않게.
 * 합칠 때 "전"은 처음 줄 것을, "후"는 이번 것을 쓰고, 결국 같아진 칸은 뺀다
 */
export async function recordChange(c: NewChange, opts: { mergeWithinMs?: number } = {}): Promise<void> {
  if (c.action === "edit" && c.fields.length === 0) return;
  try {
    if (opts.mergeWithinMs) {
      const since = new Date(Date.now() - opts.mergeWithinMs).toISOString();
      const { data: last } = await db().from("admin_changes").select("id, action, fields").eq("actor", c.actor).eq("area", c.area).eq("target", c.target.slice(0, 120)).gte("at", since).order("at", { ascending: false }).limit(1).maybeSingle();
      if (last) {
        const fields = mergeFields(last.fields as FieldChange[], c.fields);
        // 새로 만든 것을 곧바로 지웠으면 기록할 일이 없다
        if (last.action === "add" && c.action === "remove") return void (await db().from("admin_changes").delete().eq("id", last.id));
        const action: ChangeAction = last.action === "add" ? "add" : c.action;
        if (fields.length === 0 && action === "edit") return void (await db().from("admin_changes").delete().eq("id", last.id));
        await db().from("admin_changes").update({ at: new Date().toISOString(), action, fields, impact: c.impact ?? false }).eq("id", last.id);
        return;
      }
    }
    const { error } = await db()
      .from("admin_changes")
      .insert({ actor: c.actor, area: c.area, target: c.target.slice(0, 120), action: c.action, fields: c.fields, href: c.href ?? null, impact: c.impact ?? false, ...(c.at && { at: c.at }) });
    if (error) console.error("[changes] 기록 실패", error.message);
  } catch (e) {
    console.error("[changes] 기록 실패", e);
  }
}

export type Loaded = { changes: Change[]; missing: string[] };

/** from, to 는 ISO 시각. 각 출처를 못 읽으면 빼고, 빠진 출처 이름을 같이 돌려준다 */
export async function loadChanges(from: string, to: string): Promise<Loaded> {
  const missing: string[] = [];
  const parts = await Promise.all([
    common(from, to).catch(() => (missing.push("공통 기록(0028 마이그레이션 전이면 아직 없어요)"), [])),
    eventHistory(from, to).catch(() => (missing.push("행사 저장본"), [])),
    releaseActions(from, to).catch(() => (missing.push("출시 조작"), [])),
    companyAudit(from, to).catch(() => (missing.push("동심지키미 소개"), [])),
  ]);
  return { changes: parts.flat().sort((a, b) => (a.at < b.at ? 1 : -1)), missing };
}

async function common(from: string, to: string): Promise<Change[]> {
  const { data, error } = await db().from("admin_changes").select("id, at, actor, area, target, action, fields, href, impact").gte("at", from).lt("at", to).order("at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r) => isChangeArea(r.area))
    .map((r) => ({ id: `c${r.id}`, at: r.at, actor: r.actor, area: r.area, target: r.target, action: r.action as ChangeAction, fields: (r.fields ?? []) as FieldChange[], href: r.href ?? undefined, impact: r.impact }));
}

/** 행사 저장본. 판마다 바로 앞 판과 비교한다. 첫 판은 일정에서 만든 기본값과 비교한다 */
async function eventHistory(from: string, to: string): Promise<Change[]> {
  const { data: rows, error } = await db().from("event_settings_history").select("event_id, version, settings, updated_by, updated_at").lt("updated_at", to).order("version", { ascending: true }).limit(2000);
  if (error) throw new Error(error.message);
  const ids = [...new Set((rows ?? []).map((r) => r.event_id as number))];
  if (ids.length === 0) return [];
  const { data: evs, error: e2 } = await db().from("metrics_events").select("id, day, label, starts_at, ends_at").in("id", ids);
  if (e2) throw new Error(e2.message);
  const days = new Map<number, EventDay>((evs ?? []).map((e) => [e.id, { id: e.id, day: e.day, label: e.label, startsAt: e.starts_at, endsAt: e.ends_at }]));

  const out: Change[] = [];
  for (const id of ids) {
    const day = days.get(id);
    if (!day) continue;
    const base = defaultSettings(day);
    let prev = base;
    for (const r of (rows ?? []).filter((x) => x.event_id === id)) {
      const settings = normalize(r.settings, base);
      if (r.updated_at >= from) {
        const fields = diffEvent(prev, settings).map(eventField);
        out.push({
          id: `e${id}-${r.version}`,
          at: r.updated_at,
          actor: r.updated_by,
          area: "event",
          target: settings.name || day.label,
          action: r.version === 1 ? "add" : "edit",
          fields,
          href: `/admin/events/${id}`,
          impact: prev.boothClosed !== settings.boothClosed,
        });
      }
      prev = settings;
    }
  }
  return out;
}

/** 행사 비교 줄을 기록 줄로. 프레임 목록은 더하고 뺀 것으로 나눈다. 칸 이름 뒤의 "· 바뀌는 곳"은 뗀다 */
function eventField(d: { key: string; label: string; before: string; after: string }): FieldChange {
  const label = d.label.split(" · ")[0];
  if (d.key === "kiosk.frames") {
    const split = (s: string) => (s ? s.split(", ") : []);
    return diffList(label, split(d.before), split(d.after)) ?? { kind: "value", label, before: d.before, after: d.after };
  }
  return { kind: "value", label, before: d.before || null, after: d.after || null };
}

const RELEASE_LABEL: Record<string, string> = {
  "ios.renameVersion": "버전 번호 맞추기",
  "ios.attachBuild": "빌드 붙이기",
  "ios.submit": "심사에 내기",
  "ios.cancelSubmission": "제출 취소",
  "ios.release": "지금 출시하기",
  "ios.phasedPause": "단계적 출시 멈추기",
  "ios.phasedResume": "단계적 출시 이어 가기",
  "ios.phasedComplete": "바로 모두에게",
  "android.createRelease": "심사에 내기",
  "android.rolloutSet": "출시 비율 바꾸기",
  "android.halt": "단계적 출시 멈추기",
  "android.resume": "단계적 출시 이어 가기",
  "android.complete": "바로 모두에게",
};
/** 사용자에게 바로 닿는 출시 조작. 심사 제출, 버전 맞추기는 아직 사용자에게 안 보인다 */
const RELEASE_IMPACT = new Set(["ios.release", "ios.phasedPause", "ios.phasedResume", "ios.phasedComplete", "android.rolloutSet", "android.halt", "android.resume", "android.complete"]);

async function releaseActions(from: string, to: string): Promise<Change[]> {
  const { data, error } = await db().from("release_actions").select("id, platform, action, version, params, status, message, actor, created_at").gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const store = r.platform === "ios" ? "iOS" : "Android";
    const params = (r.params ?? {}) as { fraction?: number | null; fields?: string[] };
    // 스토어 페이지 "스토어로 보내기"도 같은 표에 남는다(action 이 ios.storeText 처럼 끝난다)
    if (r.action.endsWith(".storeText")) {
      return {
        id: `r${r.id}`,
        at: r.created_at,
        actor: r.actor,
        area: "store-page" as const,
        target: `${store} 스토어에 보내기 (${r.version})`,
        action: "run" as const,
        fields: params.fields?.length ? [{ kind: "list" as const, label: "보낸 칸", added: params.fields, removed: [] }] : [],
        href: AREA["store-page"].href,
        impact: true,
        status: r.status,
        note: r.status === "failed" ? (r.message ?? undefined) : undefined,
      };
    }
    const fields: FieldChange[] = typeof params.fraction === "number" ? [{ kind: "value", label: "출시 비율", before: null, after: `${Math.round(params.fraction * 100)}%` }] : [];
    return {
      id: `r${r.id}`,
      at: r.created_at,
      actor: r.actor,
      area: "release" as const,
      target: `${store} ${r.version} ${RELEASE_LABEL[r.action] ?? r.action}`,
      action: "run" as const,
      fields,
      href: AREA.release.href,
      impact: RELEASE_IMPACT.has(r.action),
      status: r.status,
      note: r.status === "failed" ? (r.message ?? undefined) : undefined,
    };
  });
}

const COMPANY_ACTION: Record<string, ChangeAction> = { create: "add", update: "edit", delete: "remove" };

async function companyAudit(from: string, to: string): Promise<Change[]> {
  const { data, error } = await db().from("company_audit").select("id, action, target, target_id, actor, at").gte("at", from).lt("at", to).order("at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const recIds = rows.filter((r) => r.target === "record").map((r) => r.target_id);
  const personIds = rows.filter((r) => r.target === "person").map((r) => r.target_id);
  const [recs, people] = await Promise.all([
    recIds.length ? db().from("company_records").select("id, title_ko").in("id", recIds) : Promise.resolve({ data: [] as { id: number; title_ko: string }[] }),
    personIds.length ? db().from("credit_people").select("id, name").in("id", personIds) : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);
  const title = new Map((recs.data ?? []).map((r) => [`record${r.id}`, r.title_ko]));
  for (const p of people.data ?? []) title.set(`person${p.id}`, p.name);
  // 회사 소개 기록은 한 일만 남아 값이 없다. 지운 것은 이름도 없어 "지운 이력" 처럼 적는다
  return rows.map((r) => ({
    id: `k${r.id}`,
    at: r.at,
    actor: r.actor,
    area: "company" as const,
    target: title.get(`${r.target}${r.target_id}`) ?? (r.target === "record" ? "지운 이력" : "지운 사람"),
    action: COMPANY_ACTION[r.action] ?? "edit",
    fields: [],
    href: AREA.company.href,
  }));
}
