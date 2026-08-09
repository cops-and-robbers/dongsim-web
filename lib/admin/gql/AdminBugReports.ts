import { graphql } from "react-relay";

// 버그 제보 목록.
export const AdminBugReportsQuery = graphql`
  query AdminBugReports(
    $page: Int
    $size: Int
    $status: BugReportStatus
    $sortDirection: SortDirection
  ) {
    adminBugReports(
      page: $page
      size: $size
      status: $status
      sortDirection: $sortDirection
    ) {
      content {
        id
        content
        userId
        userNickname
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
