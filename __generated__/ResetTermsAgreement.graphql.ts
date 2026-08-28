/**
 * @generated SignedSource<<d418b6fcd45b666929a5a542bf3858a6>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TermsType = "LOCATION_TERMS" | "MARKETING" | "PRIVACY_POLICY" | "TERMS_OF_SERVICE" | "%future added value";
export type ResetTermsAgreement$variables = {
  types: ReadonlyArray<TermsType>;
};
export type ResetTermsAgreement$data = {
  readonly resetTermsAgreement: {
    readonly affectedUsers: number;
  };
};
export type ResetTermsAgreement = {
  response: ResetTermsAgreement$data;
  variables: ResetTermsAgreement$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "types"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "types",
        "variableName": "types"
      }
    ],
    "concreteType": "ResetTermsAgreementResult",
    "kind": "LinkedField",
    "name": "resetTermsAgreement",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "affectedUsers",
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
    "name": "ResetTermsAgreement",
    "selections": (v1/*:: as any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "ResetTermsAgreement",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "9061fffb8050844d7e0ede2fa6975761",
    "id": null,
    "metadata": {},
    "name": "ResetTermsAgreement",
    "operationKind": "mutation",
    "text": "mutation ResetTermsAgreement(\n  $types: [TermsType!]!\n) {\n  resetTermsAgreement(types: $types) {\n    affectedUsers\n  }\n}\n"
  }
};
})();

(node as any).hash = "9aaec74efbd68bb84d5daffc289f97aa";

export default node;
