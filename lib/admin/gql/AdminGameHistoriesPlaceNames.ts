import { graphql } from "react-relay";

// 지난 게임 목록의 동네 이름과 국가(BE #241). 운영 서버에 아직 없을 수 있어 목록(AdminGameHistories)과 나눠서 묻는다.
// 같은 조건으로 물어 같은 판들의 이름을 받는다. 처음 보는 곳은 한 번에 5곳까지만 찾아서 다시 물을수록 채워진다.
export const AdminGameHistoriesPlaceNamesQuery = graphql`
  query AdminGameHistoriesPlaceNames(
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
        area {
          placeName
          countryCode
        }
      }
    }
  }
`;
