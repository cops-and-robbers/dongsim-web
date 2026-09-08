import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { collectGarbage, type GcReport } from "@/lib/blog/sync/gc";
import { syncFromNotion, type SyncedSlug } from "@/lib/blog/sync/sync";
import { SITE_URL } from "@/lib/constants";

/**
 * 노션 → DB 동기화 트리거 (#109).
 *
 * 공개된 주소라 토큰(Authorization 헤더)으로 막는다. 부르는 곳은 둘 -
 * 어드민의 동기화 버튼(/api/admin/blog-sync 경유)과 6시간 크론(GitHub Actions).
 *
 * 응답은 무엇이 되었고 무엇이 안 되었는지를 그대로 담는다. 부분 성공을 200으로
 * 돌리면 아무도 알아채지 못한 채 사이트가 어긋난다.
 */

// 이미지 이관까지 붙으면 시간이 늘어난다. Hobby 플랜 상한이 300초다.
export const maxDuration = 300;

/** 글의 화면 경로. 언어가 경로에 들어간다 (ko 는 접두 없음). */
function pathOf({ slug, locale }: SyncedSlug): string {
  const prefix = locale === "ko" ? "" : `/${locale}`;
  return `${prefix}/blog/${slug}`;
}

/*
  버린 캐시를 미리 데운다.

  revalidatePath 는 캐시를 "낡음"으로 표시만 한다. 다시 만드는 일은 다음 요청이
  한다. 그래서 동기화 직후 처음 들어온 사람은 옛 화면을 받는다 - 글을 쓰고 바로
  확인하는 사람이 늘 그 첫 사람이라 "발행했는데 안 보인다"가 된다.

  한 번으로는 모자란다. 첫 요청이 받는 것은 아직 옛 화면이고, 그것이 캐시에
  새것으로 앉을 수 있다. 잠깐 두고 한 번 더 부른다 - 두 번째가 새 화면이다.

  실패해도 그냥 둔다 - 데우지 못하면 예전처럼 첫 방문자가 재생성을 시작할 뿐,
  잘못된 화면이 나가지는 않는다. 닫혀야 할 주소만은 예외다(confirmClosed).
*/
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function hit(path: string): Promise<number> {
  const res = await fetch(`${SITE_URL}${path}`, {
    // 캐시를 데우는 것이 목적이므로 응답 내용은 쓰지 않는다
    headers: { "user-agent": "dongsim blog sync warmer" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return res.status;
}

async function warm(paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map(hit));
  await sleep(1500);
  await Promise.allSettled(paths.map(hit));
}

/**
 * 닫혀야 할 주소가 정말 닫혔는지 본다.
 *
 * 지운 글과 발행을 내린 글은 404 가 되어야 한다. 여기서 확인하지 않으면
 * 초안이 공개된 채로 남는다. 재생성이 끝나기까지 시간이 걸리므로 몇 번 다시
 * 보고, 그래도 열려 있는 주소는 돌려줘 호출자가 응답을 실패로 만든다.
 */
async function confirmClosed(paths: string[]): Promise<string[]> {
  let left = paths;
  for (let attempt = 0; attempt < 3 && left.length > 0; attempt++) {
    if (attempt > 0) await sleep(2000);
    const codes = await Promise.allSettled(left.map(hit));
    left = left.filter((_, i) => {
      const c = codes[i];
      return !(c.status === "fulfilled" && c.value === 404);
    });
  }
  return left;
}

function authorized(req: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  // 헤더로만 받는다. 쿼리 스트링 토큰은 접속 로그·리퍼러로 새는 통로라 지원하지
  // 않는다 - 손으로 누를 일은 어드민의 동기화 버튼이 맡는다 (#109 3단계).
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromHeader === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // 노션이 빈 목록을 줘도 지우려면 ?force=1 을 붙인다.
    // 북마크에는 넣지 않는다 - 늘 켜져 있으면 장치가 없는 것과 같다.
    const force = new URL(req.url).searchParams.get("force") === "1";
    // ?full=1 - 빠른 건너뜀 없이 전 글 재변환. 변환기 배포 뒤 한 번 돌린다.
    const full = new URL(req.url).searchParams.get("full") === "1";
    const result = await syncFromNotion({ allowEmpty: force, full });

    /*
      캐시를 버린다. 공개 화면은 ISR 캐시되므로 여기서 버려 주지 않으면 글을
      고쳐도 재검증 주기가 지날 때까지 옛것이 나간다.

      지워진 글도 버린다 - 안 그러면 노션에서 지운 글이 캐시에 남아 계속 열린다.
      바뀐 것이 없어 건너뛴 글은 버리지 않는다 - 버릴 이유가 없다.
      목록은 세 언어 라우트가 따로 캐시되므로 전부 버린다.
    */
    const closed = [...result.removed, ...result.unpublished].map(pathOf);
    const paths = [
      "/blog",
      "/en/blog",
      "/ja/blog",
      "/sitemap.xml",
      "/rss.xml",
      ...result.synced.map(pathOf),
      ...closed,
    ];
    for (const path of paths) revalidatePath(path);

    // 버리기만 하면 첫 방문자가 옛것을 받는다. 여기서 미리 데운다.
    await warm(paths);

    // 닫혀야 할 주소는 데우는 것으로 끝내지 않고 확인한다.
    const stillPublic = await confirmClosed(closed);

    /*
      고아 이미지 정리 (#109 3단계). 동기화 뒤에 돌아야 참조 목록이 최신이다.
      ?gc=dry 는 세기만, ?gc=run 은 지우기까지. 평소 동기화에는 안 붙인다 -
      버킷 전체 목록을 매번 도는 것은 낭비고, 지우기는 사람이 명시할 일이다.
      정리 실패가 발행을 막으면 안 되므로 오류는 응답에 담고 넘어간다.
    */
    const gcMode = new URL(req.url).searchParams.get("gc");
    let gc: (GcReport & { error?: string }) | undefined;
    if (gcMode === "dry" || gcMode === "run") {
      try {
        const report = await collectGarbage(gcMode === "run");
        // 고아가 수백 개면 응답이 비대해진다. 수는 그대로, 목록은 앞부분만.
        gc = { ...report, orphans: report.orphans.slice(0, 50) };
      } catch (e) {
        gc = {
          scanned: 0,
          referenced: 0,
          orphans: [],
          tooFresh: 0,
          deleted: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    /*
      한 글이라도 실패했으면 실패로 응답한다.
      이미지 이관 실패도 같이 본다 - 남은 노션 URL은 곧 만료돼 그림이 깨진다.
      지우기를 멈춘 것도, 아직 열려 있는 초안도 실패다.

      모르는 태그는 실패로 보지 않는다. 글자는 살아 있어 읽는 데 지장이 없고,
      이것까지 500으로 막으면 발행이 통째로 선다. 대신 응답에 담아 눈에 띄게 한다.
    */
    const ok =
      result.failed.length === 0 &&
      result.imageFailures.length === 0 &&
      stillPublic.length === 0 &&
      !result.removalBlocked;
    return NextResponse.json(
      { ...result, stillPublic, ...(gc ? { gc } : {}) },
      { status: ok ? 200 : 500 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
