/**
 * @generated SignedSource<<7b5854f2d45e8d9958cf94cb5c02ea03>>
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
      readonly countryCode: string | null | undefined;
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
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "countryCode",
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
    "cacheID": "47de57a0f21292d0518be219962f4ab3",
    "id": null,
    "metadata": {},
    "name": "AdminGamesPlaceNames",
    "operationKind": "query",
    "text": "query AdminGamesPlaceNames(\n  $page: Int\n  $size: Int\n  $status: GameStatus\n  $sortDirection: SortDirection\n) {\n  adminGames(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      placeName\n      countryCode\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "fb71634499689843fbf4ae88ae6bf2e5";

export default node;
