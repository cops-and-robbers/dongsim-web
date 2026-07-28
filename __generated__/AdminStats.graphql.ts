/**
 * @generated SignedSource<<c63426380c33b29f7ffa3b136ecb93e8>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameStatus = "CANCELED" | "FINISHED" | "IN_PROGRESS" | "WAITING" | "%future added value";
export type AdminStats$variables = Record<PropertyKey, never>;
export type AdminStats$data = {
  readonly adminStats: {
    readonly dailyTrend: ReadonlyArray<{
      readonly date: string;
      readonly games: number;
      readonly users: number;
    }>;
    readonly eventGames: number;
    readonly finishedGames: number;
    readonly gameGrowthRate: number;
    readonly gamesThisWeek: number;
    readonly inProgressGames: number;
    readonly newUsersThisWeek: number;
    readonly statusBreakdown: ReadonlyArray<{
      readonly count: number;
      readonly status: GameStatus;
    }>;
    readonly totalGames: number;
    readonly totalUsers: number;
    readonly userGrowthRate: number;
  };
};
export type AdminStats = {
  response: AdminStats$data;
  variables: AdminStats$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AdminStats",
    "kind": "LinkedField",
    "name": "adminStats",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalUsers",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalGames",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inProgressGames",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "finishedGames",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "eventGames",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "newUsersThisWeek",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "gamesThisWeek",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userGrowthRate",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "gameGrowthRate",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "StatusCount",
        "kind": "LinkedField",
        "name": "statusBreakdown",
        "plural": true,
        "selections": [
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
            "name": "count",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "DailyPoint",
        "kind": "LinkedField",
        "name": "dailyTrend",
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
            "name": "users",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "games",
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
    "name": "AdminStats",
    "selections": (v0/*:: as any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminStats",
    "selections": (v0/*:: as any*/)
  },
  "params": {
    "cacheID": "1ee6dbb93c561d988226bdfea84ca9fa",
    "id": null,
    "metadata": {},
    "name": "AdminStats",
    "operationKind": "query",
    "text": "query AdminStats {\n  adminStats {\n    totalUsers\n    totalGames\n    inProgressGames\n    finishedGames\n    eventGames\n    newUsersThisWeek\n    gamesThisWeek\n    userGrowthRate\n    gameGrowthRate\n    statusBreakdown {\n      status\n      count\n    }\n    dailyTrend {\n      date\n      users\n      games\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "9b5988dee16a2dcf1695b76bda9e293c";

export default node;
