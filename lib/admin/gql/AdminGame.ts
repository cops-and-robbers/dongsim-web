import { graphql } from "react-relay";

// 게임 상세 (참가자·결과·구역 포함).
export const AdminGameQuery = graphql`
  query AdminGame($id: ID!) {
    adminGame(id: $id) {
      id
      inviteCode
      status
      roundDurationMinutes
      locationRevealIntervalMinutes
      policeWaitMinutes
      maxParticipants
      isEventGame
      createdAt
      startedAt
      participants {
        userId
        nickname
        team
        status
        isHost
      }
      result {
        winnerTeam
        endReason
        totalPoliceCount
        totalRobberCount
        arrestedRobberCount
        durationSeconds
      }
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
    }
  }
`;
