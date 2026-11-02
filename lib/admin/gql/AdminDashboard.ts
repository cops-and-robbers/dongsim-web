import { graphql } from "react-relay";

// 대시보드(개요) 집계. PR #141 계약.
export const AdminDashboardQuery = graphql`
  query AdminDashboard {
    adminDashboard {
      todayGameCount
      weeklyGameCount
      inProgressGameCount
      totalUserCount
      todayNewUserCount
      pendingReportCount
      pendingBugReportCount
      averageGameDurationSeconds
      endReasonDistribution {
        endReason
        count
      }
      winRateByTeam {
        policeWinRate
        robberWinRate
      }
    }
    # pendingReportCount 는 게임 채팅 신고만 세서, 메뉴 숫자와 같은 통합 신고 건수를 함께 받는다
    adminAllReports(page: 0, size: 1, status: PENDING) {
      totalElements
    }
  }
`;
