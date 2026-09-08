"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ListPage, PageHeader, SectionCard, DescriptionList } from "@/components/admin/Parts";
import { Pill } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import { formatDateTime } from "@/lib/admin/format";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

/**
 * 블로그 동기화 (#109 3단계).
 *
 * 노션에 글을 쓰고 여기 버튼 하나로 사이트에 반영한다. 6시간마다 자동으로도
 * 돌지만(깜빡했을 때의 안전망), 쓰고 바로 확인하고 싶을 때는 이 버튼이다.
 *
 * 화면 문법은 배포 패널(액션과 마지막 실행 상태가 한 카드에 묶이고, 결과는
 * 상태 행 + 수치 + 상세 행으로 내려가는 구조)을 따른다. "발행했는데 안 떠요"의
 * 답 - 슬러그가 비었다, 이미지가 실패했다 - 이 이 화면의 존재 이유라,
 * 실패 사유를 사람이 읽는 문장 그대로 보여준다.
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

/** 마지막 실행 기록. 새로고침해도 "언제 뭘 했는지"가 남아야 화면이 상태를 가진다. */
type LastRun = { at: string; ok: boolean; result: SyncResult };

const LAST_RUN_KEY = "cnr_admin_blog_last_run";

/*
  저장된 기록은 useSyncExternalStore 로 읽는다. 서버에는 localStorage 가 없어
  "hydration 뒤 effect 에서 setState" 로 우회하기 쉬운데, 그 패턴은 연쇄 렌더라
  린트가 막는다. 이 훅은 서버 스냅숏(null)과 클라이언트 스냅숏을 정식으로
  구분해 주는 도구라 hydration 불일치도 없다. 스냅숏은 참조가 안정해야 해서
  한 번 읽어 캐시한다.
*/
let lastRunCache: LastRun | null | undefined;

function readLastRun(): LastRun | null {
  if (lastRunCache === undefined) {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
      lastRunCache = raw ? (JSON.parse(raw) as LastRun) : null;
    } catch {
      lastRunCache = null;
    }
  }
  return lastRunCache;
}

const emptySubscribe = () => () => {};

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

/** "방금 전 · 오후 3:12" 같은 시점 표기. 정확한 시각은 괄호가 아니라 뒤에 잇는다. */
function since(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  const rel =
    min < 1 ? "방금 전" : min < 60 ? `${min}분 전` : min < 1440 ? `${Math.floor(min / 60)}시간 전` : null;
  return rel ? `${rel} · ${formatDateTime(iso)}` : formatDateTime(iso);
}

