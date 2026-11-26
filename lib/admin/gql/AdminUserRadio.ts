import { graphql } from "react-relay";

// 유저가 지금까지 쓴 무전 시간(BE #239). 운영 서버에 아직 없을 수 있어 유저 상세(AdminUser)와 나눠서 묻는다.
export const AdminUserRadioQuery = graphql`
  query AdminUserRadio($id: ID!) {
    adminUser(id: $id) {
      id
      radioSeconds
    }
  }
`;
