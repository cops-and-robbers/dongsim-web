"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PageHeader, SectionCard, ScrollPage, ErrorBlock } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { AppPreview, type PreviewScene } from "@/components/admin/appConfig/AppPreview";
import { BannerImagePicker } from "@/components/admin/appConfig/BannerImagePicker";
import { HttpsUrlInput, VersionInput } from "@/components/admin/appConfig/fields";
import { SingleDatePicker } from "@/components/admin/metrics/DateRangePicker";
import { TimeSelect } from "@/components/admin/metrics/TimeSelect";
import {
  describeChanges,
  diffAppConfig,
  formatMaintenanceEnd,
  isFutureEnd,
  kstToday,
  parseMaintenanceEnd,
  presetMaintenanceEnd,
  storeWarning,
  validateAppConfig,
  warningsFor,
  type AppConfigChanges,
  type AppConfigKey,
  type AppConfigState,
  type AppConfigValues,
} from "@/lib/admin/appConfig";
import { AppConfigError, applyAppConfig, fetchAppConfig } from "@/lib/admin/appConfigClient";
import { formatDateTime } from "@/lib/admin/format";
import { useListParams } from "@/lib/admin/useListParams";
import { addDays } from "@/lib/metrics/dates";

// 앱 설정: 앱을 다시 배포하지 않고 바꾸는 Firebase Remote Config 값.
// 개발을 모르는 운영진도 쓰는 화면이라 값 이름 대신 하는 일로 나누고, 옆 폰에서 결과를 보면서 고친다.
// 설계와 근거는 docs/admin-ui.md "앱 설정"

