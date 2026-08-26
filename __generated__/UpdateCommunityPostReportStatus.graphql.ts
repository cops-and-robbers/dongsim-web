/**
 * @generated SignedSource<<b7af7609d9bf284828ed6ad596066c63>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type UpdateCommunityPostReportStatus$variables = {
  adminMemo?: string | null | undefined;
  reportId: string;
  status: ReportStatus;
};
export type UpdateCommunityPostReportStatus$data = {
  readonly updateCommunityPostReportStatus: {
    readonly adminMemo: string | null | undefined;
    readonly id: string;
    readonly status: ReportStatus;
  };
};
export type UpdateCommunityPostReportStatus = {
  response: UpdateCommunityPostReportStatus$data;
  variables: UpdateCommunityPostReportStatus$variables;
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
    "concreteType": "AdminCommunityPostReport",
    "kind": "LinkedField",
    "name": "updateCommunityPostReportStatus",
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
    "name": "UpdateCommunityPostReportStatus",
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
    "name": "UpdateCommunityPostReportStatus",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "e290a0339969e747f0c9888df114ac7b",
    "id": null,
    "metadata": {},
    "name": "UpdateCommunityPostReportStatus",
    "operationKind": "mutation",
    "text": "mutation UpdateCommunityPostReportStatus(\n  $reportId: ID!\n  $status: ReportStatus!\n  $adminMemo: String\n) {\n  updateCommunityPostReportStatus(reportId: $reportId, status: $status, adminMemo: $adminMemo) {\n    id\n    status\n    adminMemo\n  }\n}\n"
  }
};
})();

(node as any).hash = "7bef53f8cc81910bc4885e8bec6a0c2a";

export default node;
