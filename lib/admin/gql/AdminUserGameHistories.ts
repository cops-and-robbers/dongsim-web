import { graphql } from "react-relay";

// 유저가 한 끝난 게임(BE #227). 운영 서버에 아직 없을 수 있어 유저 상세(AdminUser)와 나눠서 묻는다.
// 한 쿼리에 넣으면 필드 하나가 없어도 스키마 검사에서 쿼리 전체가 거절돼 유저 상세가 통째로 안 열린다.
export const AdminUserGameHistoriesQuery = graphql`
  query AdminUserGameHistories($id: ID!, $limit: Int!) {
    adminUser(id: $id) {
      id
      gameHistories(limit: $limit) {
        gameResultId
        endedAt
        team
        winnerTeam
        endReason
        durationSeconds
        arrestCount
        arrestedCount
        isMvp
        isHost
        isEventGame
        leftAt
      }
    }
  }
`;
