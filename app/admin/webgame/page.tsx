"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard, ScrollPage, ErrorBlock } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { Pill } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import { formatDateTime } from "@/lib/admin/format";
import {
  MESSAGE_MAX,
  MODE_LABEL,
  MODE_RESULT,
  WEBGAME_MODES,
  validateWebgameChange,
  type WebgameChange,
  type WebgameMode,
  type WebgameState,
} from "@/lib/admin/webgame";
import { applyWebgame, fetchWebgame } from "@/lib/admin/webgameClient";
import { GamePreview } from "@/components/admin/webgame/GamePreview";
import { PreviewPane } from "@/components/admin/ops/PreviewPane";
import { WebgameTabs } from "@/components/admin/webgame/WebgameTabs";

// 온라인 게임: 브라우저에서 하는 경찰과 도둑 게임을 공개 전, 누구나, 점검 중으로 바꾼다.
// 게임 서버가 정본이고 여기서는 바꾸기만 한다. 앱 설정처럼 왼쪽에서 고르고 오른쪽 가로 폰에서 실제 게임 화면을 본다.
// 설계와 근거는 docs/admin-ui.md "온라인 게임"

const TONE = { soon: "slate", open: "green", pause: "red" } as const;

// 다시 여는 시각은 글로 받지 않고 고른다. 장애 때 한 번에 고르고, 지난 시각이나 오타가 나가지 않는다(앱 설정 점검과 같은 판단)
const UNTIL = [
  { key: "none", label: "안 적기", minutes: 0 },
  { key: "30m", label: "30분 뒤", minutes: 30 },
  { key: "1h", label: "1시간 뒤", minutes: 60 },
  { key: "2h", label: "2시간 뒤", minutes: 120 },
] as const;
type UntilKey = (typeof UNTIL)[number]["key"];

/** 10분 단위로 올림해서 "오후 9시 30분쯤" 처럼 읽히게 한다. 게임 화면도 10분 단위로 보여 준다 */
function untilFrom(key: UntilKey, now: number): string | null {
  const m = UNTIL.find((u) => u.key === key)?.minutes ?? 0;
  if (!m) return null;
  const step = 10 * 60_000;
  return new Date(Math.ceil((now + m * 60_000) / step) * step).toISOString();
}

// 확인창 버튼에는 "예" 대신 결과를 적는다(NN/g 확인창, GitHub Primer)
const CONFIRM: Record<WebgameMode, string> = { soon: "공개 전으로 바꾸기", open: "누구나 들어오게 열기", pause: "점검 시작하기" };

const untilText = (iso: string | null) => (iso ? formatDateTime(iso) : "안 적기");
const messageText = (m: string) => m || "기본 문장";

export default function WebgamePage() {
  const [state, setState] = useState<WebgameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    fetchWebgame()
      .then((next) => {
        setState(next);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요."));
  }, []);

  // 다른 관리자가 바꿨을 수 있으니 돌아올 때마다 다시 읽는다
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return (
    <ScrollPage>
      <PageHeader
        title="온라인 게임"
        description="브라우저에서 하는 경찰과 도둑 온라인 게임을 열고 닫아요. 바꾸면 몇 초 안에 게임에 반영돼요."
      />
      <WebgameTabs />

      {!state && !loadError && <p className="py-14 text-center text-[14px] text-sd-fg-subtle">불러오는 중이에요</p>}
      {!state && loadError && <ErrorBlock message={loadError} onRetry={load} />}

      {state && (
        <div className="space-y-5">
          {process.env.NODE_ENV !== "production" && (
            <Callout>로컬 개발 환경의 테스트 값이에요. 여기서 바꿔도 실제 게임에는 적용되지 않아요.</Callout>
          )}
          {!state.writable && <Callout variant="warning">이 환경에서는 볼 수만 있어요. 운영 어드민에서 바꿔 주세요.</Callout>}
          {/* 값이 바뀌면(적용, 다른 관리자의 변경) 쓰던 입력을 버리고 새 값에서 다시 시작한다(앱 설정과 같은 규칙) */}
          <Editor
            key={`${state.mode}-${state.at}-${state.until}`}
            state={state}
            onApplied={(next) => {
              setState(next);
              toast("바꿨어요. 몇 초 안에 게임에 반영돼요");
            }}
          />
        </div>
      )}
    </ScrollPage>
  );
}

