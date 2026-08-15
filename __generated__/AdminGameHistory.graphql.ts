/**
 * @generated SignedSource<<46c0fe09b62074582a65b50072f72b2c>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AreaType = "CIRCLE" | "POLYGON" | "%future added value";
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type ParticipantStatus = "ALIVE" | "JAILED" | "POLICE_WAITING" | "WAITING" | "%future added value";
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminGameHistory$variables = {
  id: string;
};
export type AdminGameHistory$data = {
  readonly adminGameHistory: {
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
    readonly areaType: AreaType;
    readonly arrestedRobberCount: number;
    readonly createdAt: string;
    readonly durationSeconds: number;
    readonly endReason: GameEndReason;
    readonly gameId: string;
    readonly id: string;
    readonly participants: ReadonlyArray<{
      readonly nickname: string;
      readonly status: ParticipantStatus;
      readonly team: Team;
      readonly userId: string;
    }>;
    readonly totalArrestCount: number;
    readonly totalPoliceCount: number;
    readonly totalRobberCount: number;
    readonly winnerTeam: Team;
  };
};
export type AdminGameHistory = {
  response: AdminGameHistory$data;
  variables: AdminGameHistory$variables;
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
  "name": "areaType",
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
    "concreteType": "AdminGameHistory",
    "kind": "LinkedField",
    "name": "adminGameHistory",
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
        "name": "gameId",
        "storageKey": null
      },
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
        "name": "totalArrestCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "durationSeconds",
        "storageKey": null
      },
      (v1/*:: as any*/),
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
        "concreteType": "GameArea",
        "kind": "LinkedField",
        "name": "area",
        "plural": false,
        "selections": [
          (v1/*:: as any*/),
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
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminGameHistoryParticipant",
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
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "status",
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
    "name": "AdminGameHistory",
    "selections": (v3/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGameHistory",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "dec15e0b50cf8948ef16c2d5f62ed11a",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistory",
    "operationKind": "query",
    "text": "query AdminGameHistory(\n  $id: ID!\n) {\n  adminGameHistory(id: $id) {\n    id\n    gameId\n    winnerTeam\n    endReason\n    totalPoliceCount\n    totalRobberCount\n    arrestedRobberCount\n    totalArrestCount\n    durationSeconds\n    areaType\n    createdAt\n    area {\n      areaType\n      playgroundCenterLat\n      playgroundCenterLng\n      playgroundRadiusInMeters\n      jailCenterLat\n      jailCenterLng\n      jailRadiusInMeters\n      playgroundPolygon {\n        latitude\n        longitude\n      }\n      jailPolygon {\n        latitude\n        longitude\n      }\n    }\n    participants {\n      userId\n      nickname\n      team\n      status\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "674e297661ff223d11a054eb5091ee12";

export default node;
