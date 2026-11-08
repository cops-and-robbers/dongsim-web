import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore } from "@/lib/event/adminApi";
import { companyError, parseId, parseNewNames, parseRecord, parseVersion } from "@/lib/company/adminApi";
import { newNamesProblem, validateRecord } from "@/lib/company/model";
import { ConflictError, DuplicateEventError, createRecord, deleteRecord, readBundle, updateRecord } from "@/lib/company/server";

/**
 * 이력 하나를 넣고, 고치고, 지운다 (#250). 저장하면 사이트가 들고 있던 값을 바로 버린다.
 *
 * POST           { record, newNames }           CompanyBundle
 * PUT    ?id=12  { record, version, newNames }  연 뒤에 남이 먼저 저장했으면 409
 * DELETE ?id=12&version=3                       연 뒤에 남이 먼저 저장했으면 409
 */

const CONFLICT = "다른 분이 먼저 저장했어요. 새로 불러온 값을 보고 다시 고쳐 주세요.";

async function allowed(req: Request): Promise<{ token: string } | NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "실제 사이트의 관리 화면에서만 바꿀 수 있어요." }, { status: 403 });
  return checked;
}

function failure(e: unknown): NextResponse {
  if (e instanceof ConflictError) return NextResponse.json({ error: CONFLICT }, { status: 409 });
  if (e instanceof DuplicateEventError) return NextResponse.json({ error: e.message }, { status: 409 });
  return companyError(e);
}

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await allowed(req);
  if (checked instanceof NextResponse) return checked;
  const body = (await req.json().catch(() => null)) as { record?: unknown; newNames?: unknown } | null;
  const record = parseRecord(body?.record);
  if (!record) return NextResponse.json({ error: "입력한 내용이 올바르지 않아요." }, { status: 400 });
  const newNames = parseNewNames(body?.newNames);
  const problem = Object.values(validateRecord(record))[0] ?? newNamesProblem(newNames);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    await createRecord(record, newNames, await actorName(checked.token));
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return failure(e);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await allowed(req);
  if (checked instanceof NextResponse) return checked;
  const id = parseId(req);
  const body = (await req.json().catch(() => null)) as { record?: unknown; version?: unknown; newNames?: unknown } | null;
  const record = parseRecord(body?.record);
  if (!id || !record || typeof body?.version !== "number") return NextResponse.json({ error: "입력한 내용이 올바르지 않아요." }, { status: 400 });
  const newNames = parseNewNames(body.newNames);
  const problem = Object.values(validateRecord(record))[0] ?? newNamesProblem(newNames);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    await updateRecord(id, record, body.version, newNames, await actorName(checked.token));
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const checked = await allowed(req);
  if (checked instanceof NextResponse) return checked;
  const id = parseId(req);
  const version = parseVersion(req);
  if (!id || !version) return NextResponse.json({ error: "지울 이력을 다시 골라 주세요." }, { status: 400 });
  try {
    await deleteRecord(id, version, await actorName(checked.token));
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return failure(e);
  }
}
