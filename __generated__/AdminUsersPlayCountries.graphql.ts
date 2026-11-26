/**
 * @generated SignedSource<<5ac9ffd4dbdfeae8072ec77d820dd100>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SocialType = "APPLE" | "GOOGLE" | "KAKAO" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminUsersPlayCountries$variables = {
  nickname?: string | null | undefined;
  page?: number | null | undefined;
  size?: number | null | undefined;
  socialType?: SocialType | null | undefined;
  sortDirection?: SortDirection | null | undefined;
};
export type AdminUsersPlayCountries$data = {
  readonly adminUsers: {
    readonly content: ReadonlyArray<{
      readonly id: string;
      readonly playCountries: ReadonlyArray<{
        readonly countryCode: string | null | undefined;
        readonly games: number;
      }>;
    }>;
  };
};
export type AdminUsersPlayCountries = {
  response: AdminUsersPlayCountries$data;
  variables: AdminUsersPlayCountries$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "nickname"
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
  "name": "socialType"
},
v4 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sortDirection"
},
v5 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "nickname",
        "variableName": "nickname"
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
        "name": "socialType",
        "variableName": "socialType"
      },
      {
        "kind": "Variable",
        "name": "sortDirection",
        "variableName": "sortDirection"
      }
    ],
    "concreteType": "AdminUserPage",
    "kind": "LinkedField",
    "name": "adminUsers",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminUser",
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
      (v3/*:: as any*/),
      (v4/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminUsersPlayCountries",
    "selections": (v5/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v0/*:: as any*/),
      (v3/*:: as any*/),
      (v4/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminUsersPlayCountries",
    "selections": (v5/*:: as any*/)
  },
  "params": {
    "cacheID": "caeceef03854c953513f394f162c3ca7",
    "id": null,
    "metadata": {},
    "name": "AdminUsersPlayCountries",
    "operationKind": "query",
    "text": "query AdminUsersPlayCountries(\n  $page: Int\n  $size: Int\n  $nickname: String\n  $socialType: SocialType\n  $sortDirection: SortDirection\n) {\n  adminUsers(page: $page, size: $size, nickname: $nickname, socialType: $socialType, sortDirection: $sortDirection) {\n    content {\n      id\n      playCountries {\n        countryCode\n        games\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "49222a58f7236510fd74974a015de7ae";

export default node;
