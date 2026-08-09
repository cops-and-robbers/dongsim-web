/**
 * @generated SignedSource<<b860989e8ebab9c6d57a9bea4313580f>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type UpdateReportStatus$variables = {
  adminMemo?: string | null | undefined;
  reportId: string;
  status: ReportStatus;
};
export type UpdateReportStatus$data = {
  readonly updateReportStatus: {
    readonly adminMemo: string | null | undefined;
    readonly id: string;
    readonly status: ReportStatus;
  };
};
export type UpdateReportStatus = {
  response: UpdateReportStatus$data;
  variables: UpdateReportStatus$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "adminMemo"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "reportId"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "status"
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "adminMemo",
        "variableName": "adminMemo"
      },
      {
        "kind": "Variable",
        "name": "reportId",
        "variableName": "reportId"
      },
      {
        "kind": "Variable",
        "name": "status",
        "variableName": "status"
      }
    ],
    "concreteType": "AdminReport",
    "kind": "LinkedField",
    "name": "updateReportStatus",
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
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "adminMemo",
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
      (v2/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "UpdateReportStatus",
    "selections": (v3/*:: as any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v0/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "UpdateReportStatus",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "138081f4abb2bf6dcbc88f20e2a021da",
    "id": null,
    "metadata": {},
    "name": "UpdateReportStatus",
    "operationKind": "mutation",
    "text": "mutation UpdateReportStatus(\n  $reportId: ID!\n  $status: ReportStatus!\n  $adminMemo: String\n) {\n  updateReportStatus(reportId: $reportId, status: $status, adminMemo: $adminMemo) {\n    id\n    status\n    adminMemo\n  }\n}\n"
  }
};
})();

(node as any).hash = "a1500cc853b81297a3876a3d3360c0cb";

export default node;
