import type { CommunityPost, PostPage } from "./api";

// 화면 확인용 표본 데이터. `COMMUNITY_MOCK=true` 일 때만 쓴다.
//
// BE 에 아직 없는 세 필드(참여 인원·장소명·닉네임)까지 채워 둔다.
// 그 값들이 생겼을 때 화면이 어떻게 보이는지 미리 보려는 것이 이 파일의 목적이다.
// 실서버 응답에는 아직 없으니, 여기서 본 모습이 지금 배포본과 다르다는 점에 주의한다.

/** 오늘을 기준으로 밀거나 당긴 시각. 표본이 시간이 지나도 늘 그럴듯하게 보인다. */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const POSTS: CommunityPost[] = [
  {
    id: 1284,
    writerId: 11,
    writerNickname: "경도매우러버",
    title: "나랑 경도하자!!!!!",
    content:
      "세종대학교에서 경도하실 분 모집해요! 2030대 상관없이 진심으로 즐길 분이라면 누구든지 대환영입니다!!\n\n한 판에 20분쯤 걸리고, 두세 판 하고 헤어질 생각이에요. 처음이신 분도 규칙은 5분이면 익히니까 편하게 오세요.",
    meetingAt: at(3, 18),
    placeName: "서울시 광진구 세종대학교",
    location: { latitude: 37.5502, longitude: 127.0739 },
    currentParticipants: 2,
    maxParticipants: 10,
    status: "RECRUITING",
    createdAt: at(-2, 12),
    updatedAt: at(-2, 12),
  },
  {
    id: 1283,
    writerId: 12,
    writerNickname: "포근포근백설기",
    title: "초보도 환영, 웰컴, 누구나",
    content:
      "호수 한 바퀴 도는 코스로 잡았어요. 뛰는 게 부담되면 걸어도 괜찮아요. 끝나고 근처에서 간단히 먹을 사람만 남아요.",
    meetingAt: at(5, 19, 30),
    placeName: "경기도 의왕시 백운호수 무민공원",
    location: { latitude: 37.3719, longitude: 126.9887 },
    currentParticipants: 9,
    maxParticipants: 10,
    status: "RECRUITING",
    createdAt: at(-1, 20),
    updatedAt: at(-1, 20),
  },
  {
    id: 1282,
    writerId: 13,
    writerNickname: "달리는냥파",
    title: "번개로 경도하실 분",
    content: "퇴근하고 바로 갈 수 있는 분 구해요. 정문에서 만나서 공원 안쪽으로 들어갈게요.",
    meetingAt: at(1, 20),
    placeName: "서울시 광진구 어린이대공원 정문",
    location: { latitude: 37.5487, longitude: 127.0817 },
    currentParticipants: 15,
    maxParticipants: 15,
    status: "COMPLETED",
    createdAt: at(-3, 9),
    updatedAt: at(-1, 9),
  },
  {
    id: 1279,
    writerId: 14,
    writerNickname: "すぴ",
    title: "吉祥寺で夜のケイドロ",
    content: "井の頭公園のまわりで一時間くらい。初めての方も歓迎です。",
    meetingAt: at(-2, 2),
    placeName: "도쿄도 무사시노시 기치조지",
    location: { latitude: 35.7031, longitude: 139.5797 },
    currentParticipants: 8,
    maxParticipants: 8,
    status: "COMPLETED",
    createdAt: at(-5, 21),
    updatedAt: at(-2, 3),
  },
  {
    id: 1271,
    writerId: 15,
    writerNickname: "りちゃ",
    title: "舞鶴で三本勝負",
    content: "夕方に集まって三回やりました。範囲は途中で広げました。",
    meetingAt: at(-7, 19),
    placeName: "교토부 마이즈루시",
    location: { latitude: 35.4751, longitude: 135.3855 },
    currentParticipants: 6,
    maxParticipants: 6,
    status: "COMPLETED",
    createdAt: at(-9, 15),
    updatedAt: at(-7, 21),
  },
];

export const USE_MOCK = process.env.COMMUNITY_MOCK === "true";

export function mockList(page: number, size: number): PostPage {
  const start = page * size;
  return {
    content: POSTS.slice(start, start + size),
    page: {
      size,
      number: page,
      totalElements: POSTS.length,
      totalPages: Math.max(1, Math.ceil(POSTS.length / size)),
    },
  };
}

export function mockGet(postId: number): CommunityPost | null {
  return POSTS.find((post) => post.id === postId) ?? null;
}
