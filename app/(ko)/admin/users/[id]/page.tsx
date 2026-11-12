"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchQuery, useLazyLoadQuery, useRelayEnvironment } from "react-relay";
import type { AdminUser } from "@/__generated__/AdminUser.graphql";
import type { AdminUserRadio } from "@/__generated__/AdminUserRadio.graphql";
import { AdminUserQuery } from "@/lib/admin/gql/AdminUser";
import { AdminUserRadioQuery } from "@/lib/admin/gql/AdminUserRadio";
import type { ReactNode } from "react";
import {
  CardNote,
  PageHeader,
  SectionCard,
  EmptyBlock,
  ScrollPage,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import { InviteCode } from "@/components/admin/InviteCode";
import {
  RoleBadge,
  SocialBadge,
  TeamBadge,
  ParticipantStatusBadge,
} from "@/components/admin/StatusBadge";
import { CheckIcon, DeviceIcon } from "@/components/admin/icons";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { useRecordRecent } from "@/components/admin/RecentViewed";
import { StaffToggle } from "@/components/admin/metrics/StaffToggle";
import { FinishedGamesCard } from "@/components/admin/users/FinishedGamesCard";
import { DEVICE_LABEL, formatDate, formatDateTime, labelOf } from "@/lib/admin/format";
import { formatRadio } from "@/lib/admin/gameExtras";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Relay 가 실패를 기억해서, 열쇠를 바꿔야 다시 시도 버튼이 실제로 다시 읽는다
  const [retry, setRetry] = useState(0);
  return (
    <ScrollPage>
      <QueryBoundary pending={<DetailSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <UserDetail id={id} fetchKey={retry} />
      </QueryBoundary>
    </ScrollPage>
  );
}

// 라벨(위, 작고 흐림) + 값(아래, 굵게) 필드. 값이 왼쪽 정렬로 붙어 가독성이 좋다.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-sd-fg-subtle">{label}</p>
      <div className="text-[14px] font-semibold text-sd-fg">{children}</div>
    </div>
  );
}

// 지금까지 쓴 경찰 무전 시간(BE #239). 운영에 아직 없을 수 있어 유저 상세와 따로 읽고, 판이 끝날 때만 늘어서 1분마다 다시 읽는다
function RadioField({ userId }: { userId: string }) {
  const live = useLiveRefresh(60_000);
  const { data, status } = useOptionalQuery<AdminUserRadio>(AdminUserRadioQuery, { id: userId }, "radioSeconds", live);
  const seconds = data?.adminUser?.radioSeconds;
  return (
    <Field label="무전 사용">
      {seconds != null ? (
        <span className={`tabular-nums ${seconds > 0 ? "" : "font-medium text-sd-fg-subtle"}`}>{formatRadio(seconds)}</span>
      ) : status === "loading" ? (
        <span aria-busy className="inline-block h-4 w-14 animate-pulse rounded bg-sd-gray-200 align-middle" />
      ) : status === "not-deployed" ? (
        <span className="text-[13px] font-medium text-sd-fg-subtle">서버 업데이트 뒤에 보여요</span>
      ) : (
        <span className="text-sd-fg-subtle">-</span>
      )}
    </Field>
  );
}

function AgreeRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-sd-hairline py-3.5 last:border-0 last:pb-0 first:pt-0">
      <span className="text-[14px] font-medium text-sd-fg">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-sd-positive-weak px-2 py-0.5 text-[12px] font-bold text-sd-positive">
          <CheckIcon className="h-3.5 w-3.5" />
          동의
        </span>
      ) : (
        <span className="rounded-md bg-sd-critical-weak px-2 py-0.5 text-[12px] font-bold text-sd-critical">
          미동의
        </span>
      )}
    </div>
  );
}

