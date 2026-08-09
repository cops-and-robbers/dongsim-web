// 브라우저 MSW 워커. MockProvider가 dev에서만 import·start 한다.
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
