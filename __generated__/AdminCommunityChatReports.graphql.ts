/**
 * @generated SignedSource<<4d1c4c33041404e9c70b0cb5412f9539>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type ReportType = "CHEATING" | "DEMORALIZATION" | "ETC" | "FISHING" | "IMPERSONATION" | "SPAM" | "VERBAL_ABUSE" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminCommunityChatReports$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: ReportStatus | null | undefined;
};
export type AdminCommunityChatReports$data = {
  readonly adminCommunityChatReports: {
    readonly content: ReadonlyArray<{
      readonly adminMemo: string | null | undefined;
      readonly chatMessageId: string;
      readonly createdAt: string;
      readonly etcReason: string | null | undefined;
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
export type AdminCommunityChatReports = {
  response: AdminCommunityChatReports$data;
  variables: AdminCommunityChatReports$variables;
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
    "concreteType": "AdminCommunityChatReportPage",
    "kind": "LinkedField",
    "name": "adminCommunityChatReports",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminCommunityChatReport",
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
            "name": "chatMessageId",
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
    "name": "AdminCommunityChatReports",
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
    "name": "AdminCommunityChatReports",
    "selections": (v4/*:: as any*/)
  },
  "params": {
    "cacheID": "20e936a186480842173fac04880a3685",
    "id": null,
    "metadata": {},
    "name": "AdminCommunityChatReports",
    "operationKind": "query",
    "text": "query AdminCommunityChatReports(\n  $page: Int\n  $size: Int\n  $status: ReportStatus\n  $sortDirection: SortDirection\n) {\n  adminCommunityChatReports(page: $page, size: $size, status: $status, sortDirection: $sortDirection) {\n    content {\n      id\n      chatMessageId\n      reporterUserId\n      reporterNickname\n      reportedUserId\n      reportedNickname\n      messageContent\n      reportType\n      etcReason\n      status\n      adminMemo\n      createdAt\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "6c0d5906db4ed2fba5ab947832c8d133";

export default node;
