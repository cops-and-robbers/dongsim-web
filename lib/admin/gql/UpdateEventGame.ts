import { graphql } from "react-relay";

// 이벤트 게임 켜고 끄기 (BE #214). 같은 id 의 게임 노드를 돌려받아 상세 화면이 새로고침 없이 바뀐다.
export const UpdateEventGameMutation = graphql`
  mutation UpdateEventGame($gameId: ID!, $isEventGame: Boolean!) {
    updateEventGame(gameId: $gameId, isEventGame: $isEventGame) {
      id
      isEventGame
      status
    }
  }
`;
