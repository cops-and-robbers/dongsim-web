/**
 * App Store 출시를 지표 차트의 일정(metrics_events)에 자동으로 넣는다 (#145, #147). Android 는 play/releases.ts.
 *
 * 매일 아침 App Store Connect API 의 버전 목록(appStoreVersions)에서 지금 배포 중인 버전을 보고,
 * 일정에 없는 버전이면 "iOS x.y.z 출시"를 처음 본 날의 전날로 넣는다. 한국 낮에 출시하면 다음 날 아침에 보이기 때문이다.
 * Android 와 같은 방식이다.
 *
 * 예전에는 판매 리포트의 Version 칸으로 "처음 받아진 날"을 출시일로 봤다. App Store Connect 버전 기록의
 * "배포 준비됨" 날짜와 견주니(2026-10-08) 30개 중 6개가 하루 어긋났다(3.1.5 는 출시 9/18 인데 9/17 에 잡혔다).
 * 다운로드가 적은 때는 아예 못 잡았다(4월 앞쪽 출시). 그래서 지금 배포 중인 버전을 직접 묻는 쪽으로 바꿨다.
 * 버전 목록에는 출시한 날이 없어서(만든 날만 있다) 날짜는 처음 본 날로 정한다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ASC_API, ascJson } from "./auth.ts";
import { APPSTORE_APP_ID } from "../config.ts";
import { addDays, todayIn } from "../dates.ts";

export const releaseLabel = (version: string) => `iOS ${version} 출시`;

/** "3.1.20" 끼리 크기 비교 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

type VersionAttrs = { versionString?: string; appVersionState?: string; appStoreState?: string };

/** 지금 App Store 에 나가 있는 버전 중 가장 높은 것. 심사 중이거나 준비 중인 버전은 뺀다 */
export function liveVersion(versions: VersionAttrs[]): string | null {
  const live = versions
    .filter((v) => v.versionString && (v.appVersionState === "READY_FOR_DISTRIBUTION" || v.appStoreState === "READY_FOR_SALE"))
    .map((v) => v.versionString as string)
    .sort((a, b) => compareVersion(b, a));
  return live[0] ?? null;
}

/** 일정에 없는 배포 버전이면 전날 날짜로 넣을 일정 하나 */
export function iosReleaseToAdd(labels: string[], live: string | null, todaySeoul: string): { day: string; label: string } | null {
  if (!live || labels.includes(releaseLabel(live))) return null;
  return { day: addDays(todaySeoul, -1), label: releaseLabel(live) };
}

/** 매일 수집 때 부른다. 넣은 일정 수. 일정 테이블(0004)이 없으면 아무것도 하지 않는다 */
export async function recordIosRelease(client: SupabaseClient, token: string, now: Date = new Date()): Promise<number> {
  const body = await ascJson(`${ASC_API}/apps/${APPSTORE_APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appVersionState,appStoreState`, token);
  const live = liveVersion(((body.data as { attributes: VersionAttrs }[] | undefined) ?? []).map((d) => d.attributes));
  const { data, error } = await client.from("metrics_events").select("label").like("label", "iOS % 출시");
  if (error) return 0;
  const add = iosReleaseToAdd(((data ?? []) as { label: string }[]).map((r) => r.label), live, todayIn("Asia/Seoul", now));
  if (!add) return 0;
  return (await client.from("metrics_events").insert(add)).error ? 0 : 1;
}
