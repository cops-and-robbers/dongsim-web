import { graphql } from "react-relay";

// 게임 목록의 동네 이름(BE #241). 운영 서버에 아직 없을 수 있어 목록(AdminGames)과 나눠서 묻는다(lib/admin/useOptionalQuery.ts).
// 목록과 같은 조건으로 물어 같은 방들의 이름을 받는다. 처음 보는 곳은 한 번에 5곳까지만 찾아서, 다시 물을수록 채워진다.
export const AdminGamesPlaceNamesQuery = graphql`
  query AdminGamesPlaceNames(
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
        placeName
      }
    }
  }
`;
