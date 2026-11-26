/**
 * @generated SignedSource<<1e07b71a254f3b062008bd9d2d61b90d>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminGameHistoryMvp$variables = {
  id: string;
};
export type AdminGameHistoryMvp$data = {
  readonly adminGameHistory: {
    readonly id: string;
    readonly participants: ReadonlyArray<{
      readonly arrestCount: number;
      readonly arrestedCount: number;
      readonly isMvp: boolean;
      readonly leftAt: string | null | undefined;
      readonly team: Team;
      readonly userId: string | null | undefined;
    }>;
  };
};
export type AdminGameHistoryMvp = {
  response: AdminGameHistoryMvp$data;
  variables: AdminGameHistoryMvp$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
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
            "name": "team",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "leftAt",
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
    "name": "AdminGameHistoryMvp",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGameHistoryMvp",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "b751a7742e8e14cd80aee864b91682e1",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistoryMvp",
    "operationKind": "query",
    "text": "query AdminGameHistoryMvp(\n  $id: ID!\n) {\n  adminGameHistory(id: $id) {\n    id\n    participants {\n      userId\n      team\n      leftAt\n      arrestCount\n      arrestedCount\n      isMvp\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "35168e706b4314eb307415dab2c7cb41";

export default node;
