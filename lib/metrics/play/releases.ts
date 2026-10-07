/**
 * Android 출시를 지표 차트의 일정(metrics_events)에 자동으로 넣는다 (#147). iOS 는 appstore/releases.ts.
 *
 * Play 의 출시 기록(트랙 API)은 출시 권한이 있어야 읽혀서, Play Developer Reporting API 의
 * fetchReleaseFilterOptions 로 "지금 프로덕션 트랙에 나가 있는 버전"을 매일 본다(보기 권한으로 된다).
 * 그 값이 바뀐 날을 출시일로 적는다. 매일 아침(한국 5시 43분) 보므로 바뀐 걸 처음 본 날의 전날을 출시일로 둔다.
 * 한국 낮에 출시하면 다음 날 아침에 보이기 때문이다.
 *
 * 이 API 는 출시 날짜를 주지 않고 지금 상태만 준다. 그래서 처음 본 버전은 언제 나갔는지 몰라 일정에 넣지 않고
 * 기록만 남긴다(play_daily report=release). 그 뒤로 바뀌는 버전부터 들어간다. 지난 출시는 사람이 일정에 넣는다.
 *
 * 버전별 설치 파일로 찾지 않는 이유는 docs/metrics-collection.md "Android 출시 일정"(행사 날이 출시일로 잡혔다).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceAccountFromEnv, serviceAccountToken } from "../google.ts";
import { PLAY_PACKAGE } from "../config.ts";
import { check, insertChunks } from "../db.ts";
import { addDays, todayIn } from "../dates.ts";

export const androidReleaseLabel = (name: string) => `Android ${name} 출시`;

type FilterOptions = {
  tracks?: { displayName?: string; type?: string; servingReleases?: { displayName?: string; versionCodes?: string[] }[] }[];
};

/**
 * 프로덕션 트랙에 나가 있는 버전. 단계적 출시 중이면 두 버전이 함께 나가므로 코드가 큰 쪽.
 * 이름은 "365 (3.1.24)" 의 괄호 안. 괄호가 없으면 코드를 그대로 쓴다
 */
export function productionRelease(opts: FilterOptions): { code: string; name: string } | null {
  const track = opts.tracks?.find((t) => t.displayName === "production");
  const releases = (track?.servingReleases ?? [])
    .map((r) => {
      const code = [...(r.versionCodes ?? [])].sort((a, b) => Number(b) - Number(a))[0];
      const name = r.displayName?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? code;
      return code ? { code, name } : null;
    })
    .filter((r): r is { code: string; name: string } => !!r);
  return releases.sort((a, b) => Number(b.code) - Number(a.code))[0] ?? null;
}

/**
 * 오늘 본 프로덕션 버전으로 무엇을 남길지. seen 은 지금까지 본 버전 코드.
 * 처음 보는 버전이면 기록하고, 전에 본 버전이 하나라도 있을 때만 일정에 넣는다(맨 처음 본 버전은 출시일을 모른다)
 */
export function releaseToRecord(
  seen: string[],
  current: { code: string; name: string } | null,
  todaySeoul: string,
): { record: { code: string; name: string; day: string } | null; event: { day: string; label: string } | null } {
  if (!current || seen.includes(current.code)) return { record: null, event: null };
  const day = addDays(todaySeoul, -1);
  return { record: { ...current, day }, event: seen.length > 0 ? { day, label: androidReleaseLabel(current.name) } : null };
}

/** 매일 수집 끝에 부른다. 넣은 일정 수를 돌려준다. 실패해도 수집은 성공으로 둔다(부르는 쪽이 잡는다) */
export async function recordAndroidRelease(client: SupabaseClient, now: Date = new Date()): Promise<{ version: string | null; added: number }> {
  const token = await serviceAccountToken(serviceAccountFromEnv(), "https://www.googleapis.com/auth/playdeveloperreporting");
  const res = await fetch(`https://playdeveloperreporting.googleapis.com/v1beta1/apps/${PLAY_PACKAGE}:fetchReleaseFilterOptions`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Play 출시 정보 HTTP ${res.status}`);
  const current = productionRelease((await res.json()) as FilterOptions);
  // 본 버전은 play_daily 에 report=release 로 남긴다(key 는 "코드|이름", day 는 출시일로 본 날)
  const rows = check(await client.from("play_daily").select("key").eq("report", "release").eq("dim", "production"), "Play 출시 기록 읽기") as { key: string }[];
  const { record, event } = releaseToRecord(
    rows.map((r) => r.key.split("|")[0]),
    current,
    todayIn("Asia/Seoul", now),
  );
  if (record) await insertChunks(client, "play_daily", [{ report: "release", dim: "production", key: `${record.code}|${record.name}`, day: record.day, metric: "seen", value: 1 }]);
  let added = 0;
  if (event) {
    const { data } = await client.from("metrics_events").select("id").eq("label", event.label).limit(1);
    if (!data?.length && !(await client.from("metrics_events").insert(event)).error) added = 1;
  }
  return { version: current ? `${current.name} (${current.code})` : null, added };
}
