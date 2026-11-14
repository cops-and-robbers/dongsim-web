/**
 * @generated SignedSource<<dfecddb139bfbe565a632fcf0dd23ef1>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminGameHistoryPlaceName$variables = {
  id: string;
};
export type AdminGameHistoryPlaceName$data = {
  readonly adminGameHistory: {
    readonly area: {
      readonly countryCode: string | null | undefined;
      readonly placeName: string | null | undefined;
    } | null | undefined;
    readonly id: string;
  };
};
export type AdminGameHistoryPlaceName = {
  response: AdminGameHistoryPlaceName$data;
  variables: AdminGameHistoryPlaceName$variables;
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
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminGameHistoryPlaceName",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGameHistoryPlaceName",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "d3566e9f1328277d54c7c4e3b26ae3cb",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistoryPlaceName",
    "operationKind": "query",
    "text": "query AdminGameHistoryPlaceName(\n  $id: ID!\n) {\n  adminGameHistory(id: $id) {\n    id\n    area {\n      placeName\n      countryCode\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "ca7f4a04a44139f240a1fa81095230ff";

export default node;
