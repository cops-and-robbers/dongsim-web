import { graphql } from "react-relay";

// 지난 게임 상세의 동네 이름과 국가(BE #241). 운영 서버에 아직 없을 수 있어 상세(AdminGameHistory)와 나눠서 묻는다.
export const AdminGameHistoryPlaceNameQuery = graphql`
  query AdminGameHistoryPlaceName($id: ID!) {
    adminGameHistory(id: $id) {
      id
      area {
        placeName
        countryCode
      }
    }
  }
`;
