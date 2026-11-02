import { graphql } from "react-relay";

// 메뉴에 띄울 미처리 건수. 목록은 필요 없어 한 줄만 받고 전체 건수를 읽는다.
// 신고는 adminDashboard.pendingReportCount 가 아니라 통합 신고에서 센다. 그 값은 게임 채팅 신고만 세서
// 모집글, 커뮤니티 채팅 신고가 빠진다(BE AdminDashboardService)
export const AdminPendingCountsQuery = graphql`
  query AdminPendingCounts {
    adminAllReports(page: 0, size: 1, status: PENDING) {
      totalElements
    }
    adminBugReports(page: 0, size: 1, status: PENDING) {
      totalElements
    }
  }
`;
