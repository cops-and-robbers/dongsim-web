"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Toast";
import {
  BANNER_IMAGE_TYPES,
  BANNER_SAFE,
  BANNER_SIZE,
  MAX_BANNER_BYTES,
  checkBannerSize,
} from "@/lib/admin/appConfig";
import { uploadBannerImage } from "@/lib/admin/appConfigClient";

// 배너 이미지. 주소를 치지 않고 파일을 올린다. 주소를 잘못 넣으면 앱은 배너를 말없이 숨긴다.
// 올려도 "앱에 적용"을 누르기 전에는 앱에 나가지 않는다.
// 디자인할 때 볼 크기를 함께 둔다. 숫자의 근거는 lib/admin/appConfig.ts BANNER_SIZE
const SAFE_INSET_X = `${(((BANNER_SIZE.width - BANNER_SAFE.width) / 2 / BANNER_SIZE.width) * 100).toFixed(2)}%`;
const SAFE_INSET_Y = `${(((BANNER_SIZE.height - BANNER_SAFE.height) / 2 / BANNER_SIZE.height) * 100).toFixed(2)}%`;

const readSize = (file: File) =>
  createImageBitmap(file).then((bitmap) => {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  });

export function BannerImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
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
    if (file.size > MAX_BANNER_BYTES) {
      setUploadError("2MB까지 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      // 크기가 달라도 올릴 수는 있다. 잘리는 정도는 사람이 오른쪽 폰에서 보고 정한다
      const size = await readSize(file).catch(() => null);
      const image = await uploadBannerImage(file);
      onChange(image.url);
      setSizeWarning(size ? checkBannerSize(size.width, size.height) : null);
      toast("이미지를 올렸어요. 적용하기 전까지 앱에는 보이지 않아요.");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "올리지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* 권장 크기와 같은 비율로 그리고, 어느 기기에서도 잘리지 않는 영역을 점선으로 겹친다 */}
      <div className="relative w-full max-w-[361px] overflow-hidden rounded-xl bg-sd-fill" style={{ aspectRatio: `${BANNER_SIZE.width} / ${BANNER_SIZE.height}` }}>
        {value && failedUrl !== value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="지금 고른 배너 이미지" onError={() => setFailedUrl(value)} className="h-full w-full object-cover" />
        ) : (
          <p className="flex h-full items-center justify-center text-[13px] text-sd-fg-subtle">
            {value ? "이미지를 불러오지 못했어요" : "아직 이미지가 없어요"}
          </p>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute rounded border border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{ left: SAFE_INSET_X, right: SAFE_INSET_X, top: SAFE_INSET_Y, bottom: SAFE_INSET_Y }}
        />
      </div>

      <div className="mt-3">
        <Button variant="neutral" size="sm" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "올리는 중..." : value ? "다른 이미지 올리기" : "이미지 올리기"}
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={BANNER_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />

      {uploadError && (
        <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
          {uploadError}
        </p>
      )}
      {sizeWarning && <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-sd-warning">{sizeWarning}</p>}

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-sd-fill px-4 py-3 text-[13px]">
        <dt className="font-semibold text-sd-fg-subtle">권장 크기</dt>
        <dd className="font-semibold tabular-nums text-sd-fg">
          {BANNER_SIZE.width} × {BANNER_SIZE.height}px
        </dd>
        <dt className="font-semibold text-sd-fg-subtle">글자와 얼굴</dt>
        <dd className="tabular-nums text-sd-fg-muted">
          가운데 {BANNER_SAFE.width} × {BANNER_SAFE.height}px 안에 넣어 주세요
        </dd>
        <dt className="font-semibold text-sd-fg-subtle">파일</dt>
        <dd className="text-sd-fg-muted">PNG, JPG, WEBP, 2MB까지</dd>
      </dl>
      <p className="mt-1.5 text-[13px] leading-relaxed text-sd-fg-subtle">
        기기마다 화면 비율이 달라 바깥쪽은 잘릴 수 있어요. 점선 안은 어느 기기에서도 잘리지 않아요.
      </p>
    </div>
  );
}
