import { NextResponse } from "next/server";
import {
  actorName,
  fetchAppStoreVersion,
  getTemplate,
  guardAppConfig,
  isWritable,
  listHistory,
  publishTemplate,
  RemoteConfigConflict,
  storageBucket,
} from "@/lib/admin/server/remoteConfig";
import {
  describeForHistory,
  diffAppConfig,
  isAppConfigKey,
  EVIDENCE_KEYS,
  isOurBannerUrl,
  isOurEvidenceUrl,
  mergeTemplate,
  readAppConfig,
  validateChanges,
  type AppConfigChanges,
  type AppConfigState,
} from "@/lib/admin/appConfig";

/**
 * 어드민 "앱 설정" (docs/admin-ui.md). Firebase Remote Config 를 서버에서 대신 읽고 게시한다.
 * 서비스 계정 키를 브라우저에 내려보낼 수 없어서 이 경로가 중간에 선다.
 *
 * GET                  AppConfigState
 * GET ?only=maintenance { maintenance } 메뉴의 "점검 중" 표시가 쓴다
 * PUT { etag, changes } 고친 값만 받아 최신 템플릿에 합쳐 게시한다
 */

const CONFLICT = "다른 사람이 먼저 바꿨어요. 최신 값을 불러왔으니 다시 확인해 주세요.";
const noStore = { headers: { "Cache-Control": "no-store" } };

async function currentState(): Promise<AppConfigState> {
  const [{ template, etag }, history, appStoreVersion] = await Promise.all([getTemplate(), listHistory(), fetchAppStoreVersion()]);
  return { ...readAppConfig(template), etag, history, appStoreVersion, writable: isWritable(), source: "firebase" };
}

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guardAppConfig(req);
  if (checked instanceof NextResponse) return checked;
  try {
    if (new URL(req.url).searchParams.get("only") === "maintenance") {
      const { template } = await getTemplate();
      return NextResponse.json({ maintenance: readAppConfig(template).values.maintenance === "true" }, noStore);
    }
    return NextResponse.json(await currentState(), noStore);
  } catch (e) {
    console.error("[app-config] 읽기 실패", e);
    return NextResponse.json({ error: "불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guardAppConfig(req);
  if (checked instanceof NextResponse) return checked;
  if (!isWritable()) return NextResponse.json({ error: "이 환경에서는 볼 수만 있어요. 운영 어드민에서 바꿔 주세요." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { etag?: unknown; changes?: unknown };
  if (typeof body.etag !== "string" || typeof body.changes !== "object" || body.changes === null) {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  // 정해 둔 14개 말고는 받지 않는다. 앱에 없는 값이나 콘솔에서 쓰는 다른 값을 이 경로로 바꿀 수 없다
  const requested: AppConfigChanges = {};
  for (const [key, value] of Object.entries(body.changes)) {
    if (!isAppConfigKey(key) || typeof value !== "string") {
      return NextResponse.json({ error: "바꿀 수 없는 값이 들어 있어요." }, { status: 400 });
    }
    requested[key] = value;
  }

  try {
    const { template, etag } = await getTemplate();
    // 화면이 본 뒤로 누가 바꿨다면, 사람이 보지 못한 값 위에 게시하지 않는다
    if (etag !== body.etag) return NextResponse.json({ error: CONFLICT }, { status: 409 });

    const { values, conditioned } = readAppConfig(template);
    const changes = diffAppConfig(values, requested);
    if (Object.keys(changes).length === 0) return NextResponse.json(await currentState(), noStore);
    if (conditioned.some((key) => changes[key] !== undefined)) {
      return NextResponse.json({ error: "콘솔에서 조건을 건 값이에요. Firebase 콘솔에서 바꿔 주세요." }, { status: 409 });
    }

    // 배너 이미지는 우리 폴더에 올린 것만 내보낸다. 빈 값(숨기기)은 괜찮다
    if (changes.banner_image_url && !isOurBannerUrl(changes.banner_image_url, storageBucket())) {
      return NextResponse.json({ error: "이 이미지 주소는 쓸 수 없어요. 새로 올려 주세요." }, { status: 400 });
    }

    if (EVIDENCE_KEYS.some((key) => changes[key] && !isOurEvidenceUrl(changes[key], storageBucket()))) {
      return NextResponse.json({ error: "이 이미지 주소는 쓸 수 없어요. 새로 올려 주세요." }, { status: 400 });
    }

    const errors = validateChanges(values, changes);
    const firstError = Object.values(errors)[0];
    if (firstError) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    const description = describeForHistory(await actorName(checked.token), values, changes);
    await publishTemplate(mergeTemplate(template, changes, description), etag);
    return NextResponse.json(await currentState(), noStore);
  } catch (e) {
    if (e instanceof RemoteConfigConflict) return NextResponse.json({ error: CONFLICT }, { status: 409 });
    console.error("[app-config] 게시 실패", e);
    return NextResponse.json({ error: "적용하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
