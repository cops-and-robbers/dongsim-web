import { graphql } from "react-relay";

// 세 종류 신고를 합친 목록. 공통 필드만 내려오고 처리 뮤테이션이 없다.
export const AdminAllReportsQuery = graphql`
  query AdminAllReports(
    $page: Int
    $size: Int
    $status: ReportStatus
    $source: ReportSource
    $sortDirection: SortDirection
  ) {
    adminAllReports(
      page: $page
      size: $size
      status: $status
      source: $source
      sortDirection: $sortDirection
    ) {
      content {
        id
        source
        reporterUserId
        reporterNickname
        reportedUserId
        reportedNickname
        content
        status
        createdAt
      }
      totalElements
      totalPages
      page
      size
    }
  }
`;
