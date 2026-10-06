/**
 * 주간 리포트의 숫자 (#146). 저장된 하루 지표를 한 주(월~일)로 더한다.
 * 입력만 보고 답하는 순수 함수라 테스트(weekly.test.mjs)가 숫자를 넣어 확인한다.
 *
 * 더해도 되는 숫자만 쓴다. 하루 도달(reach), 하루 사용자(activeUsers, totalUsers)는
 * 같은 사람을 여러 날 세서 일주일로 더하면 부풀려진다. 그래서 인스타는 조회,
 * 프로필 방문, 링크 클릭을, 앱은 이벤트 횟수를 더한다.
 *
 * 날짜 기준이 소스마다 다르다. 인스타 계정 지표와 App Store 판매는 미국 서부(PT) 날짜로,
 * GA4 와 AdMob 은 한국 날짜로 온다. PT 하루(D)는 한국 D일 오후 4~5시부터 D+1일 같은 시각까지라
 * 대부분 한국 D+1일과 겹친다. 그래서 PT 날짜는 하루 뒤로 옮겨 한국 주에 맞춘다(shiftPt).
 * 옮기지 않으면 월요일 아침에는 PT 일요일 숫자가 아직 없어서 한 주가 6일로 잘린다.
 */

import { addDays } from "../dates.ts";
import { splitKey } from "../ga4/run.ts";

export type Week = { start: string; end: string }; // YYYY-MM-DD, 월요일과 일요일

export type WeeklyInput = {
  instagramDays: { day: string; views: number | null; profileViews: number | null; websiteClicks: number | null }[];
  instagramPosts: { postedAt: string }[];
  ga4: { property: string; day: string; breakdown: string; key: string; metric: string; value: number }[];
  appstoreSales: { day: string; productType: string; units: number }[];
  admob: { day: string; earningsMicros: number; matchedRequests: number; impressions: number }[];
};

export type WeeklyNumbers = {
  instagram: { posts: number; views: number; profileViews: number; linkClicks: number };
  web: { sessions: number; fromInstagram: number; downloadClicks: number };
  installs: { appStoreNew: number; firstOpenAndroid: number; firstOpenIos: number };
  game: { starts: number; overs: number };
  ads: { impressions: number; matchedRequests: number; earningsMicros: number };
};

/** 그 주(월~일)에 들어가나 */
const inWeek = (day: string, w: Week) => day >= w.start && day <= w.end;

/** PT 날짜를 그 하루와 가장 많이 겹치는 한국 날짜로 (위 설명) */
export const shiftPt = (day: string) => addDays(day, 1);
const sum = <T>(rows: T[], pick: (r: T) => number | null) => rows.reduce((a, r) => a + (pick(r) ?? 0), 0);

/** App Store 신규 다운로드 상품 유형 (재다운로드 3, 업데이트 7 은 뺀다) */
const NEW_DOWNLOAD = new Set(["1", "1F", "1T"]);

/** 인스타에서 온 웹 방문의 출처 (session_campaign 의 첫 칸) */
export const FROM_INSTAGRAM = /instagram|linktr\.ee/i;

/** 게시물 올린 시각을 한국 날짜로 */
function seoulDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

export function weeklyNumbers(input: WeeklyInput, w: Week): WeeklyNumbers {
  const ig = input.instagramDays.filter((d) => inWeek(shiftPt(d.day), w));
  const ga = input.ga4.filter((r) => inWeek(r.day, w));
  const appEvent = (name: string, platform?: string) =>
    sum(
      ga.filter(
        (r) =>
          r.property === "app" &&
          r.breakdown === "event" &&
          r.metric === "eventCount" &&
          splitKey(r.key)[0] === name &&
          (!platform || splitKey(r.key)[1] === platform),
      ),
      (r) => r.value,
    );
  const ads = input.admob.filter((r) => inWeek(r.day, w));
  return {
    instagram: {
      posts: input.instagramPosts.filter((p) => inWeek(seoulDay(p.postedAt), w)).length,
      views: sum(ig, (d) => d.views),
      profileViews: sum(ig, (d) => d.profileViews),
      linkClicks: sum(ig, (d) => d.websiteClicks),
    },
    web: {
      sessions: sum(ga.filter((r) => r.property === "web" && r.breakdown === "total" && r.metric === "sessions"), (r) => r.value),
      fromInstagram: sum(
        ga.filter(
          (r) =>
            r.property === "web" &&
            r.breakdown === "session_campaign" &&
            r.metric === "sessions" &&
            // 링크트리 UTM(instagram|bio|...), 인스타 앱이 남긴 출처(l.instagram.com 등),
            // UTM 없이 링크트리를 거친 방문(linktr.ee)을 같이 센다. 링크트리는 인스타 프로필에만 걸려 있다
            FROM_INSTAGRAM.test(splitKey(r.key)[0]),
        ),
        (r) => r.value,
      ),
      downloadClicks: sum(
        ga.filter((r) => r.property === "web" && r.breakdown === "event" && r.key === "app_download_click" && r.metric === "eventCount"),
        (r) => r.value,
      ),
    },
    installs: {
      appStoreNew: sum(input.appstoreSales.filter((r) => inWeek(shiftPt(r.day), w) && NEW_DOWNLOAD.has(r.productType)), (r) => r.units),
      firstOpenAndroid: appEvent("first_open", "Android"),
      firstOpenIos: appEvent("first_open", "iOS"),
    },
    game: { starts: appEvent("game_start"), overs: appEvent("game_over") },
    ads: {
      impressions: sum(ads, (r) => r.impressions),
      matchedRequests: sum(ads, (r) => r.matchedRequests),
      earningsMicros: sum(ads, (r) => r.earningsMicros),
    },
  };
}

/** now 기준으로 바로 지난주(한국 날짜 월~일)와 그 전주 */
export function lastTwoWeeks(todaySeoul: string): { current: Week; previous: Week } {
  const day = new Date(`${todaySeoul}T12:00:00Z`);
  const dow = (day.getUTCDay() + 6) % 7; // 월 0 ... 일 6
  const thisMonday = new Date(day.getTime() - dow * 86_400_000);
  const shift = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  return {
    current: { start: shift(thisMonday, -7), end: shift(thisMonday, -1) },
    previous: { start: shift(thisMonday, -14), end: shift(thisMonday, -8) },
  };
}
