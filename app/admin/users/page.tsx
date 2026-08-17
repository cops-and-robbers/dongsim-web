"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminUsers } from "@/__generated__/AdminUsers.graphql";
import { AdminUsersQuery } from "@/lib/admin/gql/AdminUsers";
import {
  PageHeader,
  Card,
  Pagination,
  SearchInput,
  EmptyBlock,
  TableSkeleton,
  ListPage,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import { RoleBadge, SocialBadge } from "@/components/admin/StatusBadge";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Button } from "@/components/admin/Button";
import { Dropdown } from "@/components/admin/Dropdown";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { DeviceIcon } from "@/components/admin/icons";
import { DEVICE_LABEL, formatDate, labelOf } from "@/lib/admin/format";

type SocialType = "" | "KAKAO" | "GOOGLE" | "APPLE";
type Sort = "LATEST" | "OLDEST";
const PAGE_SIZE = 20;

// BE는 가입일 기준 정렬만 지원한다(sortDirection). 별도 정렬 키는 없다.
const SORT_VARS: Record<Sort, { sortDirection: "ASC" | "DESC" }> = {
  LATEST: { sortDirection: "DESC" },
  OLDEST: { sortDirection: "ASC" },
};

export default function UsersPage() {
  const [nicknameInput, setNicknameInput] = useState("");
  const [nickname, setNickname] = useState("");
  const [social, setSocial] = useState<SocialType>("");
  const [sort, setSort] = useState<Sort>("LATEST");
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => {
        setNickname(nicknameInput.trim());
        setPage(0);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [nicknameInput]);

  const update = (fn: () => void) => startTransition(fn);

  return (
    <ListPage>
      <PageHeader
        title="유저"
        description="가입한 유저를 검색하고 상세 이력을 확인해요."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={nicknameInput}
          onChange={setNicknameInput}
          placeholder="닉네임 검색"
        />
        <Dropdown<SocialType>
          value={social}
          onChange={(v) =>
            update(() => {
              setSocial(v);
              setPage(0);
            })
          }
          options={[
            { label: "소셜 전체", value: "" },
            { label: "카카오", value: "KAKAO" },
            { label: "구글", value: "GOOGLE" },
            { label: "애플", value: "APPLE" },
          ]}
        />
        <SegmentedControl<Sort>
          value={sort}
          onChange={(v) =>
            update(() => {
              setSort(v);
              setPage(0);
            })
          }
          options={[
            { label: "최신순", value: "LATEST" },
            { label: "오래된순", value: "OLDEST" },
          ]}
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <QueryBoundary
          pending={<TableSkeleton />}
          onRetry={() => setFetchKey((k) => k + 1)}
        >
          <UsersResults
            variables={{
              page,
              size: PAGE_SIZE,
              nickname: nickname || undefined,
              socialType: social || undefined,
              ...SORT_VARS[sort],
            }}
            fetchKey={fetchKey}
            dim={isPending}
            onPage={(p) => update(() => setPage(p))}
            emptyAction={
              nickname !== "" || social !== "" ? (
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() =>
                    update(() => {
                      setNicknameInput("");
                      setNickname("");
                      setSocial("");
                      setSort("LATEST");
                      setPage(0);
                    })
                  }
                >
                  검색 초기화
                </Button>
              ) : undefined
            }
          />
        </QueryBoundary>
      </Card>
    </ListPage>
  );
}

function UsersResults({
  variables,
  fetchKey,
  dim,
  onPage,
  emptyAction,
}: {
  variables: AdminUsers["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  emptyAction?: ReactNode;
}) {
  const data = useLazyLoadQuery<AdminUsers>(AdminUsersQuery, variables, {
    fetchKey,
    fetchPolicy: "store-or-network",
  });
  const pageData = data.adminUsers;

  if (pageData.content.length === 0) {
    const filtered = variables.nickname != null || variables.socialType != null;
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 유저가 없어요" : "아직 유저가 없어요"}
          description={
            filtered
              ? "검색어나 필터를 바꿔보세요."
              : "가입한 유저가 여기에 표시돼요."
          }
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="min-h-0 flex-1 overflow-auto">
      <Table
        sticky
        head={
          <>
            <Th>유저</Th>
            <Th>소셜</Th>
            <Th>권한</Th>
            <Th>위치 동의</Th>
            <Th>기기</Th>
            <Th className="text-right">가입일</Th>
          </>
        }
      >
          {pageData.content.map((u, i) => (
            <Tr key={u.id} index={i} href={`/admin/users/${u.id}`}>
              <Td>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="font-semibold text-sd-fg transition hover:text-accent"
                >
                  {u.nickname}
                </Link>
              </Td>
              <Td>
                <SocialBadge social={u.socialType} />
              </Td>
              <Td>
                <RoleBadge role={u.role} />
              </Td>
              <Td>
                {u.locationTermsAgreed ? (
                  <span className="font-semibold text-sd-fg-subtle">
                    동의
                  </span>
                ) : (
                  <span className="font-bold text-sd-critical">미동의</span>
                )}
              </Td>
              <Td className="text-sd-fg-subtle">
                {u.device ? (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <DeviceIcon
                      type={u.device.deviceType}
                      className="h-3.5 w-3.5 text-sd-fg-subtle"
                    />
                    {labelOf(DEVICE_LABEL, u.device.deviceType)}
                  </span>
                ) : (
                  <span className="text-sd-disabled">
                    미등록
                  </span>
                )}
              </Td>
              <Td className="text-right text-sd-fg-subtle">
                {formatDate(u.createdAt)}
              </Td>
            </Tr>
          ))}
      </Table>
      </div>

      <Pagination
        page={pageData.page}
        totalPages={pageData.totalPages}
        totalElements={pageData.totalElements}
        size={pageData.size}
        onPage={onPage}
      />
    </div>
  );
}