/** 카드 안의 수치 스트립 - 배포 요약처럼 큰 숫자 + 작은 라벨 */
function Stat({ label: name, value, tone }: { label: string; value: number; tone?: "red" }) {
  return (
    <div className="min-w-[72px]">
      <p
        className={`text-[24px] font-bold leading-none tabular-nums ${
          tone === "red" && value > 0 ? "text-sd-critical" : "text-sd-fg"
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-sd-fg-subtle">{name}</p>
    </div>
  );
}

/** 상세 행 - 왼쪽 구분 라벨, 오른쪽 내용. 콜아웃 더미 대신 표처럼 읽힌다. */
function DetailRow({
  pill,
  children,
}: {
  pill: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-sd-hairline px-5 py-3 text-[13px] leading-relaxed text-sd-fg-muted">
      <span className="mt-0.5 shrink-0">{pill}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function AdminBlogPage() {
  const toast = useToast();
  const [running, setRunning] = useState<"sync" | "dry" | "run" | null>(null);
  // 이번 세션에서 새로 돌린 결과가 저장된 기록보다 우선한다
  const [fresh, setFresh] = useState<LastRun | null>(null);
  const stored = useSyncExternalStore(emptySubscribe, readLastRun, () => null);
  const last = fresh ?? stored;
  const [confirmGc, setConfirmGc] = useState(false);

  const run = async (gc?: "dry" | "run") => {
    setRunning(gc ?? "sync");
    try {
      const { status, body } = await callSync(gc);
      const entry: LastRun = { at: new Date().toISOString(), ok: status === 200, result: body };
      setFresh(entry);
      lastRunCache = entry;
      try {
        localStorage.setItem(LAST_RUN_KEY, JSON.stringify(entry));
      } catch {
        // 기록을 못 남겨도 화면 동작에는 지장이 없다
      }
      if (status === 200) {
        toast(gc === "run" ? "정리까지 끝났어요." : "동기화가 끝났어요.");
      } else {
        toast(body.error ?? "일부가 실패했어요. 결과를 확인해 주세요.");
      }
    } catch {
      toast("호출에 실패했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setRunning(null);
    }
  };

  const r = last?.result;
  const failed = r?.failed ?? [];
  const closed = [...(r?.removed ?? []), ...(r?.unpublished ?? [])];
  const gc = r?.gc;
  const orphanCount = gc && !gc.error ? gc.orphans.length : 0;

  return (
    <ListPage>
      <PageHeader
        title="블로그"
        description="노션에 쓴 글을 사이트에 반영해요."
      />

      <div className="flex flex-col gap-4">
        <SectionCard
          title="노션 동기화"
          right={
            <Button size="sm" onClick={() => run()} disabled={running !== null}>
              {running === "sync" ? "동기화 중..." : "지금 동기화"}
            </Button>
          }
          flush
        >
          {/* 상태 행: 마지막 실행이 언제였고 어떻게 끝났는지 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
            {running === "sync" ? (
              <>
                <Pill tone="blue">진행 중</Pill>
                <span className="text-[13px] text-sd-fg-subtle">
                  노션에서 바뀐 글을 찾고 있어요. 잠시면 돼요.
                </span>
              </>
            ) : last ? (
              <>
                <Pill tone={last.ok ? "green" : "red"}>{last.ok ? "성공" : "실패"}</Pill>
                <span className="text-[13px] text-sd-fg-subtle">{since(last.at)}</span>
              </>
            ) : (
              <>
                <Pill tone="slate">대기</Pill>
                <span className="text-[13px] text-sd-fg-subtle">
                  아직 이 화면에서 돌린 적이 없어요. 자동 동기화는 6시간마다 돌아요.
                </span>
              </>
            )}
          </div>

          {/* 수치 스트립: 실행 결과 요약 */}
          {r && !r.error && (
            <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-sd-hairline px-5 py-4">
              <Stat label="반영" value={r.synced?.length ?? 0} />
              <Stat label="변화 없음" value={r.skipped?.length ?? 0} />
              <Stat label="내림" value={closed.length} />
              <Stat label="실패" value={failed.length} tone="red" />
            </div>
          )}

          {/* 상세 행: 있는 것만, 표처럼 */}
          {r?.error && (
            <DetailRow pill={<Pill tone="red">오류</Pill>}>{r.error}</DetailRow>
          )}
          {(r?.synced?.length ?? 0) > 0 && (
            <DetailRow pill={<Pill tone="green">반영</Pill>}>
              {r!.synced!.map(label).join(", ")}
            </DetailRow>
          )}
          {closed.length > 0 && (
            <DetailRow pill={<Pill tone="slate">내림</Pill>}>
              {closed.map(label).join(", ")}
            </DetailRow>
          )}
          {failed.map((f) => (
            <DetailRow key={f.slug} pill={<Pill tone="red">실패</Pill>}>
              <span className="font-semibold text-sd-fg">{f.slug}</span> - {f.reason}
            </DetailRow>
          ))}
          {(r?.imageFailures ?? []).map((f) => (
            <DetailRow key={f.slug} pill={<Pill tone="red">이미지</Pill>}>
              <span className="font-semibold text-sd-fg">{f.slug}</span> - {f.count}장을 못
              옮겼어요. 그대로 두면 한 시간 뒤 그림이 깨지니 다시 동기화해 주세요.
            </DetailRow>
          ))}
          {(r?.unknownTags ?? []).map((t) => (
            <DetailRow key={t.slug} pill={<Pill tone="amber">블록</Pill>}>
              <span className="font-semibold text-sd-fg">{t.slug}</span> - 다루지 못한 노션
              블록: {t.tags.join(", ")}
            </DetailRow>
          ))}
          {(r?.stillPublic?.length ?? 0) > 0 && (
            <DetailRow pill={<Pill tone="red">미닫힘</Pill>}>
              내렸는데 아직 열려 있는 주소: {r!.stillPublic!.join(", ")}
            </DetailRow>
          )}
        </SectionCard>

        <SectionCard
          title="이미지 저장소"
          right={
            <Button
              variant="neutral"
              size="sm"
              onClick={() => run("dry")}
              disabled={running !== null}
            >
              {running === "dry" ? "검사 중..." : "검사"}
            </Button>
          }
          flush
        >
          <div className="px-5 py-4">
            <p className="text-[13px] leading-relaxed text-sd-fg-subtle">
              글을 고치면 안 쓰는 옛 그림이 저장소에 남아요. 검사는 세기만 해요 -
              지우는 건 아래에서 따로 확인을 거쳐요.
            </p>
          </div>

          {gc && !gc.error && (
            <div className="border-t border-sd-hairline px-5 py-4">
              <DescriptionList
                items={[
                  { term: "저장소 그림", desc: `${gc.scanned}장` },
                  { term: "글이 쓰는 중", desc: `${gc.referenced}장` },
                  {
                    term: "지울 수 있음",
                    desc:
                      orphanCount > 0 ? (
                        <span className="text-sd-critical">{orphanCount}장</span>
                      ) : (
                        <Pill tone="green">깨끗해요</Pill>
                      ),
                  },
                  { term: "7일 유예 중", desc: `${gc.tooFresh}장` },
                ]}
              />
              {gc.deleted > 0 && (
                <p className="mt-3 text-[13px] text-sd-fg-subtle">
                  이번에 {gc.deleted}장을 지웠어요.
                </p>
              )}
              {orphanCount > 0 && (
                <div className="mt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmGc(true)}
                    disabled={running !== null}
                  >
                    {running === "run" ? "정리 중..." : `${orphanCount}장 지우기`}
                  </Button>
                </div>
              )}
            </div>
          )}
          {gc?.error && (
            <DetailRow pill={<Pill tone="red">오류</Pill>}>{gc.error}</DetailRow>
          )}
        </SectionCard>
      </div>

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
