import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isBoothOpen } from "@/components/photobooth/schedule";

// 클라이언트가 Blob에 직접 업로드할 때 쓰는 토큰 발급 라우트(파일은 서버를 거치지 않음).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // 운영 시간 밖에는 토큰을 발급하지 않아 업로드를 차단한다(API 직접 호출 포함).
        if (!isBoothOpen()) {
          throw new Error("지금은 포토부스 운영 시간이 아니에요.");
        }
        return {
          allowedContentTypes: ["image/jpeg"],
          addRandomSuffix: true,
          maximumSizeInBytes: 15 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
