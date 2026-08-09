// 공지사항 목(MSW REST 핸들러가 사용). 세션 동안 생성·수정·삭제가 유지되는 인메모리 스토어.
import type {
  Notice,
  NoticeCategory,
  NoticeInput,
  NoticeList,
} from "@/lib/admin/notices/api";

let seq = 8;

let notices: Notice[] = [
  {
    id: 1,
    title: "경찰과 도둑 정식 출시 안내",
    content: "많은 관심 부탁드립니다. 지금 바로 친구들과 함께 즐겨보세요!",
    pinned: true,
    category: "NOTICE",
    createdAt: "2026-07-20T10:00:00+09:00",
    updatedAt: "2026-07-20T10:00:00+09:00",
  },
  {
    id: 2,
    title: "서버 점검 안내 (8/2 02:00~04:00)",
    content: "안정적인 서비스 제공을 위해 서버 점검을 진행합니다. 점검 시간 동안 게임 이용이 제한됩니다.",
    pinned: true,
    category: "MAINTENANCE",
    createdAt: "2026-07-30T09:00:00+09:00",
    updatedAt: "2026-07-30T09:00:00+09:00",
  },
  {
    id: 3,
    title: "여름 이벤트 - 밤샘 술래잡기",
    content: "8월 한 달간 야간 라운드 참여 시 특별 뱃지를 드립니다.",
    pinned: false,
    category: "EVENT",
    createdAt: "2026-07-28T14:00:00+09:00",
    updatedAt: "2026-07-28T14:00:00+09:00",
  },
  {
    id: 4,
    title: "v3.0.0 업데이트 - 폴리곤 구역 지원",
    content: "이제 원형뿐 아니라 다각형 구역으로도 게임을 만들 수 있어요.",
    pinned: false,
    category: "UPDATE",
    createdAt: "2026-07-29T18:00:00+09:00",
    updatedAt: "2026-07-29T18:00:00+09:00",
  },
  {
    id: 5,
    title: "위치 권한 안내",
    content: "게임 진행을 위해 위치 권한이 필요합니다. 게임 종료 시 위치 정보는 자동 폐기됩니다.",
    pinned: false,
    category: "NOTICE",
    createdAt: "2026-07-15T11:00:00+09:00",
    updatedAt: "2026-07-15T11:00:00+09:00",
  },
  {
    id: 6,
    title: "긴급 점검 완료",
    content: "일시적 접속 지연 문제가 해결되었습니다. 이용에 불편을 드려 죄송합니다.",
    pinned: false,
    category: "MAINTENANCE",
    createdAt: "2026-07-22T20:30:00+09:00",
    updatedAt: "2026-07-22T20:30:00+09:00",
  },
  {
    id: 7,
    title: "친구 초대 이벤트",
    content: "친구를 초대하고 함께 게임하면 양쪽 모두에게 보상을 드려요.",
    pinned: false,
    category: "EVENT",
    createdAt: "2026-07-10T09:00:00+09:00",
    updatedAt: "2026-07-10T09:00:00+09:00",
  },
  {
    id: 8,
    title: "닉네임 정책 업데이트",
    content: "부적절한 닉네임 필터링 기준이 강화되었습니다.",
    pinned: false,
    category: "UPDATE",
    createdAt: "2026-07-05T09:00:00+09:00",
    updatedAt: "2026-07-05T09:00:00+09:00",
  },
];

function nowIso(): string {
  // 브라우저 환경이라 Date 사용 가능.
  return new Date().toISOString();
}

export function mockListNotices(params: {
  page: number;
  size: number;
  category?: NoticeCategory;
}): NoticeList {
  let items = [...notices];
  if (params.category) items = items.filter((n) => n.category === params.category);
  // 고정 먼저, 그다음 최신순.
  items.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.createdAt.localeCompare(a.createdAt)
  );
  const total = items.length;
  const start = params.page * params.size;
  const content = items.slice(start, start + params.size);
  return {
    content,
    page: {
      size: params.size,
      number: params.page,
      totalElements: total,
      totalPages: Math.max(1, Math.ceil(total / params.size)),
    },
  };
}

export function mockGetNotice(id: number): Notice | undefined {
  return notices.find((n) => n.id === id);
}

export function mockCreateNotice(input: NoticeInput): Notice {
  const now = nowIso();
  const notice: Notice = { id: ++seq, ...input, createdAt: now, updatedAt: now };
  notices = [notice, ...notices];
  return notice;
}

export function mockUpdateNotice(id: number, input: NoticeInput): Notice | undefined {
  const idx = notices.findIndex((n) => n.id === id);
  if (idx < 0) return undefined;
  notices[idx] = { ...notices[idx], ...input, updatedAt: nowIso() };
  return notices[idx];
}

export function mockDeleteNotice(id: number): boolean {
  const before = notices.length;
  notices = notices.filter((n) => n.id !== id);
  return notices.length < before;
}
