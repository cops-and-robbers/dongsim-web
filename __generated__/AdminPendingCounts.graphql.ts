/**
 * @generated SignedSource<<8c5507c402ef2085b7a96379dccb5388>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminPendingCounts$variables = Record<PropertyKey, never>;
export type AdminPendingCounts$data = {
  readonly adminAllReports: {
    readonly totalElements: number;
  };
  readonly adminBugReports: {
    readonly totalElements: number;
  };
};
export type AdminPendingCounts = {
  response: AdminPendingCounts$data;
  variables: AdminPendingCounts$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "kind": "Literal",
    "name": "page",
    "value": 0
  },
  {
    "kind": "Literal",
    "name": "size",
    "value": 1
  },
  {
    "kind": "Literal",
    "name": "status",
    "value": "PENDING"
  }
],
v1 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "totalElements",
    "storageKey": null
  }
],
v2 = [
  {
    "alias": null,
    "args": (v0/*:: as any*/),
    "concreteType": "AdminAllReportPage",
    "kind": "LinkedField",
    "name": "adminAllReports",
    "plural": false,
    "selections": (v1/*:: as any*/),
    "storageKey": "adminAllReports(page:0,size:1,status:\"PENDING\")"
  },
  {
    "alias": null,
    "args": (v0/*:: as any*/),
    "concreteType": "AdminBugReportPage",
    "kind": "LinkedField",
    "name": "adminBugReports",
    "plural": false,
    "selections": (v1/*:: as any*/),
    "storageKey": "adminBugReports(page:0,size:1,status:\"PENDING\")"
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminPendingCounts",
    "selections": (v2/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminPendingCounts",
    "selections": (v2/*:: as any*/)
  },
  "params": {
    "cacheID": "6a0562c21470c55f0d25b7b9dd1b32b5",
    "id": null,
    "metadata": {},
    "name": "AdminPendingCounts",
    "operationKind": "query",
    "text": "query AdminPendingCounts {\n  adminAllReports(page: 0, size: 1, status: PENDING) {\n    totalElements\n  }\n  adminBugReports(page: 0, size: 1, status: PENDING) {\n    totalElements\n  }\n}\n"
  }
};
})();

(node as any).hash = "ad38eecc4e06984931b4aa0361ed7260";

export default node;
