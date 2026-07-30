export const SITE_URL = "https://copsnro66ers.site";

export const APP_LINKS = {
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.elipair.copsandrobbers",
  appStore: "https://apps.apple.com/kr/app/경찰과도둑/id6756843948",
};

export const BRAND = {
  fullName: "동심지키미",
  tagline: "추억의 게임에서 가치를 찾습니다",
  email: "copsnro66ers@gmail.com",
  game: "경찰과 도둑",
  appVersion: "v1.7.4",
  instagram: "https://www.instagram.com/cops._.robbers",
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

/** 회사 소개 카드에 행으로 나열하는 기본 정보. 항목은 아래에 계속 추가할 수 있다. */
export const COMPANY_INFO: { label: string; value: string; href?: string }[] = [
  { label: "설립", value: "2026년 4월" },
  { label: "대표", value: FOUNDER.name },
  { label: "팀 규모", value: `${TEAM_MEMBERS.length + 1}명` },
  { label: "분야", value: "위치 기반 오프라인 게임" },
  { label: "대표 서비스", value: BRAND.game },
  { label: "문의", value: BRAND.email, href: `mailto:${BRAND.email}` },
];

export type HelperRole = "infrastructure" | "qa";

export type Helper = {
  name: string;
  role: HelperRole;
  participationCount: number;
  github?: string;
};

/**
 * 도움 주신 분들 - 발자국 카운트 = participationCount.
 * 인프라 제공자는 별도 spotlight로 노출.
 * 정렬: infrastructure 먼저, 그다음 참여 횟수 내림차순, 같은 횟수 안에선 입력 순서.
 */
export const HELPERS: Helper[] = [
  {
    name: "신지훈",
    role: "infrastructure",
    participationCount: 1,
    github: "https://github.com/developowl",
  },
  {
    name: "남해윤",
    role: "qa",
    participationCount: 2,
    github: "https://github.com/haeyoon1",
  },
  {
    name: "송혜정",
    role: "qa",
    participationCount: 2,
    github: "https://github.com/Songhyejeong",
  },
  {
    name: "이진",
    role: "qa",
    participationCount: 2,
    github: "https://github.com/2Jin1031",
  },
  { name: "안금서", role: "qa", participationCount: 1 },
  { name: "손건우", role: "qa", participationCount: 1 },
  { name: "신혜빈", role: "qa", participationCount: 1 },
  { name: "정창우", role: "qa", participationCount: 1 },
  { name: "허석준", role: "qa", participationCount: 1 },
  { name: "서현진", role: "qa", participationCount: 1 },
  { name: "오동현", role: "qa", participationCount: 1 },
  { name: "최승훈", role: "qa", participationCount: 1 },
  { name: "김민욱", role: "qa", participationCount: 1 },
  { name: "정명준", role: "qa", participationCount: 1 },
  { name: "강대현", role: "qa", participationCount: 1 },
  { name: "심 혁", role: "qa", participationCount: 1 },
];

export type HistoryEntry = { date: string; title: string };
export type AwardEntry = { date: string; title: string; award: string };

/** 주요 연혁 - 오래된 것부터 최신 순. */
export const TEAM_HISTORY: HistoryEntry[] = [
  { date: "2026.03.24", title: "경찰과 도둑 1차 QA 진행" },
  { date: "2026.04.08", title: "동심지키미 설립" },
  { date: "2026.04.28", title: "경찰과 도둑 2차 QA 진행" },
  { date: "2026.07.04", title: "서울게임타운 박람회 ‘경찰과 도둑’ 부스 참여" },
];

/** 수상 및 선정 이력. */
export const TEAM_AWARDS: AwardEntry[] = [
  { date: "2026.05.08", title: "세종 창업 아이디어 리그", award: "대상" },
  { date: "2026.03.06", title: "세종대학교 아롬 데모데이", award: "특별상" },
  { date: "2026.07", title: "세종대학교 하반기 입주공모전", award: "우수 창업 아이템상" },
  { date: "2026.07", title: "세종대학교 창업 동아리 SSUP", award: "선정" },
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

export type FaqItem = {
  question: string;
  answer: string;
  link?: { label: string; href: string };
};

export const GAME_FAQ: FaqItem[] = [
  {
    question: "몇 명이서 할 수 있나요?",
    answer:
      "최대 50명까지 가능합니다. 경찰 팀과 도둑 팀으로 나눠서 진행합니다.",
  },
  {
    question: "한 판에 얼마나 걸리나요?",
    answer: "기본 30분이고, 방장이 더 짧게도 길게도 정할 수 있습니다.",
  },
  {
    question: "도둑 위치는 경찰한테 어떻게 공개되나요?",
    answer:
      "방장이 정한 주기마다 도둑의 위치가 경찰 지도에 발자국으로 표시됩니다.",
  },
  {
    question: "경찰은 도둑을 어떻게 잡나요?",
    answer: "도둑을 따라잡은 뒤, 도둑 화면의 QR을 스캔하면 체포됩니다.",
  },
  {
    question: "감옥에 갇히면 끝인가요?",
    answer: "아닙니다. 갇혀도 팀원이 구해주면 다시 도망칠 수 있습니다.",
  },
  {
    question: "같은 팀끼리만 대화할 수 있나요?",
    answer:
      "경찰과 도둑의 채팅방이 분리되어 있어, 상대 팀은 대화를 볼 수 없습니다.",
  },
  {
    question: "아이폰과 안드로이드가 같이 할 수 있나요?",
    answer: "네, 기종과 관계없이 함께 플레이할 수 있습니다.",
  },
  {
    question: "위치 정보는 안전하게 처리되나요?",
    answer:
      "게임이 진행되는 동안에만 위치를 수집하고, 게임이 끝나면 멈춥니다. 자세한 내용은 위치정보 이용약관에서 확인할 수 있습니다.",
    link: { label: "위치정보 이용약관 보기", href: "/location" },
  },
  {
    question: "무료인가요?",
    answer: "네, 무료로 다운로드하여 플레이할 수 있습니다.",
  },
];
