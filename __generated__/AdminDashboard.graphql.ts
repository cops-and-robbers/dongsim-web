/**
 * @generated SignedSource<<a2490301556b3cc389f3483965e360b7>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameEndReason = "ALL_ARRESTED" | "POLICE_FORFEITED" | "ROBBER_FORFEITED" | "TIME_OVER" | "%future added value";
export type AdminDashboard$variables = Record<PropertyKey, never>;
export type AdminDashboard$data = {
  readonly adminDashboard: {
    readonly averageGameDurationSeconds: number;
    readonly endReasonDistribution: ReadonlyArray<{
      readonly count: number;
      readonly endReason: GameEndReason;
    }>;
    readonly inProgressGameCount: number;
    readonly pendingBugReportCount: number;
    readonly pendingReportCount: number;
    readonly todayGameCount: number;
    readonly todayNewUserCount: number;
    readonly totalUserCount: number;
    readonly weeklyGameCount: number;
    readonly winRateByTeam: {
      readonly policeWinRate: number;
      readonly robberWinRate: number;
    };
  };
};
export type AdminDashboard = {
  response: AdminDashboard$data;
  variables: AdminDashboard$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AdminDashboard",
    "kind": "LinkedField",
    "name": "adminDashboard",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "todayGameCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "weeklyGameCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inProgressGameCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalUserCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "todayNewUserCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pendingReportCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pendingBugReportCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "averageGameDurationSeconds",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "EndReasonDistribution",
        "kind": "LinkedField",
        "name": "endReasonDistribution",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endReason",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "count",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WinRateByTeam",
        "kind": "LinkedField",
        "name": "winRateByTeam",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "policeWinRate",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "robberWinRate",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "AdminDashboard",
    "selections": (v0/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminDashboard",
    "selections": (v0/*:: as any*/)
  },
  "params": {
    "cacheID": "d3dc89af9a586ace3d2309ab03d11604",
    "id": null,
    "metadata": {},
    "name": "AdminDashboard",
    "operationKind": "query",
    "text": "query AdminDashboard {\n  adminDashboard {\n    todayGameCount\n    weeklyGameCount\n    inProgressGameCount\n    totalUserCount\n    todayNewUserCount\n    pendingReportCount\n    pendingBugReportCount\n    averageGameDurationSeconds\n    endReasonDistribution {\n      endReason\n      count\n    }\n    winRateByTeam {\n      policeWinRate\n      robberWinRate\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3ca9ea94f668bf46d981a9a1aa8d01e4";

export default node;
