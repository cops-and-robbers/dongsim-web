/**
 * @generated SignedSource<<ba4cbcc40c25779ca35c24f017be8ae7>>
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
      readonly countryCode: string | null | undefined;
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
    "cacheID": "246d3c603897b8563acacb83f83c64d8",
    "id": null,
    "metadata": {},
    "name": "AdminGamePlaceName",
    "operationKind": "query",
    "text": "query AdminGamePlaceName(\n  $id: ID!\n) {\n  adminGame(id: $id) {\n    id\n    area {\n      placeName\n      countryCode\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "145fa720fe0552b7b26a238e93498124";

export default node;
