/**
 * @generated SignedSource<<8921939ca77965d232a37bc24d14d29c>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminUserGameHistories$variables = {
  id: string;
  limit: number;
};
export type AdminUserGameHistories$data = {
  readonly adminUser: {
    readonly gameHistories: ReadonlyArray<{
      readonly arrestCount: number;
      readonly arrestedCount: number;
      readonly durationSeconds: number | null | undefined;
      readonly endReason: GameEndReason | null | undefined;
      readonly endedAt: string | null | undefined;
      readonly gameResultId: string;
      readonly isEventGame: boolean;
      readonly isHost: boolean;
      readonly isMvp: boolean;
      readonly leftAt: string | null | undefined;
      readonly team: Team;
      readonly winnerTeam: Team | null | undefined;
    }>;
    readonly id: string;
  } | null | undefined;
};
export type AdminUserGameHistories = {
  response: AdminUserGameHistories$data;
  variables: AdminUserGameHistories$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "limit"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "id"
      }
    ],
    "concreteType": "AdminUser",
    "kind": "LinkedField",
    "name": "adminUser",
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
        "args": [
          {
            "kind": "Variable",
            "name": "limit",
            "variableName": "limit"
          }
        ],
        "concreteType": "UserGameHistory",
        "kind": "LinkedField",
        "name": "gameHistories",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "gameResultId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endedAt",
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
            "name": "durationSeconds",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "arrestCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "arrestedCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isMvp",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isHost",
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
            "name": "leftAt",
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
    "name": "AdminUserGameHistories",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminUserGameHistories",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "d720d1fcbe6eebd2841bd7bf2e6455d3",
    "id": null,
    "metadata": {},
    "name": "AdminUserGameHistories",
    "operationKind": "query",
    "text": "query AdminUserGameHistories(\n  $id: ID!\n  $limit: Int!\n) {\n  adminUser(id: $id) {\n    id\n    gameHistories(limit: $limit) {\n      gameResultId\n      endedAt\n      team\n      winnerTeam\n      endReason\n      durationSeconds\n      arrestCount\n      arrestedCount\n      isMvp\n      isHost\n      isEventGame\n      leftAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "d569817bea2ff2cd8e603def9f17faab";

export default node;
