// 신고·버그 제보 목(MSW GraphQL 핸들러가 사용). 세션 동안 상태 변경이 유지된다.

export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type ReportType =
  | "FISHING"
  | "VERBAL_ABUSE"
  | "IMPERSONATION"
  | "SPAM"
  | "CHEATING"
  | "DEMORALIZATION"
  | "ETC";
export type BugReportStatus = "PENDING" | "RESOLVED";
export type ReportSource = "GAME_CHAT" | "COMMUNITY_POST" | "COMMUNITY_CHAT";

export interface MockReport {
  id: string;
  gameId: string;
  reporterUserId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedNickname: string;
  messageContent: string;
  reportType: ReportType;
  etcReason: string | null;
  status: ReportStatus;
  resolvedBy: string | null;
  adminMemo: string | null;
  createdAt: string;
}

export interface MockCommunityPostReport {
  id: string;
  postId: string;
  postTitle: string;
  postContent: string;
  reporterUserId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedNickname: string;
  reportType: ReportType;
  etcReason: string | null;
  status: ReportStatus;
  adminMemo: string | null;
  createdAt: string;
}

export interface MockCommunityChatReport {
  id: string;
  chatMessageId: string;
  reporterUserId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedNickname: string;
  messageContent: string;
  reportType: ReportType;
  etcReason: string | null;
  status: ReportStatus;
  adminMemo: string | null;
  createdAt: string;
}

export interface MockBugReport {
  id: string;
  content: string;
  userId: string;
  userNickname: string;
  status: BugReportStatus;
  adminMemo: string | null;
  createdAt: string;
}

const NICKS = [
  "집요한수사관4512",
  "날쌘도둑",
  "은밀한냥파",
  "잽싼여우",
  "명랑한삵",
  "수상한수달",
  "대담한고양이",
  "조용한토끼",
];
const TYPES: ReportType[] = [
  "FISHING",
  "VERBAL_ABUSE",
  "IMPERSONATION",
  "SPAM",
  "CHEATING",
  "DEMORALIZATION",
  "ETC",
];
const MSGS = [
  "야 너 진짜 못한다 ㅋㅋ",
  "○○사이트 무료 아이템 지금 검색",
  "핵 쓰는 거 아니냐 위치가 계속 보임",
  "그냥 나가버림 팀 다 망함",
  "관리자인데 계정 정보 알려줘",
  "도배도배도배도배도배",
  "욕설이 너무 심해요",
];

const reports: MockReport[] = Array.from({ length: 14 }, (_, i) => {
  const type = TYPES[i % TYPES.length];
  const rep = NICKS[i % NICKS.length];
  const red = NICKS[(i + 3) % NICKS.length];
  const status: ReportStatus =
    i % 5 === 0 ? "RESOLVED" : i % 7 === 0 ? "DISMISSED" : "PENDING";
  const day = 28 - (i % 20);
  return {
    id: String(100 + i),
    gameId: String(3 + (i % 12)),
    reporterUserId: String(10 + i),
    reporterNickname: rep,
    reportedUserId: String(20 + i),
    reportedNickname: red,
    messageContent: MSGS[i % MSGS.length],
    reportType: type,
    etcReason: type === "ETC" ? "규칙에 없는 비매너 행위예요." : null,
    status,
    resolvedBy: status === "PENDING" ? null : "9",
    adminMemo: status === "RESOLVED" ? "확인 후 경고 처리했어요." : null,
    createdAt: `2026-07-${String(day).padStart(2, "0")}T${String(
      9 + (i % 12)
    ).padStart(2, "0")}:15:00+09:00`,
  };
});

const BUGS = [
  "게임 시작 버튼을 누르면 앱이 꺼져요.",
  "지도에서 내 위치가 계속 튀어요.",
  "체포 버튼이 가끔 안 눌려요.",
  "초대 링크로 들어가면 흰 화면만 떠요.",
  "다크 모드에서 글씨가 안 보여요.",
  "게임 종료 후 결과가 안 나와요.",
  "푸시 알림이 두 번씩 와요.",
  "닉네임 변경이 저장이 안 돼요.",
];

