/**
 * @generated SignedSource<<c4677bd3202d30d91558fd0feaee677f>>
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
    "cacheID": "0958956c119b6992b6617e8f0a37a471",
    "id": null,
    "metadata": {},
    "name": "AdminGameHistoryPlaceName",
    "operationKind": "query",
    "text": "query AdminGameHistoryPlaceName(\n  $id: ID!\n) {\n  adminGameHistory(id: $id) {\n    id\n    area {\n      placeName\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "408c4630faacd0a2c139b9d7dcfa7649";

export default node;
