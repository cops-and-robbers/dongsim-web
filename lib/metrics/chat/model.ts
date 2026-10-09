/**
 * 챗봇 모델 연결 (#163). Vertex AI(Gemini Enterprise Agent Platform)의 Gemini 를 서비스 계정으로 부른다.
 *
 * 비용은 Google AI Pro 의 월 10달러 Cloud 크레딧으로 내고, 그 프로젝트에 Spend Cap 을 건다(docs/metrics-chat.md).
 * 코드에서도 사람당 하루 질문 수와 이번 달 비용 상한을 따로 막는다(route.ts). Spend Cap 은 미리보기 기능이라 바뀔 수 있어서다.
 *
 * 환경변수
 * - CHAT_VERTEX_PROJECT: 챗봇 전용 프로젝트 id (없으면 챗봇을 끈다)
 * - CHAT_VERTEX_LOCATION: 기본 global
 * - CHAT_MODEL: 기본 gemini-3.8-flash
 * - CHAT_MOCK=1: 개발 서버에서 가짜 모델(devMock.ts). Vertex 없이 화면을 볼 때
 * - CHAT_GOOGLE_SERVICE_ACCOUNT_JSON: 없으면 GOOGLE_SERVICE_ACCOUNT_JSON(지표 수집 계정)을 쓴다. 그 계정에 Vertex AI 사용자 역할을 줘야 한다
 */

import { createGoogleVertex } from "@ai-sdk/google-vertex";
import type { LanguageModel } from "ai";
import { devMockModel } from "./devMock.ts";

export type ChatModel = { model: LanguageModel; modelId: string; providerOptions: Record<string, Record<string, unknown>> };

export function chatModelFromEnv(): ChatModel | null {
  // 개발 서버에서만: 가짜 모델로 화면과 검증 흐름을 본다(devMock.ts). 운영 빌드에서는 무시한다
  if (process.env.CHAT_MOCK === "1" && process.env.NODE_ENV !== "production") return { model: devMockModel(), modelId: "dev-mock", providerOptions: {} };
  const project = process.env.CHAT_VERTEX_PROJECT;
  const raw = process.env.CHAT_GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!project || !raw) return null;
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const vertex = createGoogleVertex({
    project,
    location: process.env.CHAT_VERTEX_LOCATION || "global",
    googleAuthOptions: { credentials: { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") } },
  });
  const modelId = process.env.CHAT_MODEL || "gemini-3.8-flash";
  // 생각은 low (3.7, 3.8 Flash 는 minimal 로 못 내린다). 온도는 Gemini 3 권장대로 기본값 그대로 둔다
  return { model: vertex(modelId), modelId, providerOptions: { vertex: { thinkingConfig: { thinkingLevel: "low" } } } };
}
