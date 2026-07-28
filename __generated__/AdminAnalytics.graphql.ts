/**
 * @generated SignedSource<<555ddcc3a402b920065fb5f10f916d8c>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeviceType = "ANDROID" | "IOS" | "%future added value";
export type AdminAnalytics$variables = Record<PropertyKey, never>;
export type AdminAnalytics$data = {
  readonly adminAnalytics: {
    readonly avgEngagementSeconds: number;
    readonly dau: number;
    readonly dauGrowthRate: number;
    readonly dauTrend: ReadonlyArray<{
      readonly date: string;
      readonly value: number;
    }>;
    readonly mau: number;
    readonly newUsers: number;
    readonly platformBreakdown: ReadonlyArray<{
      readonly platform: DeviceType;
      readonly users: number;
    }>;
    readonly retentionD1: number;
    readonly retentionD7: number;
    readonly topEvents: ReadonlyArray<{
      readonly count: number;
      readonly name: string;
    }>;
    readonly wau: number;
  };
};
export type AdminAnalytics = {
  response: AdminAnalytics$data;
  variables: AdminAnalytics$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AdminAnalytics",
    "kind": "LinkedField",
    "name": "adminAnalytics",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dau",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "wau",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "mau",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "newUsers",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dauGrowthRate",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "avgEngagementSeconds",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "retentionD1",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "retentionD7",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AnalyticsPoint",
        "kind": "LinkedField",
        "name": "dauTrend",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "date",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "value",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "EventCount",
        "kind": "LinkedField",
        "name": "topEvents",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "name",
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
        "concreteType": "PlatformCount",
        "kind": "LinkedField",
        "name": "platformBreakdown",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "platform",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "users",
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
    "name": "AdminAnalytics",
    "selections": (v0/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminAnalytics",
    "selections": (v0/*:: as any*/)
  },
  "params": {
    "cacheID": "dcd2406ad7f54ee578d41f7f5b6a2cd5",
    "id": null,
    "metadata": {},
    "name": "AdminAnalytics",
    "operationKind": "query",
    "text": "query AdminAnalytics {\n  adminAnalytics {\n    dau\n    wau\n    mau\n    newUsers\n    dauGrowthRate\n    avgEngagementSeconds\n    retentionD1\n    retentionD7\n    dauTrend {\n      date\n      value\n    }\n    topEvents {\n      name\n      count\n    }\n    platformBreakdown {\n      platform\n      users\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "bc66a5d0989cf158be756ba6d573e340";

export default node;
