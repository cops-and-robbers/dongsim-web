import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { actorName } from "@/lib/admin/server/remoteConfig";
import {
  isWebgameConnected,
  isWebgameWritable,
  readWebgameControl,
  webgameUrl,
  writeWebgameControl,
} from "@/lib/admin/server/webgame";
import { validateWebgameChange, type WebgameChange, type WebgameState } from "@/lib/admin/webgame";

/**
 * 어드민 "온라인 게임" (docs/admin-ui.md). 게임 서버의 운영 상태를 대신 읽고 바꾼다.
 *
 * GET                        WebgameState
 * PUT { mode, message, until } 바꾼 사람 이름은 화면이 보낸 값이 아니라 토큰으로 백엔드에 묻는다
 */

const noStore = { headers: { "Cache-Control": "no-store" } };

async function guard(req: Request): Promise<{ token: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });
  if (!isWebgameConnected()) return NextResponse.json({ error: "게임 서버 비밀값이 아직 연결되지 않았어요. docs/admin-ui.md를 확인해 주세요." }, { status: 503 });
  return { token };
}

const withEnv = (control: Awaited<ReturnType<typeof readWebgameControl>>): WebgameState => ({
  ...control,
  url: webgameUrl(),
  writable: isWebgameWritable(),
});

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  try {
    return NextResponse.json(withEnv(await readWebgameControl()), noStore);
  } catch (e) {
    console.error("[webgame] 읽기 실패", e);
    return NextResponse.json({ error: "게임 서버에서 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isWebgameWritable()) return NextResponse.json({ error: "운영 배포에서만 바꿀 수 있어요." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Partial<WebgameChange> | null;
  const invalid = validateWebgameChange(body);
  if (invalid || !body) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const change: WebgameChange = { mode: body.mode!, message: (body.message ?? "").trim(), until: body.until || null };
    const saved = await writeWebgameControl(change, await actorName(checked.token));
    return NextResponse.json(withEnv(saved), noStore);
  } catch (e) {
    console.error("[webgame] 바꾸기 실패", e);
    return NextResponse.json({ error: "게임 서버가 바꾸지 않았어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
