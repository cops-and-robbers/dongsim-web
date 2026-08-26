/**
 * @generated SignedSource<<11f863b7d267784096af582f6aa10c8d>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type UpdateCommunityChatReportStatus$variables = {
  adminMemo?: string | null | undefined;
  reportId: string;
  status: ReportStatus;
};
export type UpdateCommunityChatReportStatus$data = {
  readonly updateCommunityChatReportStatus: {
    readonly adminMemo: string | null | undefined;
    readonly id: string;
    readonly status: ReportStatus;
  };
};
export type UpdateCommunityChatReportStatus = {
  response: UpdateCommunityChatReportStatus$data;
  variables: UpdateCommunityChatReportStatus$variables;
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
    "concreteType": "AdminCommunityChatReport",
    "kind": "LinkedField",
    "name": "updateCommunityChatReportStatus",
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
    "name": "UpdateCommunityChatReportStatus",
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
    "name": "UpdateCommunityChatReportStatus",
    "selections": (v3/*:: as any*/)
  },
  "params": {
    "cacheID": "a3f7582b3fb62f112d49bc36d666afdf",
    "id": null,
    "metadata": {},
    "name": "UpdateCommunityChatReportStatus",
    "operationKind": "mutation",
    "text": "mutation UpdateCommunityChatReportStatus(\n  $reportId: ID!\n  $status: ReportStatus!\n  $adminMemo: String\n) {\n  updateCommunityChatReportStatus(reportId: $reportId, status: $status, adminMemo: $adminMemo) {\n    id\n    status\n    adminMemo\n  }\n}\n"
  }
};
})();

(node as any).hash = "c6b8a66611dfc643b44672dd8f1c3aaa";

export default node;
