export const APP_LINKS = {
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.elipair.copsandrobbers",
  appStore: "https://apps.apple.com/kr/app/경찰과도둑/id6756843948",
};

export const BRAND = {
  fullName: "동심지킴이",
  tagline: "추억의 게임에서 가치를 찾습니다",
  email: "copsnro66ers@gmail.com",
  game: "경찰과 도둑",
  appVersion: "v1.7.4",
  instagram: "https://www.instagram.com/cops._.robbers",
  github: "https://github.com/cops-and-robbers",
};

export const NAV_ITEMS = [
  { href: "/game", label: "게임 소개" },
  { href: "/team", label: "팀 소개" },
] as const;

export type TeamMember = {
  name: string;
  role: "Frontend" | "Backend" | "Design";
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
    photo: "/team/hwang.png",
    github: "https://github.com/HyerimH",
  },
  {
    name: "윤지희",
    role: "Design",
    bio: "프로필 준비 중이에요.",
    photo: "/team/yoon.jpeg",
    github: "https://github.com/jihee127",
  },
];

export const QA_MEMBERS = [
  "안금서",
  "남해윤",
  "손건우",
  "송혜정",
  "신혜빈",
  "이진",
  "정창우",
  "허석준",
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

export type GameFeature = {
  badge: string;
  badgeTone: "blue" | "green";
  title: string;
  description: string;
  checks: string[];
  mockup: "zone" | "location" | "qr" | "chat";
};

export const GAME_FEATURES: GameFeature[] = [
  {
    badge: "MAP SETUP",
    badgeTone: "blue",
    title: "지도에 구역을 그려요",
    description:
      "호스트가 지도를 드래그하면 원형 플레이 구역이 그려져요. 감옥 위치까지 손끝으로 지정하고 바로 게임을 시작하세요.",
    checks: [
      "드래그로 원형 구역 자유 설정",
      "구역 내부에 감옥 영역 지정",
      "이탈 시 화면 잠김",
    ],
    mockup: "zone",
  },
  {
    badge: "LOCATION",
    badgeTone: "green",
    title: "일정 주기마다 발자국이 찍혀요",
    description:
      "방장이 정한 주기마다 도둑의 위치가 발자국으로 공개돼요. 공개 전에 자리를 옮기지 않으면 그대로 잡힐 수 있어요.",
    checks: [
      "방장이 정한 주기로 위치 공개",
      "이전 발자국은 다음 공개까지 유지",
      "다음 공개까지 실시간 카운트",
    ],
    mockup: "location",
  },
  {
    badge: "QR SCAN",
    badgeTone: "blue",
    title: "QR 스캔으로 공정하게 체포해요",
    description:
      "경찰이 도둑의 QR을 스캔하는 순간 바로 체포돼요. 실제로 마주쳐야 성립되니까 공정한 경기가 이어져요.",
    checks: ["스캔 한 번이면 바로 체포", "도둑이 본인 QR을 직접 표시"],
    mockup: "qr",
  },
  {
    badge: "TEAM CHAT",
    badgeTone: "green",
    title: "팀원에게만 닿는 대화",
    description:
      "경찰은 경찰끼리, 도둑은 도둑끼리. 전략이 상대 팀으로 새어나가지 않아요.",
    checks: [
      "경찰·도둑 채널 완전 분리",
      "전체 공지 채널 별도 제공",
      "실시간 메시지 동기화",
    ],
    mockup: "chat",
  },
];
