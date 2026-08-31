/**
 * @generated SignedSource<<18b693260a2b08f0be256ef2c81a9545>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TermsType = "LOCATION_TERMS" | "MARKETING" | "PRIVACY_POLICY" | "TERMS_OF_SERVICE" | "%future added value";
export type TermsResetPreview$variables = {
  types: ReadonlyArray<TermsType>;
};
export type TermsResetPreview$data = {
  readonly termsResetPreview: {
    readonly affectedUsers: number;
  };
};
export type TermsResetPreview = {
  response: TermsResetPreview$data;
  variables: TermsResetPreview$variables;
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
    "concreteType": "TermsResetPreview",
    "kind": "LinkedField",
    "name": "termsResetPreview",
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
    "name": "TermsResetPreview",
    "selections": (v1/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "TermsResetPreview",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "75c667cf64299436936c9c21106b7da5",
    "id": null,
    "metadata": {},
    "name": "TermsResetPreview",
    "operationKind": "query",
    "text": "query TermsResetPreview(\n  $types: [TermsType!]!\n) {\n  termsResetPreview(types: $types) {\n    affectedUsers\n  }\n}\n"
  }
};
})();

(node as any).hash = "014bfb3ef66f9144c3044e19a9fc963f";

export default node;
