/**
 * @generated SignedSource<<b6284bcfa001e4cee9aab04e5fab7889>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeviceType = "ANDROID" | "IOS" | "%future added value";
export type ParticipantStatus = "ALIVE" | "JAILED" | "POLICE_WAITING" | "WAITING" | "%future added value";
export type Role = "ADMIN" | "USER" | "%future added value";
export type SocialType = "APPLE" | "GOOGLE" | "KAKAO" | "%future added value";
export type Team = "POLICE" | "ROBBER" | "%future added value";
export type AdminUser$variables = {
  id: string;
};
export type AdminUser$data = {
  readonly adminUser: {
    readonly createdAt: string;
    readonly device: {
      readonly createdAt: string;
      readonly deviceType: DeviceType;
    } | null | undefined;
    readonly id: string;
    readonly locationTermsAgreed: boolean;
    readonly nickname: string;
    readonly participations: ReadonlyArray<{
      readonly createdAt: string;
      readonly gameId: string;
      readonly inviteCode: string;
      readonly isHost: boolean;
      readonly status: ParticipantStatus;
      readonly team: Team | null | undefined;
    }>;
    readonly privacyPolicyAgreed: boolean;
    readonly role: Role;
    readonly socialType: SocialType;
    readonly termsOfServiceAgreed: boolean;
  } | null | undefined;
};
export type AdminUser = {
  response: AdminUser$data;
  variables: AdminUser$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v2 = [
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
        "name": "termsOfServiceAgreed",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "privacyPolicyAgreed",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "locationTermsAgreed",
        "storageKey": null
      },
      (v1/*:: as any*/),
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
          },
          (v1/*:: as any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "GameParticipation",
        "kind": "LinkedField",
        "name": "participations",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "gameId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "inviteCode",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "team",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "status",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isHost",
            "storageKey": null
          },
          (v1/*:: as any*/)
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
    "name": "AdminUser",
    "selections": (v2/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "AdminUser",
    "selections": (v2/*:: as any*/)
  },
  "params": {
    "cacheID": "edc0863517e3f664f8df33a613554a20",
    "id": null,
    "metadata": {},
    "name": "AdminUser",
    "operationKind": "query",
    "text": "query AdminUser(\n  $id: ID!\n) {\n  adminUser(id: $id) {\n    id\n    nickname\n    socialType\n    role\n    termsOfServiceAgreed\n    privacyPolicyAgreed\n    locationTermsAgreed\n    createdAt\n    device {\n      deviceType\n      createdAt\n    }\n    participations {\n      gameId\n      inviteCode\n      team\n      status\n      isHost\n      createdAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a16a2a83a4a7c5598297c7d253da54d8";

export default node;
