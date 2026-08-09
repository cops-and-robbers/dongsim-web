import { graphql } from "react-relay";

// 버그 제보 처리 상태 변경.
export const UpdateBugReportStatusMutation = graphql`
  mutation UpdateBugReportStatus(
    $bugReportId: ID!
    $status: BugReportStatus!
    $adminMemo: String
  ) {
    updateBugReportStatus(
      bugReportId: $bugReportId
      status: $status
      adminMemo: $adminMemo
    ) {
      id
      status
      adminMemo
    }
  }
`;
