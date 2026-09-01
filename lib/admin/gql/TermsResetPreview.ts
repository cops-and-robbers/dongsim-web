import { graphql } from "react-relay";

// 약관 초기화 미리보기. 실행 없이 대상 인원만 계산한다.
// 되돌릴 수 없는 뮤테이션 앞에서 확인 화면에 보여줄 숫자를 얻는 용도다.
export const TermsResetPreviewQuery = graphql`
  query TermsResetPreview($types: [TermsType!]!) {
    termsResetPreview(types: $types) {
      affectedUsers
    }
  }
`;
