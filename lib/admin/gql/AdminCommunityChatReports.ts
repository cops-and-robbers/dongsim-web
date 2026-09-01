import { graphql } from "react-relay";

// 커뮤니티 채팅 신고 목록.
export const AdminCommunityChatReportsQuery = graphql`
  query AdminCommunityChatReports(
    $page: Int
    $size: Int
    $status: ReportStatus
    $sortDirection: SortDirection
  ) {
    adminCommunityChatReports(
      page: $page
      size: $size
      status: $status
      sortDirection: $sortDirection
    ) {
      content {
        id
        chatMessageId
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
