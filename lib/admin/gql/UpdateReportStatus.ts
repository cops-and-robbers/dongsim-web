import { graphql } from "react-relay";

// 신고 처리 상태 변경. 반환 노드(id 동일)로 Relay 스토어가 갱신돼 목록이 자동 반영된다.
export const UpdateReportStatusMutation = graphql`
  mutation UpdateReportStatus(
    $reportId: ID!
    $status: ReportStatus!
    $adminMemo: String
  ) {
    updateReportStatus(
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
