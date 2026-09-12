import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isBoothOpen } from "@/components/photobooth/schedule";
import { PHOTOBOOTH_PUBLIC_BASE } from "@/lib/photobooth/constants";
import { presignUpload } from "@/lib/photobooth/r2";

// 팀 R2 presigned PUT URL 발급 라우트 (#123) - 파일은 서버를 거치지 않고
// 브라우저가 R2에 직접 올린다(Vercel 함수 본문 4.5MB 제한 회피).
export async function POST(): Promise<NextResponse> {
  // 운영 시간 밖에는 URL을 발급하지 않아 업로드를 차단한다(API 직접 호출 포함).
  if (!isBoothOpen()) {
    return NextResponse.json(
      { error: "지금은 포토부스 운영 시간이 아니에요." },
      { status: 403 },
    );
  }

  // URL-safe 문자만 - presign 의 canonical path 와 /p?k= 검증 정규식이 이 형태에 기댄다.
  const key = `strips/${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;

  try {
    return NextResponse.json({
      uploadUrl: presignUpload(key),
      publicUrl: `${PHOTOBOOTH_PUBLIC_BASE}/${key}`,
      key,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
