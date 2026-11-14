/**
 * @generated SignedSource<<c076f879eb91b086bbf4255dc806f841>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminGameHistoriesPlaceNames$variables = {
  endReason?: GameEndReason | null | undefined;
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
};
export type AdminGameHistoriesPlaceNames$data = {
  readonly adminGameHistories: {
    readonly content: ReadonlyArray<{
      readonly area: {
        readonly placeName: string | null | undefined;
      } | null | undefined;
      readonly id: string;
    }>;
  };
};
export type AdminGameHistoriesPlaceNames = {
  response: AdminGameHistoriesPlaceNames$data;
  variables: AdminGameHistoriesPlaceNames$variables;
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
            "concreteType": "GameArea",
            "kind": "LinkedField",
            "name": "area",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "placeName",
                "storageKey": null
              }
            ],
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
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v3/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminGameHistoriesPlaceNames",
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
    "name": "AdminGameHistoriesPlaceNames",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "593984bac1fc6bb239ed437123a69567",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistoriesPlaceNames",
    "operationKind": "query",
    "text": "query AdminGameHistoriesPlaceNames(\n  $page: Int\n  $size: Int\n  $endReason: GameEndReason\n  $sortDirection: SortDirection\n) {\n  adminGameHistories(page: $page, size: $size, endReason: $endReason, sortDirection: $sortDirection) {\n    content {\n      id\n      area {\n        placeName\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "73d8e7fc2ab2e62e259d12ae1dcd340d";

export default node;
