"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGameHistory } from "@/__generated__/AdminGameHistory.graphql";
import type { AdminGameHistoryRadio } from "@/__generated__/AdminGameHistoryRadio.graphql";
import type { AdminGameHistoryPlaceName } from "@/__generated__/AdminGameHistoryPlaceName.graphql";
import { AdminGameHistoryQuery } from "@/lib/admin/gql/AdminGameHistory";
import { AdminGameHistoryRadioQuery } from "@/lib/admin/gql/AdminGameHistoryRadio";
import { AdminGameHistoryPlaceNameQuery } from "@/lib/admin/gql/AdminGameHistoryPlaceName";
import {
  PageHeader,
  SectionCard,
  DescriptionList,
  ScrollPage,
  CardNote,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import {
  TeamBadge,
  ParticipantStatusBadge,
  Pill,
} from "@/components/admin/StatusBadge";
import { Avatar } from "@/components/admin/Avatar";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { useRecordRecent } from "@/components/admin/RecentViewed";
import { GameAreaMap } from "@/components/admin/maps";
import { PlaceNameTag } from "@/components/admin/games/PlaceNameTag";
import { attachRadio, formatRadio, radioSummary } from "@/lib/admin/gameExtras";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";
import {
  END_REASON_LABEL,
  TEAM_LABEL,
  formatDateTime,
  formatDuration,
  gameEndedAt,
  labelOf,
} from "@/lib/admin/format";

export default function GameHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScrollPage>
      <QueryBoundary pending={<DetailSkeleton />}>
        <HistoryDetail id={id} />
      </QueryBoundary>
    </ScrollPage>
  );
}