// 웹사이트 입구(/online)의 버튼이 상태마다 어떻게 되는지. 미리보기 아래에 한 줄로 적는다
const SITE_NOTE: Record<WebgameMode, string> = {
  soon: "웹사이트 입구에서는 '친구랑 한 판 하기'를 누를 수 없고, 아래에 '아직 만들고 있어요'가 보여요.",
  open: "웹사이트 입구에서 '친구랑 한 판 하기'를 누르면 게임 첫 화면으로 가요.",
  pause: "웹사이트 입구에서는 '친구랑 한 판 하기'를 누를 수 없고, 아래에 점검 안내가 보여요.",
};

type Draft = { mode: WebgameMode; message: string; until: UntilKey };

function Editor({ state, onApplied }: { state: WebgameState; onApplied: (next: WebgameState) => void }) {
  const [draft, setDraft] = useState<Draft>({
    mode: state.mode,
    message: state.mode === "pause" ? state.message : "",
    // 지난 점검의 시각이 그대로 나가지 않게, 늘 비워 둔 채로 시작한다
    until: "none",
  });
  // "1시간 뒤"가 화면을 연 시각에 묶이지 않게 30초마다 다시 잰다. 적용할 때는 확인창을 연 시각을 쓴다
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const pause = draft.mode === "pause";
  // 적용하기 전에도 고른 값 그대로 그린다. 고른 상태가 지금과 같고 시각을 새로 고르지 않았으면 저장된 시각을 보여 준다
  const previewUntil = !pause ? null : draft.until === "none" && state.mode === "pause" && draft.message === state.message ? state.until : untilFrom(draft.until, now);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-5">
        <CurrentCard state={state} now={now} />
        <ChangeCard state={state} draft={draft} onDraft={setDraft} onApplied={onApplied} />
      </div>
      <PreviewPane>
        <GamePreview mode={draft.mode} message={pause ? draft.message.trim() : ""} until={previewUntil} now={now} />
        <p aria-live="polite" className="mt-3 text-center text-[13px] leading-relaxed text-sd-fg-muted">
          {SITE_NOTE[draft.mode]}
        </p>
      </PreviewPane>
    </div>
  );
}

