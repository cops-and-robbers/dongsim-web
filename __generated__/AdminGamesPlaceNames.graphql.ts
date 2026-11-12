/**
 * @generated SignedSource<<95112da8c9df3233eaa86fd7810b27cc>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameStatus = "CANCELED" | "FINISHED" | "IN_PROGRESS" | "WAITING" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminGamesPlaceNames$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: GameStatus | null | undefined;
};
export type AdminGamesPlaceNames$data = {
  readonly adminGames: {
    readonly content: ReadonlyArray<{
      readonly id: string;
      readonly placeName: string | null | undefined;
    }>;
  };
};
export type AdminGamesPlaceNames = {
  response: AdminGamesPlaceNames$data;
  variables: AdminGamesPlaceNames$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "page"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "size"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sortDirection"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "status"
},
v4 = [
  {
    "alias": null,
    "args": [
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
      },
      {
        "kind": "Variable",
        "name": "status",
        "variableName": "status"
      }
    ],
    "concreteType": "AdminGamePage",
    "kind": "LinkedField",
    "name": "adminGames",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminGameSummary",
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
            "name": "placeName",
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
    "name": "AdminGamesPlaceNames",
    "selections": (v4/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v3/*:: as any*/),
      (v2/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminGamesPlaceNames",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "7ab16cbb41a7981cf901ce9425acb374",
    "id": null,
    "metadata": {},
    "name": "AdminGamesPlaceNames",
    "operationKind": "query",
    "text": "query AdminGamesPlaceNames(\n  $page: Int\n  $size: Int\n  $status: GameStatus\n  $sortDirection: SortDirection\n) {\n  adminGames(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      placeName\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "e8ec0ca6b6ed26727d2a8315a115bf88";

export default node;
