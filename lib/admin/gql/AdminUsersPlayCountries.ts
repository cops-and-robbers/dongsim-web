import { graphql } from "react-relay";

// 유저 목록의 주로 플레이하는 국가(BE #241). 운영 서버에 아직 없을 수 있어 목록(AdminUsers)과 나눠서 같은 조건으로 묻는다.
// 서버는 목록의 유저를 한 번에 묶어 센다(device 와 같은 방식).
export const AdminUsersPlayCountriesQuery = graphql`
  query AdminUsersPlayCountries(
    $page: Int
    $size: Int
    $nickname: String
    $socialType: SocialType
    $sortDirection: SortDirection
  ) {
    adminUsers(
      page: $page
      size: $size
      nickname: $nickname
      socialType: $socialType
      sortDirection: $sortDirection
    ) {
      content {
        id
        playCountries {
          countryCode
          games
        }
      }
    }
  }
`;
