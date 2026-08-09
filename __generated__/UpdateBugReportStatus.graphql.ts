/**
 * @generated SignedSource<<a165646c818776d9203beb4dd2119312>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type BugReportStatus = "PENDING" | "RESOLVED" | "%future added value";
export type UpdateBugReportStatus$variables = {
  adminMemo?: string | null | undefined;
  bugReportId: string;
  status: BugReportStatus;
};
export type UpdateBugReportStatus$data = {
  readonly updateBugReportStatus: {
    readonly adminMemo: string | null | undefined;
    readonly id: string;
    readonly status: BugReportStatus;
  };
};
export type UpdateBugReportStatus = {
  response: UpdateBugReportStatus$data;
  variables: UpdateBugReportStatus$variables;
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
  "name": "bugReportId"
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
        "name": "bugReportId",
        "variableName": "bugReportId"
      },
      {
        "kind": "Variable",
        "name": "status",
        "variableName": "status"
      }
    ],
    "concreteType": "AdminBugReport",
    "kind": "LinkedField",
    "name": "updateBugReportStatus",
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
    "name": "UpdateBugReportStatus",
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
    "name": "UpdateBugReportStatus",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "14ccac0c2c8bc188af0d4445240bf63f",
    "id": null,
    "metadata": {},
    "name": "UpdateBugReportStatus",
    "operationKind": "mutation",
    "text": "mutation UpdateBugReportStatus(\n  $bugReportId: ID!\n  $status: BugReportStatus!\n  $adminMemo: String\n) {\n  updateBugReportStatus(bugReportId: $bugReportId, status: $status, adminMemo: $adminMemo) {\n    id\n    status\n    adminMemo\n  }\n}\n"
  }
};
})();

(node as any).hash = "f63b0d0cab54649ddc3d09729982d378";

export default node;
