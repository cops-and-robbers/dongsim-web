import type { FieldChange } from "./model.ts";

/** 앞 기록의 칸에 이번 칸을 겹친다. 값 칸은 처음의 "전"과 이번의 "후", 목록은 다시 계산할 수 없어 이번 것을 쓴다 */
export function mergeFields(prev: FieldChange[], next: FieldChange[]): FieldChange[] {
  const out = new Map(prev.map((f) => [f.label, f]));
  for (const f of next) {
    const p = out.get(f.label);
    if (p && (p.kind === "value" || p.kind === "image") && f.kind === p.kind) {
      const merged = { ...f, before: p.before };
      if ((merged.before ?? null) === (merged.after ?? null)) out.delete(f.label);
      else out.set(f.label, merged);
    } else out.set(f.label, f);
  }
  return [...out.values()];
}
