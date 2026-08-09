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
  }
`;
