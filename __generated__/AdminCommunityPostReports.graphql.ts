/**
 * @generated SignedSource<<ad3ea145633f3b91f833b619737f996e>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type ReportType = "CHEATING" | "DEMORALIZATION" | "ETC" | "FISHING" | "IMPERSONATION" | "SPAM" | "VERBAL_ABUSE" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminCommunityPostReports$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: ReportStatus | null | undefined;
};
export type AdminCommunityPostReports$data = {
  readonly adminCommunityPostReports: {
    readonly content: ReadonlyArray<{
      readonly adminMemo: string | null | undefined;
      readonly createdAt: string;
      readonly etcReason: string | null | undefined;
      readonly id: string;
      readonly postContent: string;
      readonly postId: string;
      readonly postTitle: string;
      readonly reportType: ReportType;
      readonly reportedNickname: string;
      readonly reportedUserId: string;
      readonly reporterNickname: string;
      readonly reporterUserId: string;
      readonly status: ReportStatus;
    }>;
    readonly page: number;
    readonly size: number;
    readonly totalElements: number;
    readonly totalPages: number;
  };
};
export type AdminCommunityPostReports = {
  response: AdminCommunityPostReports$data;
  variables: AdminCommunityPostReports$variables;
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
    "concreteType": "AdminCommunityPostReportPage",
    "kind": "LinkedField",
    "name": "adminCommunityPostReports",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminCommunityPostReport",
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
            "name": "postId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "postTitle",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "postContent",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reporterUserId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reporterNickname",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reportedUserId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reportedNickname",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reportType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "etcReason",
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
    "name": "AdminCommunityPostReports",
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
    "name": "AdminCommunityPostReports",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "e3f8c2417d78736d2e785d68e1877f15",
    "id": null,
    "metadata": {},
    "name": "AdminCommunityPostReports",
    "operationKind": "query",
    "text": "query AdminCommunityPostReports(\n  $page: Int\n  $size: Int\n  $status: ReportStatus\n  $sortDirection: SortDirection\n) {\n  adminCommunityPostReports(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      postId\n      postTitle\n      postContent\n      reporterUserId\n      reporterNickname\n      reportedUserId\n      reportedNickname\n      reportType\n      etcReason\n      status\n      adminMemo\n      createdAt\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "89a678637cbdb01b94ffa214dc7949c3";

export default node;
