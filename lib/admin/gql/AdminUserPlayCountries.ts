import { graphql } from "react-relay";

// 유저가 주로 플레이하는 국가(BE #241). 운영 서버에 아직 없을 수 있어 유저 상세(AdminUser)와 나눠서 묻는다.
export const AdminUserPlayCountriesQuery = graphql`
  query AdminUserPlayCountries($id: ID!) {
    adminUser(id: $id) {
      id
      playCountries {
        countryCode
        games
        lastPlayedAt
      }
    }
  }
`;
