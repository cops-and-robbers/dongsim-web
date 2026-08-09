import { graphql } from "react-relay";

// 유저 목록. 오퍼레이션명 AdminUsers = 파일 모듈명(Relay 네이밍 규칙).
export const AdminUsersQuery = graphql`
  query AdminUsers(
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
        nickname
        socialType
        role
        locationTermsAgreed
        createdAt
        device {
          deviceType
        }
      }
      totalElements
      totalPages
      page
      size
    }
  }
`;
