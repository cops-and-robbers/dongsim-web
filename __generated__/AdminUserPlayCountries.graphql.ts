/**
 * @generated SignedSource<<9122f3bf10592ecd5465d9513abdbf88>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminUserPlayCountries$variables = {
  id: string;
};
export type AdminUserPlayCountries$data = {
  readonly adminUser: {
    readonly id: string;
    readonly playCountries: ReadonlyArray<{
      readonly countryCode: string | null | undefined;
      readonly games: number;
      readonly lastPlayedAt: string | null | undefined;
    }>;
  } | null | undefined;
};
export type AdminUserPlayCountries = {
  response: AdminUserPlayCountries$data;
  variables: AdminUserPlayCountries$variables;
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
        "concreteType": "PlayCountry",
        "kind": "LinkedField",
        "name": "playCountries",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "countryCode",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "games",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "lastPlayedAt",
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
    "name": "AdminUserPlayCountries",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminUserPlayCountries",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "f21037596aa739798474a0ce3dee3233",
    "id": null,
    "metadata": {},
    "name": "AdminUserPlayCountries",
    "operationKind": "query",
    "text": "query AdminUserPlayCountries(\n  $id: ID!\n) {\n  adminUser(id: $id) {\n    id\n    playCountries {\n      countryCode\n      games\n      lastPlayedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "cc59178e159c852646dbb811e3cd6767";

export default node;
