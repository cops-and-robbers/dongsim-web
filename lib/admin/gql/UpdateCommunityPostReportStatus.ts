import { graphql } from "react-relay";

// 커뮤니티 모집글 신고 처리 상태 변경.
export const UpdateCommunityPostReportStatusMutation = graphql`
  mutation UpdateCommunityPostReportStatus(
    $reportId: ID!
    $status: ReportStatus!
    $adminMemo: String
  ) {
    updateCommunityPostReportStatus(
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
