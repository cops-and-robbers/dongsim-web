// MSW GraphQL 핸들러. Relay가 /graphql 로 보낸 오퍼레이션을 이름으로 매칭해
// 인메모리 데이터셋(data.ts)에서 응답을 만든다.
// delay()로 약간의 지연을 줘서 로딩 상태 UX를 실제처럼 다듬을 수 있게 한다.
import { graphql, http, HttpResponse, delay } from "msw";
import {
  queryUsers,
  getUser,
  queryGames,
  getGame,
  type GameStatus,
  type SocialType,
} from "./data";
import {
  mockListNotices,
  mockGetNotice,
  mockCreateNotice,
  mockUpdateNotice,
  mockDeleteNotice,
} from "./notices";
import type { NoticeCategory, NoticeInput } from "@/lib/admin/notices/api";
import {
  queryGameHistories,
  queryGameHistory,
  type GameEndReason,
} from "./gameHistories";
import {
  queryReports,
  queryBugReports,
  updateReportStatus,
  updateBugReportStatus,
  getDashboard,
  type ReportStatus,
  type BugReportStatus,
} from "./reports";

export const GRAPHQL_ENDPOINT = "/graphql";

const api = graphql.link(GRAPHQL_ENDPOINT);

export const handlers = [
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
    return HttpResponse.json({ data: { adminDashboard: getDashboard() } });
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
  http.get("/api/notices", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 10);
    const category = url.searchParams.get("category") as NoticeCategory | null;
    return HttpResponse.json(
      mockListNotices({ page, size, category: category ?? undefined })
    );
  }),

  http.get("/api/notices/:id", async ({ params }) => {
    const notice = mockGetNotice(Number(params.id));
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
