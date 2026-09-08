"use client";

import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, ListPage, PageHeader } from "@/components/admin/Parts";
import { useToast } from "@/components/admin/Toast";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

/**
 * 블로그 동기화 (#109 3단계).
 *
 * 노션에 글을 쓰고 여기 버튼 하나로 사이트에 반영한다. 6시간마다 자동으로도
 * 돌지만(깜빡했을 때의 안전망), 쓰고 바로 확인하고 싶을 때는 이 버튼이다.
 *
 * 결과를 그대로 보여주는 것이 이 화면의 존재 이유다 - "발행했는데 안 떠요"의
 * 답(슬러그가 비었다, 이미지가 실패했다)이 지금까지는 API 응답 안에만 있었다.
 */

type SyncResult = {
  synced?: { slug: string; locale: string }[];
  skipped?: { slug: string; reason: string }[];
  removed?: { slug: string; locale: string }[];
  unpublished?: { slug: string; locale: string }[];
  failed?: { slug: string; reason: string }[];
  imageFailures?: { slug: string; count: number }[];
  unknownTags?: { slug: string; tags: string[] }[];
  stillPublic?: string[];
  gc?: {
    scanned: number;
    referenced: number;
    orphans: string[];
    tooFresh: number;
    deleted: number;
    error?: string;
  };
  error?: string;
};

async function callSync(gc?: "dry" | "run"): Promise<{ status: number; body: SyncResult }> {
  const url = `/api/admin/blog-sync${gc ? `?gc=${gc}` : ""}`;
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    });

  let res = await send();
  // accessToken 만료(401)면 한 번 재발급 후 재시도 - Relay 네트워크 계층과 같은 규칙
  if (res.status === 401 && (await reissue())) {
    res = await send();
  }
  return { status: res.status, body: (await res.json()) as SyncResult };
}

const label = ({ slug, locale }: { slug: string; locale: string }) =>
  locale === "ko" ? slug : `${locale}/${slug}`;

export default function AdminBlogPage() {
  const toast = useToast();
  const [running, setRunning] = useState<"sync" | "dry" | "run" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [confirmGc, setConfirmGc] = useState(false);

  const run = async (gc?: "dry" | "run") => {
    setRunning(gc ?? "sync");
    try {
      const { status, body } = await callSync(gc);
      setResult(body);
      if (status === 200) {
        toast(gc === "run" ? "정리까지 끝났어요." : "동기화가 끝났어요.");
      } else {
        toast(body.error ?? "일부가 실패했어요. 아래 결과를 확인해 주세요.");
      }
    } catch {
      toast("호출에 실패했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setRunning(null);
    }
  };

  const failed = result?.failed ?? [];
  const closed = [...(result?.removed ?? []), ...(result?.unpublished ?? [])];

  return (
    <ListPage>
      <PageHeader
        title="블로그"
        description="노션에 쓴 글을 사이트에 반영해요. 6시간마다 자동으로도 돌아요."
        actions={
          <Button onClick={() => run()} disabled={running !== null}>
            {running === "sync" ? "동기화 중..." : "지금 동기화"}
          </Button>
        }
      />

      {result && (
        <div className="mb-6 flex flex-col gap-3">
          {result.error && <Callout variant="danger" title="실패">{result.error}</Callout>}

          <Callout
            variant={failed.length > 0 ? "danger" : "success"}
            title={
              failed.length > 0
                ? `${failed.length}편이 반영되지 못했어요`
                : `반영 ${result.synced?.length ?? 0}편 · 변화 없음 ${result.skipped?.length ?? 0}편`
            }
          >
            {(result.synced?.length ?? 0) > 0 && (
              <p>반영: {result.synced!.map(label).join(", ")}</p>
            )}
            {closed.length > 0 && <p>내림: {closed.map(label).join(", ")}</p>}
            {failed.map((f) => (
              <p key={f.slug}>
                {f.slug}: {f.reason}
              </p>
            ))}
          </Callout>

          {(result.imageFailures?.length ?? 0) > 0 && (
            <Callout variant="danger" title="이미지 옮기기 실패">
              {result.imageFailures!.map((f) => (
                <p key={f.slug}>
                  {f.slug}: {f.count}장 - 그대로 두면 한 시간 뒤 그림이 깨져요. 다시
                  동기화해 주세요.
                </p>
              ))}
            </Callout>
          )}

          {(result.unknownTags?.length ?? 0) > 0 && (
            <Callout variant="neutral" title="다루지 못한 노션 블록">
              {result.unknownTags!.map((t) => (
                <p key={t.slug}>
                  {t.slug}: {t.tags.join(", ")}
                </p>
              ))}
            </Callout>
          )}

          {(result.stillPublic?.length ?? 0) > 0 && (
            <Callout variant="danger" title="내렸는데 아직 열려 있는 주소">
              {result.stillPublic!.join(", ")}
            </Callout>
          )}

          {result.gc && (
            <Callout
              variant={result.gc.error ? "danger" : "neutral"}
              title="이미지 정리"
            >
              {result.gc.error ? (
                <p>{result.gc.error}</p>
              ) : (
                <p>
                  저장소 {result.gc.scanned}장 중 참조 없는 그림 {result.gc.orphans.length}
                  장{result.gc.tooFresh > 0 && ` (올린 지 7일 안 된 ${result.gc.tooFresh}장은 제외)`}
                  {result.gc.deleted > 0 && ` - ${result.gc.deleted}장 지웠어요`}
                </p>
              )}
            </Callout>
          )}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-2 p-1">
          <p className="text-[14px] font-semibold text-sd-fg">이미지 저장소 정리</p>
          <p className="text-[13px] text-sd-fg-subtle">
            글을 고치면 안 쓰는 옛 그림이 저장소에 남아요. 검사는 세기만 하고,
            정리는 참조가 없고 올린 지 7일이 지난 그림만 지워요.
          </p>
          <div className="mt-1 flex gap-2">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => run("dry")}
              disabled={running !== null}
            >
              {running === "dry" ? "검사 중..." : "검사만"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmGc(true)}
              disabled={running !== null}
            >
              {running === "run" ? "정리 중..." : "정리 실행"}
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmGc}
        title="안 쓰는 그림을 지울까요?"
        message="어떤 글도 참조하지 않고 올린 지 7일이 지난 그림을 저장소에서 지워요. 지운 그림은 되돌릴 수 없어요."
        confirmText="지우기"
        danger
        pending={running === "run"}
        onConfirm={async () => {
          setConfirmGc(false);
          await run("run");
        }}
        onClose={() => setConfirmGc(false)}
      />
    </ListPage>
  );
}
