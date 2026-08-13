import { graphql } from "react-relay";

// 지난 게임 기록. BE PR #151 계약.
export const AdminGameHistoriesQuery = graphql`
  query AdminGameHistories(
    $page: Int
    $size: Int
    $endReason: GameEndReason
    $sortDirection: SortDirection
  ) {
    adminGameHistories(
      page: $page
      size: $size
      endReason: $endReason
      sortDirection: $sortDirection
    ) {
      content {
        id
        gameId
        winnerTeam
        endReason
        totalPoliceCount
        totalRobberCount
        arrestedRobberCount
        totalArrestCount
        durationSeconds
        areaType
        createdAt
        participants {
          userId
          nickname
          team
          status
        }
      }
      totalElements
      totalPages
      page
      size
    }
  }
`;
