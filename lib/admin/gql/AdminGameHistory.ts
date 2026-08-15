import { graphql } from "react-relay";

// 지난 게임 기록 한 건. 목록(adminGameHistories)이 아니라 단건으로 받는다.
// 구역 좌표는 폴리곤이면 점이 여러 개라 목록에 얹으면 페이지마다 낭비가 커서,
// 지도를 그리는 상세에서만 가져온다.
export const AdminGameHistoryQuery = graphql`
  query AdminGameHistory($id: ID!) {
    adminGameHistory(id: $id) {
      id
      gameId
      winnerTeam
      endReason
      totalPoliceCount
      totalRobberCount
      arrestedRobberCount
      totalArrestCount
      durationSeconds
      areaType
      createdAt
      area {
        areaType
        playgroundCenterLat
        playgroundCenterLng
        playgroundRadiusInMeters
        jailCenterLat
        jailCenterLng
        jailRadiusInMeters
        playgroundPolygon {
          latitude
          longitude
        }
        jailPolygon {
          latitude
          longitude
        }
      }
      participants {
        userId
        nickname
        team
        status
      }
    }
  }
`;
