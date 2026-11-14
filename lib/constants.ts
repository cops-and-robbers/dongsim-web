export const SITE_URL = "https://copsandrobbers.app";

export const APP_LINKS = {
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.elipair.copsandrobbers",
  // 국가 코드 없는 정식 링크 - 애플이 사용자의 실제 지역 스토어로 자동 연결한다.
  appStore: "https://apps.apple.com/app/id6756843948",
};

/**
 * App Store 캠페인 링크의 공급자 토큰(pt). 팀 계정 번호라 비밀이 아니다 - 캠페인 링크마다
 * 그대로 드러난다. App Store Connect > 앱 > 분석 > 캠페인 > 캠페인 링크 생성에서 확인 (#144).
 */
export const APP_STORE_PROVIDER_TOKEN = "128766908";

export const BRAND = {
  fullName: "동심지키미",
  tagline: "추억의 게임에서 가치를 찾습니다",
  email: "copsnro66ers@gmail.com",
  game: "경찰과 도둑",
  appVersion: "v1.7.4",
  instagram: "https://www.instagram.com/dongsim_protector",
  github: "https://github.com/cops-and-robbers",
  youtube: "https://www.youtube.com/channel/UCUmCD4Lg4jc95ShNBPxSdDA",
  tiktok: "https://www.tiktok.com/@cops._.robbers",
};

export const NAV_ITEMS = [
  { href: "/game", label: "게임 소개" },
  { href: "/blog", label: "이야기" },
  { href: "/team", label: "팀 소개" },
] as const;

export type TeamMember = {
  name: string;
  role: "Frontend" | "Backend" | "Design" | "Marketing";
  bio: string;
  photo: string;
  github?: string;
  instagram?: string;
};

export const FOUNDER: TeamMember = {
  name: "정상희",
  role: "Backend",
  bio: "프로필 준비 중이에요.",
  photo: "/team/jeong.jpeg",
  github: "https://github.com/SANGHEEJEONG",
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "홍의민",
    role: "Frontend",
    bio: "프로필 준비 중이에요.",
    photo: "/team/hong.jpeg",
    github: "https://github.com/EM-H20",
  },
  {
    name: "박찬빈",
    role: "Frontend",
    bio: "프로필 준비 중이에요.",
    photo: "/team/park.jpeg",
    github: "https://github.com/INSANE-P",
  },
  {
    name: "이창희",
    role: "Backend",
    bio: "프로필 준비 중이에요.",
    photo: "/team/lee.jpeg",
    github: "https://github.com/chxghee",
  },
  {
    name: "황혜림",
    role: "Backend",
    bio: "프로필 준비 중이에요.",
    photo: "/team/hwang.jpg",
    github: "https://github.com/HyerimH",
  },
  {
    name: "윤지희",
    role: "Design",
    bio: "프로필 준비 중이에요.",
    photo: "/team/yoon.jpeg",
    github: "https://github.com/jihee127",
  },
  {
    name: "김다임",
    role: "Design",
    bio: "프로필 준비 중이에요.",
    photo: "/team/kim.jpeg",
    github: "https://github.com/muchaim811",
  },
  {
    name: "최유정",
    role: "Marketing",
    bio: "프로필 준비 중이에요.",
    photo: "/team/choi.jpeg",
  },
];

export const HOW_STEPS = [
  {
    title: "방 만들기",
    description: "방을 만들면 6자리 초대 코드와 QR이 자동으로 생성돼요.",
  },
  {
    title: "구역 그리기",
    description: "지도 위에 플레이 구역과 감옥을 드래그로 그려요.",
  },
  {
    title: "팀 정하기",
    description: "닉네임을 정하고 경찰이나 도둑을 자유롭게 선택해요.",
  },
  {
    title: "이제 뛰면 돼요",
    description:
      "제한 시간 안에 도둑을 모두 잡으면 경찰 승, 한 명이라도 살아남으면 도둑 승.",
  },
];

export const HOME_FEATURES = [
  {
    title: "5분마다 남는 발자국",
    description:
      "도둑의 위치가 지도 위에 자동으로 공개돼요. 지워지지 않는 단서로 추격이 시작됩니다.",
    icon: "map",
  },
  {
    title: "구역과 감옥, 손끝으로",
    description:
      "원하는 크기로 플레이 구역을 그리고 내부에 감옥까지 한 번에 지정하세요.",
    icon: "zone",
  },
  {
    title: "팀원에게만 닿는 대화",
    description:
      "경찰과 도둑 채널이 완전히 나뉘어 있어요. 상대 팀에는 절대 보이지 않아요.",
    icon: "chat",
  },
] as const;

export type GameMockup =
  | "zone"
  | "shrink"
  | "location"
  | "qr"
  | "chat"
  | "result"
  | "communityList"
  | "communityChat";

// 게임 기능 블록의 목업 순서(언어 무관). 카피는 messages.ts의 game.features와 같은 순서로 대응.
// 4.0.1 기준: 구역 축소(#668)와 팀 MVP 결과가 들어가고, 커뮤니티는 한 블록으로 합쳤다.
export const GAME_FEATURE_MOCKUPS: GameMockup[] = [
  "zone",
  "shrink",
  "location",
  "qr",
  "chat",
  "result",
  "communityList",
];
