import { graphql } from "react-relay";

// 게임 상세의 동네 이름(BE #241). 운영 서버에 아직 없을 수 있어 상세(AdminGame)와 나눠서 묻는다.
export const AdminGamePlaceNameQuery = graphql`
  query AdminGamePlaceName($id: ID!) {
    adminGame(id: $id) {
      id
      area {
        placeName
      }
    }
  }
`;
