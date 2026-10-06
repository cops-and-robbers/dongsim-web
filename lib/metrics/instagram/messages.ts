/**
 * 디스코드로 보낼 문구 (#140). 말투와 모양 규칙은 docs/instagram-report.md 에 있다.
 *
 * 요약하면
 * - 첫 줄(굵게)에 무슨 일인지와 숫자 하나. 휴대폰 알림에는 첫 줄만 보인다
 * - 한 줄에 숫자 하나. 디스코드 글꼴은 고정폭이 아니라 칸을 맞추면 틀어진다
 * - 헤더(#)와 이모지는 쓰지 않는다. 헤더는 글자가 커서 짧은 리포트도 휴대폰 한 화면을 넘긴다
 * - 게시물 제목, 링크, 기준 설명은 맨 아래 작은 글씨(-#)
 */

import type { MediaWithLatest, ProductType, ViewGain } from "./types.ts";
import type { Spike, Standing } from "./rules.ts";

/** 디스코드 메시지 본문 상한. 넘으면 전송 자체가 거절된다. */
export const DISCORD_CONTENT_LIMIT = 2000;

const SEOUL = "Asia/Seoul";

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

/** "12배쯤", "4.5배" - 열 배가 넘으면 소수점은 읽는 데 도움이 안 된다. */
export function formatMultiple(x: number): string {
  if (x >= 10) return `${Math.round(x)}배쯤`;
  const one = Math.round(x * 10) / 10;
  return `${Number.isInteger(one) ? one.toFixed(0) : one.toFixed(1)}배`;
}

/**
 * 앞말에 맞는 "예요/이에요". 받침이 있으면 "이에요" ("12배쯤이에요", "4.5배예요").
 * 숫자나 기호로 끝나면 읽는 소리를 알 수 없어 "예요"로 둔다 - 그렇게 끝나는 말을 넘기지 않는다.
 */
export function withCopula(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  return isHangul && (last - 0xac00) % 28 !== 0 ? `${word}이에요` : `${word}예요`;
}

function seoulParts(iso: string) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL,
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { month: get("month"), day: get("day"), hour: get("hour"), dayPeriod: get("dayPeriod") };
}

/** 한국 날짜 "9월 4일" */
export function seoulDate(iso: string): string {
  const p = seoulParts(iso);
  return `${p.month}월 ${p.day}일`;
}

/** 한국 시각 "오후 4시" */
export function seoulHour(iso: string): string {
  const p = seoulParts(iso);
  return `${p.dayPeriod} ${p.hour}시`;
}

/** "2026-09-13" 같은 날짜 문자열을 "9월 13일"로. 시간대 변환 없이 그대로 읽는다. */
export function plainDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/**
 * 캡션을 리포트 한 줄로. 첫 줄만, 80자까지.
 *
 * 서식을 만드는 기호는 글자로 바꾼다. 캡션의 * _ ~ ` 가 그대로 가면 리포트
 * 아래쪽 글씨가 통째로 기울거나 지워진 것처럼 보인다. [ 는 가려진 링크
 * [글](주소) 의 시작이라 같이 막는다. > 와 # 는 줄 맨 앞에서만 서식이 되는데
 * 이 줄은 "-# " 로 시작하므로 그대로 둔다. 멘션은 전송할 때 allowed_mentions 로 막는다.
 */
