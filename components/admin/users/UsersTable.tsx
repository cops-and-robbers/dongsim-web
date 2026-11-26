"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminUsers } from "@/__generated__/AdminUsers.graphql";
import { AdminUsersQuery } from "@/lib/admin/gql/AdminUsers";
import { Card, EmptyBlock, ListPage, PageHeader, Pagination, SearchInput, TableSkeleton } from "@/components/admin/Parts";
import { LAST_ROW_TITLE, Table, Td, Th, Tr } from "@/components/admin/Table";
import { RoleBadge, SocialBadge } from "@/components/admin/StatusBadge";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Button } from "@/components/admin/Button";
import { Dropdown } from "@/components/admin/Dropdown";
import { RecentMenu } from "@/components/admin/RecentViewed";
import { ListViewSwitch } from "@/components/admin/ListViewSwitch";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { DeviceIcon } from "@/components/admin/icons";
import { LiveDot, PersonAvatar, Tag } from "@/components/admin/split/SplitParts";
import { DEVICE_LABEL, TEAM_LABEL, formatDate, labelOf } from "@/lib/admin/format";
import { useClampPage, useListParams, useListScroll } from "@/lib/admin/useListParams";
import type { LiveRoom, LiveRoomPerson } from "@/lib/admin/useLiveRooms";

const PAGE_SIZE = 20;

// 두 칸 보기와 같은 주소 이름(q, sort)을 써서 보기를 바꿔도 검색어와 정렬이 그대로 남는다. social 은 표에만 있다
const PARAMS = {
  q: "text",
  social: ["", "KAKAO", "GOOGLE", "APPLE"],
  sort: ["desc", "asc"],
} as const;

type InRoom = ReadonlyMap<string, { room: LiveRoom; person: LiveRoomPerson }>;

/**
 * 유저 표 보기 (docs/admin-ui.md "목록 보기 고르기"). 여러 사람의 값을 나란히 견줄 때 쓴다.
 * 예전 유저 목록(#315 전)을 되살리되 지금 방, 운영진 표시, 사람 그림을 더했다. 줄을 누르면 전체 화면 상세로 가고,
 * 돌아오면 검색어, 거르기, 쪽, 스크롤 위치가 그대로다(lib/admin/useListParams.ts)
 */
export function UsersTable({ staff, inRoom }: { staff: ReadonlySet<string> | null; inRoom: InRoom }) {
  const { current, shown, dim, set } = useListParams(PARAMS);
  const [fetchKey, setFetchKey] = useState(0);

  // 치는 글자는 바로 보여 주고 주소에는 잠깐 멈췄을 때 쓴다. 메뉴를 눌러 주소가 비면 검색창도 비운다
  const [input, setInput] = useState(current.q);
  const [written, setWritten] = useState(current.q);
  const [lastUrl, setLastUrl] = useState(current.q);
  if (current.q !== lastUrl) {
    setLastUrl(current.q);
    if (current.q !== written) {
      setInput(current.q);
      setWritten(current.q);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === written) return;
      setWritten(trimmed);
      set({ q: trimmed });
    }, 300);
    return () => clearTimeout(t);
  }, [input, written, set]);

  const filtered = shown.q !== "" || shown.social !== "";
  const reset = () => {
    setInput("");
    setWritten("");
    set({ q: "", social: "", sort: "desc", page: 0 });
  };

  return (
    <ListPage>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <PageHeader
          title="유저"
          description="줄을 누르면 전체 화면으로 열려요. 돌아오면 보던 자리 그대로예요."
          actions={
            <>
              <RecentMenu group="user" />
              <ListViewSwitch />
            </>
          }
        />

        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <SearchInput value={input} onChange={setInput} placeholder="닉네임으로 찾기" />
          <Dropdown<(typeof PARAMS.social)[number]>
            value={current.social}
            onChange={(v) => set({ social: v })}
            options={[
              { label: "로그인 전체", value: "" },
              { label: "카카오", value: "KAKAO" },
              { label: "구글", value: "GOOGLE" },
              { label: "애플", value: "APPLE" },
            ]}
          />
          <SegmentedControl<(typeof PARAMS.sort)[number]>
            value={current.sort}
            onChange={(v) => set({ sort: v })}
            options={[
              { label: "최근 가입순", value: "desc" },
              { label: "오래된 가입순", value: "asc" },
            ]}
          />
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <QueryBoundary pending={<TableSkeleton />} onRetry={() => setFetchKey((k) => k + 1)}>
            <UsersResults
              variables={{
                page: shown.page,
                size: PAGE_SIZE,
                nickname: shown.q || undefined,
                socialType: shown.social || undefined,
                sortDirection: shown.sort === "asc" ? "ASC" : "DESC",
              }}
              fetchKey={fetchKey}
              dim={dim}
              onPage={(page) => set({ page })}
              staff={staff}
              inRoom={inRoom}
              empty={
                filtered ? (
                  <Button variant="neutral" size="sm" onClick={reset}>
                    검색 초기화
                  </Button>
                ) : undefined
              }
              filtered={filtered}
            />
          </QueryBoundary>
        </Card>
      </div>
    </ListPage>
  );
}

