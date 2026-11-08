import type { PersonDraft, RecordDraft } from "@/lib/company/model";

// 어드민 동심지키미 소개에서 지금 고치는 것 (#250). 화면(왼쪽)과 미리보기(오른쪽)가 같은 값을 본다

export type Meta = { updatedBy?: string; updatedAt?: string };
export type RecordEdit = Meta & { type: "record"; id: number | null; version: number; draft: RecordDraft; newNames: string[] };
export type PersonEdit = Meta & { type: "person"; id: number | null; version: number; draft: PersonDraft; sameNameOk: boolean; duplicate: boolean };
export type Edit = RecordEdit | PersonEdit;