export function captionLine(caption: string | null): string | null {
  const first = caption
    ?.split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!first) return null;
  const cut = [...first].length > 80 ? `${[...first].slice(0, 80).join("")}...` : first;
  return cut.replace(/([\\*_~`|[\]])/g, "\\$1");
}

function kindOf(type: ProductType): { object: string; subject: string; self: string } {
  return type === "REELS"
    ? { object: "릴스를", subject: "릴스예요", self: "이 릴스" }
    : { object: "게시물을", subject: "게시물이에요", self: "이 게시물" };
}

/** 지표 한 줄. 값이 없으면(인스타가 안 준 지표) 줄째로 뺀다. */
function line(label: string, value: number | null, unit: string, suffix = ""): string | null {
  return value === null ? null : `- ${label} ${formatCount(value)}${unit}${suffix}`;
}

/** 소제목과 줄들. 남은 줄이 없으면 소제목도 빼서 덩그러니 남지 않게 한다. */
function section(title: string, lines: (string | null)[]): string | null {
  const kept = lines.filter((l): l is string => l !== null);
  return kept.length ? [title, ...kept].join("\n") : null;
}

/**
 * "이 게시물까지 올린 11개 중 가장 많이 봤어요" / "2번째로 많이" / "가장 적게".
 * 먼저 올린 게시물과만 비교하므로 "지금까지"가 아니라 "이 게시물까지"다.
 */
function rankSentence(s: Standing, self: string): string | null {
  if (s.total < 2) return null;
  const prefix = `${self}까지 올린 ${s.total}개 중`;
  if (s.rank === 1) return `${prefix} 가장 많이 봤어요.`;
  // "12개 중 12번째로 많이"는 거꾸로 읽어야 뜻이 들어온다
  if (s.rank === s.total && s.total >= 3) return `${prefix} 가장 적게 봤어요.`;
  return `${prefix} ${s.rank}번째로 많이 봤어요.`;
}

/** 보통 게시물과 비교한 한 문장. 비교 대상이 모자라면 null */
function compareSentence(reach: number, othersMedian: number | null): string | null {
  if (othersMedian === null || othersMedian <= 0) return null;
  const typical = `보통 게시물(${formatCount(othersMedian)}명)`;
  const x = reach / othersMedian;
  if (x >= 1.5) return `${typical}의 ${withCopula(formatMultiple(x))}.`;
  if (x >= 0.8) return `${typical}과 비슷해요.`;
  return `${typical}보다 적은 사람이 봤어요.`;
}

/**
 * 게시물 리포트.
 *
 * @param reachStanding 본 사람(도달) 기준 순위 (rules.standingOf). 먼저 올린 게시물들과 비교한다
 * @param sharesStanding 공유 기준 순위 - 3위 안일 때만 괄호로 붙인다
 */
export function buildPostReport(
  post: MediaWithLatest,
  now: Date,
  reachStanding: Standing | null,
  sharesStanding: Standing | null,
): string {
  const m = post.latest;
  if (!m) throw new Error("누적값이 없는 게시물은 리포트를 만들 수 없어요");
  const kind = kindOf(post.productType);
  const date = seoulDate(post.postedAt);
  const days = Math.floor((now.getTime() - new Date(post.postedAt).getTime()) / 86_400_000);

  const head =
    m.reach !== null
      ? `**${date} ${kind.object} 올리고 ${days}일 동안 ${formatCount(m.reach)}명이 봤어요**`
      : `**${date} ${kind.object} 올린 지 ${days}일이 지났어요**`;
  const compare =
    m.reach !== null && reachStanding ? compareSentence(m.reach, reachStanding.othersMedian) : null;
  const summary = [reachStanding ? rankSentence(reachStanding, kind.self) : null, compare]
    .filter((l): l is string => l !== null)
    .join(" ");

  const isReels = post.productType === "REELS";
  const seen = section("**본 사람**", [
    line("조회", m.views, "회"),
    line("도달", m.reach, "명"),
    // 릴스는 인스타가 프로필 지표를 주지 않는 대신 시청 지표를 준다
    isReels && m.skipRate !== null ? `- 처음 3초 안에 넘긴 비율 ${Math.round(m.skipRate * 10) / 10}%` : null,
    isReels && m.avgWatchMs !== null ? `- 평균 시청 ${(m.avgWatchMs / 1000).toFixed(1)}초` : null,
  ]);
  const profile = isReels
    ? null
    : section("**프로필까지 온 사람**", [
        line("프로필 방문", m.profileVisits, "회"),
        line("프로필 링크 클릭", m.bioLinkClicks, "회"),
        line("팔로우", m.follows, "명"),
      ]);
  const sharesRank =
    sharesStanding && sharesStanding.total >= 3 && sharesStanding.rank <= 3
      ? ` (${sharesStanding.total}개 중 ${sharesStanding.rank}위)`
      : "";
  const reactions = section("**반응**", [
    line("공유", m.shares, "회", sharesRank),
    line("좋아요", m.likes, "개"),
    line("댓글", m.comments, "개"),
    line("저장", m.saved, "회"),
  ]);

  const caption = captionLine(post.caption);
  const footer = [
    caption ? `-# ${caption}` : null,
    `-# <${post.permalink}>`,
    compare && reachStanding
      ? `-# 보통 게시물은 ${kind.self}보다 먼저 올린 ${reachStanding.othersCount}개를 본 사람 수로 줄 세운 가운데 값이에요.`
      : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return fit(
    [summary ? `${head}\n${summary}` : head, seen, profile, reactions, footer]
      .filter((b): b is string => b !== null && b.length > 0)
      .join("\n\n"),
  );
}

/** "9월 13일 오후 4시부터 다음 날 오후 4시까지" */
function seoulRange(startIso: string, endIso: string): string {
  const sameDay = seoulDate(startIso) === seoulDate(endIso);
  const end = sameDay ? seoulHour(endIso) : `다음 날 ${seoulHour(endIso)}`;
  return `${seoulDate(startIso)} ${seoulHour(startIso)}부터 ${end}까지`;
}

/**
 * 급상승 알림.
 *
 * 첫 줄에 배수까지 넣는다 - 휴대폰 알림에는 첫 줄만 보이는데, 숫자만으로는
 * 많은 건지 알 수 없다.
 *
 * @param topGain 그 하루를 다 덮는 기간 동안 조회가 가장 많이 늘어난 게시물 (run.ts 가 고른다)
 */
export function buildSpikeAlert(spike: Spike, topGain: ViewGain | null): string {
  const reach = formatCount(spike.day.reach as number);
  const date = plainDate(spike.day.day);
  // 평소가 0명이면 배수가 뜻이 없다 (rules 가 1명으로 보고 계산한 값이다)
  const quiet = spike.baseline < 1;
  const lines: (string | null)[] = [
    quiet
      ? `**${date} 하루 동안 ${reach}명이 우리 인스타를 봤어요**`
      : `**${date} 하루 동안 ${reach}명이 우리 인스타를 봤어요. 평소의 ${withCopula(formatMultiple(spike.multiple))}**`,
    quiet ? "직전 2주 동안은 거의 보는 사람이 없었어요." : `평소에는 하루 ${formatCount(spike.baseline)}명쯤 봤어요.`,
  ];
  if (topGain && topGain.gained > 0) {
    const kind = kindOf(topGain.media.productType);
    lines.push(
      `이 무렵 조회가 가장 많이 늘어난 건 ${seoulDate(topGain.media.postedAt)} ${kind.subject}.`,
      `${seoulDate(topGain.since)} ${seoulHour(topGain.since)} 이후 ${formatCount(topGain.gained)}회 늘었어요.`,
    );
  }
  lines.push(
    "",
    topGain && topGain.gained > 0 ? `-# <${topGain.media.permalink}>` : null,
    quiet
      ? "-# 게시물, 릴스, 스토리를 여러 개 본 사람도 한 명으로 셌어요."
      : "-# 게시물, 릴스, 스토리를 여러 개 본 사람도 한 명으로 셌어요. 평소는 직전 14일의 가운데 값이에요.",
    `-# ${date}은 미국 서부 시간 기준이에요. 한국 시간으로는 ${seoulRange(spike.day.dayStart, spike.day.dayEnd)}예요.`,
  );
  return fit(lines.filter((l): l is string => l !== null).join("\n"));
}

/** 상한을 넘으면 자른다. 리포트가 통째로 안 가는 것보다 끝이 잘린 편이 낫다. */
function fit(content: string): string {
  if (content.length <= DISCORD_CONTENT_LIMIT) return content;
  return `${content.slice(0, DISCORD_CONTENT_LIMIT - 3)}...`;
}
