// MSW GraphQL 핸들러. Relay가 /graphql 로 보낸 오퍼레이션을 이름으로 매칭해
// 인메모리 데이터셋(data.ts)에서 응답을 만든다.
// delay()로 약간의 지연을 줘서 로딩 상태 UX를 실제처럼 다듬을 수 있게 한다.
import { graphql, http, HttpResponse, delay } from "msw";
import { mockAppConfig, mockApplyAppConfig, mockUploadBanner } from "./appConfig";
import { mockApplyWebgame, mockWebgame, mockWebgameMonitor } from "./webgame";
import { mockEvent, mockEvents, mockSaveEvent, mockSaveMinigame } from "./events";
import { mockCompany, mockRemovePerson, mockRemoveRecord, mockSavePerson, mockSaveRecord, mockSkipEvent } from "./company";
import { mockAssets, mockPatchAsset, mockUploadAsset } from "./assets";
import { mockRelease, mockRunAction } from "./release";
import { mockPresign, mockSaveDraft, mockSaveImageDraft, mockSend, mockStorePage } from "./storePage";
import { mockCreateTemplate, mockDeleteTemplate, mockInbox, mockPatchReview, mockReply, mockTemplates, mockUpdateTemplate, mockWaiting } from "./reviews";
import { mockPatchCheck, mockStoreCheck } from "./storeCheck";
import {
  queryUsers,
  getUser,
  queryGames,
  getGame,
  updateEventGame,
  type GameStatus,
  type SocialType,
} from "./data";
import {
  mockListNotices,
  mockGetNotice,
  mockGetNoticeTranslations,
  mockCreateNotice,
  mockUpdateNotice,
  mockDeleteNotice,
} from "./notices";
import type {
  NoticeCategory,
  NoticeInput,
  NoticeLanguage,
} from "@/lib/admin/notices/api";
import {
  countTermsResetTargets,
  resetTermsAgreement,
  type TermsType,
} from "./data";
import {
  queryGameHistories,
  queryGameHistory,
  queryUserGameHistories,
  type GameEndReason,
} from "./gameHistories";
import {
  queryReports,
  queryBugReports,
  queryCommunityPostReports,
  queryCommunityChatReports,
  queryAllReports,
  updateReportStatus,
  updateBugReportStatus,
  updateCommunityPostReportStatus,
  updateCommunityChatReportStatus,
  getDashboard,
  type ReportStatus,
  type BugReportStatus,
  type ReportSource,
} from "./reports";

export const GRAPHQL_ENDPOINT = "/graphql";

const api = graphql.link(GRAPHQL_ENDPOINT);

