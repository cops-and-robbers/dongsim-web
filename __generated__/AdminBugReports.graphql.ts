/**
 * @generated SignedSource<<81877a76e94e4e5e2b3c13db371a18ee>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type BugReportStatus = "PENDING" | "RESOLVED" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminBugReports$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: BugReportStatus | null | undefined;
};
export type AdminBugReports$data = {
  readonly adminBugReports: {
    readonly content: ReadonlyArray<{
      readonly adminMemo: string | null | undefined;
      readonly content: string;
      readonly createdAt: string;
      readonly id: string;
      readonly status: BugReportStatus;
      readonly userId: string;
      readonly userNickname: string;
    }>;
    readonly page: number;
    readonly size: number;
    readonly totalElements: number;
    readonly totalPages: number;
  };
};
export type AdminBugReports = {
  response: AdminBugReports$data;
  variables: AdminBugReports$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "page"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "size"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sortDirection"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "status"
},
v4 = [
  {
    "alias": null,
    "args": [
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
        "name": "sortDirection",
        "variableName": "sortDirection"
      },
      {
        "kind": "Variable",
        "name": "status",
        "variableName": "status"
      }
    ],
    "concreteType": "AdminBugReportPage",
    "kind": "LinkedField",
    "name": "adminBugReports",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminBugReport",
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
            "name": "content",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "userId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "userNickname",
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
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "createdAt",
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
      (v3/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminBugReports",
    "selections": (v4/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v3/*:: as any*/),
      (v2/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminBugReports",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "d39374eb5b19b4c70c1db33dda961e83",
    "id": null,
    "metadata": {},
    "name": "AdminBugReports",
    "operationKind": "query",
    "text": "query AdminBugReports(\n  $page: Int\n  $size: Int\n  $status: BugReportStatus\n  $sortDirection: SortDirection\n) {\n  adminBugReports(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      content\n      userId\n      userNickname\n      status\n      adminMemo\n      createdAt\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "d8e0cb4d41297772f72e78a4c386544b";

export default node;
