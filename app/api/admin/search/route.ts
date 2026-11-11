import { NextResponse } from "next/server";
import { guard, noStore } from "@/lib/event/adminApi";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { canSend, isMissingTable, loadSearchRows } from "@/lib/search/store";
import { buildSearchView, type SearchView } from "@/lib/search/view";
import { getAllPosts } from "@/lib/blog/store";

/**
 * 어드민 지표 "검색" 탭의 데이터 (#309).
 *
 * 지표 화면과 같은 기간을 받는다. ?from&to 는 이번 기간, ?pfrom&pto 는 비교 기간(비교를 끄면 없음).
 * 구글 판정과 새 페이지는 기간과 상관없이 오늘 기준이다.
 */

export type SearchResponse = SearchView & { writable: boolean };
export type SearchSetup = { setup: { tables: boolean } };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const q = new URL(req.url).searchParams;
  const today = todayIn("Asia/Seoul");
  const from = q.get("from") ?? addDays(today, -28);
  const to = q.get("to") ?? addDays(today, -1);
  const pfrom = q.get("pfrom");
  const pto = q.get("pto");
  if (![from, to].every((d) => YMD.test(d)) || from > to) return NextResponse.json({ error: "기간 형식이 달라요." }, { status: 400 });
  const previous = pfrom && pto && YMD.test(pfrom) && YMD.test(pto) && pfrom <= pto ? { start: pfrom, end: pto } : null;
  try {
    const [rows, posts] = await Promise.all([
      loadSearchRows(today, previous && previous.start < from ? previous.start : from, to),
      // 글 제목을 못 읽어도 주소로 보이면 된다
      getAllPosts().catch(() => []),
    ]);
    const titles = new Map(posts.map((p) => [`${p.locale}/${p.slug}`, p.title]));
    const view = buildSearchView({ today, ...rows, range: { start: from, end: to }, previous, titles });
    return NextResponse.json({ ...view, writable: canSend() } satisfies SearchResponse, noStore);
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ setup: { tables: false } } satisfies SearchSetup, noStore);
    console.error("[search]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "검색 현황을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
