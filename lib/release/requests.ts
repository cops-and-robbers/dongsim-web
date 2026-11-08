/**
 * 출시 조작이 스토어에 보내는 요청 모양. 순수 함수라 공식 명세(App Store Connect OpenAPI, Play discovery)와 그대로 대조해 테스트한다.
 * 보내는 일은 actions.ts 가 한다.
 */
export type AscRequest = { method: "PATCH" | "POST"; path: string; body: Record<string, unknown> };

const ref = (type: string, id: string) => ({ data: { type, id } });

export const ascRequests = {
  /** 버전 칸 이름 바꾸기 (AppStoreVersionUpdateRequest) */
  renameVersion: (versionId: string, versionString: string): AscRequest => ({
    method: "PATCH",
    path: `/v1/appStoreVersions/${versionId}`,
    body: { data: { type: "appStoreVersions", id: versionId, attributes: { versionString } } },
  }),
  /** 빌드 붙이기 (AppStoreVersionBuildLinkageRequest) */
  attachBuild: (versionId: string, buildId: string): AscRequest => ({
    method: "PATCH",
    path: `/v1/appStoreVersions/${versionId}/relationships/build`,
    body: ref("builds", buildId),
  }),
  /** 심사 제출 묶음 만들기 (ReviewSubmissionCreateRequest) */
  createSubmission: (appId: string): AscRequest => ({
    method: "POST",
    path: "/v1/reviewSubmissions",
    body: { data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: ref("apps", appId) } } },
  }),
  /** 묶음에 버전 넣기 (ReviewSubmissionItemCreateRequest) */
  addSubmissionItem: (submissionId: string, versionId: string): AscRequest => ({
    method: "POST",
    path: "/v1/reviewSubmissionItems",
    body: { data: { type: "reviewSubmissionItems", relationships: { reviewSubmission: ref("reviewSubmissions", submissionId), appStoreVersion: ref("appStoreVersions", versionId) } } },
  }),
  /** 제출 (ReviewSubmissionUpdateRequest submitted) */
  submit: (submissionId: string): AscRequest => ({
    method: "PATCH",
    path: `/v1/reviewSubmissions/${submissionId}`,
    body: { data: { type: "reviewSubmissions", id: submissionId, attributes: { submitted: true } } },
  }),
  /** 제출 취소 (ReviewSubmissionUpdateRequest canceled) */
  cancelSubmission: (submissionId: string): AscRequest => ({
    method: "PATCH",
    path: `/v1/reviewSubmissions/${submissionId}`,
    body: { data: { type: "reviewSubmissions", id: submissionId, attributes: { canceled: true } } },
  }),
  /** 승인된 버전 출시 (AppStoreVersionReleaseRequestCreateRequest) */
  release: (versionId: string): AscRequest => ({
    method: "POST",
    path: "/v1/appStoreVersionReleaseRequests",
    body: { data: { type: "appStoreVersionReleaseRequests", relationships: { appStoreVersion: ref("appStoreVersions", versionId) } } },
  }),
  /** 단계적 출시 멈춤, 이어 가기, 바로 모두에게 (AppStoreVersionPhasedReleaseUpdateRequest) */
  phased: (phasedId: string, state: "PAUSED" | "ACTIVE" | "COMPLETE"): AscRequest => ({
    method: "PATCH",
    path: `/v1/appStoreVersionPhasedReleases/${phasedId}`,
    body: { data: { type: "appStoreVersionPhasedReleases", id: phasedId, attributes: { phasedReleaseState: state } } },
  }),
};

/** Play 트랙의 출시 하나 (TrackRelease). versionCodes 는 문자열(int64) */
export type TrackRelease = { name?: string; versionCodes?: string[]; status?: string; userFraction?: number; releaseNotes?: { language: string; text: string }[] };

const has = (r: TrackRelease, code: number) => (r.versionCodes ?? []).map(Number).includes(code);

/**
 * 프로덕션 트랙에 넣을 출시 목록. current 는 편집 안에서 읽은 지금 프로덕션 출시들.
 * - 새 출시: 모두에게(completed)면 그것 하나, 일부면 inProgress + 비율. 나가 있는 completed 출시는 남겨 둔다(나머지 사람이 계속 받는다)
 * - 비율, 멈춤, 이어 가기: 그 출시만 바꾸고 나머지는 그대로
 * - 바로 모두에게: 그 출시를 completed 로, 이전 completed 출시는 뺀다(새 출시가 대신한다)
 */
export function productionReleases(
  action: "createRelease" | "rolloutSet" | "halt" | "resume" | "complete",
  current: TrackRelease[],
  p: { code: number; fraction?: number; notes?: { language: string; text: string }[] },
): TrackRelease[] {
  if (action === "createRelease") {
    const full = (p.fraction ?? 1) >= 1;
    const release: TrackRelease = {
      versionCodes: [String(p.code)],
      status: full ? "completed" : "inProgress",
      ...(full ? {} : { userFraction: p.fraction }),
      ...(p.notes?.length ? { releaseNotes: p.notes } : {}),
    };
    return full ? [release] : [release, ...current.filter((r) => r.status === "completed")];
  }
  const target = current.find((r) => has(r, p.code));
  if (!target) throw new Error(`프로덕션 트랙에 빌드 ${p.code} 출시가 없어요`);
  const others = current.filter((r) => r !== target);
  if (action === "complete") {
    const { userFraction: _drop, ...rest } = target;
    void _drop;
    return [{ ...rest, status: "completed" }, ...others.filter((r) => r.status !== "completed")];
  }
  if (action === "rolloutSet") return [{ ...target, status: "inProgress", userFraction: p.fraction }, ...others];
  if (action === "halt") return [{ ...target, status: "halted" }, ...others];
  return [{ ...target, status: "inProgress" }, ...others];
}
