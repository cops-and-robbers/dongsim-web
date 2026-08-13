/**
 * @generated SignedSource<<d41459b3d9271e5fb46609b778c89a88>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AreaType = "CIRCLE" | "POLYGON" | "%future added value";
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type ParticipantStatus = "ALIVE" | "JAILED" | "POLICE_WAITING" | "WAITING" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminGameHistories$variables = {
  endReason?: GameEndReason | null | undefined;
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
};
export type AdminGameHistories$data = {
  readonly adminGameHistories: {
    readonly content: ReadonlyArray<{
      readonly areaType: AreaType;
      readonly arrestedRobberCount: number;
      readonly createdAt: string;
      readonly durationSeconds: number;
      readonly endReason: GameEndReason;
      readonly gameId: number;
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
    }>;
    readonly page: number;
    readonly size: number;
    readonly totalElements: number;
    readonly totalPages: number;
  };
};
export type AdminGameHistories = {
  response: AdminGameHistories$data;
  variables: AdminGameHistories$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "endReason"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "page"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "size"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sortDirection"
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "endReason",
        "variableName": "endReason"
      },
      {
        "kind": "Variable",
        "name": "page",
        "variableName": "page"
      },
      {
        "kind": "Variable",
        "name": "size",
        "variableName": "size"
      },
      {
        "kind": "Variable",
        "name": "sortDirection",
        "variableName": "sortDirection"
      }
    ],
    "concreteType": "AdminGameHistoryPage",
    "kind": "LinkedField",
    "name": "adminGameHistories",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminGameHistory",
        "kind": "LinkedField",
        "name": "content",
        "plural": true,
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
            "name": "createdAt",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalElements",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalPages",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "page",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "size",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v3/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminGameHistories",
    "selections": (v4/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v0/*:: as any*/),
      (v3/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminGameHistories",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "cf4bf187ce3bba947db3fd6c49391fa7",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistories",
    "operationKind": "query",
    "text": "query AdminGameHistories(\n  $page: Int\n  $size: Int\n  $endReason: GameEndReason\n  $sortDirection: SortDirection\n) {\n  adminGameHistories(page: $page, size: $size, endReason: $endReason, sortDirection: $sortDirection) {\n    content {\n      id\n      gameId\n      winnerTeam\n      endReason\n      totalPoliceCount\n      totalRobberCount\n      arrestedRobberCount\n      totalArrestCount\n      durationSeconds\n      areaType\n      createdAt\n      participants {\n        userId\n        nickname\n        team\n        status\n      }\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "1eb265dcfb1b0e6899bdee7c17c0bb65";

export default node;
