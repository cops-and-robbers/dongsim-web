import { graphql } from "react-relay";

// 신고 목록.
export const AdminReportsQuery = graphql`
  query AdminReports(
    $page: Int
    $size: Int
    $status: ReportStatus
    $sortDirection: SortDirection
  ) {
    adminReports(
      page: $page
      size: $size
      status: $status
      sortDirection: $sortDirection
    ) {
      content {
        id
        gameId
        reporterUserId
        reporterNickname
        reportedUserId
        reportedNickname
        messageContent
        reportType
        etcReason
        status
        adminMemo
        createdAt
      }
      totalElements
      totalPages
      page
      size
    }
  }
`;
