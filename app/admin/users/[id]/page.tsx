"use client";

import { useParams } from "next/navigation";
import { useLazyLoadQuery } from "react-relay";
import type { AdminUser } from "@/__generated__/AdminUser.graphql";
import { AdminUserQuery } from "@/lib/admin/gql/AdminUser";
import type { ReactNode } from "react";
import {
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
import { DEVICE_LABEL, formatDate, formatDateTime, labelOf } from "@/lib/admin/format";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScrollPage>
      <QueryBoundary pending={<DetailSkeleton />}>
        <UserDetail id={id} />
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

function UserDetail({ id }: { id: string }) {
  const data = useLazyLoadQuery<AdminUser>(AdminUserQuery, { id });
  const user = data.adminUser;

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
        <SectionCard
          title="참여 게임 이력"
          flush
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle">
              {user.participations.length}개
            </span>
          }
        >
          {user.participations.length === 0 ? (
            <p className="py-8 text-center text-sm text-sd-fg-subtle">
              참여한 게임이 없어요.
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
        </SectionCard>
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
