// 공지사항 목(MSW REST 핸들러가 사용). 세션 동안 생성·수정·삭제가 유지되는 인메모리 스토어.
// BE 다국어 계약(#174)과 같은 규칙으로 동작한다: 본문은 언어별 번역으로 저장하고,
// 조회 시 요청 언어 → 원문 언어 → 아무 번역 순으로 대체한다.
import type {
  Notice,
  NoticeCategory,
  NoticeInput,
  NoticeLanguage,
  NoticeList,
} from "@/lib/admin/notices/api";

type StoredNotice = {
  id: number;
  pinned: boolean;
  category: NoticeCategory;
  originalLanguage: NoticeLanguage;
  translations: Partial<Record<NoticeLanguage, { title: string; content: string }>>;
  createdAt: string;
  updatedAt: string;
};

let seq = 8;

let notices: StoredNotice[] = [
  {
    id: 1,
    pinned: true,
    category: "NOTICE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "경찰과 도둑 정식 출시 안내",
        content: "많은 관심 부탁드립니다. 지금 바로 친구들과 함께 즐겨보세요!",
      },
      ja: {
        title: "「警察と泥棒」正式リリースのお知らせ",
        content: "今すぐ友達と一緒に遊んでみてください!",
      },
    },
    createdAt: "2026-07-20T10:00:00+09:00",
    updatedAt: "2026-07-20T10:00:00+09:00",
  },
  {
    id: 2,
    pinned: true,
    category: "MAINTENANCE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "서버 점검 안내 (8/2 02:00~04:00)",
        content:
          "안정적인 서비스 제공을 위해 서버 점검을 진행합니다. 점검 시간 동안 게임 이용이 제한됩니다.",
      },
      ja: {
        title: "サーバーメンテナンスのお知らせ (8/2 02:00~04:00)",
        content:
          "安定したサービス提供のため、サーバーメンテナンスを実施します。メンテナンス中はゲームをご利用いただけません。",
      },
      en: {
        title: "Server maintenance (Aug 2, 02:00-04:00)",
        content:
          "We will perform server maintenance to keep the service stable. The game will be unavailable during this window.",
      },
    },
    createdAt: "2026-07-30T09:00:00+09:00",
    updatedAt: "2026-07-30T09:00:00+09:00",
  },
  {
    id: 3,
    pinned: false,
    category: "EVENT",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "여름 이벤트 - 밤샘 술래잡기",
        content: "8월 한 달간 야간 라운드 참여 시 특별 뱃지를 드립니다.",
      },
    },
    createdAt: "2026-07-28T14:00:00+09:00",
    updatedAt: "2026-07-28T14:00:00+09:00",
  },
  {
    id: 4,
    pinned: false,
    category: "UPDATE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "v3.0.0 업데이트 - 폴리곤 구역 지원",
        content: "이제 원형뿐 아니라 다각형 구역으로도 게임을 만들 수 있어요.",
      },
    },
    createdAt: "2026-07-29T18:00:00+09:00",
    updatedAt: "2026-07-29T18:00:00+09:00",
  },
  {
    id: 5,
    pinned: false,
    category: "NOTICE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "위치 권한 안내",
        content:
          "게임 진행을 위해 위치 권한이 필요합니다. 게임 종료 시 위치 정보는 자동 폐기됩니다.",
      },
    },
    createdAt: "2026-07-15T11:00:00+09:00",
    updatedAt: "2026-07-15T11:00:00+09:00",
  },
  {
    id: 6,
    pinned: false,
    category: "MAINTENANCE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "긴급 점검 완료",
        content: "일시적 접속 지연 문제가 해결되었습니다. 이용에 불편을 드려 죄송합니다.",
      },
    },
    createdAt: "2026-07-22T20:30:00+09:00",
    updatedAt: "2026-07-22T20:30:00+09:00",
  },
  {
    id: 7,
    pinned: false,
    category: "EVENT",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "친구 초대 이벤트",
        content: "친구를 초대하고 함께 게임하면 양쪽 모두에게 보상을 드려요.",
      },
    },
    createdAt: "2026-07-10T09:00:00+09:00",
    updatedAt: "2026-07-10T09:00:00+09:00",
  },
  {
    id: 8,
    pinned: false,
    category: "UPDATE",
    originalLanguage: "ko",
    translations: {
      ko: {
        title: "닉네임 정책 업데이트",
        content: "부적절한 닉네임 필터링 기준이 강화되었습니다.",
      },
    },
    createdAt: "2026-07-05T09:00:00+09:00",
    updatedAt: "2026-07-05T09:00:00+09:00",
  },
];

