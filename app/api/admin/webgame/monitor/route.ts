import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import {
  isUsageConnected,
  isWebgameConnected,
  readWebgameLive,
  readWebgameResults,
  readWebgameUsage,
} from "@/lib/admin/server/webgame";
import type { WebgameMonitor } from "@/lib/admin/webgameMonitor";

/**
 * 어드민 "온라인 게임 > 모니터링" (docs/admin-ui.md). 판 결과, 도는 판 수, Cloudflare 사용량을 한 번에 돌려준다.
 * 세 곳은 따로 실패할 수 있어서, 하나가 실패해도 나머지는 그대로 보내고 실패한 칸만 errors 에 적는다.
 * 비밀값과 토큰은 이 경로에서만 쓰고 화면으로 내려보내지 않는다.
 */

const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const usageConnected = isUsageConnected();
  const [live, results, usage] = await Promise.allSettled([
    readWebgameLive(),
    isWebgameConnected() ? readWebgameResults() : Promise.reject(new Error("게임 서버 비밀값이 연결되지 않았어요")),
    usageConnected ? readWebgameUsage() : Promise.resolve(null),
  ]);
  const errors: WebgameMonitor["errors"] = {};
  const again = "불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
  if (live.status === "rejected") {
    console.error("[webgame-monitor] 도는 판 실패", live.reason);
    errors.live = again;
  }
  if (results.status === "rejected") {
    if (isWebgameConnected()) console.error("[webgame-monitor] 판 결과 실패", results.reason);
    errors.results = isWebgameConnected() ? again : "게임 서버 비밀값이 연결되지 않았어요.";
  }
  if (usage.status === "rejected") {
    console.error("[webgame-monitor] 사용량 실패", usage.reason);
    errors.usage = again;
  }
  const body: WebgameMonitor = {
    live: live.status === "fulfilled" ? live.value : null,
    results: results.status === "fulfilled" ? results.value : null,
    usage: usage.status === "fulfilled" ? usage.value : null,
    usageConnected,
    errors,
  };
  return NextResponse.json(body, noStore);
}
