import { graphql } from "react-relay";

// 유저 상세 (지금 들어가 있는 방 포함). 끝난 게임은 AdminUserGameHistories 로 따로 읽는다.
export const AdminUserQuery = graphql`
  query AdminUser($id: ID!) {
    adminUser(id: $id) {
      id
      nickname
      socialType
      role
      termsOfServiceAgreed
      privacyPolicyAgreed
      locationTermsAgreed
      allowMarketingPush
      createdAt
      device {
        deviceType
        createdAt
      }
      participations {
        gameId
        inviteCode
        team
        status
        isHost
        createdAt
      }
    }
  }
`;
