/**
 * @generated SignedSource<<3b09bdc16979cfa78d265dcc2d68e698>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminGamePlaceName$variables = {
  id: string;
};
export type AdminGamePlaceName$data = {
  readonly adminGame: {
    readonly area: {
      readonly placeName: string | null | undefined;
    } | null | undefined;
    readonly id: string;
  } | null | undefined;
};
export type AdminGamePlaceName = {
  response: AdminGamePlaceName$data;
  variables: AdminGamePlaceName$variables;
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
    "concreteType": "AdminGame",
    "kind": "LinkedField",
    "name": "adminGame",
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
    "name": "AdminGamePlaceName",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminGamePlaceName",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "0d5991782e9e34619287ab8422142ab5",
    "id": null,
    "metadata": {},
    "name": "AdminGamePlaceName",
    "operationKind": "query",
    "text": "query AdminGamePlaceName(\n  $id: ID!\n) {\n  adminGame(id: $id) {\n    id\n    area {\n      placeName\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "8d58e270c513e5fe10dccda774eb9ffa";

export default node;
