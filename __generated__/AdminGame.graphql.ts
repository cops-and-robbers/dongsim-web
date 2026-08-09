/**
 * @generated SignedSource<<c6c539c1ab7e646b4eb226441d6ca3eb>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AreaType = "CIRCLE" | "POLYGON" | "%future added value";
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type GameStatus = "CANCELED" | "FINISHED" | "IN_PROGRESS" | "WAITING" | "%future added value";
export type ParticipantStatus = "ALIVE" | "JAILED" | "POLICE_WAITING" | "WAITING" | "%future added value";
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminGame$variables = {
  id: string;
};
export type AdminGame$data = {
  readonly adminGame: {
    readonly area: {
      readonly areaType: AreaType;
      readonly jailCenterLat: number | null | undefined;
      readonly jailCenterLng: number | null | undefined;
      readonly jailPolygon: ReadonlyArray<{
        readonly latitude: number;
        readonly longitude: number;
      }> | null | undefined;
      readonly jailRadiusInMeters: number | null | undefined;
      readonly playgroundCenterLat: number | null | undefined;
      readonly playgroundCenterLng: number | null | undefined;
      readonly playgroundPolygon: ReadonlyArray<{
        readonly latitude: number;
        readonly longitude: number;
      }> | null | undefined;
      readonly playgroundRadiusInMeters: number | null | undefined;
    } | null | undefined;
    readonly createdAt: string;
    readonly id: string;
    readonly inviteCode: string;
    readonly isEventGame: boolean;
    readonly locationRevealIntervalMinutes: number;
    readonly maxParticipants: number;
    readonly participants: ReadonlyArray<{
      readonly isHost: boolean;
      readonly nickname: string;
      readonly status: ParticipantStatus;
      readonly team: Team | null | undefined;
      readonly userId: string;
    }>;
    readonly policeWaitMinutes: number;
    readonly result: {
      readonly arrestedRobberCount: number;
      readonly durationSeconds: number;
      readonly endReason: GameEndReason;
      readonly totalPoliceCount: number;
      readonly totalRobberCount: number;
      readonly winnerTeam: Team;
    } | null | undefined;
    readonly roundDurationMinutes: number;
    readonly startedAt: string | null | undefined;
    readonly status: GameStatus;
  } | null | undefined;
};
export type AdminGame = {
  response: AdminGame$data;
  variables: AdminGame$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "latitude",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "longitude",
    "storageKey": null
  }
],
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "id"
      }
    ],
    "concreteType": "AdminGame",
    "kind": "LinkedField",
    "name": "adminGame",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inviteCode",
        "storageKey": null
      },
      (v1/*:: as any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "roundDurationMinutes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "locationRevealIntervalMinutes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "policeWaitMinutes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "maxParticipants",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isEventGame",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "startedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminParticipant",
        "kind": "LinkedField",
        "name": "participants",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "userId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "nickname",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "team",
            "storageKey": null
          },
          (v1/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isHost",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "GameResult",
        "kind": "LinkedField",
        "name": "result",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "winnerTeam",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endReason",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalPoliceCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalRobberCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "arrestedRobberCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "durationSeconds",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "GameArea",
        "kind": "LinkedField",
        "name": "area",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "areaType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "playgroundCenterLat",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "playgroundCenterLng",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "playgroundRadiusInMeters",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "jailCenterLat",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "jailCenterLng",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "jailRadiusInMeters",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Coordinate",
            "kind": "LinkedField",
            "name": "playgroundPolygon",
            "plural": true,
            "selections": (v2/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Coordinate",
            "kind": "LinkedField",
            "name": "jailPolygon",
            "plural": true,
            "selections": (v2/*:: as any*/),
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminGame",
    "selections": (v3/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGame",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "f1bcae07de3b53f38c26ddd8d028ff98",
    "id": null,
    "metadata": {},
    "name": "AdminGame",
    "operationKind": "query",
    "text": "query AdminGame(\n  $id: ID!\n) {\n  adminGame(id: $id) {\n    id\n    inviteCode\n    status\n    roundDurationMinutes\n    locationRevealIntervalMinutes\n    policeWaitMinutes\n    maxParticipants\n    isEventGame\n    createdAt\n    startedAt\n    participants {\n      userId\n      nickname\n      team\n      status\n      isHost\n    }\n    result {\n      winnerTeam\n      endReason\n      totalPoliceCount\n      totalRobberCount\n      arrestedRobberCount\n      durationSeconds\n    }\n    area {\n      areaType\n      playgroundCenterLat\n      playgroundCenterLng\n      playgroundRadiusInMeters\n      jailCenterLat\n      jailCenterLng\n      jailRadiusInMeters\n      playgroundPolygon {\n        latitude\n        longitude\n      }\n      jailPolygon {\n        latitude\n        longitude\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5604e10e4258b2504bd8bc48c15ed71b";

export default node;