const bugReports: MockBugReport[] = BUGS.map((content, i) => {
  const status: BugReportStatus = i % 3 === 0 ? "RESOLVED" : "PENDING";
  const day = 30 - i;
  return {
    id: String(200 + i),
    content,
    userId: String(30 + i),
    userNickname: NICKS[i % NICKS.length],
    status,
    adminMemo: status === "RESOLVED" ? "다음 배포에 반영했어요." : null,
    createdAt: `2026-07-${String(day).padStart(2, "0")}T${String(
      10 + (i % 10)
    ).padStart(2, "0")}:30:00+09:00`,
  };
});

const POST_TITLES = [
  "광진구 어린이대공원 술래잡기 하실 분",
  "홍대입구 저녁 8시 모집합니다",
  "부산 광안리 주말 번개",
  "성수동 뛰실 분 구해요",
  "대전 은행동 야간 모임",
  "제주 함덕 해변 모집",
];
const POST_BODIES = [
  "○○사이트 가입하면 아이템 무료로 드려요 지금 검색",
  "초보만 오세요 잘하는 사람 오면 욕함",
  "참가비 3만원 계좌로 먼저 입금해주세요",
  "다른 모임 광고입니다 여기로 오세요",
  "관리자입니다 인증을 위해 정보를 보내주세요",
  "도배도배도배도배도배도배",
];
const CHAT_MSGS = [
  "야 진짜 못하네 오지 마라",
  "○○ 링크 눌러보세요 이벤트 중",
  "돈 먼저 보내면 자리 잡아드림",
  "운영자인데 계정 확인 좀 할게요",
  "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ",
  "여기 말고 다른 방으로 오세요",
];

const communityPostReports: MockCommunityPostReport[] = Array.from(
  { length: 9 },
  (_, i) => {
    const type = TYPES[(i + 2) % TYPES.length];
    const status: ReportStatus =
      i % 4 === 0 ? "RESOLVED" : i % 6 === 0 ? "DISMISSED" : "PENDING";
    return {
      id: String(300 + i),
      postId: String(40 + i),
      postTitle: POST_TITLES[i % POST_TITLES.length],
      postContent: POST_BODIES[i % POST_BODIES.length],
      reporterUserId: String(10 + i),
      reporterNickname: NICKS[i % NICKS.length],
      reportedUserId: String(20 + i),
      reportedNickname: i === 4 ? "알수없음" : NICKS[(i + 2) % NICKS.length],
      reportType: type,
      etcReason: type === "ETC" ? "모임 내용과 관계없는 글이에요." : null,
      status,
      adminMemo: status === "RESOLVED" ? "게시글을 내렸어요." : null,
      createdAt: `2026-08-${String(24 - (i % 18)).padStart(2, "0")}T${String(
        10 + (i % 10)
      ).padStart(2, "0")}:20:00+09:00`,
    };
  }
);

const communityChatReports: MockCommunityChatReport[] = Array.from(
  { length: 7 },
  (_, i) => {
    const type = TYPES[(i + 4) % TYPES.length];
    const status: ReportStatus =
      i % 3 === 0 ? "RESOLVED" : i % 5 === 0 ? "DISMISSED" : "PENDING";
    return {
      id: String(400 + i),
      chatMessageId: String(900 + i),
      reporterUserId: String(12 + i),
      reporterNickname: NICKS[(i + 1) % NICKS.length],
      reportedUserId: String(22 + i),
      reportedNickname: NICKS[(i + 5) % NICKS.length],
      messageContent: CHAT_MSGS[i % CHAT_MSGS.length],
      reportType: type,
      etcReason: type === "ETC" ? "대화 흐름을 계속 끊어요." : null,
      status,
      adminMemo: status === "RESOLVED" ? "채팅 이용을 제한했어요." : null,
      createdAt: `2026-08-${String(25 - (i % 16)).padStart(2, "0")}T${String(
        11 + (i % 9)
      ).padStart(2, "0")}:40:00+09:00`,
    };
  }
);

function paginate<T extends { status: string; createdAt: string }>(
  all: T[],
  args: { page?: number; size?: number; status?: string; sortDirection?: "ASC" | "DESC" }
) {
  const page = args.page ?? 0;
  const size = args.size ?? 20;
  const items = args.status ? all.filter((r) => r.status === args.status) : [...all];
  items.sort((a, b) =>
    args.sortDirection === "ASC"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  );
  const totalElements = items.length;
  const content = items.slice(page * size, page * size + size);
  return {
    content,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    page,
    size,
  };
}

export function queryReports(args: {
  page?: number;
  size?: number;
  status?: ReportStatus;
  sortDirection?: "ASC" | "DESC";
}) {
  return paginate(reports, args);
}