function HistoryDetail({ id }: { id: string }) {
  const data = useLazyLoadQuery<AdminGameHistory>(AdminGameHistoryQuery, { id });
  const history = data.adminGameHistory;
  const endedAt = formatDateTime(gameEndedAt(history));
  useRecordRecent("history", id, {
    title: `${labelOf(TEAM_LABEL, history.winnerTeam)} 승`,
    detail: `지난 게임 · ${endedAt}`,
  });

  const area = history.area;

  // 무전 시간(BE #239)과 동네 이름(BE #241)은 운영에 아직 없을 수 있어 따로 읽는다. 없으면 그 칸만 안 보인다
  const radio = useOptionalQuery<AdminGameHistoryRadio>(AdminGameHistoryRadioQuery, { id }, "radioSeconds");
  const place = useOptionalQuery<AdminGameHistoryPlaceName>(AdminGameHistoryPlaceNameQuery, { id }, "placeName", 0, {
    // 처음 보는 곳은 이름을 찾는 데 몇 초 걸려 첫 응답엔 비어 있을 수 있다. 백엔드가 찾아 저장해 두면 다음에 온다
    retryWhile: (d) => d.adminGameHistory?.area != null && d.adminGameHistory.area.placeName == null,
  });
  const placeName = place.data?.adminGameHistory?.area?.placeName ?? null;
  const rows = attachRadio(history.participants, radio.data?.adminGameHistory?.participants ?? null);
  const hasPolice = rows.some((p) => p.team === "POLICE");
  const showRadio = radio.status === "ready" && hasPolice;
  const radioTotal = radioSummary(rows);
  const forfeited =
    history.endReason === "POLICE_FORFEITED" ||
    history.endReason === "ROBBER_FORFEITED";

  // 진행 중인 게임 상세와 같은 순서로 보여준다. 경찰 먼저, 그다음 도둑.
  // 팀 안에서는 잘한 순서 - 경찰은 많이 잡을수록, 도둑은 덜 잡힐수록 위로.
  const teamOrder: Record<string, number> = { POLICE: 0, ROBBER: 1 };
  const recordOf = (p: (typeof history.participants)[number]) =>
    p.team === "POLICE" ? p.arrestCount : p.arrestedCount;
  const participants = [...rows].sort(
    (a, b) =>
      (teamOrder[a.team ?? ""] ?? 9) - (teamOrder[b.team ?? ""] ?? 9) ||
      (a.team === "POLICE"
        ? recordOf(b) - recordOf(a)
        : recordOf(a) - recordOf(b))
  );

  // 팀별 MVP - 경찰은 체포 최다, 도둑은 잡힘 최소(끝까지 잘 도망친 사람).
  // 명단 전체가 대상이므로 중도 퇴장자도 그대로 후보에 들어간다.
  // 팀 전원이 동률이면(전원 0회 등) 배지가 의미 없으니 달지 않는다. 동률 우승은 모두 MVP.
  const mvpRecord = (team: "POLICE" | "ROBBER"): number | null => {
    const records = history.participants
      .filter((p) => p.team === team)
      .map(recordOf);
    if (records.length === 0 || records.every((r) => r === records[0])) return null;
    return team === "POLICE" ? Math.max(...records) : Math.min(...records);
  };
  const bestRecord = {
    POLICE: mvpRecord("POLICE"),
    ROBBER: mvpRecord("ROBBER"),
  };

  // 인원은 명단(중도 퇴장자 포함) 기준으로 센다. BE의 totalPoliceCount 등은
  // 종료 시점 잔존 인원만이라 퇴장자가 있으면 명단과 어긋나 보여서다.
  // 몰수패처럼 명단이 비어 있는 옛 기록만 BE 집계로 돌아간다.
  const headcount = (team: "POLICE" | "ROBBER") => {
    const members = history.participants.filter((p) => p.team === team);
    const total =
      members.length ||
      (team === "POLICE" ? history.totalPoliceCount : history.totalRobberCount);
    const left = members.filter((p) => p.leftAt != null).length;
    return `${total}명${left > 0 ? ` (중도 퇴장 ${left})` : ""}`;
  };

  return (
    <>
      <PageHeader
        back={{ href: "/admin/games/history", label: "지난 게임" }}
        title={`${labelOf(TEAM_LABEL, history.winnerTeam)} 승`}
        description={endedAt}
        actions={
          <>
            <TeamBadge team={history.winnerTeam} />
            <Pill tone="slate">
              {labelOf(END_REASON_LABEL, history.endReason)}
            </Pill>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="게임 결과">
          <DescriptionList
            items={[
              { term: "경찰 인원", desc: headcount("POLICE") },
              { term: "도둑 인원", desc: headcount("ROBBER") },
              {
                term: "체포된 도둑",
                desc: `${history.arrestedRobberCount}/${history.totalRobberCount}명`,
              },
              { term: "총 체포 횟수", desc: `${history.totalArrestCount}회` },
              {
                term: "진행 시간",
                desc: formatDuration(history.durationSeconds),
              },
              { term: "종료 시각", desc: endedAt },
              ...(showRadio
                ? [
                    {
                      term: "경찰 무전",
                      desc:
                        radioTotal.used === 0
                          ? "아무도 안 썼어요"
                          : `${radioTotal.police}명 중 ${radioTotal.used}명, 합계 ${formatRadio(radioTotal.totalSeconds)}`,
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>

        <SectionCard title="플레이 구역" right={placeName ? <PlaceNameTag name={placeName} /> : undefined}>
          {area ? (
            <>
              <GameAreaMap area={area} />
              {!hasJail(area) && (
                // 감옥 좌표는 2026-08-15 배포부터 쌓인다. 그 전 기록은 놀이터만 그려진다.
                <p className="mt-3 text-[13px] text-sd-fg-subtle">
                  이 기록에는 감옥 위치가 남아 있지 않아 놀이터 구역만 보여요.
                </p>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              좌표가 남아 있지 않은 기록이에요.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="참여자"
          flush
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle">
              {history.participants.length}명
            </span>
          }
        >
          {history.participants.length === 0 ? (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              {forfeited
                ? "모두 게임을 떠나서 남은 참여자 기록이 없어요."
                : "참여자 기록이 없어요."}
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>닉네임</Th>
                  <Th>팀</Th>
                  <Th>상태</Th>
                  <Th>기록</Th>
                  {showRadio && <Th>무전</Th>}
                </>
              }
            >
              {participants.map((p, i) => (
                // 이벤트 게임은 나갔다 다시 들어올 수 있어 같은 사람이 두 줄이 된다. userId 만으로는 열쇠가 겹친다
                <Tr key={`${p.userId}-${i}`} index={i}>
                  <Td>
                    {p.userId != null ? (
                      <Link
                        href={`/admin/users/${p.userId}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar name={p.nickname} team={p.team} />
                        <span className="font-semibold text-sd-fg transition hover:text-accent">
                          {p.nickname}
                        </span>
                      </Link>
                    ) : (
                      // 탈퇴하면 회원 번호가 지워지고 닉네임이 "알수없음"이 된다(BE #223). 갈 회원 화면이 없어 링크를 빼고,
                      // 원래 그런 닉네임과 헷갈리지 않게 탈퇴 표시를 붙인다
                      <span className="flex items-center gap-3">
                        <Avatar name={p.nickname} team={p.team} />
                        <span className="font-semibold text-sd-fg-muted">{p.nickname}</span>
                        <Pill tone="slate">탈퇴</Pill>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <TeamBadge team={p.team} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <ParticipantStatusBadge status={p.status} />
                      {p.leftAt != null && <Pill tone="amber">중도 퇴장</Pill>}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {p.team === "POLICE"
                          ? `체포 ${p.arrestCount}회`
                          : `잡힘 ${p.arrestedCount}회`}
                      </span>
                      {(p.team === "POLICE" || p.team === "ROBBER") &&
                        bestRecord[p.team] != null &&
                        recordOf(p) === bestRecord[p.team] && (
                          <Pill tone={p.team === "POLICE" ? "blue" : "green"}>
                            MVP
                          </Pill>
                        )}
                    </span>
                  </Td>
                  {showRadio && (
                    <Td className="tabular-nums">
                      {p.team !== "POLICE" ? (
                        <span className="text-sd-disabled">-</span>
                      ) : p.radioSeconds == null ? (
                        <span className="text-sd-fg-subtle">-</span>
                      ) : (
                        <span className={p.radioSeconds > 0 ? "text-sd-fg" : "text-sd-fg-subtle"}>{formatRadio(p.radioSeconds)}</span>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </Table>
          )}
          {showRadio && history.participants.length > 0 && (
            <CardNote>무전은 경찰만 써요. 2분마다 세서 실제보다 한 번 접속에 최대 2분 적게 나와요.</CardNote>
          )}
        </SectionCard>
      </div>
    </>
  );
}

// 원형이면 감옥 중심, 다각형이면 감옥 폴리곤이 있어야 지도에 감옥이 그려진다.
function hasJail(area: NonNullable<
  AdminGameHistory["response"]["adminGameHistory"]["area"]
>): boolean {
  return area.areaType === "POLYGON"
    ? (area.jailPolygon?.length ?? 0) > 0
    : area.jailCenterLat != null && area.jailRadiusInMeters != null;
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-sd-gray-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-sd-gray-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-sd-gray-200" />
      </div>
    </>
  );
}
