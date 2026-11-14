/**
 * @generated SignedSource<<d7e993a1aeb4215edf17505d08aaa380>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminUserRadio$variables = {
  id: string;
};
export type AdminUserRadio$data = {
  readonly adminUser: {
    readonly id: string;
    readonly radioSeconds: number;
  } | null | undefined;
};
export type AdminUserRadio = {
  response: AdminUserRadio$data;
  variables: AdminUserRadio$variables;
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
        "args": null,
        "kind": "ScalarField",
        "name": "radioSeconds",
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
    "name": "AdminUserRadio",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminUserRadio",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "3edb01928e154468fc156b160aa3c34d",
    "id": null,
    "metadata": {},
    "name": "AdminUserRadio",
    "operationKind": "query",
    "text": "query AdminUserRadio(\n  $id: ID!\n) {\n  adminUser(id: $id) {\n    id\n    radioSeconds\n  }\n}\n"
  }
};
})();

(node as any).hash = "2bb331381747133139bb58ad8b9abdb4";

export default node;
