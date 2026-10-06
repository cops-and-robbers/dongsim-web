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

/** 0.46달러. 기호($)보다 읽는 그대로 쓴다 */
function usd(micros: number): string {
  return `${(micros / 1e6).toFixed(2)}달러`;
}

function pct(part: number, whole: number): string | null {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : null;
}

/** 첫 줄이 "지난주"라 다음 줄은 "그 전주"로 받는다 */
function change(now: number, before: number, unit: string): string {
  const d = now - before;
  if (d === 0) return "그 전주와 같아요.";
  return `그 전주보다 ${formatCount(Math.abs(d))}${unit} ${d > 0 ? "늘었어요" : "줄었어요"}.`;
}

export function buildWeeklyReport(week: Week, now: WeeklyNumbers, before: WeeklyNumbers): string {
  const firstNow = now.installs.firstOpenAndroid + now.installs.firstOpenIos;
  const firstBefore = before.installs.firstOpenAndroid + before.installs.firstOpenIos;
  const perGame = now.game.overs > 0 ? (now.ads.impressions / now.game.overs).toFixed(1) : null;
  const showRate = pct(now.ads.impressions, now.ads.matchedRequests);

  const blocks: (string | null)[][] = [
    [
      // 첫 실행은 사람이 아니라 횟수다(앱을 지웠다 다시 깔면 또 센다). "명"으로 쓰지 않는다
      `**지난주(${md(week.start)}~${md(week.end)}) 앱 첫 실행은 ${withCopula(`${formatCount(firstNow)}회`)}**`,
      change(firstNow, firstBefore, "회"),
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
      line("Android 첫 실행", now.installs.firstOpenAndroid, before.installs.firstOpenAndroid, "회"),
      line("iOS 첫 실행", now.installs.firstOpenIos, before.installs.firstOpenIos, "회"),
    ],
    [
      "**게임과 광고**",
      line("게임 시작", now.game.starts, before.game.starts, "판"),
      line("광고 노출", now.ads.impressions, before.ads.impressions, "회"),
      showRate ? `- 광고 노출률 ${showRate}` : null,
      perGame ? `- 끝난 게임 ${formatCount(now.game.overs)}판, 한 판당 광고 노출 ${perGame}회` : null,
      `- 예상 광고 수익 ${usd(now.ads.earningsMicros)} (전주 ${usd(before.ads.earningsMicros)})`,
    ],
    [
      "-# 앱 첫 실행은 Android와 iOS를 더한 횟수예요.",
      showRate ? "-# 노출률은 받은 광고 중 화면에 뜬 비율이에요." : null,
      "-# 인스타와 App Store 다운로드는 미국 서부 날짜를 하루 뒤로 옮겨 한국 날짜에 맞췄어요.",
    ],
  ];
  return blocks
    .map((b) => b.filter((l): l is string => l !== null).join("\n"))
    .join("\n\n");
}