export function queryBugReports(args: {
  page?: number;
  size?: number;
  status?: BugReportStatus;
  sortDirection?: "ASC" | "DESC";
}) {
  return paginate(bugReports, args);
}

export function queryCommunityPostReports(args: {
  page?: number;
  size?: number;
  status?: ReportStatus;
  sortDirection?: "ASC" | "DESC";
}) {
  return paginate(communityPostReports, args);
}

export function queryCommunityChatReports(args: {
  page?: number;
  size?: number;
  status?: ReportStatus;
  sortDirection?: "ASC" | "DESC";
}) {
  return paginate(communityChatReports, args);
}

// 세 종류를 공통 필드로 합친 목록. 실제 서버는 DB UNION 으로 만든다.
export function queryAllReports(args: {
  page?: number;
  size?: number;
  status?: ReportStatus;
  source?: ReportSource;
  sortDirection?: "ASC" | "DESC";
}) {
  const merged = [
    ...reports.map((r) => ({ ...toAllReport(r, "GAME_CHAT"), content: r.messageContent })),
    ...communityPostReports.map((r) => ({
      ...toAllReport(r, "COMMUNITY_POST"),
      content: r.postTitle,
    })),
    ...communityChatReports.map((r) => ({
      ...toAllReport(r, "COMMUNITY_CHAT"),
      content: r.messageContent,
    })),
  ];
  const scoped = args.source ? merged.filter((r) => r.source === args.source) : merged;
  return paginate(scoped, args);
}

function toAllReport(
  r: {
    id: string;
    reporterUserId: string;
    reporterNickname: string;
    reportedUserId: string;
    reportedNickname: string;
    status: ReportStatus;
    createdAt: string;
  },
  source: ReportSource
) {
  return {
    id: r.id,
    source,
    reporterUserId: r.reporterUserId,
    reporterNickname: r.reporterNickname,
    reportedUserId: r.reportedUserId,
    reportedNickname: r.reportedNickname,
    status: r.status,
    createdAt: r.createdAt,
  };
}

export function updateCommunityPostReportStatus(
  reportId: string,
  status: ReportStatus,
  adminMemo: string | null
): MockCommunityPostReport | null {
  const r = communityPostReports.find((x) => x.id === reportId);
  if (!r) return null;
  r.status = status;
  r.adminMemo = adminMemo ?? r.adminMemo;
  return r;
}

export function updateCommunityChatReportStatus(
  reportId: string,
  status: ReportStatus,
  adminMemo: string | null
): MockCommunityChatReport | null {
  const r = communityChatReports.find((x) => x.id === reportId);
  if (!r) return null;
  r.status = status;
  r.adminMemo = adminMemo ?? r.adminMemo;
  return r;
}

export function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminMemo: string | null
): MockReport | null {
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  r.status = status;
  r.adminMemo = adminMemo ?? r.adminMemo;
  r.resolvedBy = status === "PENDING" ? null : "9";
  return r;
}

export function updateBugReportStatus(
  bugReportId: string,
  status: BugReportStatus,
  adminMemo: string | null
): MockBugReport | null {
  const b = bugReports.find((x) => x.id === bugReportId);
  if (!b) return null;
  b.status = status;
  b.adminMemo = adminMemo ?? b.adminMemo;
  return b;
}

// 대시보드(개요) 집계 목. pending 수는 실제 목 데이터에서 파생.
export function getDashboard() {
  return {
    todayGameCount: 12,
    weeklyGameCount: 84,
    inProgressGameCount: 5,
    totalUserCount: 314,
    todayNewUserCount: 18,
    pendingReportCount: reports.filter((r) => r.status === "PENDING").length,
    pendingBugReportCount: bugReports.filter((b) => b.status === "PENDING").length,
    averageGameDurationSeconds: 742.5, // BE는 AVG라 소수 - 목도 소수로 둬서 반올림 처리 검증
    endReasonDistribution: [
      { endReason: "ALL_ARRESTED", count: 41 },
      { endReason: "TIME_OVER", count: 27 },
      { endReason: "ROBBER_FORFEITED", count: 9 },
      { endReason: "POLICE_FORFEITED", count: 7 },
    ],
    // BE 스케일과 동일하게 0~100 퍼센트로 둔다.
    winRateByTeam: { policeWinRate: 54, robberWinRate: 46 },
  };
}
