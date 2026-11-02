// 목록 화면의 필터와 페이지를 주소 문자열과 오가게 하는 규칙. 화면은 lib/admin/useListParams.ts 로 쓴다.

/** 고를 수 있는 값 목록(첫 값이 기본값) 또는 자유 입력("text", 기본값은 빈 문자열). */
export type ParamSpec = readonly string[] | "text";
export type ListSchema = Record<string, ParamSpec>;

export type ListValues<S extends ListSchema> = {
  [K in keyof S]: S[K] extends readonly (infer V)[] ? V : string;
} & { page: number };

const fallbackOf = (spec: ParamSpec) => (spec === "text" ? "" : spec[0]);

/** 사람이 고쳐도 되는 주소라 틀린 값은 기본값으로 읽는다. 페이지는 주소에서 1부터, 코드에서 0부터. */
export function readListParams<S extends ListSchema>(search: string, schema: S): ListValues<S> {
  const params = new URLSearchParams(search);
  const values: Record<string, string | number> = {};
  for (const [key, spec] of Object.entries(schema)) {
    const raw = params.get(key);
    if (spec === "text") values[key] = raw?.trim() ?? "";
    else values[key] = raw !== null && spec.includes(raw) ? raw : spec[0];
  }
  const page = params.get("page") ?? "";
  // 서버의 페이지 번호는 32비트 정수라 긴 숫자는 받지 않는다
  values.page = /^[1-9]\d{0,5}$/.test(page) ? Number(page) - 1 : 0;
  return values as ListValues<S>;
}

/**
 * 바뀐 값만 반영한 주소 문자열을 돌려준다. 기본값은 지워서 주소를 짧게 둔다.
 * 필터가 바뀌면 페이지는 첫 페이지로 돌아간다. 같은 값을 다시 고르면 페이지를 건드리지 않는다.
 */
export function patchListParams<S extends ListSchema>(
  search: string,
  schema: S,
  patch: Partial<ListValues<S>>
): string {
  const params = new URLSearchParams(search);
  const before = readListParams(search, schema) as Record<string, string | number>;
  let filterChanged = false;

  for (const [key, spec] of Object.entries(schema)) {
    const value = (patch as Record<string, string | undefined>)[key];
    if (value === undefined) continue;
    if (value !== before[key]) filterChanged = true;
    if (value === fallbackOf(spec)) params.delete(key);
    else params.set(key, value);
  }

  const page = (patch as { page?: number }).page ?? (filterChanged ? 0 : Number(before.page));
  if (page === 0) params.delete("page");
  else params.set("page", String(page + 1));

  return params.toString();
}