function UsersResults({
  variables,
  fetchKey,
  dim,
  onPage,
  staff,
  inRoom,
  empty,
  filtered,
}: {
  variables: AdminUsers["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  staff: ReadonlySet<string> | null;
  inRoom: InRoom;
  empty?: ReactNode;
  filtered: boolean;
}) {
  const data = useLazyLoadQuery<AdminUsers>(AdminUsersQuery, variables, { fetchKey, fetchPolicy: "store-or-network" });
  const pageData = data.adminUsers;
  const scrollRef = useListScroll();
  const over = useClampPage(pageData, onPage);
  if (over) return null;

  if (pageData.content.length === 0)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 유저가 없어요" : "아직 유저가 없어요"}
          description={filtered ? "검색어나 로그인 종류를 바꿔 보세요." : "가입한 유저가 여기에 보여요."}
          action={empty}
        />
      </div>
    );

  return (
    <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <Table
          sticky
          head={
            <>
              <Th>유저</Th>
              <Th>지금</Th>
              <Th>로그인</Th>
              <Th>권한</Th>
              <Th>위치 동의</Th>
              <Th>기기</Th>
              <Th className="text-right">가입일</Th>
            </>
          }
        >
          {pageData.content.map((u, i) => {
            const here = inRoom.get(u.id);
            const href = `/admin/users/${u.id}`;
            return (
              <Tr key={u.id} index={i} href={href}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <PersonAvatar id={u.id} size={28} />
                    <Link href={href} className={`font-semibold text-sd-fg transition hover:text-accent ${LAST_ROW_TITLE}`}>
                      {u.nickname}
                    </Link>
                  </span>
                </Td>
                <Td>
                  {/* 지금 방에 있는 사람만. 게임 중이면 초록(두 칸 보기와 같은 규칙) */}
                  {here ? (
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${here.room.live ? "text-sd-positive" : "text-sd-fg-subtle"}`}>
                      <LiveDot live={here.room.live} />
                      {here.room.inviteCode} {here.room.live ? "게임 중" : "대기 중"}
                      {here.person.team && <span className="font-medium text-sd-fg-subtle">· {labelOf(TEAM_LABEL, here.person.team)}</span>}
                    </span>
                  ) : (
                    <span className="text-sd-disabled">-</span>
                  )}
                </Td>
                <Td>
                  <SocialBadge social={u.socialType} />
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <RoleBadge role={u.role} />
                    {staff?.has(u.id) && <Tag>운영진</Tag>}
                  </span>
                </Td>
                <Td>{u.locationTermsAgreed ? <span className="font-semibold text-sd-fg-subtle">동의</span> : <span className="font-bold text-sd-critical">미동의</span>}</Td>
                <Td className="text-sd-fg-subtle">
                  {u.device ? (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <DeviceIcon type={u.device.deviceType} className="h-3.5 w-3.5 text-sd-fg-subtle" />
                      {labelOf(DEVICE_LABEL, u.device.deviceType)}
                    </span>
                  ) : (
                    <span className="text-sd-disabled">미등록</span>
                  )}
                </Td>
                <Td className="text-right tabular-nums text-sd-fg-subtle">{formatDate(u.createdAt)}</Td>
              </Tr>
            );
          })}
        </Table>
      </div>
      <Pagination page={pageData.page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} size={pageData.size} onPage={onPage} />
    </div>
  );
}
