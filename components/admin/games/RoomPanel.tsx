"use client";

import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGame } from "@/__generated__/AdminGame.graphql";
import type { AdminGamePlaceName } from "@/__generated__/AdminGamePlaceName.graphql";
import { AdminGameQuery } from "@/lib/admin/gql/AdminGame";
import { AdminGamePlaceNameQuery } from "@/lib/admin/gql/AdminGamePlaceName";
import { useRecordRecent } from "@/components/admin/RecentViewed";
import { AreaCard } from "@/components/admin/games/AreaCard";
import { FieldOpsCard } from "@/components/admin/games/FieldOpsCard";
import { DetailHead, DetailState, ExpandIcon, IconButton, KV, LiveDot, Panel, Stats, Tag } from "@/components/admin/split/SplitParts";
import { isActive } from "@/lib/admin/eventGame";
import { TEAM_LABEL, labelOf } from "@/lib/admin/format";
import { kstTimeOfDay } from "@/lib/admin/people";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";

type Game = NonNullable<AdminGame["response"]["adminGame"]>;
type Person = Game["participants"][number];

/**
 * 지금 열린 방 상세 (#315, 시안 "경도 어드민 유저와 게임").
 * 방에서 가장 궁금한 건 지금 몇 명이 어떤 상태인지다. 행사 부스에서는 이 숫자를 보며 운영진 도둑을 더 넣을지 정한다.
 * 그다음 부스에서 하는 일(현장 운영), 명단, 라운드 흐름, 바꿀 수 없는 설정 순서
 */
export function RoomPanel({ id, page = false, userHref }: { id: string; page?: boolean; userHref: (userId: string) => string }) {
  // 방 상태는 앱에서 바뀐다. 보여 주면서 뒤에서 새로 받는다(lib/admin/useLiveRefresh.ts)
  const live = useLiveRefresh();
  const data = useLazyLoadQuery<AdminGame>(AdminGameQuery, { id }, { fetchKey: live, fetchPolicy: "store-and-network" });
  const game = data.adminGame;
  useRecordRecent("game", id, game ? { title: game.inviteCode, detail: `게임 ID ${game.id}` } : null);
  // 동네 이름(BE #241)은 운영에 아직 없을 수 있어 따로 읽는다. 대기 중인 방은 구역이 바뀔 수 있어 같은 차례로 다시 읽는다
  const place = useOptionalQuery<AdminGamePlaceName>(AdminGamePlaceNameQuery, { id }, "placeName", live, {
    retryWhile: (d) => d.adminGame?.area != null && d.adminGame.area.placeName == null,
  });

  if (!game)
    return (
      <DetailState
        title="이 방은 이제 없어요"
        body="방은 모두 나가면 사라져요. 끝난 판은 게임 목록의 끝난 게임에서 볼 수 있어요."
        art="robber"
        action={
          <Link href="/admin/games" className="rounded-[10px] bg-sd-gray-200 px-3.5 py-2 text-[14px] font-semibold text-sd-fg hover:bg-sd-gray-300">
            게임 목록으로
          </Link>
        }
      />
    );

  const playing = game.status === "IN_PROGRESS";
  const host = game.participants.find((p) => p.isHost);
  const police = game.participants.filter((p) => p.team === "POLICE");
  const robbers = game.participants.filter((p) => p.team === "ROBBER");
  const undecided = game.participants.filter((p) => p.team !== "POLICE" && p.team !== "ROBBER");
  const jailed = robbers.filter((p) => p.status === "JAILED").length;
  const round = game.results.length + (playing ? 1 : 0);
  const sub = [host ? `방장 ${host.nickname}` : null, `${kstTimeOfDay(game.createdAt)}에 만듦`, playing && round > 0 ? `${round}라운드째` : null].filter(Boolean).join(" · ");

  return (
    <>
      <DetailHead
        title={
          <>
            <span className="tracking-[0.06em] tabular-nums">{game.inviteCode}</span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-normal ${playing ? "text-sd-positive" : "text-sd-fg-subtle"}`}>
              <LiveDot live={playing} />
              {playing ? "게임 중" : "대기 중"}
            </span>
            {game.isEventGame && <Tag>이벤트</Tag>}
          </>
        }
        sub={sub}
        actions={!page && <IconButton label="이 방만 크게 보기" href={`/admin/games/${game.id}`}><ExpandIcon /></IconButton>}
      />

      <AreaCard
        area={game.area}
        placeName={place.data?.adminGame?.area?.placeName ?? null}
        countryCode={place.data?.adminGame?.area?.countryCode ?? null}
        emptyText="방장이 아직 구역을 정하지 않았어요."
      />

      <Panel>
        <Stats
          items={
            playing
              ? [
                  { label: "경찰", value: police.length, unit: "명", tone: "cop" },
                  { label: "도둑 생존", value: robbers.length - jailed, unit: "명", tone: "rob" },
                  { label: "수감", value: jailed, unit: "명", tone: jailed > 0 ? "crit" : undefined },
                ]
              : [
                  { label: "인원", value: game.participants.length, unit: game.isEventGame ? "명" : `/ ${game.maxParticipants}명` },
                  { label: "경찰", value: police.length, unit: "명", tone: "cop" },
                  { label: "도둑", value: robbers.length, unit: "명", tone: "rob" },
                ]
          }
        />
      </Panel>

      {isActive(game.status) && <FieldOpsCard game={game} />}

      <Panel title="명단" sub={`${game.participants.length}명`}>
        {game.participants.length === 0 ? (
          <p className="text-[13.5px] text-sd-fg-subtle">지금 방에 아무도 없어요.</p>
        ) : (
          <>
            {police.length > 0 && <Team label={TEAM_LABEL.POLICE} tone="cop" people={police} userHref={userHref} />}
            {robbers.length > 0 && <Team label={TEAM_LABEL.ROBBER} tone="rob" people={robbers} userHref={userHref} right={playing && jailed > 0 ? `수감 ${jailed}명` : undefined} />}
            {undecided.length > 0 && <Team label="팀 고르는 중" people={undecided} userHref={userHref} />}
          </>
        )}
        {/* 방 상세는 지금 방에 있는 사람만 준다(백엔드가 나가는 순간 참가자 행을 지운다) */}
        <p className="mt-3 text-[12.5px] leading-relaxed text-sd-fg-subtle">
          나간 사람은 바로 빠져요. 게임 중에 나간 사람은 그 판이 끝나면 끝난 게임 기록에 중도 퇴장으로 남아요.
        </p>
      </Panel>

      {(game.results.length > 0 || playing) && (
        // 한 방에서 여러 판을 이어서 한다. 라운드마다 이긴 팀을 칸으로 보여 줘 흐름이 보인다
        <Panel title="라운드" sub={`${round}라운드`}>
          <div className="flex flex-wrap gap-1.5">
            {game.results.map((r, i) => {
              const cop = r.winnerTeam === "POLICE";
              return (
                <span key={r.roundNumber ?? i} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${cop ? "bg-sd-info-weak text-sd-info" : "bg-sd-positive-weak text-sd-positive"}`}>
                  <i className="not-italic text-[11.5px] opacity-70 tabular-nums">{r.roundNumber ?? i + 1}</i>
                  {labelOf(TEAM_LABEL, r.winnerTeam)} 승
                </span>
              );
            })}
            {playing && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-sd-gray-200 px-2.5 py-1.5 text-[13px] font-semibold text-sd-fg-muted">
                <i className="not-italic text-[11.5px] opacity-70 tabular-nums">{round}</i>
                진행 중
              </span>
            )}
          </div>
        </Panel>
      )}

      {/* 설정은 바꿀 수 없고 확인만 하는 값이라 아래에 뒀다 */}
      <Panel title="설정">
        <KV label="라운드 시간">{game.roundDurationMinutes}분</KV>
        <KV label="위치 공개 주기">{game.locationRevealIntervalMinutes}분</KV>
        <KV label="경찰 대기 시간">{game.policeWaitMinutes}분</KV>
        <KV label="최대 인원">{game.isEventGame ? "제한 없음" : `${game.maxParticipants}명`}</KV>
      </Panel>
    </>
  );
}

