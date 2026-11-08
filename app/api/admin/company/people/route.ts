import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore } from "@/lib/event/adminApi";
import { companyError, parseId, parsePerson, parseVersion } from "@/lib/company/adminApi";
import { validatePerson } from "@/lib/company/model";
import { ConflictError, DuplicateNameError, createPerson, deletePerson, readBundle, updatePerson } from "@/lib/company/server";

/**
 * 고마운 분들 한 사람을 넣고, 고치고, 지운다 (#250).
 *
 * POST           { person, sameNameOk }           CompanyBundle
 * PUT    ?id=12  { person, version, sameNameOk }  연 뒤에 남이 먼저 저장했으면 409
 * DELETE ?id=12&version=3                         이름과 참여 기록을 진짜로 지운다
 *
 * 이름이 겹치면 409 { code: "duplicate-name" }. 동명이인이면 sameNameOk 로 다시 보낸다
 */

async function allowed(req: Request): Promise<{ token: string } | NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "실제 사이트의 관리 화면에서만 바꿀 수 있어요." }, { status: 403 });
  return checked;
}

function failure(e: unknown): NextResponse {
  if (e instanceof ConflictError) return NextResponse.json({ error: "다른 분이 먼저 저장했어요. 새로 불러온 값을 보고 다시 고쳐 주세요." }, { status: 409 });
  if (e instanceof DuplicateNameError) return NextResponse.json({ error: "이미 명단에 있는 이름이에요. 같은 분이면 기존 항목을 고쳐 주세요.", code: "duplicate-name" }, { status: 409 });
  return companyError(e);
}

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await allowed(req);
  if (checked instanceof NextResponse) return checked;
  const body = (await req.json().catch(() => null)) as { person?: unknown; sameNameOk?: unknown } | null;
  const person = parsePerson(body?.person);
  if (!person) return NextResponse.json({ error: "입력한 내용이 올바르지 않아요." }, { status: 400 });
  const problem = Object.values(validatePerson(person))[0];
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    await createPerson(person, body?.sameNameOk === true, await actorName(checked.token));
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return failure(e);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await allowed(req);
  if (checked instanceof NextResponse) return checked;
  const id = parseId(req);
  const body = (await req.json().catch(() => null)) as { person?: unknown; version?: unknown; sameNameOk?: unknown } | null;
  const person = parsePerson(body?.person);
  if (!id || !person || typeof body?.version !== "number") return NextResponse.json({ error: "입력한 내용이 올바르지 않아요." }, { status: 400 });
  const problem = Object.values(validatePerson(person))[0];
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    await updatePerson(id, person, body.version, body.sameNameOk === true, await actorName(checked.token));
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
  if (!id || !version) return NextResponse.json({ error: "지울 분을 다시 골라 주세요." }, { status: 400 });
  try {
    await deletePerson(id, version, await actorName(checked.token));
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return failure(e);
  }
}