function CurrentCard({ state, now }: { state: WebgameState; now: number }) {
  return (
    <SectionCard title="지금 상태" right={<Pill tone={TONE[state.mode]}>{MODE_LABEL[state.mode]}</Pill>}>
      <div className="space-y-2 text-[14px] leading-relaxed">
        <p className="text-sd-fg">{MODE_RESULT[state.mode]}</p>
        {state.mode === "pause" && (
          <p className="text-sd-fg-muted">
            안내: {messageText(state.message)}
            <br />
            다시 여는 시각: <span className="tabular-nums">{untilText(state.until)}</span>
            {state.until && Date.parse(state.until) < now && " (지났어요. 게임에는 '조금 뒤에 다시 와 주세요'가 나와요)"}
          </p>
        )}
        <p className="text-[13px] text-sd-fg-subtle">
          {state.at ? (
            <>
              마지막으로 바꾼 사람: {state.by || "알 수 없음"} (<span className="tabular-nums">{formatDateTime(new Date(state.at).toISOString())}</span>)
            </>
          ) : (
            "아직 바꾼 적이 없어요. 지금은 공개 전이에요."
          )}
        </p>
        <p className="text-[13px] text-sd-fg-subtle">
          게임 주소:{" "}
          <a href={`${state.url}/play`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline-offset-4 hover:underline">
            {state.url.replace(/^https:\/\//, "")}/play
          </a>
        </p>
      </div>
    </SectionCard>
  );
}

function ChangeCard({
  state,
  draft,
  onDraft,
  onApplied,
}: {
  state: WebgameState;
  draft: Draft;
  onDraft: (next: Draft) => void;
  onApplied: (next: WebgameState) => void;
}) {
  const { mode, message, until } = draft;
  const setMode = (m: WebgameMode) => onDraft({ ...draft, mode: m });
  const setMessage = (m: string) => onDraft({ ...draft, message: m });
  const setUntil = (u: UntilKey) => onDraft({ ...draft, until: u });
  const [dialog, setDialog] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  // 화면을 연 시각이 아니라 확인창을 연 시각을 기준으로 "1시간 뒤"를 정한다
  const [openedAt, setOpenedAt] = useState(0);

  const pause = mode === "pause";
  const change: WebgameChange = { mode, message: pause ? message.trim() : "", until: pause ? untilFrom(until, openedAt) : null };
  const invalid = validateWebgameChange(change);
  const dirty = mode !== state.mode || (pause && (change.message !== state.message || until !== "none"));
  const length = Array.from(message).length;

  const items = [
    { key: "mode", label: "상태", before: MODE_LABEL[state.mode], after: MODE_LABEL[mode] },
    ...(pause
      ? [
          { key: "message", label: "안내", before: state.mode === "pause" ? messageText(state.message) : "-", after: messageText(change.message) },
          { key: "until", label: "다시 여는 시각", before: state.mode === "pause" ? untilText(state.until) : "-", after: untilText(change.until) },
        ]
      : []),
  ].filter((i) => i.before !== i.after);

  // 누구나는 공개, 점검은 모두를 막는 일이라 빨간 버튼과 경고를 단다. 공개 전으로 돌리는 건 막는 쪽이지만 팀은 계속 들어와서 일반 버튼
  const warning = {
    open: "누구나 들어와 방을 만들 수 있어요. 무료 한도를 넘으면 그날은 게임이 막혀요.",
    pause: "새로 들어오는 사람을 모두 막아요. 팀도 들어오지 못해요.",
    soon: "",
  }[mode];

  const confirm = async () => {
    setPending(true);
    setError(undefined);
    try {
      onApplied(await applyWebgame(change));
      setDialog(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <SectionCard title="상태 바꾸기">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="온라인 게임 상태" className="space-y-2">
          {WEBGAME_MODES.map((m) => {
            const on = m === mode;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m)}
                disabled={!state.writable}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  on ? "border-accent bg-accent-weak" : "border-sd-line hover:bg-sd-pressed"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${on ? "border-accent" : "border-sd-gray-400"}`}
                >
                  {on && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[14px] font-bold text-sd-fg">
                    {MODE_LABEL[m]}
                    {m === state.mode && <span className="text-[12px] font-semibold text-sd-fg-subtle">지금</span>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-sd-fg-muted">{MODE_RESULT[m]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {pause && (
          <div className="space-y-4 rounded-xl bg-sd-fill p-4">
            <div>
              <label htmlFor="webgame-message" className="block text-[13px] font-semibold text-sd-fg">
                게임 화면에 보여 줄 안내
              </label>
              <input
                id="webgame-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MESSAGE_MAX * 2}
                disabled={!state.writable}
                placeholder="비워 두면 '조금 뒤에 다시 와 주세요'가 나와요"
                className="mt-1.5 h-10 w-full rounded-lg border border-sd-line bg-sd-surface px-3 text-[14px] text-sd-fg outline-none focus:border-accent"
              />
              <p className={`mt-1 text-right text-[12px] tabular-nums ${length > MESSAGE_MAX ? "text-sd-critical" : "text-sd-fg-subtle"}`}>
                {length}/{MESSAGE_MAX}
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-sd-fg">다시 여는 시각</p>
              <div role="radiogroup" aria-label="다시 여는 시각" className="mt-1.5 flex flex-wrap gap-2">
                {UNTIL.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    role="radio"
                    aria-checked={until === u.key}
                    onClick={() => setUntil(u.key)}
                    disabled={!state.writable}
                    className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                      until === u.key ? "bg-accent text-accent-fg" : "bg-sd-gray-200 text-sd-fg-muted hover:bg-sd-gray-300"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-sd-fg-subtle">시간이 돼도 저절로 열리지 않아요. 점검이 끝나면 여기서 상태를 바꿔 주세요.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-sd-hairline pt-4">
          <Button
            size="sm"
            variant={mode === "soon" ? "brand" : "danger"}
            disabled={!state.writable || !dirty || Boolean(invalid)}
            onClick={() => {
              setOpenedAt(Date.now());
              setError(undefined);
              setDialog(true);
            }}
          >
            변경 내용 확인
          </Button>
        </div>
      </div>

      {dialog && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={items}
          warnings={warning ? [warning] : []}
          note="바꾸면 몇 초 안에 게임에 반영돼요. 하던 판은 끝까지 가요."
          danger={mode !== "soon"}
          confirmText={CONFIRM[mode]}
          pending={pending}
          error={error}
          onClose={() => setDialog(false)}
          onConfirm={confirm}
        />
      )}
    </SectionCard>
  );
}
