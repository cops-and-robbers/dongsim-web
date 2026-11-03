"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Toast";
import { BANNER_IMAGE_TYPES, MAX_EVIDENCE_BYTES, checkEvidenceImage, checkEvidenceSharpness } from "@/lib/admin/appConfig";
import { uploadEvidenceImage } from "@/lib/admin/appConfigClient";

// 이벤트 증거 사진 한 장. 배너처럼 주소를 치지 않고 파일을 올린다.
// 범위를 벗어난 사진은 저장소에 쌓이지 않게 올리기 전에 막는다.

const readSize = (file: File) =>
  createImageBitmap(file).then((bitmap) => {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  });

export function EvidenceImagePicker({
  label,
  value,
  onChange,
  onRatio,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** 사진을 불러오면 비율을 알려 준다. 사진끼리 같은지 패널이 본다 */
  onRatio: (url: string, ratio: number) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const onFile = async (file: File) => {
    setUploadError(undefined);
    setSizeWarning(null);
    if (!(BANNER_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setUploadError("PNG, JPG, WEBP 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setUploadError("사진은 1MB까지 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      // 펼칠 수 없는 파일은 앱에서도 깨진다. 앞부분 형식만 맞은 파일이 올라가지 않게 막는다
      const size = await readSize(file).catch(() => null);
      const imageError = size ? checkEvidenceImage(size.width, size.height) : "사진을 읽지 못했어요. 다른 파일로 올려 주세요.";
      if (imageError || !size) {
        setUploadError(imageError ?? undefined);
        return;
      }
      const image = await uploadEvidenceImage(file);
      onChange(image.url);
      setSizeWarning(checkEvidenceSharpness(size.width, size.height));
      toast("사진을 올렸어요. 적용하기 전까지 앱에는 보이지 않아요.");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "올리지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sd-fill">
        {value && failedUrl !== value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`지금 고른 ${label}`}
            onError={() => setFailedUrl(value)}
            onLoad={(e) => onRatio(value, e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="px-2 text-center text-[12px] text-sd-fg-subtle">{value ? "사진을 불러오지 못했어요" : "사진이 아직 없어요"}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">{label}</p>
        <Button variant="neutral" size="sm" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "올리는 중..." : value ? "다른 사진 올리기" : "사진 올리기"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={BANNER_IMAGE_TYPES.join(",")}
          aria-label={`${label} 파일`}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
        {(uploadError || error) && (
          <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
            {uploadError ?? error}
          </p>
        )}
        {sizeWarning && <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-sd-warning">{sizeWarning}</p>}
      </div>
    </div>
  );
}
