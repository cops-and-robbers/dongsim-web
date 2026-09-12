// 합성된 스트립(JPEG Blob)을 팀 R2에 올리고 공개 URL과 키를 반환 (#123).
// 서버(/api/photobooth/upload)는 presigned URL만 발급하고, 파일은 여기서
// R2로 직접 PUT 한다. 키는 다운로드 QR의 짧은 링크(/p?k=)에 쓴다.
export type UploadedStrip = { url: string; key: string };

export async function uploadStrip(blob: Blob): Promise<UploadedStrip> {
  const res = await fetch("/api/photobooth/upload", { method: "POST" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "업로드 준비에 실패했어요.");
  }
  const { uploadUrl, publicUrl, key } = (await res.json()) as {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "content-type": "image/jpeg" },
  });
  if (!put.ok) {
    throw new Error(`사진 업로드에 실패했어요. (${put.status})`);
  }
  return { url: publicUrl, key };
}
