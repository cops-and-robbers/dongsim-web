import { NextResponse } from "next/server";
import { guardAppConfig, isWritable, uploadBannerImage } from "@/lib/admin/server/remoteConfig";
import { MAX_BANNER_BYTES, sniffImageType } from "@/lib/admin/appConfig";

/**
 * 앱 설정의 배너 이미지. Firebase Storage banners 폴더에 대신 올린다(docs/admin-ui.md "앱 설정").
 * 올린다고 앱에 나가지는 않는다. 앱 설정을 적용해야 나간다. 지우는 기능은 두지 않는다.
 *
 * POST  form-data file  올린 이미지 하나
 */

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guardAppConfig(req);
  if (checked instanceof NextResponse) return checked;
  if (!isWritable()) return NextResponse.json({ error: "이 환경에서는 볼 수만 있어요. 운영 어드민에서 바꿔 주세요." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일을 읽지 못했어요." }, { status: 400 });
  if (file.size > MAX_BANNER_BYTES) return NextResponse.json({ error: "2MB까지 올릴 수 있어요." }, { status: 413 });

  // 확장자나 브라우저가 적어 보낸 종류는 믿지 않고 파일 앞부분을 본다
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return NextResponse.json({ error: "PNG, JPG, WEBP 파일만 올릴 수 있어요." }, { status: 415 });

  try {
    return NextResponse.json(await uploadBannerImage(bytes, type), { status: 201 });
  } catch (e) {
    console.error("[app-config] 배너 올리기 실패", e);
    return NextResponse.json({ error: "올리지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