// 팀은 묶음 제목과 색으로 나눈다. 이름 앞 그림은 팀을 말하지 않아 뺐다. 감옥에 있는 도둑은 이름 옆에 빨갛게
function Team({ label, tone, people, userHref, right }: { label: string; tone?: "cop" | "rob"; people: readonly Person[]; userHref: (id: string) => string; right?: string }) {
  return (
    <div className="[&+&]:mt-4 [&+&]:pt-3.5 [&+&]:shadow-[inset_0_1px_0_var(--sd-hairline)]">
      <div className="mb-1 flex items-baseline gap-2 text-[13.5px] font-bold">
        <span className={tone === "cop" ? "text-sd-info" : tone === "rob" ? "text-sd-positive" : "text-sd-fg"}>{label}</span>
        <small className="text-[12.5px] font-medium tabular-nums text-sd-fg-subtle">{people.length}명</small>
        {right && <small className="ml-auto text-[12.5px] font-semibold text-sd-critical">{right}</small>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-x-3 gap-y-0.5">
        {people.map((p) => (
          <Link key={p.userId} href={userHref(p.userId)} className="-mx-2 flex min-w-0 items-center gap-1.5 rounded-[9px] px-2 py-1.5 text-[14px] font-medium text-sd-fg hover:bg-sd-pressed">
            <span className="truncate">{p.nickname}</span>
            {p.isHost && <span className="shrink-0 text-[11px] font-bold text-accent">방장</span>}
            {p.team === "ROBBER" && p.status === "JAILED" && <span className="shrink-0 text-[11px] font-bold text-sd-critical">수감</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
