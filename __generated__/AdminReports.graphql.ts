/**
 * @generated SignedSource<<2a095b55f10be95dfcfb923041c40294>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type ReportType = "CHEATING" | "DEMORALIZATION" | "ETC" | "FISHING" | "IMPERSONATION" | "SPAM" | "VERBAL_ABUSE" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminReports$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: ReportStatus | null | undefined;
};
export type AdminReports$data = {
  readonly adminReports: {
    readonly content: ReadonlyArray<{
      readonly adminMemo: string | null | undefined;
      readonly createdAt: string;
      readonly etcReason: string | null | undefined;
      readonly gameId: string;
      readonly id: string;
      readonly messageContent: string;
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
export type AdminReports = {
  response: AdminReports$data;
  variables: AdminReports$variables;
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
    "concreteType": "AdminReportPage",
    "kind": "LinkedField",
    "name": "adminReports",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminReport",
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
            "name": "gameId",
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
            "name": "messageContent",
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
    "name": "AdminReports",
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
    "name": "AdminReports",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "5bc347c449802818c7339efebd033261",
    "id": null,
    "metadata": {},
    "name": "AdminReports",
    "operationKind": "query",
    "text": "query AdminReports(\n  $page: Int\n  $size: Int\n  $status: ReportStatus\n  $sortDirection: SortDirection\n) {\n  adminReports(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      gameId\n      reporterUserId\n      reporterNickname\n      reportedUserId\n      reportedNickname\n      messageContent\n      reportType\n      etcReason\n      status\n      adminMemo\n      createdAt\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "562bba234a3624a454fef54c8e5e4a29";

export default node;
