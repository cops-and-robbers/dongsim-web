/**
 * 주간 리포트 문구 (#146). 규칙은 docs/instagram-report.md 의 "메시지 문구 규칙"과 같다 -
 * 첫 줄(굵게)에 결론과 숫자, 한 줄에 숫자 하나와 단위, 헤더와 이모지 없음, 기준은 맨 아래 작은 글씨.
 *
 * 비교는 그 전주와 한다. 숫자 옆 괄호에 전주 값을 그대로 적는다 - "%p", "배" 로
 * 바꾸면 작은 숫자에서 과장된다(3 → 6 이 "2배").
 */

import type { Week, WeeklyNumbers } from "./numbers.ts";
import { formatCount, withCopula } from "../instagram/messages.ts";

const md = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
};

function line(label: string, now: number, before: number, unit: string): string {
  return `- ${label} ${formatCount(now)}${unit} (전주 ${formatCount(before)}${unit})`;
}

function usd(micros: number): string {
  return `$${(micros / 1e6).toFixed(2)}`;
}

function pct(part: number, whole: number): string | null {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : null;
}

/** "12명 늘었어요" / "3명 줄었어요" / "전주와 같아요" */
function change(now: number, before: number, unit: string): string {
  const d = now - before;
  if (d === 0) return "전주와 같아요.";
  return `전주보다 ${formatCount(Math.abs(d))}${unit} ${d > 0 ? "늘었어요" : "줄었어요"}.`;
}

export function buildWeeklyReport(week: Week, now: WeeklyNumbers, before: WeeklyNumbers): string {
  const firstNow = now.installs.firstOpenAndroid + now.installs.firstOpenIos;
  const firstBefore = before.installs.firstOpenAndroid + before.installs.firstOpenIos;
  const perGame = now.game.overs > 0 ? (now.ads.impressions / now.game.overs).toFixed(1) : null;
  const showRate = pct(now.ads.impressions, now.ads.matchedRequests);

  const blocks: (string | null)[][] = [
    [
      `**지난주(${md(week.start)}~${md(week.end)}) 앱을 처음 연 사람은 ${withCopula(`${formatCount(firstNow)}명`)}**`,
      change(firstNow, firstBefore, "명"),
    ],
    [
      "**인스타**",
      `- 새 게시물 ${now.instagram.posts}개 (전주 ${before.instagram.posts}개)`,
      line("조회", now.instagram.views, before.instagram.views, "회"),
      line("프로필 방문", now.instagram.profileViews, before.instagram.profileViews, "회"),
      line("프로필 링크 클릭", now.instagram.linkClicks, before.instagram.linkClicks, "회"),
    ],
    [
      "**웹**",
      line("방문", now.web.sessions, before.web.sessions, "회"),
      line("인스타에서 온 방문", now.web.fromInstagram, before.web.fromInstagram, "회"),
      line("다운로드 버튼 클릭", now.web.downloadClicks, before.web.downloadClicks, "회"),
    ],
    [
      "**설치**",
      line("App Store 신규 다운로드", now.installs.appStoreNew, before.installs.appStoreNew, "건"),
      line("앱 첫 실행 Android", now.installs.firstOpenAndroid, before.installs.firstOpenAndroid, "회"),
      line("앱 첫 실행 iOS", now.installs.firstOpenIos, before.installs.firstOpenIos, "회"),
    ],
    [
      "**게임과 광고**",
      line("게임 시작", now.game.starts, before.game.starts, "판"),
      line("광고 노출", now.ads.impressions, before.ads.impressions, "회"),
      showRate ? `- 광고 노출률 ${showRate} (받은 광고 중 실제로 보인 비율)` : null,
      perGame ? `- 끝난 게임 한 판당 광고 노출 ${perGame}회` : null,
      `- 예상 광고 수익 ${usd(now.ads.earningsMicros)} (전주 ${usd(before.ads.earningsMicros)})`,
    ],
    [
      "-# 앱을 처음 연 사람은 Android와 iOS 첫 실행을 더한 값이에요.",
      "-# 인스타와 App Store 다운로드는 미국 서부 날짜, 나머지는 한국 날짜로 한 주를 나눠요.",
    ],
  ];
  return blocks
    .map((b) => b.filter((l): l is string => l !== null).join("\n"))
    .join("\n\n");
}
