import { graphql } from "react-relay";

// 유저 상세 (참여 게임 이력 포함).
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
