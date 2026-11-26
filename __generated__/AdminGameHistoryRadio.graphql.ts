/**
 * @generated SignedSource<<817e710688b461fd7f5d1c83275d9299>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminGameHistoryRadio$variables = {
  id: string;
};
export type AdminGameHistoryRadio$data = {
  readonly adminGameHistory: {
    readonly id: string;
    readonly participants: ReadonlyArray<{
      readonly arrestCount: number;
      readonly arrestedCount: number;
      readonly leftAt: string | null | undefined;
      readonly radioSeconds: number;
      readonly team: Team;
      readonly userId: string | null | undefined;
    }>;
  };
};
export type AdminGameHistoryRadio = {
  response: AdminGameHistoryRadio$data;
  variables: AdminGameHistoryRadio$variables;
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
            "name": "radioSeconds",
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
    "name": "AdminGameHistoryRadio",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGameHistoryRadio",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "5556a3d81eb30f317e2f69251277dfe4",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistoryRadio",
    "operationKind": "query",
    "text": "query AdminGameHistoryRadio(\n  $id: ID!\n) {\n  adminGameHistory(id: $id) {\n    id\n    participants {\n      userId\n      team\n      leftAt\n      arrestCount\n      arrestedCount\n      radioSeconds\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "4e52d2070c3c7b67d5900b37add16a31";

export default node;
