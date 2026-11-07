"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { DownloadIcon } from "@/components/admin/icons";
import { CharacterUploader, FrameUploader, SlotOverlay } from "@/components/admin/assets/Uploader";
import { fetchAssets, patchAsset } from "@/lib/admin/assetsClient";
import { formatDateTime } from "@/lib/admin/format";
import type { AssetsList } from "@/lib/event/adminApi";
import { BUILTIN_CHARACTERS, BUILTIN_FRAME, FRAME_SIZE, assetUrl, frameSrc, type Asset, type AssetKind } from "@/lib/event/assets";

// 그림 보관함 (#224, docs/admin-ui.md "그림 보관함").
// 디자이너가 프레임과 캐릭터를 올려 두면, 행사 포토부스 탭에서 골라 쓴다. 기본 그림은 늘 맨 앞에 있고 지울 수 없다.
// 쓰는 행사가 있는 그림은 숨기지 못한다(부스가 계속 쓰니까). 파일은 지우지 않고 숨기기만 한다.

export default function AssetsPage() {
  const toast = useToast();
  const [data, setData] = useState<AssetsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<AssetKind>("frame");
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const load = useCallback(() => {
    fetchAssets()
      .then((d) => {
        setError(null);
        setData(d);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const list = (data?.assets ?? []).filter((a) => a.kind === kind && (showHidden || !a.archived));
  const hiddenCount = (data?.assets ?? []).filter((a) => a.kind === kind && a.archived).length;
  const writable = data?.writable ?? false;

  const toggleHidden = async (a: Asset) => {
    try {
      const next = await patchAsset(a.id, { archived: !a.archived });
      setData((d) => (d ? { ...d, assets: d.assets.map((x) => (x.id === a.id ? next : x)) } : d));
      toast(next.archived ? "숨겼어요. 행사에서 더 고를 수 없어요." : "다시 보이게 했어요.");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <ScrollPage>
      <PageHeader
        title="그림 보관함"
        description="포토부스 프레임과 캐릭터를 올려 두고, 행사 포토부스 탭에서 골라 써요."
        actions={
          <Button onClick={() => setUploading(kind)} disabled={!data || !writable}>
            {kind === "frame" ? "프레임 올리기" : "캐릭터 올리기"}
          </Button>
        }
      />
      {data && !writable && (
        <div className="mb-5">
          <Callout variant="warning">이 환경에서는 볼 수만 있어요. 그림은 실제 부스가 쓰는 저장소에 올라가서 운영 어드민에서만 올려요.</Callout>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<AssetKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: "frame", label: "프레임" },
            { value: "character", label: "캐릭터" },
          ]}
        />
        {hiddenCount > 0 && (
          <label className="flex items-center gap-2 text-[13px] text-sd-fg-muted">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-[var(--accent)]" />
            숨긴 그림 {hiddenCount}개도 보기
          </label>
        )}
      </div>

      {kind === "frame" && <FrameGuide />}

      {error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : !data ? (
        <div aria-busy className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-sd-gray-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {kind === "frame" ? (
            <Card thumb={<img src={frameSrc(BUILTIN_FRAME)} alt="" className="h-56 w-auto" />} title={BUILTIN_FRAME.label} meta={`${BUILTIN_FRAME.slots.length}컷 · 코드에 든 기본 그림`} usage="고른 프레임이 없는 행사는 이 프레임" />
          ) : (
            (["cop", "thief"] as const).map((s) => (
              <Card key={s} thumb={<img src={BUILTIN_CHARACTERS[s].src} alt="" className="h-32 w-auto" />} title={BUILTIN_CHARACTERS[s].label} meta={`${s === "cop" ? "경찰" : "도둑"} 쪽 · 코드에 든 기본 그림`} usage="고른 캐릭터가 없는 행사는 이 그림" />
            ))
          )}
          {list.map((a) => {
            const users = data.usage[a.key] ?? [];
            return (
              <Card
                key={a.id}
                dim={a.archived}
                thumb={
                  a.kind === "frame" && a.meta.slots ? (
                    <SlotOverlay src={assetUrl(a.key)} width={a.meta.width} height={a.meta.height} slots={a.meta.slots} h={224} />
                  ) : (
                    <img src={assetUrl(a.key)} alt="" className="h-32 w-auto" />
                  )
                }
                title={a.label}
                meta={a.kind === "frame" ? `${a.meta.slots?.length ?? 0}컷 · ${a.createdBy} · ${formatDateTime(a.createdAt).slice(0, 10)}` : `${a.meta.side === "thief" ? "도둑" : "경찰"} 쪽 · ${a.createdBy}`}
                usage={users.length ? `${users.join(", ")}에서 써요` : "쓰는 행사가 없어요"}
                action={
                  writable ? (
                    <button
                      type="button"
                      onClick={() => toggleHidden(a)}
                      disabled={!a.archived && users.length > 0}
                      title={!a.archived && users.length > 0 ? "쓰는 행사에서 먼저 빼야 숨길 수 있어요" : undefined}
                      className="text-[12px] font-semibold text-sd-fg-subtle hover:text-sd-fg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {a.archived ? "다시 보이기" : "숨기기"}
                    </button>
                  ) : undefined
                }
              />
            );
          })}
          {writable && (
            <button
              type="button"
              onClick={() => setUploading(kind)}
              className="flex min-h-72 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-sd-line text-sd-fg-subtle transition-colors hover:bg-sd-fill"
            >
              <span className="text-[24px]">+</span>
              <span className="text-[13px] font-semibold">{kind === "frame" ? "프레임 올리기" : "캐릭터 올리기"}</span>
            </button>
          )}
        </div>
      )}

      {uploading === "frame" && (
        <FrameUploader
          disabled={!writable}
          onCancel={() => setUploading(null)}
          onDone={(a) => {
            setUploading(null);
            setData((d) => (d ? { ...d, assets: [a, ...d.assets] } : d));
            toast(`“${a.label}” 프레임을 올렸어요. 행사 포토부스 탭의 고르기 화면에서 고를 수 있어요.`);
          }}
        />
      )}
      {uploading === "character" && (
        <CharacterUploader
          disabled={!writable}
          onCancel={() => setUploading(null)}
          onDone={(a) => {
            setUploading(null);
            setData((d) => (d ? { ...d, assets: [a, ...d.assets] } : d));
            toast(`“${a.label}” 캐릭터를 올렸어요. 행사 포토부스 탭의 시작 화면에서 고를 수 있어요.`);
          }}
        />
      )}
    </ScrollPage>
  );
}

function Card({ thumb, title, meta, usage, action, dim = false }: { thumb: React.ReactNode; title: string; meta: string; usage: string; action?: React.ReactNode; dim?: boolean }) {
  return (
    <div className={`flex flex-col rounded-2xl border border-sd-line bg-sd-surface p-3 ${dim ? "opacity-60" : ""}`}>
      <div className="flex h-60 items-center justify-center rounded-xl bg-sd-fill">{thumb}</div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[14px] font-semibold text-sd-fg">{title}</p>
        {action}
      </div>
      <p className="mt-0.5 truncate text-[12px] text-sd-fg-subtle">{meta}</p>
      <p className="mt-1 text-[12px] text-sd-fg-muted">{usage}</p>
    </div>
  );
}

/** 디자이너용 규격 안내. 숫자는 지금 부스 인쇄 코드에서 계산한 값(docs/admin-ui.md) */
function FrameGuide() {
  return (
    <div className="mb-5">
      <SectionCard title="프레임 만드는 법" right={<span className="hidden text-[12px] text-sd-fg-subtle sm:inline">디자이너에게 이 칸을 보내 주세요</span>}>
        <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)]">
          <img src="/photobooth/templates/photobooth-frame-4cut-template.png" alt="4컷 빈 틀" className="hidden h-[360px] w-auto rounded-md ring-1 ring-sd-line md:block" />
          <div className="space-y-3 text-[13px] leading-relaxed text-sd-fg-muted">
            <ul className="space-y-1.5">
              <li>
                <b className="text-sd-fg">크기</b> {FRAME_SIZE.width} x {FRAME_SIZE.height}px PNG, 4MB 아래
              </li>
              <li>
                <b className="text-sd-fg">사진 칸</b> 완전히 투명하게 비워요. 1칸에서 6칸까지, 칸 크기는 모두 같게(카메라가 한 비율로 찍어요). 지금 틀은 4칸, 칸마다 1588 x 1117px
              </li>
              <li>
                <b className="text-sd-fg">장식</b> 칸 위로 살짝 걸쳐도 돼요. 사진은 프레임 아래에 깔려요
              </li>
              <li>
                <b className="text-sd-fg">인쇄</b> 1800px 이 인쇄물에서 약 47mm 라 1mm 가 약 38px 이에요. 글자는 100px, 선은 6px 이상이어야 읽혀요. 가장자리 몇 mm 는 잘릴 수 있어 글자와 로고는 조금 안쪽에
              </li>
              <li>
                <b className="text-sd-fg">같이 쓰기</b> 한 행사에서 여러 프레임을 고르려면 칸 수와 칸 크기가 같아야 해요
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <a href="/photobooth/templates/photobooth-frame-4cut-template.svg" download className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted hover:bg-sd-gray-300">
                <DownloadIcon className="h-4 w-4" />
                빈 틀 SVG (피그마, 일러스트레이터)
              </a>
              <a href="/photobooth/templates/photobooth-frame-4cut-template.png" download className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted hover:bg-sd-gray-300">
                <DownloadIcon className="h-4 w-4" />
                빈 틀 PNG
              </a>
            </div>
            <p className="text-[12px] text-sd-fg-subtle">올리면 투명한 칸을 저절로 찾아 파란 상자로 보여 주고, 샘플 사진을 넣은 모습까지 보여 줘요.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
