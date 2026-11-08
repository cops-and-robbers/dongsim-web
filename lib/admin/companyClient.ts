// 어드민 화면에서 동심지키미 소개 경로를 부른다(#250). 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(eventsClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { CompanyBundle } from "@/lib/company/adminApi";
import type { PersonDraft, RecordDraft } from "@/lib/company/model";

/** 남이 먼저 저장했을 때. 화면은 새로 불러와 다시 고치게 한다 */
export class CompanyConflict extends Error {}
/** 명단에 같은 이름이 있을 때. 화면은 동명이인인지 묻는다 */
export class DuplicateName extends Error {}

async function call(url: string, init?: RequestInit): Promise<Response> {
  const send = () =>
    fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${getAccessToken() ?? ""}` },
      cache: "no-store",
    });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function read(res: Response): Promise<CompanyBundle> {
  const body = (await res.json().catch(() => ({}))) as CompanyBundle & { error?: string; code?: string };
  if (body.code === "duplicate-name") throw new DuplicateName(body.error ?? "이미 명단에 있는 이름이에요.");
  if (res.status === 409) throw new CompanyConflict(body.error ?? "다른 분이 먼저 저장했어요.");
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const fetchCompany = async () => read(await call("/api/admin/company"));

export const saveRecord = async (id: number | null, record: RecordDraft, version: number, newNames: string[]) =>
  read(await call(`/api/admin/company/records${id ? `?id=${id}` : ""}`, json(id ? "PUT" : "POST", { record, version, newNames })));
export const removeRecord = async (id: number, version: number) => read(await call(`/api/admin/company/records?id=${id}&version=${version}`, { method: "DELETE" }));

export const savePerson = async (id: number | null, person: PersonDraft, version: number, sameNameOk: boolean) =>
  read(await call(`/api/admin/company/people${id ? `?id=${id}` : ""}`, json(id ? "PUT" : "POST", { person, version, sameNameOk })));
export const removePerson = async (id: number, version: number) => read(await call(`/api/admin/company/people?id=${id}&version=${version}`, { method: "DELETE" }));

export const skipEvent = async (eventId: number) => read(await call("/api/admin/company/skips", json("POST", { eventId })));
