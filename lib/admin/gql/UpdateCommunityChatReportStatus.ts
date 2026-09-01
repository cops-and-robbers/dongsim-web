import { graphql } from "react-relay";

// 커뮤니티 채팅 신고 처리 상태 변경.
export const UpdateCommunityChatReportStatusMutation = graphql`
  mutation UpdateCommunityChatReportStatus(
    $reportId: ID!
    $status: ReportStatus!
    $adminMemo: String
  ) {
    updateCommunityChatReportStatus(
      reportId: $reportId
      status: $status
      adminMemo: $adminMemo
    ) {
      id
      status
      adminMemo
    }
  }
`;
