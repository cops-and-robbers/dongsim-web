import { graphql } from "react-relay";

// 약관 동의 일괄 초기화. 되돌릴 수 없으므로 TermsResetPreview로
// 대상 인원을 먼저 확인한 뒤에만 호출한다.
export const ResetTermsAgreementMutation = graphql`
  mutation ResetTermsAgreement($types: [TermsType!]!) {
    resetTermsAgreement(types: $types) {
      affectedUsers
    }
  }
`;
