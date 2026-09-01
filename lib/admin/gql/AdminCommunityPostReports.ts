import { graphql } from "react-relay";

// 커뮤니티 모집글 신고 목록.
export const AdminCommunityPostReportsQuery = graphql`
  query AdminCommunityPostReports(
    $page: Int
    $size: Int
    $status: ReportStatus
    $sortDirection: SortDirection
  ) {
    adminCommunityPostReports(
      page: $page
      size: $size
      status: $status
      sortDirection: $sortDirection
    ) {
      content {
        id
        postId
        postTitle
        postContent
        reporterUserId
        reporterNickname
        reportedUserId
        reportedNickname
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