export const handlers = [
  api.query("TermsResetPreview", async ({ variables }) => {
    await delay(250);
    const { types } = variables as { types: TermsType[] };
    return HttpResponse.json({
      data: { termsResetPreview: { affectedUsers: countTermsResetTargets(types) } },
    });
  }),

  api.mutation("ResetTermsAgreement", async ({ variables }) => {
    await delay(500);
    const { types } = variables as { types: TermsType[] };
    return HttpResponse.json({
      data: { resetTermsAgreement: { affectedUsers: resetTermsAgreement(types) } },
    });
  }),

  api.query("AdminUsers", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminUsers: queryUsers(
          variables as {
            page?: number;
            size?: number;
            nickname?: string;
            socialType?: SocialType;
            fromDate?: string;
            toDate?: string;
            sortBy?: "CREATED_AT" | "NICKNAME";
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminUser", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: { adminUser: getUser((variables as { id: string }).id) },
    });
  }),

  api.query("AdminUserGameHistories", async ({ variables }) => {
    await delay(400);
    const { id, limit } = variables as { id: string; limit: number };
    // 4번: 백엔드가 운영에 나가기 전, 5번: 불러오기 실패, 6번: 펼치기만 실패 (lib/admin-mock/gameHistories.ts 의 경우 목록)
    if (id === "4") {
      return HttpResponse.json({
        errors: [{ message: "Validation error (FieldUndefined@[adminUser/gameHistories]) : Field 'gameHistories' in type 'AdminUser' is undefined" }],
      });
    }
    if (id === "5" || (id === "6" && limit > 21)) {
      return HttpResponse.json({ data: null, errors: [{ message: "INTERNAL_ERROR" }] });
    }
    return HttpResponse.json({
      data: { adminUser: { id, gameHistories: queryUserGameHistories(id, limit) } },
    });
  }),

  api.query("AdminGames", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminGames: queryGames(
          variables as {
            page?: number;
            size?: number;
            status?: GameStatus;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminGame", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: { adminGame: getGame((variables as { id: string }).id) },
    });
  }),

  api.query("AdminGameHistories", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminGameHistories: queryGameHistories(
          variables as {
            page?: number;
            size?: number;
            endReason?: GameEndReason;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminGameHistory", async ({ variables }) => {
    await delay(400);
    const { id } = variables as { id: string };
    try {
      return HttpResponse.json({ data: { adminGameHistory: queryGameHistory(id) } });
    } catch {
      return HttpResponse.json({
        data: { adminGameHistory: null },
        errors: [{ message: "GAME_RESULT_NOT_FOUND" }],
      });
    }
  }),

  api.query("AdminDashboard", async () => {
    await delay(450);
    return HttpResponse.json({
      data: {
        adminDashboard: getDashboard(),
        adminAllReports: { totalElements: queryAllReports({ page: 0, size: 1, status: "PENDING" }).totalElements },
      },
    });
  }),

  api.query("AdminPendingCounts", async () => {
    await delay(200);
    return HttpResponse.json({
      data: {
        adminAllReports: { totalElements: queryAllReports({ page: 0, size: 1, status: "PENDING" }).totalElements },
        adminBugReports: { totalElements: queryBugReports({ page: 0, size: 1, status: "PENDING" }).totalElements },
      },
    });
  }),

  api.query("AdminReports", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminReports: queryReports(
          variables as {
            page?: number;
            size?: number;
            status?: ReportStatus;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminCommunityPostReports", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminCommunityPostReports: queryCommunityPostReports(
          variables as {
            page?: number;
            size?: number;
            status?: ReportStatus;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminCommunityChatReports", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminCommunityChatReports: queryCommunityChatReports(
          variables as {
            page?: number;
            size?: number;
            status?: ReportStatus;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminAllReports", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminAllReports: queryAllReports(
          variables as {
            page?: number;
            size?: number;
            status?: ReportStatus;
            source?: ReportSource;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.query("AdminBugReports", async ({ variables }) => {
    await delay(400);
    return HttpResponse.json({
      data: {
        adminBugReports: queryBugReports(
          variables as {
            page?: number;
            size?: number;
            status?: BugReportStatus;
            sortDirection?: "ASC" | "DESC";
          }
        ),
      },
    });
  }),

  api.mutation("UpdateReportStatus", async ({ variables }) => {
    await delay(300);
    const v = variables as {
      reportId: string;
      status: ReportStatus;
      adminMemo?: string | null;
    };
    return HttpResponse.json({
      data: {
        updateReportStatus: updateReportStatus(
          v.reportId,
          v.status,
          v.adminMemo ?? null
        ),
      },
    });
  }),

  api.mutation("UpdateCommunityPostReportStatus", async ({ variables }) => {
    await delay(300);
    const v = variables as {
      reportId: string;
      status: ReportStatus;
      adminMemo?: string | null;
    };
    return HttpResponse.json({
      data: {
        updateCommunityPostReportStatus: updateCommunityPostReportStatus(
          v.reportId,
          v.status,
          v.adminMemo ?? null
        ),
      },
    });
  }),

  api.mutation("UpdateCommunityChatReportStatus", async ({ variables }) => {
    await delay(300);
    const v = variables as {
      reportId: string;
      status: ReportStatus;
      adminMemo?: string | null;
    };
    return HttpResponse.json({
      data: {
        updateCommunityChatReportStatus: updateCommunityChatReportStatus(
          v.reportId,
          v.status,
          v.adminMemo ?? null
        ),
      },
    });
  }),

  api.mutation("UpdateEventGame", async ({ variables }) => {
    await delay(300);
    const v = variables as { gameId: string; isEventGame: boolean };
    try {
      return HttpResponse.json({ data: { updateEventGame: updateEventGame(v.gameId, v.isEventGame) } });
    } catch (e) {
      // 백엔드처럼 data 없이 errors 만 돌려준다
      return HttpResponse.json({ data: null, errors: [{ message: e instanceof Error ? e.message : String(e) }] });
    }
  }),

  api.mutation("UpdateBugReportStatus", async ({ variables }) => {
    await delay(300);
    const v = variables as {
      bugReportId: string;
      status: BugReportStatus;
      adminMemo?: string | null;
    };
    return HttpResponse.json({
      data: {
        updateBugReportStatus: updateBugReportStatus(
          v.bugReportId,
          v.status,
          v.adminMemo ?? null
        ),
      },
    });
  }),

  // ── 공지사항 REST (/api/notices) ──
  // 앱 설정. 로컬에서는 실제 Firebase 에 닿지 않는다
  http.get("/api/admin/app-config", async ({ request }) => {
    await delay(300);
    const state = mockAppConfig();
    if (new URL(request.url).searchParams.get("only") === "maintenance") {
      return HttpResponse.json({ maintenance: state.values.maintenance === "true" });
    }
    return HttpResponse.json(state);
  }),

  http.put("/api/admin/app-config", async ({ request }) => {
    await delay(500);
    const { etag, changes } = (await request.json()) as { etag: string; changes: Record<string, string> };
    const { status, body } = mockApplyAppConfig(etag, changes);
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  http.post("/api/admin/app-config/evidence", async () => {
    await delay(800);
    return HttpResponse.json(mockUploadBanner(), { status: 201 });
  }),

  http.post("/api/admin/app-config/banners", async () => {
    await delay(800);
    return HttpResponse.json(mockUploadBanner(), { status: 201 });
  }),

  // 온라인 게임 운영 상태. 로컬에서는 실제 게임 서버에 닿지 않는다
  http.get("/api/admin/webgame/monitor", async () => {
    await delay(400);
    return HttpResponse.json(mockWebgameMonitor());
  }),

  http.get("/api/admin/webgame", async () => {
    await delay(300);
    return HttpResponse.json(mockWebgame());
  }),

  http.put("/api/admin/webgame", async ({ request }) => {
    await delay(500);
    const { status, body } = mockApplyWebgame((await request.json()) as Parameters<typeof mockApplyWebgame>[0]);
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  // 행사 설정(#219). 로컬에서는 실제 부스와 홈이 읽는 저장소에 닿지 않는다. minigame 이 :id 보다 먼저 와야 한다
  http.get("/api/admin/events", async () => {
    await delay(300);
    return HttpResponse.json(mockEvents());
  }),

  http.put("/api/admin/events/minigame", async ({ request }) => {
    await delay(500);
    const { value } = (await request.json()) as { value: Parameters<typeof mockSaveMinigame>[0] };
    return HttpResponse.json(mockSaveMinigame(value));
  }),

  http.get("/api/admin/events/:id", async ({ params }) => {
    await delay(300);
    const { status, body } = mockEvent(Number(params.id));
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  http.put("/api/admin/events/:id", async ({ params, request }) => {
    await delay(500);
    const { status, body } = mockSaveEvent(Number(params.id), (await request.json()) as { settings?: unknown; version?: number });
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  // 회사 소개(#250). 로컬에서는 실제 소개 페이지가 읽는 저장소에 닿지 않는다
  http.get("/api/admin/company", async () => {
    await delay(300);
    return HttpResponse.json(mockCompany());
  }),

  ...(["records", "people"] as const).flatMap((kind) => {
    const url = `/api/admin/company/${kind}`;
    const idOf = (request: Request) => Number(new URL(request.url).searchParams.get("id")) || null;
    const save = async ({ request }: { request: Request }) => {
      await delay(400);
      const body = await request.json();
      const { status, body: out } = kind === "records" ? mockSaveRecord(idOf(request), body as Parameters<typeof mockSaveRecord>[1]) : mockSavePerson(idOf(request), body as Parameters<typeof mockSavePerson>[1]);
      return HttpResponse.json(out as Record<string, unknown>, { status });
    };
    return [
      http.post(url, save),
      http.put(url, save),
      http.delete(url, async ({ request }) => {
        await delay(400);
        const id = idOf(request) ?? 0;
        const version = Number(new URL(request.url).searchParams.get("version"));
        const { status, body } = kind === "records" ? mockRemoveRecord(id, version) : mockRemovePerson(id, version);
        return HttpResponse.json(body as Record<string, unknown>, { status });
      }),
    ];
  }),

  http.post("/api/admin/company/skips", async ({ request }) => {
    await delay(300);
    const { eventId } = (await request.json()) as { eventId: number };
    const { status, body } = mockSkipEvent(eventId);
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  // 출시 보드. 로컬에서는 스토어에 닿지 않고 상황별 값으로 답한다(?scenario=)
  http.get("/api/admin/release", async ({ request }) => {
    await delay(500);
    return HttpResponse.json(mockRelease(new URL(request.url).searchParams.get("scenario")));
  }),

  http.post("/api/admin/release/actions", async ({ request }) => {
    await delay(900);
    const { status, body } = mockRunAction((await request.json()) as { id?: string; dryRun?: boolean });
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  // 스토어 점검. 로컬에서는 실제 스토어와 Supabase 에 닿지 않는다
  http.get("/api/admin/store-check", async () => {
    await delay(300);
    return HttpResponse.json(mockStoreCheck());
  }),

  http.patch("/api/admin/store-check", async ({ request }) => {
    await delay(200);
    return HttpResponse.json(mockPatchCheck((await request.json()) as Parameters<typeof mockPatchCheck>[0]));
  }),

  // 리뷰. 로컬에서는 실제 스토어와 Supabase 에 닿지 않는다
  http.get("/api/admin/reviews", async ({ request }) => {
    await delay(300);
    return HttpResponse.json(new URL(request.url).searchParams.get("count") ? mockWaiting() : mockInbox());
  }),

  http.patch("/api/admin/reviews", async ({ request }) => {
    await delay(200);
    return HttpResponse.json(mockPatchReview((await request.json()) as Parameters<typeof mockPatchReview>[0]));
  }),

  http.post("/api/admin/reviews", async ({ request }) => {
    await delay(500);
    return HttpResponse.json(mockReply((await request.json()) as Parameters<typeof mockReply>[0]));
  }),

  http.get("/api/admin/reviews/templates", async () => {
    await delay(200);
    return HttpResponse.json(mockTemplates());
  }),

  http.post("/api/admin/reviews/templates", async ({ request }) => {
    await delay(300);
    return HttpResponse.json(mockCreateTemplate((await request.json()) as Parameters<typeof mockCreateTemplate>[0]));
  }),

  http.put("/api/admin/reviews/templates", async ({ request }) => {
    await delay(300);
    return HttpResponse.json(mockUpdateTemplate((await request.json()) as Parameters<typeof mockUpdateTemplate>[0]));
  }),

  http.delete("/api/admin/reviews/templates", async ({ request }) => {
    await delay(200);
    return HttpResponse.json(mockDeleteTemplate(Number(new URL(request.url).searchParams.get("id"))));
  }),

  // 스토어 페이지. 로컬에서는 실제 스토어와 Supabase 에 닿지 않는다
  http.get("/api/admin/store-page", async () => {
    await delay(400);
    return HttpResponse.json(mockStorePage());
  }),

  http.put("/api/admin/store-page", async ({ request }) => {
    await delay(300);
    return HttpResponse.json(mockSaveDraft((await request.json()) as Parameters<typeof mockSaveDraft>[0]));
  }),

  http.post("/api/admin/store-page/send", async ({ request }) => {
    await delay(500);
    return HttpResponse.json(mockSend((await request.json()) as Parameters<typeof mockSend>[0]));
  }),

  http.post("/api/admin/store-page/images", async ({ request }) => {
    await delay(200);
    return HttpResponse.json(mockPresign((await request.json()) as Parameters<typeof mockPresign>[0]));
  }),

  http.put("/api/admin/store-page/images", async ({ request }) => {
    await delay(200);
    return HttpResponse.json(mockSaveImageDraft((await request.json()) as Parameters<typeof mockSaveImageDraft>[0]));
  }),

  // 그림 보관함(#224). 로컬에서는 실제 R2 와 Supabase 에 닿지 않는다
  http.get("/api/admin/assets", async () => {
    await delay(300);
    return HttpResponse.json(mockAssets());
  }),

  http.post("/api/admin/assets", async ({ request }) => {
    await delay(800);
    const { status, body } = mockUploadAsset(await request.formData());
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  http.patch("/api/admin/assets/:id", async ({ params, request }) => {
    await delay(300);
    const { status, body } = mockPatchAsset(Number(params.id), (await request.json()) as { label?: string; archived?: boolean });
    return HttpResponse.json(body as Record<string, unknown>, { status });
  }),

  http.get("/api/notices", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 10);
    const category = url.searchParams.get("category") as NoticeCategory | null;
    const language = url.searchParams.get("language") as NoticeLanguage | null;
    return HttpResponse.json(
      mockListNotices({
        page,
        size,
        category: category ?? undefined,
        language: language ?? undefined,
      })
    );
  }),

  http.get("/api/notices/:id/translations", async ({ params }) => {
    const data = mockGetNoticeTranslations(Number(params.id));
    return data
      ? HttpResponse.json(data)
      : new HttpResponse(null, { status: 404 });
  }),

  http.get("/api/notices/:id", async ({ request, params }) => {
    const url = new URL(request.url);
    const language = (url.searchParams.get("language") as NoticeLanguage | null) ?? "ko";
    const notice = mockGetNotice(Number(params.id), language);
    return notice
      ? HttpResponse.json(notice)
      : new HttpResponse(null, { status: 404 });
  }),

  http.post("/api/notices", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as NoticeInput;
    return HttpResponse.json(mockCreateNotice(body), { status: 201 });
  }),

  http.put("/api/notices/:id", async ({ request, params }) => {
    await delay(300);
    const body = (await request.json()) as NoticeInput;
    const notice = mockUpdateNotice(Number(params.id), body);
    return notice
      ? HttpResponse.json(notice)
      : new HttpResponse(null, { status: 404 });
  }),

  http.delete("/api/notices/:id", async ({ params }) => {
    await delay(300);
    mockDeleteNotice(Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