const TIMING = "앱을 새로 열 때 적용돼요. 최대 1시간 늦을 수 있어요.";
const CONSOLE_HISTORY = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/config/env/firebase/history`;

const PARAMS = { tab: ["maintenance", "version", "ads", "banner"] } as const;
type Tab = (typeof PARAMS.tab)[number];
type AdScene = "community-ad" | "game-end-ad";

/** 패널들이 함께 쓰는 값과 함수. */
type Shared = {
  values: AppConfigValues;
  appStoreVersion: string | null;
  /** 이 값들을 지금 바꿀 수 있나. 볼 수만 있는 환경이거나 콘솔에서 조건이 걸렸으면 false */
  canEdit: (keys: AppConfigKey[]) => boolean;
  /** 게시한다. 실패하면 던지고, 까닭은 확인창이 보여 준다 */
  apply: (changes: AppConfigChanges) => Promise<void>;
  /** 저장 전 값을 옆 폰에 보여 준다 */
  onDraft: (changes: AppConfigChanges) => void;
};

export default function AppConfigPage() {
  const { current, set } = useListParams(PARAMS);
  const [state, setState] = useState<AppConfigState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Tab, AppConfigChanges>>>({});
  const [adScene, setAdScene] = useState<AdScene>("community-ad");
  const toast = useToast();

  const load = useCallback(() => {
    fetchAppConfig()
      .then((next) => {
        setState(next);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요."));
  }, []);

  // 다른 탭이나 콘솔에서 바꿨을 수 있으니 돌아올 때마다 다시 읽는다
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const apply = async (changes: AppConfigChanges) => {
    if (!state) return;
    try {
      setState(await applyAppConfig(state.etag, changes));
      toast("앱 설정을 적용했어요");
    } catch (e) {
      // 다른 사람이 먼저 바꿨다. 최신 값을 불러오면 패널이 새로 그려져 확인창이 닫히니 까닭은 토스트로 알린다
      if (e instanceof AppConfigError && e.status === 409) {
        toast(e.message);
        load();
      }
      throw e;
    }
  };

  const draftFor = useCallback((tab: Tab) => (changes: AppConfigChanges) => setDrafts((d) => ({ ...d, [tab]: changes })), []);
  const [onDrafts] = useState(() => ({
    maintenance: draftFor("maintenance"),
    version: draftFor("version"),
    ads: draftFor("ads"),
    banner: draftFor("banner"),
  }));

  const tab = current.tab;
  const scene: PreviewScene = tab === "ads" ? adScene : tab;

  return (
    <ScrollPage>
      <PageHeader title="앱 설정" description="앱을 다시 배포하지 않고 설정을 바꿀 수 있어요. 적용하면 실제 사용자에게 반영돼요." />

      {!state && !loadError && <p className="py-14 text-center text-[14px] text-sd-fg-subtle">불러오는 중이에요</p>}
      {!state && loadError && <ErrorBlock message={loadError} onRetry={load} />}

      {state && (
        <div className="space-y-5">
          {state.source === "mock" && <Callout>로컬 개발 환경의 테스트 값이에요. 여기서 바꿔도 실제 앱에는 적용되지 않아요.</Callout>}
          {!state.writable && <Callout variant="warning">이 환경에서는 볼 수만 있어요. 운영 어드민에서 바꿔 주세요.</Callout>}
          {state.conditioned.length > 0 && <Callout variant="warning">콘솔에서 조건을 건 값이 있어요. 그 값은 Firebase 콘솔에서 바꿔 주세요.</Callout>}

          <SegmentedControl<Tab>
            value={tab}
            onChange={(v) => set({ tab: v })}
            options={[
              { label: state.values.maintenance === "true" ? "점검 중" : "점검", value: "maintenance" },
              { label: "앱 버전", value: "version" },
              { label: "광고", value: "ads" },
              { label: "홈 배너", value: "banner" },
            ]}
          />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-5">
              <Panels key={state.etag} state={state} tab={tab} apply={apply} onDrafts={onDrafts} adScene={adScene} onAdScene={setAdScene} />
              <History state={state} />
            </div>
            <div className="self-start lg:sticky lg:top-0">
              <AppPreview
                scene={scene}
                values={{ ...state.values, ...drafts.maintenance, ...drafts.version, ...drafts.ads, ...drafts.banner }}
              />
            </div>
          </div>
        </div>
      )}
    </ScrollPage>
  );
}

// 값이 바뀌면(적용, 다른 사람의 변경) 쓰던 입력을 버리고 새 값에서 다시 시작한다. 낡은 값 위에 고치지 않게.
// 탭을 옮겨도 쓰던 입력이 남도록 네 패널을 모두 그려 두고 보이는 것만 고른다
function Panels({
  state,
  tab,
  apply,
  onDrafts,
  adScene,
  onAdScene,
}: {
  state: AppConfigState;
  tab: Tab;
  apply: Shared["apply"];
  onDrafts: Record<Tab, Shared["onDraft"]>;
  adScene: AdScene;
  onAdScene: (scene: AdScene) => void;
}) {
  const shared = {
    values: state.values,
    appStoreVersion: state.appStoreVersion,
    canEdit: (keys: AppConfigKey[]) => state.writable && !keys.some((k) => state.conditioned.includes(k)),
    apply,
  };
  return (
    <>
      <div hidden={tab !== "maintenance"}>
        <MaintenancePanel {...shared} onDraft={onDrafts.maintenance} />
      </div>
      <div hidden={tab !== "version"}>
        <VersionPanel {...shared} onDraft={onDrafts.version} />
      </div>
      <div hidden={tab !== "ads"}>
        <AdsPanel {...shared} onDraft={onDrafts.ads} adScene={adScene} onAdScene={onAdScene} />
      </div>
      <div hidden={tab !== "banner"}>
        <BannerPanel {...shared} onDraft={onDrafts.banner} />
      </div>
    </>
  );
}

// ── 공용 부품 ────────────────────────────────────────────────

/** 이 값이 언제 쓰는 것인지 한 문장으로 먼저 알려 준다. */
function Intro({ children }: { children: ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-sd-fg-muted">{children}</p>;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-sd-fg-subtle">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[13px] leading-relaxed text-sd-fg-subtle">{hint}</p>
      )}
    </div>
  );
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : "적용하지 못했어요. 잠시 뒤 다시 시도해 주세요.");

/** 확인창을 열고 적용하는 흐름. 실패하면 창을 닫지 않고 까닭을 보여 준다. */
function useApply(apply: Shared["apply"]) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (changes: AppConfigChanges, onDone: () => void) => {
    setPending(true);
    setError(undefined);
    try {
      await apply(changes);
      onDone();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPending(false);
    }
  };
  return { pending, error, run, clear: () => setError(undefined) };
}

/** 패널 아래 "되돌리기, 변경 내용 확인". 고친 게 있을 때만 보인다. */
function SaveBar({ dirty, disabled, onReset, onReview }: { dirty: boolean; disabled: boolean; onReset: () => void; onReview: () => void }) {
  if (!dirty) return null;
  return (
    <div className="flex justify-end gap-2 border-t border-sd-hairline pt-4">
      <Button variant="neutral" size="sm" onClick={onReset}>
        되돌리기
      </Button>
      <Button size="sm" onClick={onReview} disabled={disabled}>
        변경 내용 확인
      </Button>
    </div>
  );
}

// ── 점검 ─────────────────────────────────────────────────────

type EndMode = "none" | "plus1" | "plus2" | "custom";
type EndForm = { mode: EndMode; date: string; time: string };

const PRESET_MINUTES: Partial<Record<EndMode, number>> = { plus1: 60, plus2: 120 };
const MAX_END_DAYS = 30;

/** 고른 값에서 앱에 나갈 문구를 만든다. 다 고르지 않았거나 지난 시각이면 ready 가 false 다. */
function readEnd(form: EndForm, now: number) {
  if (form.mode === "none") return { text: "", ready: true };
  const minutes = PRESET_MINUTES[form.mode];
  if (minutes) return { text: formatMaintenanceEnd(presetMaintenanceEnd(now, minutes)), ready: true };
  if (!form.time) return { text: "", ready: false };
  const end = { date: form.date, time: form.time };
  if (!isFutureEnd(end, now)) return { text: "", ready: false, error: "지금보다 뒤의 시각을 골라 주세요." };
  return { text: formatMaintenanceEnd(end), ready: true };
}

// 장애 중에도 빨리 고르게 자주 쓰는 길이를 먼저 두고, 달력은 예고된 점검에만 연다
function EndField({ form, onChange, now, error, disabled }: { form: EndForm; onChange: (f: EndForm) => void; now: number; error?: string; disabled: boolean }) {
  const today = kstToday(now);
  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">끝나는 시각 (선택)</p>
      <SegmentedControl<EndMode>
        value={form.mode}
        onChange={(mode) => onChange({ ...form, mode })}
        options={[
          { label: "안 적기", value: "none" },
          { label: "1시간 뒤", value: "plus1" },
          { label: "2시간 뒤", value: "plus2" },
          { label: "직접", value: "custom" },
        ]}
      />
      {form.mode === "custom" && (
        <div className="mt-2 flex items-start gap-2">
          <SingleDatePicker value={form.date} min={today} max={addDays(today, MAX_END_DAYS)} onChange={(date) => onChange({ ...form, date })} />
          <TimeSelect value={form.time} onChange={(time) => onChange({ ...form, time })} label="점검이 끝나는 시간" placeholder="시간" allDay />
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] leading-relaxed text-sd-fg-subtle">한국 시간 기준이에요. 영어, 일본어 사용자에게도 같은 형식으로 보여요.</p>
      )}
    </div>
  );
}

function MaintenancePanel({ values, canEdit, apply, onDraft }: Shared) {
  const on = values.maintenance === "true";
  const editable = canEdit(["maintenance", "maintenance_message"]);
  const [dialog, setDialog] = useState<"start" | "end" | "message" | "clear" | null>(null);
  // 화면을 연 시각을 기준으로 "1시간 뒤"를 정한다
  const [now] = useState(() => Date.now());
  // 시작할 때는 비워 둔다. 지난 점검의 날짜가 그대로 나가는 일을 막으려고 예전 값을 채워 두지 않는다
  const [end, setEnd] = useState<EndForm>(() => {
    const saved = on ? parseMaintenanceEnd(values.maintenance_message) : null;
    return { mode: saved ? "custom" : "none", date: saved?.date ?? kstToday(now), time: saved?.time ?? "" };
  });
  const { pending, error, run, clear } = useApply(apply);

  const { text, ready, error: endError } = readEnd(end, now);
  const close = () => setDialog(null);
  const open = (kind: "start" | "end" | "message" | "clear") => {
    clear();
    setDialog(kind);
  };

  useEffect(() => onDraft({ maintenance_message: text }), [onDraft, text]);

  return (
    <SectionCard title="점검">
      <div className="space-y-4">
        <Intro>서버 작업처럼 앱을 잠시 막아야 할 때 써요. 오른쪽 화면이 사용자에게 보여요.</Intro>

        {on ? (
          <Callout variant="danger" title="지금 점검 모드가 켜져 있어요">
            적용되면 앱을 새로 여는 사용자는 들어올 수 없어요. 적용까지 최대 1시간 걸릴 수 있어요. 점검이 끝나면 꼭 꺼 주세요.
          </Callout>
        ) : (
          <Callout title="시작하면 이렇게 돼요">
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>앱을 새로 여는 사용자는 오른쪽 화면에서 멈춰요.</li>
              <li>이미 앱을 쓰고 있는 사용자의 화면은 바뀌지 않아요. 앱을 다시 열 때 막혀요.</li>
              <li>적용까지 최대 1시간 걸릴 수 있어요.</li>
              <li>작업이 끝나면 여기로 돌아와 점검 끝내기를 눌러 주세요.</li>
            </ul>
          </Callout>
        )}

        {/* 콘솔로 점검하던 때의 날짜가 남아 있으면 치울 수 있게 한다. 점검이 꺼져 있어 사용자에게는 보이지 않는다 */}
        {!on && values.maintenance_message && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-sd-fg-subtle">
            <span>
              지난 점검 때 적어 둔 시각이 남아 있어요: <span className="tabular-nums text-sd-fg-muted">{values.maintenance_message}</span>. 앱에는 보이지 않아요.
            </span>
            <Button variant="neutral" size="sm" onClick={() => open("clear")} disabled={!editable}>
              지우기
            </Button>
          </div>
        )}

        <EndField form={end} onChange={setEnd} now={now} error={endError} disabled={!editable} />

        <div className="flex flex-wrap justify-end gap-2 border-t border-sd-hairline pt-4">
          {on ? (
            <>
              <Button variant="neutral" size="sm" onClick={() => open("message")} disabled={!editable || !ready || text === values.maintenance_message}>
                끝나는 시각 바꾸기
              </Button>
              <Button size="sm" onClick={() => open("end")} disabled={!editable}>
                점검 끝내기
              </Button>
            </>
          ) : (
            <Button variant="danger" size="sm" onClick={() => open("start")} disabled={!editable || !ready}>
              점검 시작
            </Button>
          )}
        </div>
      </div>

      {dialog === "start" && (
        <ChangeDialog
          title="점검을 시작할까요?"
          warnings={["적용되면 앱을 새로 여는 사용자는 들어올 수 없어요. 적용까지 최대 1시간 걸릴 수 있어요."]}
          items={[{ key: "end", label: "끝나는 시각", before: "없음", after: text || "안 적기" }]}
          danger
          confirmText="점검 시작"
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() => run({ maintenance: "true", maintenance_message: text }, close)}
        />
      )}
      {dialog === "message" && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={describeChanges(values, { maintenance_message: text })}
          note={TIMING}
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() => run({ maintenance_message: text }, close)}
        />
      )}
      {dialog === "clear" && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={describeChanges(values, { maintenance_message: "" })}
          note="점검이 꺼져 있어 사용자에게 보이는 변화는 없어요."
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() => run({ maintenance_message: "" }, close)}
        />
      )}
      {dialog === "end" && (
        <ChangeDialog
          title="점검을 끝낼까요?"
          note="사용자가 다시 들어올 수 있어요. 끝나는 시각도 함께 지워요. 적용까지 최대 1시간 걸릴 수 있어요."
          confirmText="점검 끝내기"
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() => run({ maintenance: "false", maintenance_message: "" }, close)}
        />
      )}
    </SectionCard>
  );
}

// ── 앱 버전 ──────────────────────────────────────────────────

type VersionForm = Pick<AppConfigValues, "latest_version" | "minimum_version" | "force_update">;

function VersionPanel({ values, appStoreVersion, canEdit, apply, onDraft }: Shared) {
  const saved: VersionForm = {
    latest_version: values.latest_version,
    minimum_version: values.minimum_version,
    force_update: values.force_update,
  };
  const [form, setForm] = useState(saved);
  const [reviewing, setReviewing] = useState(false);
  const { pending, error, run, clear } = useApply(apply);
  const editable = canEdit(["latest_version", "minimum_version", "force_update"]);

  const changes = diffAppConfig(values, form);
  const dirty = Object.keys(changes).length > 0;
  const errors = dirty ? validateAppConfig({ ...values, ...form }) : {};
  const hasError = Boolean(errors.latest_version || errors.minimum_version);
  const store = storeWarning({ ...values, ...form }, changes, appStoreVersion);
  const warnings = [...warningsFor(values, changes), ...(store ? [store] : [])];

  // 틀린 값으로는 앱이 어떻게 될지 보여 줄 수 없어 고칠 때까지 저장된 값으로 그린다
  const previewForm = hasError ? "" : JSON.stringify(form);
  useEffect(() => onDraft(previewForm ? (JSON.parse(previewForm) as VersionForm) : {}), [onDraft, previewForm]);

  return (
    <SectionCard title="앱 버전">
      <div className="space-y-4">
        <Intro>새 버전을 스토어에 올린 뒤에 써요. 옛날 앱을 쓰는 사람에게 업데이트를 권하거나, 업데이트 전까지 막을 수 있어요.</Intro>

        <Field
          id="latest-version"
          label="최신 버전"
          hint={`이 버전보다 낮은 앱에는 새 버전 안내가 떠요. 앱스토어와 플레이 스토어에 모두 올라간 뒤에 바꿔 주세요.${appStoreVersion ? ` 지금 앱스토어는 ${appStoreVersion}이에요.` : ""}`}
          error={errors.latest_version}
        >
          <VersionInput
            id="latest-version"
            label="최신 버전"
            value={form.latest_version}
            disabled={!editable}
            invalid={Boolean(errors.latest_version)}
            onChange={(v) => setForm({ ...form, latest_version: v })}
          />
        </Field>

        <Field id="minimum-version" label="최소 버전" hint="이 버전보다 낮은 앱은 아래에서 고른 대로 처리해요." error={errors.minimum_version}>
          <VersionInput
            id="minimum-version"
            label="최소 버전"
            value={form.minimum_version}
            disabled={!editable}
            invalid={Boolean(errors.minimum_version)}
            onChange={(v) => setForm({ ...form, minimum_version: v })}
          />
        </Field>

        <div className={editable ? "" : "pointer-events-none opacity-50"}>
          <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">최소 버전보다 낮은 앱은</p>
          <SegmentedControl<string>
            value={form.force_update}
            onChange={(v) => setForm({ ...form, force_update: v })}
            options={[
              { label: "업데이트해야 써요", value: "true" },
              { label: "나중에 해도 돼요", value: "false" },
            ]}
          />
        </div>

        <SaveBar
          dirty={dirty}
          disabled={hasError || !editable}
          onReset={() => setForm(saved)}
          onReview={() => {
            clear();
            setReviewing(true);
          }}
        />
      </div>

      {reviewing && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={describeChanges(values, changes)}
          warnings={warnings}
          danger={warnings.length > 0}
          note={TIMING}
          pending={pending}
          error={error}
          onClose={() => setReviewing(false)}
          onConfirm={() => run(changes, () => setReviewing(false))}
        />
      )}
    </SectionCard>
  );
}

// ── 광고 ─────────────────────────────────────────────────────

const AD_ROWS = [
  { key: "ads_enabled", label: "전체 광고", hint: "끄면 모든 광고가 사라져요.", scene: null },
  { key: "community_ads_enabled", label: "커뮤니티 광고", hint: "모집 글 목록에 5개마다 나와요.", scene: "community-ad" },
  { key: "game_end_ads_enabled", label: "게임 종료 광고", hint: "게임을 마치고 나갈 때 전면으로 나와요.", scene: "game-end-ad" },
] as const;

function AdsPanel({ values, canEdit, apply, onDraft, adScene, onAdScene }: Shared & { adScene: AdScene; onAdScene: (s: AdScene) => void }) {
  const [target, setTarget] = useState<AppConfigChanges | null>(null);
  const { pending, error, run, clear } = useApply(apply);
  const editable = canEdit(AD_ROWS.map((r) => r.key));
  const globalOn = values.ads_enabled === "true";

  const targetJson = target ? JSON.stringify(target) : "";
  useEffect(() => onDraft(targetJson ? (JSON.parse(targetJson) as AppConfigChanges) : {}), [onDraft, targetJson]);

  return (
    <SectionCard title="광고" flush>
      <div className="px-5 pt-4">
        <Intro>광고에 문제가 생겼을 때 급히 끄거나 다시 켤 수 있어요. 줄을 누르면 오른쪽에서 어디에 나오는지 볼 수 있어요.</Intro>
      </div>
      <div className="mt-2 divide-y divide-sd-hairline">
        {AD_ROWS.map((row) => {
          const on = values[row.key] === "true";
          const hiddenByGlobal = row.key !== "ads_enabled" && !globalOn;
          const shown = row.scene === adScene;
          return (
            <div key={row.key} className={`flex items-start justify-between gap-4 px-5 py-4 ${shown ? "bg-sd-fill" : ""}`}>
              <button
                type="button"
                disabled={!row.scene}
                aria-pressed={row.scene ? shown : undefined}
                onClick={() => {
                  if (row.scene) onAdScene(row.scene);
                }}
                className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span id={`${row.key}-label`} className="block text-[14px] font-semibold text-sd-fg">
                  {row.label}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-sd-fg-subtle">
                  {hiddenByGlobal ? "전체 광고가 꺼져 있어 지금은 안 보여요." : row.hint}
                </span>
              </button>
              {/* 스위치는 누르면 바로 바뀌는 부품이라, 저장 버튼 대신 눌렀을 때 확인창을 연다 */}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-labelledby={`${row.key}-label`}
                disabled={!editable}
                onClick={() => {
                  clear();
                  if (row.scene) onAdScene(row.scene);
                  setTarget({ [row.key]: on ? "false" : "true" });
                }}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${on ? "bg-accent" : "bg-sd-gray-400"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sd-surface shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>

      {target && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={describeChanges(values, target)}
          warnings={warningsFor(values, target)}
          danger={warningsFor(values, target).length > 0}
          note="앱을 열어 둔 사용자에게도 반영돼요. 최대 1시간 걸릴 수 있어요."
          pending={pending}
          error={error}
          onClose={() => setTarget(null)}
          onConfirm={() => run(target, () => setTarget(null))}
        />
      )}
    </SectionCard>
  );
}

// ── 배너 ─────────────────────────────────────────────────────

type BannerForm = Pick<AppConfigValues, "banner_enabled" | "banner_image_url" | "banner_link_url">;

function BannerPanel({ values, canEdit, apply, onDraft }: Shared) {
  const saved: BannerForm = {
    banner_enabled: values.banner_enabled,
    banner_image_url: values.banner_image_url,
    banner_link_url: values.banner_link_url,
  };
  const savedLinkMode = values.banner_link_url ? "url" : "none";
  const [form, setForm] = useState(saved);
  const [linkMode, setLinkMode] = useState<"none" | "url">(savedLinkMode);
  const [reviewing, setReviewing] = useState(false);
  const { pending, error, run, clear } = useApply(apply);
  const editable = canEdit(["banner_enabled", "banner_image_url", "banner_link_url"]);

  const after = { ...form, banner_link_url: linkMode === "url" ? form.banner_link_url : "" };
  const changes = diffAppConfig(values, after);
  const dirty = Object.keys(changes).length > 0 || linkMode !== savedLinkMode;
  const errors = dirty ? validateAppConfig({ ...values, ...after }) : {};
  // 고른 직후의 빈칸은 틀린 게 아니라 아직 안 쓴 것이라 빨갛게 하지 않고 적용만 막는다
  const linkEmpty = linkMode === "url" && !form.banner_link_url;
  const linkError = linkMode === "url" && !linkEmpty ? errors.banner_link_url : undefined;
  const hasError = Boolean(errors.banner_image_url || linkError || linkEmpty);

  const afterJson = JSON.stringify(after);
  useEffect(() => onDraft(JSON.parse(afterJson) as BannerForm), [onDraft, afterJson]);

  return (
    <SectionCard title="홈 배너">
      <div className="space-y-4">
        <Intro>홈 화면에 띄우는 이벤트 이미지를 바꿔요. 이미지를 올리면 오른쪽에서 바로 볼 수 있어요.</Intro>

        <div className={editable ? "" : "pointer-events-none opacity-50"}>
          <SegmentedControl<string>
            value={form.banner_enabled}
            onChange={(v) => setForm({ ...form, banner_enabled: v })}
            options={[
              { label: "표시하기", value: "true" },
              { label: "숨기기", value: "false" },
            ]}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">이미지</p>
          <BannerImagePicker value={form.banner_image_url} onChange={(url) => setForm({ ...form, banner_image_url: url })} disabled={!editable} />
          {errors.banner_image_url && (
            <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
              {errors.banner_image_url}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">눌렀을 때</p>
          <div className={editable ? "" : "pointer-events-none opacity-50"}>
            <SegmentedControl<"none" | "url">
              value={linkMode}
              onChange={setLinkMode}
              options={[
                { label: "이동 안 함", value: "none" },
                { label: "주소로 이동", value: "url" },
              ]}
            />
          </div>
          {linkMode === "url" && (
            <div className="mt-2">
              <label htmlFor="banner-link" className="sr-only">
                이동할 주소
              </label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <HttpsUrlInput
                    id="banner-link"
                    value={form.banner_link_url}
                    onChange={(url) => setForm({ ...form, banner_link_url: url })}
                    disabled={!editable}
                    invalid={Boolean(linkError)}
                  />
                </div>
                {form.banner_link_url && !linkError && (
                  <a href={form.banner_link_url} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] font-semibold text-accent hover:underline">
                    열어 보기
                  </a>
                )}
              </div>
              {linkError && (
                <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
                  {linkError}
                </p>
              )}
            </div>
          )}
        </div>

        <SaveBar
          dirty={dirty}
          disabled={hasError || !editable || Object.keys(changes).length === 0}
          onReset={() => {
            setForm(saved);
            setLinkMode(savedLinkMode);
          }}
          onReview={() => {
            clear();
            setReviewing(true);
          }}
        />
      </div>

      {reviewing && (
        <ChangeDialog
          title="이대로 적용할까요?"
          items={describeChanges(values, changes)}
          note="홈 화면을 열어 둔 사용자에게도 바로 반영돼요."
          pending={pending}
          error={error}
          onClose={() => setReviewing(false)}
          onConfirm={() => run(changes, () => setReviewing(false))}
        />
      )}
    </SectionCard>
  );
}

// ── 변경 이력 ────────────────────────────────────────────────

function History({ state }: { state: AppConfigState }) {
  if (state.history.length === 0) return null;
  return (
    <SectionCard
      title="변경 이력"
      flush
      right={
        <a href={CONSOLE_HISTORY} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-accent hover:underline">
          콘솔에서 되돌리기
        </a>
      }
    >
      <ul className="divide-y divide-sd-hairline">
        {state.history.map((v) => (
          <li key={v.number} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-3">
            <p className="min-w-0 break-words text-[14px] text-sd-fg-muted">{v.description || "Firebase 콘솔에서 바꿨어요"}</p>
            <p className="shrink-0 text-[12px] tabular-nums text-sd-fg-subtle">
              버전 {v.number} · {formatDateTime(v.updateTime)}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
