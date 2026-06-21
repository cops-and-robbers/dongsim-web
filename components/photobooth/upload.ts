import { upload } from "@vercel/blob/client";

// 합성된 스트립(JPEG Blob)을 Vercel Blob에 공개로 올리고 공개 URL을 반환.
// 파일명은 photobooth/ 프리픽스 + 무작위 접미사 → 이벤트 후 prefix로 일괄 삭제하기 쉬움.
export async function uploadStrip(blob: Blob): Promise<string> {
  const result = await upload("photobooth/strip.jpg", blob, {
    access: "public",
    handleUploadUrl: "/api/photobooth/upload",
    contentType: "image/jpeg",
  });
  return result.url;
}