function UserDetail({ id, fetchKey }: { id: string; fetchKey: number }) {
  const environment = useRelayEnvironment();
  const data = useLazyLoadQuery<AdminUser>(AdminUserQuery, { id }, { fetchKey, fetchPolicy: "store-and-network" });
  // "지금" 들어가 있는 방을 보여 주는 화면이라 주기적으로 새로 받아 스토어를 바꾼다(lib/admin/useLiveRefresh.ts).
  // fetchKey 로 다시 읽으면 Relay 가 실패를 기억해 두었다가 다음 그릴 때 던져서, 잠깐의 실패로 화면 전체가 오류로 바뀐다.
  // 여기서는 실패해도 보던 화면을 그대로 두고 다음 차례에 다시 읽는다
  const live = useLiveRefresh();
  useEffect(() => {
    if (live === 0) return;
    fetchQuery<AdminUser>(environment, AdminUserQuery, { id }, { fetchPolicy: "network-only" })
      .toPromise()
      .catch(() => {});
  }, [environment, id, live]);
  const user = data.adminUser;
  useRecordRecent("user", id, user ? { title: user.nickname, detail: `유저 ID ${user.id}` } : null);

  if (!user) {
    return (
      <>
        <PageHeader back={{ href: "/admin/users", label: "유저 목록" }} title="유저" />
        <EmptyBlock
          title="유저를 찾을 수 없어요"
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </>
    );
  }

  const agreedCount = [
    user.termsOfServiceAgreed,
    user.privacyPolicyAgreed,
    user.locationTermsAgreed,
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/users", label: "유저 목록" }}
        title={user.nickname}
        description={`유저 ID ${user.id}`}
        actions={<RoleBadge role={user.role} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="기본 정보">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="소셜">
              <SocialBadge social={user.socialType} />
            </Field>
            <Field label="가입일">{formatDateTime(user.createdAt)}</Field>
            <Field label="기기">
              {user.device ? (
                <span className="inline-flex items-center gap-1.5">
                  <DeviceIcon
                    type={user.device.deviceType}
                    className="h-4 w-4 text-sd-fg-subtle"
                  />
                  {labelOf(DEVICE_LABEL, user.device.deviceType)}
                </span>
              ) : (
                <span className="text-sd-fg-subtle">미등록</span>
              )}
            </Field>
            <Field label="기기 등록일">
              {user.device ? (
                formatDate(user.device.createdAt)
              ) : (
                <span className="text-sd-fg-subtle">-</span>
              )}
            </Field>
            <RadioField userId={user.id} />
          </div>
        </SectionCard>

        <SectionCard
          title="약관 동의"
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle tabular-nums">
              {agreedCount}/3 동의
            </span>
          }
        >
          <div>
            <AgreeRow label="서비스 이용약관" ok={user.termsOfServiceAgreed} />
            <AgreeRow label="개인정보 처리방침" ok={user.privacyPolicyAgreed} />
            <AgreeRow label="위치기반 서비스" ok={user.locationTermsAgreed} />
            <AgreeRow label="마케팅 정보 수신 (선택)" ok={user.allowMarketingPush} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-5">
        <StaffToggle userId={user.id} isAdmin={user.role === "ADMIN"} />
      </div>

      <div className="mt-5">
        <SectionCard
          title="지금 들어가 있는 방"
          flush
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle">
              {user.participations.length}개
            </span>
          }
        >
          {user.participations.length === 0 ? (
            <p className="py-8 text-center text-sm text-sd-fg-subtle">
              지금 들어가 있는 방이 없어요.
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>초대코드</Th>
                  <Th>팀</Th>
                  <Th>상태</Th>
                  <Th>방장</Th>
                  <Th>참여일</Th>
                </>
              }
            >
              {user.participations.map((p, i) => (
                <Tr key={`${p.gameId}-${i}`} index={i}>
                  <Td>
                    <InviteCode code={p.inviteCode} gameId={p.gameId} />
                  </Td>
                  <Td>
                    <TeamBadge team={p.team} />
                  </Td>
                  <Td>
                    <ParticipantStatusBadge status={p.status} />
                  </Td>
                  <Td>
                    {p.isHost ? (
                      <span className="font-semibold text-accent">
                        방장
                      </span>
                    ) : (
                      <span className="text-sd-fg-subtle">-</span>
                    )}
                  </Td>
                  <Td className="text-sd-fg-subtle">
                    {formatDate(p.createdAt)}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
          {user.participations.length > 0 && (
            <CardNote>판이 끝나도 방을 나가기 전까지 여기에 남아요.</CardNote>
          )}
        </SectionCard>
      </div>

      <div className="mt-5">
        <FinishedGamesCard key={user.id} userId={user.id} />
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-sd-gray-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-sd-gray-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-sd-gray-200" />
      </div>
    </>
  );
}