function nowIso(): string {
  // 브라우저 환경이라 Date 사용 가능.
  return new Date().toISOString();
}

/** BE와 같은 대체 규칙: 요청 언어 → 원문 언어 → 아무 번역. */
function resolve(stored: StoredNotice, requested: NoticeLanguage): Notice {
  const translation =
    stored.translations[requested] ??
    stored.translations[stored.originalLanguage] ??
    Object.values(stored.translations)[0];
  const language = stored.translations[requested]
    ? requested
    : stored.translations[stored.originalLanguage]
      ? stored.originalLanguage
      : (Object.keys(stored.translations)[0] as NoticeLanguage);
  return {
    id: stored.id,
    title: translation?.title ?? "",
    content: translation?.content ?? "",
    language,
    requestedLanguage: requested,
    pinned: stored.pinned,
    category: stored.category,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}

export function mockListNotices(params: {
  page: number;
  size: number;
  category?: NoticeCategory;
  language?: NoticeLanguage;
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
  const content = items
    .slice(start, start + params.size)
    .map((n) => resolve(n, params.language ?? "ko"));
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

export function mockGetNoticeTranslations(id: number):
  | {
      noticeId: number;
      originalLanguage: NoticeLanguage;
      translations: { language: NoticeLanguage; title: string; content: string }[];
    }
  | undefined {
  const stored = notices.find((n) => n.id === id);
  if (!stored) return undefined;
  return {
    noticeId: stored.id,
    originalLanguage: stored.originalLanguage,
    translations: Object.entries(stored.translations).map(([language, t]) => ({
      language: language as NoticeLanguage,
      title: t.title,
      content: t.content,
    })),
  };
}

export function mockGetNotice(
  id: number,
  language: NoticeLanguage
): Notice | undefined {
  const stored = notices.find((n) => n.id === id);
  return stored ? resolve(stored, language) : undefined;
}

function toStoredTranslations(input: NoticeInput): StoredNotice["translations"] {
  return Object.fromEntries(
    input.translations.map((t) => [t.language, { title: t.title, content: t.content }])
  );
}

export function mockCreateNotice(input: NoticeInput): Notice {
  const now = nowIso();
  const stored: StoredNotice = {
    id: ++seq,
    pinned: input.pinned,
    category: input.category,
    originalLanguage: input.originalLanguage,
    translations: toStoredTranslations(input),
    createdAt: now,
    updatedAt: now,
  };
  notices = [stored, ...notices];
  return resolve(stored, input.originalLanguage);
}

export function mockUpdateNotice(id: number, input: NoticeInput): Notice | undefined {
  const idx = notices.findIndex((n) => n.id === id);
  if (idx < 0) return undefined;
  notices[idx] = {
    ...notices[idx],
    pinned: input.pinned,
    category: input.category,
    originalLanguage: input.originalLanguage,
    translations: toStoredTranslations(input),
    updatedAt: nowIso(),
  };
  return resolve(notices[idx], input.originalLanguage);
}

export function mockDeleteNotice(id: number): boolean {
  const before = notices.length;
  notices = notices.filter((n) => n.id !== id);
  return notices.length < before;
}
