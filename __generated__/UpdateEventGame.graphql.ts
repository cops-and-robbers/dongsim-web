/**
 * @generated SignedSource<<03839738d83441652ddbf90155c07ccd>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GameStatus = "CANCELED" | "FINISHED" | "IN_PROGRESS" | "WAITING" | "%future added value";
export type UpdateEventGame$variables = {
  gameId: string;
  isEventGame: boolean;
};
export type UpdateEventGame$data = {
  readonly updateEventGame: {
    readonly id: string;
    readonly isEventGame: boolean;
    readonly status: GameStatus;
  };
};
export type UpdateEventGame = {
  response: UpdateEventGame$data;
  variables: UpdateEventGame$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "gameId"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "isEventGame"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "gameId",
        "variableName": "gameId"
      },
      {
        "kind": "Variable",
        "name": "isEventGame",
        "variableName": "isEventGame"
      }
    ],
    "concreteType": "AdminGame",
    "kind": "LinkedField",
    "name": "updateEventGame",
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
        "name": "isEventGame",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "UpdateEventGame",
    "selections": (v1/*:: as any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "UpdateEventGame",
    "selections": (v1/*:: as any*/)
  },
  "params": {
    "cacheID": "2783298fef85f228d807af2a3ed41aa7",
    "id": null,
    "metadata": {},
    "name": "UpdateEventGame",
    "operationKind": "mutation",
    "text": "mutation UpdateEventGame(\n  $gameId: ID!\n  $isEventGame: Boolean!\n) {\n  updateEventGame(gameId: $gameId, isEventGame: $isEventGame) {\n    id\n    isEventGame\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "192730f5dd93a9dad402072d7664aa98";

export default node;
