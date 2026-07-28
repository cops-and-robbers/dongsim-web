/**
 * @generated SignedSource<<4df947cade2f6e166fdd6dbcd184eeda>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeviceType = "ANDROID" | "IOS" | "%future added value";
export type Role = "ADMIN" | "USER" | "%future added value";
export type SocialType = "APPLE" | "GOOGLE" | "KAKAO" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type UserSortField = "CREATED_AT" | "NICKNAME" | "%future added value";
export type AdminUsers$variables = {
  nickname?: string | null | undefined;
  page?: number | null | undefined;
  size?: number | null | undefined;
  socialType?: SocialType | null | undefined;
  sortBy?: UserSortField | null | undefined;
  sortDirection?: SortDirection | null | undefined;
};
export type AdminUsers$data = {
  readonly adminUsers: {
    readonly content: ReadonlyArray<{
      readonly createdAt: string;
      readonly device: {
        readonly deviceType: DeviceType;
      } | null | undefined;
      readonly id: string;
      readonly locationTermsAgreed: boolean;
      readonly nickname: string;
      readonly role: Role;
      readonly socialType: SocialType;
    }>;
    readonly page: number;
    readonly size: number;
    readonly totalElements: number;
    readonly totalPages: number;
  };
};
export type AdminUsers = {
  response: AdminUsers$data;
  variables: AdminUsers$variables;
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
  "name": "sortBy"
},
v5 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sortDirection"
},
v6 = [
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
        "name": "sortBy",
        "variableName": "sortBy"
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
            "kind": "ScalarField",
            "name": "nickname",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "socialType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "role",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "locationTermsAgreed",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "createdAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "UserDevice",
            "kind": "LinkedField",
            "name": "device",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "deviceType",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalElements",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalPages",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "page",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "size",
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
      (v4/*:: as any*/),
      (v5/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminUsers",
    "selections": (v6/*:: as any*/),
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
      (v4/*:: as any*/),
      (v5/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminUsers",
    "selections": (v6/*:: as any*/)
  },
  "params": {
    "cacheID": "2eeff2d6ce94a08b980aeb4b9f2d4268",
    "id": null,
    "metadata": {},
    "name": "AdminUsers",
    "operationKind": "query",
    "text": "query AdminUsers(\n  $page: Int\n  $size: Int\n  $nickname: String\n  $socialType: SocialType\n  $sortBy: UserSortField\n  $sortDirection: SortDirection\n) {\n  adminUsers(page: $page, size: $size, nickname: $nickname, socialType: $socialType, sortBy: $sortBy, sortDirection: $sortDirection) {\n    content {\n      id\n      nickname\n      socialType\n      role\n      locationTermsAgreed\n      createdAt\n      device {\n        deviceType\n      }\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "6fd79d120aea9a6b894b182ad459d946";

export default node;
