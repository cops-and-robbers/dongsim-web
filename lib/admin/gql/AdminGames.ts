import { graphql } from "react-relay";

// 게임 목록.
export const AdminGamesQuery = graphql`
  query AdminGames(
    $page: Int
    $size: Int
    $status: GameStatus
    $sortDirection: SortDirection
  ) {
    adminGames(
      page: $page
      size: $size
      status: $status
      sortDirection: $sortDirection
    ) {
      content {
        id
        inviteCode
        status
        roundDurationMinutes
        maxParticipants
        isEventGame
        participantCount
        createdAt
      }
      totalElements
      totalPages
      page
      size
    }
  }
`;
