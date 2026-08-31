/**
 * @generated SignedSource<<ebc95233eb0bf1d28417a879bc5586c5>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ReportSource = "COMMUNITY_CHAT" | "COMMUNITY_POST" | "GAME_CHAT" | "%future added value";
export type ReportStatus = "DISMISSED" | "PENDING" | "RESOLVED" | "%future added value";
export type SortDirection = "ASC" | "DESC" | "%future added value";
export type AdminAllReports$variables = {
  page?: number | null | undefined;
  size?: number | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  source?: ReportSource | null | undefined;
  status?: ReportStatus | null | undefined;
};
export type AdminAllReports$data = {
  readonly adminAllReports: {
    readonly content: ReadonlyArray<{
      readonly content: string;
      readonly createdAt: string;
      readonly id: string;
      readonly reportedNickname: string;
      readonly reportedUserId: string;
      readonly reporterNickname: string;
      readonly reporterUserId: string;
      readonly source: ReportSource;
      readonly status: ReportStatus;
    }>;
    readonly page: number;
    readonly size: number;
    readonly totalElements: number;
    readonly totalPages: number;
  };
};
export type AdminAllReports = {
  response: AdminAllReports$data;
  variables: AdminAllReports$variables;
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
  "name": "source"
},
v4 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "status"
},
v5 = [
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
        "name": "source",
        "variableName": "source"
      },
      {
        "kind": "Variable",
        "name": "status",
        "variableName": "status"
      }
    ],
    "concreteType": "AdminAllReportPage",
    "kind": "LinkedField",
    "name": "adminAllReports",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AdminAllReport",
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
            "name": "source",
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
            "name": "content",
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
      (v3/*:: as any*/),
      (v4/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminAllReports",
    "selections": (v5/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v4/*:: as any*/),
      (v3/*:: as any*/),
      (v2/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "AdminAllReports",
    "selections": (v5/*:: as any*/)
  },
  "params": {
    "cacheID": "4775ddd6cd81a1992140c567886a96fd",
    "id": null,
    "metadata": {},
    "name": "AdminAllReports",
    "operationKind": "query",
    "text": "query AdminAllReports(\n  $page: Int\n  $size: Int\n  $status: ReportStatus\n  $source: ReportSource\n  $sortDirection: SortDirection\n) {\n  adminAllReports(page: $page, size: $size, status: $status, source: $source, sortDirection: $sortDirection) {\n    content {\n      id\n      source\n      reporterUserId\n      reporterNickname\n      reportedUserId\n      reportedNickname\n      content\n      status\n      createdAt\n    }\n    totalElements\n    totalPages\n    page\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "ed59e733e783d9134723cbc6112f4680";

export default node;
