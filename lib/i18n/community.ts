import type { Locale } from "./config";

// 모집글 페이지 문구. 메인 messages.ts 와 떼어 둔 이유는 /play 와 같다 -
// 이 기능만 쓰는 문구가 많아 섞으면 messages.ts 가 비대해진다.
//
// 일본에서 실제로 자리가 열리고 있어 en·ja 를 처음부터 채워 둔다.

export type CommunityText = {
  meta: { title: string; description: string };
  list: {
    eyebrow: string;
    heading: string;
    lede: string;
    openHeading: string;
    pastHeading: string;
    emptyTitle: string;
    emptyBody: string;
    ctaHeading: string;
    ctaBody: string;
    ctaButton: string;
  };
  card: {
    closed: string;
    host: (nickname: string) => string;
    seats: (current: number, max: number) => string;
    today: string;
    tomorrow: string;
    inDays: (n: number) => string;
    seatsLeft: (n: number) => string;
    seatsNone: string;
  };
  detail: {
    place: string;
    when: string;
    host: string;
    placeHint: string;
    openMap: string;
    closedTitle: string;
    closedBody: string;
    fullTitle: string;
    fullBody: string;
    joinButton: string;
    joinHint: string;
    escapeTitle: string;
    escapeBody: string;
    otherButton: string;
    otherHint: string;
    moreHeading: string;
    moreAll: string;
  };
};

const ko: CommunityText = {
  meta: {
    title: "모임",
    description:
      "동네에서 함께 뛸 사람을 찾는 모임이에요. 장소와 시간을 보고 앱에서 참여할 수 있어요.",
  },
  list: {
    eyebrow: "커뮤니티",
    heading: "지금 열린 모임",
    lede: "가까운 날짜부터 보여드려요.",
    openHeading: "지금 열린 모임",
    pastHeading: "지난 모임",
    emptyTitle: "아직 열린 모임이 없어요",
    emptyBody: "첫 모임을 열어보세요. 장소와 시간만 정하면 돼요.",
    ctaHeading: "직접 모임을 열어보세요",
    ctaBody: "장소와 시간만 정하면 돼요. 링크 하나로 사람을 모을 수 있어요.",
    ctaButton: "앱에서 모임 만들기",
  },
  card: {
    closed: "마감",
    host: (nickname) => `주최 ${nickname}`,
    seats: (current, max) => `${current} / ${max}명`,
    today: "오늘이에요",
    tomorrow: "내일이에요",
    inDays: (n) => `${n}일 뒤예요`,
    seatsLeft: (n) => (n === 1 ? "한 자리 남았어요" : `${n}자리 남았어요`),
    seatsNone: "자리가 다 찼어요",
  },
  detail: {
    place: "장소",
    when: "일시",
    host: "주최",
    placeHint: "자세한 집결 지점은 참여하면 알려드려요",
    openMap: "지도 열기",
    closedTitle: "이 모임은 마감됐어요",
    closedBody: "다른 모임은 아래에서 볼 수 있어요.",
    fullTitle: "자리가 다 찼어요",
    fullBody: "다음 모임을 기다리거나 직접 열어보세요.",
    joinButton: "앱에서 참여하기",
    joinHint: "참여 신청은 앱에서 할 수 있어요",
    escapeTitle: "한 단계만 더!",
    escapeBody: "오른쪽 위 ⋯에서 '다른 브라우저로 열기'를 누르면 이어져요.",
    otherButton: "앱 받으러 가기",
    otherHint: "다른 모임도 앱에서 볼 수 있어요",
    moreHeading: "이런 모임도 열려 있어요",
    moreAll: "모임 전체 보기",
  },
};

const en: CommunityText = {
  meta: {
    title: "Meetups",
    description:
      "Find people to play with nearby. Check the place and time, then join from the app.",
  },
  list: {
    eyebrow: "Community",
    heading: "Open meetups",
    lede: "Sorted by how soon they start.",
    openHeading: "Open meetups",
    pastHeading: "Past meetups",
    emptyTitle: "No open meetups yet",
    emptyBody: "Open the first one. All you need is a place and a time.",
    ctaHeading: "Open your own meetup",
    ctaBody: "Pick a place and a time. One link is enough to gather people.",
    ctaButton: "Create in the app",
  },
  card: {
    closed: "Closed",
    host: (nickname) => `Host ${nickname}`,
    seats: (current, max) => `${current} / ${max}`,
    today: "Today",
    tomorrow: "Tomorrow",
    inDays: (n) => `In ${n} days`,
    seatsLeft: (n) => (n === 1 ? "One spot left" : `${n} spots left`),
    seatsNone: "All spots taken",
  },
  detail: {
    place: "Place",
    when: "When",
    host: "Host",
    placeHint: "The exact meeting spot is shared once you join",
    openMap: "Open map",
    closedTitle: "This meetup is closed",
    closedBody: "You can find others below.",
    fullTitle: "All spots are taken",
    fullBody: "Wait for the next one, or open your own.",
    joinButton: "Join in the app",
    joinHint: "Joining happens in the app",
    escapeTitle: "One more step!",
    escapeBody: "Tap ⋯ at the top right and choose 'Open in browser' to continue.",
    otherButton: "Get the app",
    otherHint: "Other meetups are in the app too",
    moreHeading: "These are open too",
    moreAll: "See all meetups",
  },
};

const ja: CommunityText = {
  meta: {
    title: "募集",
    description:
      "近くで一緒に走る人を探す募集です。場所と時間を見て、アプリから参加できます。",
  },
  list: {
    eyebrow: "コミュニティ",
    heading: "募集中のケイドロ",
    lede: "開催が近い順に並べています。",
    openHeading: "募集中のケイドロ",
    pastHeading: "終わった募集",
    emptyTitle: "まだ募集がありません",
    emptyBody: "最初の募集を出してみましょう。場所と時間だけで大丈夫です。",
    ctaHeading: "自分で募集を出す",
    ctaBody: "場所と時間を決めるだけ。リンク一つで人を集められます。",
    ctaButton: "アプリで募集を作る",
  },
  card: {
    closed: "締め切り",
    host: (nickname) => `主催 ${nickname}`,
    seats: (current, max) => `${current} / ${max}人`,
    today: "今日です",
    tomorrow: "明日です",
    inDays: (n) => `${n}日後です`,
    seatsLeft: (n) => (n === 1 ? "残り1人です" : `残り${n}人です`),
    seatsNone: "定員に達しました",
  },
  detail: {
    place: "場所",
    when: "日時",
    host: "主催",
    placeHint: "詳しい集合場所は参加すると分かります",
    openMap: "地図を開く",
    closedTitle: "この募集は締め切りました",
    closedBody: "ほかの募集は下から見られます。",
    fullTitle: "定員に達しました",
    fullBody: "次の募集を待つか、自分で開いてみてください。",
    joinButton: "アプリで参加する",
    joinHint: "参加の申し込みはアプリからです",
    escapeTitle: "あと一歩！",
    escapeBody: "右上の⋯から「他のブラウザで開く」を押すと続けられます。",
    otherButton: "アプリを入れる",
    otherHint: "ほかの募集もアプリで見られます",
    moreHeading: "こちらも募集中です",
    moreAll: "募集をすべて見る",
  },
};

const TEXT: Record<Locale, CommunityText> = { ko, en, ja };

export function getCommunityText(locale: Locale): CommunityText {
  return TEXT[locale];
}
