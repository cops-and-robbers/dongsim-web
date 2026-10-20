"use client";

import { useEffect, useState } from "react";
import { fetchQuery, useMutation, useRelayEnvironment } from "react-relay";
import type { UpdateEventGame } from "@/__generated__/UpdateEventGame.graphql";
import { UpdateEventGameMutation } from "@/lib/admin/gql/UpdateEventGame";
import { AdminGameQuery } from "@/lib/admin/gql/AdminGame";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { QrCodeIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/Toast";
import { eventGameFailure, eventGameSwitch } from "@/lib/admin/eventGame";
import { JoinHint } from "./JoinHint";
import { JoinQrDialog } from "./JoinQrDialog";

/**
 * 게임 상세 > 현장 운영. 부스에서 방을 열 때 하는 두 가지를 한 카드에 둔다.
 * 1. 이벤트 게임 켜고 끄기 (BE #214 updateEventGame). 예전엔 DB 를 직접 고쳤다
 * 2. 방 참가 QR 보기 (/join/<초대코드>, 행사 링크 꼬리표를 붙일 수 있다)
 *
 * 대기 중이거나 진행 중인 방에만 보인다(끝난 라운드의 방은 백엔드가 다시 대기 중으로 돌린다).
 * 앱에서 게임을 시작하면 상태가 바뀌는데 이 화면은 모르니, 열려 있는 동안 15초마다 상태를 다시 읽는다.
 * 설계와 근거는 docs/admin-ui.md "게임 상세 현장 운영"
 */

const REFRESH_MS = 15_000;

type Game = { id: string; inviteCode: string; status: string; isEventGame: boolean };

export function FieldOpsCard({ game }: { game: Game }) {
  const environment = useRelayEnvironment();
  const toast = useToast();
  const [commit, inFlight] = useMutation<UpdateEventGame>(UpdateEventGameMutation);
  const [confirming, setConfirming] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 화면을 보고 있을 때만 상태를 다시 읽는다. 받은 게임 노드가 스토어를 갱신해 상태 표시와 스위치가 같이 바뀐다
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fetchQuery(environment, AdminGameQuery, { id: game.id }, { fetchPolicy: "network-only" }).subscribe({});
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [environment, game.id]);

  const rule = eventGameSwitch(game.status, game.isEventGame);

  const fail = (message: string) => {
    if (eventGameFailure(message) === "not-deployed") {
      setError("운영 서버에 아직 이 기능이 없어요. 백엔드가 배포되면 다시 눌러 주세요.");
      return;
    }
    setError("바꾸지 못했어요. 그사이 게임 상태가 바뀌었을 수 있어요. 지금 상태를 다시 불러왔어요.");
    fetchQuery(environment, AdminGameQuery, { id: game.id }, { fetchPolicy: "network-only" }).subscribe({});
  };

  const apply = (next: boolean) => {
    setError(null);
    commit({
      variables: { gameId: game.id, isEventGame: next },
      // 스위치는 누르는 즉시 움직여야 한다. 실패하면 Relay 가 되돌린다
      optimisticResponse: { updateEventGame: { id: game.id, isEventGame: next, status: game.status } },
      onCompleted: (_, errors) => {
        setConfirming(false);
        if (errors?.length) return fail(errors.map((e) => e.message).join("\n"));
        toast(next ? "이벤트 게임으로 바꿨어요" : "일반 게임으로 되돌렸어요");
      },
      onError: (e) => {
        setConfirming(false);
        fail(e.message);
      },
    });
  };

  const onSwitch = () => {
    const next = !game.isEventGame;
    if (next && rule.confirm) return setConfirming(true);
    apply(next);
  };

  const note = switchNote(game.status, game.isEventGame);

  return (
    <section aria-labelledby="field-ops-title" className="mb-5 rounded-2xl border border-sd-line bg-sd-surface">
      <h2 id="field-ops-title" className="border-b border-sd-hairline px-5 py-4 text-[14px] font-bold text-sd-fg">
        현장 운영
      </h2>
      <div className="grid grid-cols-1 divide-y divide-sd-hairline lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p id="event-game-label" className="text-[14px] font-semibold text-sd-fg">
              이벤트 게임
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-sd-fg-muted">
              부스에서 운영진이 도둑을 맡을 때 켜요. 게임 진행 중에만 들어올 수 있어요. 인원 제한은 없어요. 들어오는 사람은 모두 경찰팀이에요. 마지막 경찰이 나가도 게임은 끝나지 않아요.
            </p>
            {note && <p className="mt-2 text-[13px] leading-relaxed text-sd-fg-subtle">{note}</p>}
            {error && (
              <p role="alert" className="mt-2 text-[13px] leading-relaxed text-sd-critical">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={game.isEventGame}
            aria-labelledby="event-game-label"
            disabled={!rule.enabled || inFlight}
            onClick={onSwitch}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${game.isEventGame ? "bg-accent" : "bg-sd-gray-400"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sd-surface shadow transition-all ${game.isEventGame ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-sd-fg">참가 QR</p>
            <p className="mt-1 text-[13px] leading-relaxed text-sd-fg-muted">휴대폰 카메라로 찍으면 앱에서 이 방이 열려요. 앱이 없으면 스토어로 가요.</p>
            <div className="mt-2 empty:hidden">
              <JoinHint status={game.status} isEventGame={game.isEventGame} />
            </div>
          </div>
          <Button size="sm" variant="neutral" onClick={() => setQrOpen(true)} className="shrink-0">
            <QrCodeIcon className="h-4 w-4" />
            QR 보기
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="진행 중인 게임을 이벤트 게임으로 바꿀까요?"
        message="게임 진행 중에 켜면 방이 대기 중이 될 때까지 끌 수 없어요. 지금 참여 중인 사람은 게임을 그대로 이어서 해요."
        confirmText="바꾸기"
        pending={inFlight}
        onConfirm={() => apply(true)}
        onClose={() => setConfirming(false)}
      />

      {qrOpen && (
        <JoinQrDialog inviteCode={game.inviteCode} status={game.status} isEventGame={game.isEventGame} onClose={() => setQrOpen(false)} />
      )}
    </section>
  );
}

/** 스위치 아래 한 줄. 못 누르는 이유와, 누르면 되돌릴 수 없다는 것을 누르기 전에 알린다 */
function switchNote(status: string, isEventGame: boolean): string | null {
  if (status === "IN_PROGRESS" && isEventGame) return "진행 중에는 끌 수 없어요. 이 판이 끝나 대기 중이 되면 끌 수 있어요.";
  if (status === "IN_PROGRESS") return "진행 중에 켜면 이 판이 끝날 때까지 끌 수 없어요.";
  return null;
}
