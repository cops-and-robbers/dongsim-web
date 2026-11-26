import { graphql } from "react-relay";

// 지난 게임 참가자별 MVP(BE #243). 운영 서버에 아직 없을 수 있어 상세(AdminGameHistory)와 나눠서 묻는다.
// 참가자 줄에는 id 가 없어서, 본 쿼리의 줄과 짝지을 값(userId, 팀, 나간 시각, 기록)을 같이 받는다(lib/admin/gameExtras.ts attachMvp)
export const AdminGameHistoryMvpQuery = graphql`
  query AdminGameHistoryMvp($id: ID!) {
    adminGameHistory(id: $id) {
      id
      participants {
        userId
        team
        leftAt
        arrestCount
        arrestedCount
        isMvp
      }
    }
  }
`;
