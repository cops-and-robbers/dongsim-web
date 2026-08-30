import type { CommunityPost, ListScope, PostPage } from "./api";

// 화면 확인용 표본 데이터. `COMMUNITY_MOCK=true` 일 때만 쓴다.
//
// currentParticipants 는 채우지 않는다. 자리 표시는 안 하는 방향이라
// 실서버와 같은 화면(자리 관련 표시가 접힌 상태)이 보여야 한다.
// 해외 글도 넣어 region 이 다른 문자로 올 때의 줄바꿈을 함께 본다.

/** 오늘을 기준으로 밀거나 당긴 시각. 표본이 시간이 지나도 늘 그럴듯하게 보인다. */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const POSTS: CommunityPost[] = [
  {
    id: 1290,
    writerId: 21,
    writerNickname: "SpeedyFox1234",
    writerProfileIcon: 2,
    title: "Cops and robbers at Central Park",
    content:
      "Meet at the fountain. First timers welcome - we will go over the rules in five minutes, then play two or three rounds.",
    meetingAt: at(4, 18),
    location: {
      latitude: 40.7743,
      longitude: -73.9708,
      region: "Manhattan, New York",
      placeName: "Bethesda Fountain, Central Park",
      countryCode: "US",
    },
    maxParticipants: 12,
    status: "RECRUITING",
    createdAt: at(-1, 9),
    updatedAt: at(-1, 9),
  },
  {
    id: 1291,
    writerId: 22,
    writerNickname: "FlinkerFuchs99",
    writerProfileIcon: 1,
    title: "Räuber und Gendarm auf dem Tempelhofer Feld",
    content:
      "Wir treffen uns am Eingang Columbiadamm. Anfänger sind willkommen, die Regeln erklären wir vor Ort.",
    meetingAt: at(6, 17),
    location: {
      latitude: 52.4736,
      longitude: 13.4018,
      region: "Tempelhof, Berlin",
      placeName: "Tempelhofer Feld, Eingang Columbiadamm",
      countryCode: "DE",
    },
    maxParticipants: 10,
    status: "RECRUITING",
    createdAt: at(-2, 15),
    updatedAt: at(-2, 15),
  },
  {
    id: 1284,
    writerId: 11,
    writerNickname: "경도매우러버",
    writerProfileIcon: 1,
    title: "나랑 경도하자!!!!!",
    content:
      "세종대학교에서 경도하실 분 모집해요! 2030대 상관없이 진심으로 즐길 분이라면 누구든지 대환영입니다!!\n\n한 판에 20분쯤 걸리고, 두세 판 하고 헤어질 생각이에요. 처음이신 분도 규칙은 5분이면 익히니까 편하게 오세요.",
    meetingAt: at(3, 18),
    location: {
      latitude: 37.5502,
      longitude: 127.0739,
      region: "서울특별시 광진구 군자동",
      placeName: "세종대 정문",
      countryCode: "KR",
    },
    maxParticipants: 10,
    status: "RECRUITING",
    createdAt: at(-2, 12),
    updatedAt: at(-2, 12),
  },
  {
    id: 1283,
    writerId: 12,
    writerNickname: "포근포근백설기",
    writerProfileIcon: 2,
    title: "초보도 환영, 웰컴, 누구나",
    content:
      "호수 한 바퀴 도는 코스로 잡았어요. 뛰는 게 부담되면 걸어도 괜찮아요. 끝나고 근처에서 간단히 먹을 사람만 남아요.",
    meetingAt: at(5, 19, 30),
    location: {
      latitude: 37.3719,
      longitude: 126.9887,
      region: "경기도 의왕시 학의동",
      placeName: "백운호수 무민공원",
      countryCode: "KR",
    },
    maxParticipants: 10,
    status: "RECRUITING",
    createdAt: at(-1, 20),
    updatedAt: at(-1, 20),
  },
  {
    id: 1282,
    writerId: 13,
    writerNickname: "달리는냥파",
    writerProfileIcon: 1,
    title: "번개로 경도하실 분",
    content: "퇴근하고 바로 갈 수 있는 분 구해요. 정문에서 만나서 공원 안쪽으로 들어갈게요.",
    meetingAt: at(1, 20),
    location: {
      latitude: 37.5487,
      longitude: 127.0817,
      region: "서울특별시 광진구 능동",
      placeName: "어린이대공원 정문",
      countryCode: "KR",
    },
    maxParticipants: 15,
    status: "COMPLETED",
    createdAt: at(-3, 9),
    updatedAt: at(-1, 9),
  },
  {
    id: 1279,
    writerId: 14,
    writerNickname: "すぴ",
    writerProfileIcon: 2,
    title: "吉祥寺で夜のケイドロ",
    content: "井の頭公園のまわりで一時間くらい。初めての方も歓迎です。",
    meetingAt: at(-2, 2),
    location: {
      latitude: 35.7031,
      longitude: 139.5797,
      region: "東京都 武蔵野市 吉祥寺南町",
      placeName: "井の頭公園 西園",
      countryCode: "JP",
    },
    maxParticipants: 8,
    status: "COMPLETED",
    createdAt: at(-5, 21),
    updatedAt: at(-2, 3),
  },
  {
    id: 1271,
    writerId: 15,
    writerNickname: "りちゃ",
    writerProfileIcon: 1,
    title: "舞鶴で三本勝負",
    content: "夕方に集まって三回やりました。範囲は途中で広げました。",
    meetingAt: at(-7, 19),
    location: {
      latitude: 35.4751,
      longitude: 135.3855,
      region: "京都府 舞鶴市 浜",
      placeName: "舞鶴公園",
      countryCode: "JP",
    },
    maxParticipants: 6,
    status: "ENDED",
    createdAt: at(-9, 15),
    updatedAt: at(-7, 21),
  },
];

export const USE_MOCK = process.env.COMMUNITY_MOCK === "true";

export function mockList(size: number, cursor?: string, scope?: ListScope): PostPage {
  // BE 와 같은 범위 규칙: 국가 하나 또는 제외 목록
  let posts = POSTS;
  if (scope?.excludeCountryCodes) {
    const excluded = scope.excludeCountryCodes;
    posts = POSTS.filter((post) => !excluded.includes(post.location.countryCode ?? ""));
  } else if (scope?.countryCode) {
    posts = POSTS.filter((post) => post.location.countryCode === scope.countryCode);
  }
  // 커서는 "몇 번째부터"만 담는다. 실서버 커서는 시각+id 를 인코딩하지만
  // 표본에서 그것까지 흉내 낼 이유가 없다
  const start = cursor ? Number(cursor) : 0;
  const slice = posts.slice(start, start + size);
  const next = start + size;
  return {
    content: slice,
    cursor: {
      nextCursor: next < posts.length ? String(next) : null,
      hasNext: next < posts.length,
    },
  };
}

export function mockGet(postId: number): CommunityPost | null {
  return POSTS.find((post) => post.id === postId) ?? null;
}
