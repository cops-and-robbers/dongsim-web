/**
 * 챗봇 모델 연결 (#163). 두 길 중 하나를 쓴다.
 *
 * 1. AI Studio 무료 키(CHAT_GEMINI_API_KEY): 결제 등록이 없어 돈이 나갈 수 없다. 대신 보낸 내용이 구글 서비스 개선에 쓰이고
 *    사람이 볼 수 있다(공식 가격표 "Used to improve our products: Yes"). 그래서 광고 수익은 보내지 않는다(tools.ts redact).
 *    무료 한도(분당, 하루 요청 수)는 공식 문서에 숫자가 없고 AI Studio 에서만 보인다. 질문 하나가 2~4번 요청한다
 * 2. Vertex AI(CHAT_VERTEX_PROJECT): 유료 등급이라 내용이 학습에 쓰이지 않는다. Google AI Pro 월 10달러 크레딧과 Spend Cap 으로 낸다
 * 키가 있으면 1 을 먼저 쓴다.
 *
 * 비용은 Google AI Pro 의 월 10달러 Cloud 크레딧으로 내고, 그 프로젝트에 Spend Cap 을 건다(docs/metrics-chat.md).
 * 코드에서도 사람당 하루 질문 수와 이번 달 비용 상한을 따로 막는다(route.ts). Spend Cap 은 미리보기 기능이라 바뀔 수 있어서다.
 *
 * 환경변수
 * - CHAT_GEMINI_API_KEY: AI Studio 에서 만든 키(무료 등급)
 * - CHAT_VERTEX_PROJECT: 챗봇 전용 프로젝트 id (없으면 챗봇을 끈다)
 * - CHAT_VERTEX_LOCATION: 기본 global
 * - CHAT_MODEL: 기본 gemini-3.8-flash
 * - CHAT_MOCK=1: 개발 서버에서 가짜 모델(devMock.ts). Vertex 없이 화면을 볼 때
 * - CHAT_GOOGLE_SERVICE_ACCOUNT_JSON: 없으면 GOOGLE_SERVICE_ACCOUNT_JSON(지표 수집 계정)을 쓴다. 그 계정에 Vertex AI 사용자 역할을 줘야 한다
 */

import { createGoogle } from "@ai-sdk/google";
import { createGoogleVertex } from "@ai-sdk/google-vertex";
import type { LanguageModel } from "ai";
import { devMockModel } from "./devMock.ts";

export type ChatModel = {
  model: LanguageModel;
  modelId: string;
  providerOptions: Record<string, Record<string, unknown>>;
  /** 무료 등급이면 비용 0, 대신 보낼 지표를 줄인다 */
  free: boolean;
};

/**
 * 서비스 계정 JSON 읽기. 앞뒤 따옴표는 걷는다(Vercel 에 .env 줄을 통째로 붙이면 따옴표가 값에 남을 수 있다).
 * JSON 파싱 오류 메시지에는 입력 조각(개인 키 일부)이 실려 로그와 응답으로 샌다. 그래서 원래 오류를 버리고 이름만 알린다(google.ts 와 같다)
 */
export function serviceAccount(raw: string): { client_email: string; private_key: string } {
  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(raw.trim().replace(/^'([\s\S]*)'$/, "$1"));
  } catch {
    throw new Error("CHAT_GOOGLE_SERVICE_ACCOUNT_JSON 을 JSON 으로 읽지 못했어요");
  }
  if (!sa.client_email || !sa.private_key) throw new Error("CHAT_GOOGLE_SERVICE_ACCOUNT_JSON 형식이 달라요(client_email, private_key 가 없어요)");
  return { client_email: sa.client_email, private_key: sa.private_key };
}

export function chatModelFromEnv(): ChatModel | null {
  // 개발 서버에서만: 가짜 모델로 화면과 검증 흐름을 본다(devMock.ts). 운영 빌드에서는 무시한다
  if (process.env.CHAT_MOCK === "1" && process.env.NODE_ENV !== "production") return { model: devMockModel(), modelId: "dev-mock", providerOptions: {}, free: true };
  const modelId = process.env.CHAT_MODEL || "gemini-3.8-flash";
  // 생각은 low (3.7, 3.8 Flash 는 minimal 로 못 내린다). 온도는 Gemini 3 권장대로 기본값(1.0) 그대로 둔다. 0 으로 낮추면 반복에 빠질 수 있다고 구글 문서가 경고한다
  const thinking = { thinkingConfig: { thinkingLevel: "low" } };
  const apiKey = process.env.CHAT_GEMINI_API_KEY;
  if (apiKey) return { model: createGoogle({ apiKey })(modelId), modelId, providerOptions: { google: thinking }, free: true };
  const project = process.env.CHAT_VERTEX_PROJECT;
  const raw = process.env.CHAT_GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!project || !raw) return null;
  const sa = serviceAccount(raw);
  const vertex = createGoogleVertex({
    project,
    location: process.env.CHAT_VERTEX_LOCATION || "global",
    googleAuthOptions: { credentials: { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") } },
  });
  return { model: vertex(modelId), modelId, providerOptions: { vertex: thinking }, free: false };
}
