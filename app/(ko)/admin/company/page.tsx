"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { Callout } from "@/components/admin/Callout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { AuditCard, CandidatesCard, PeopleCard, RecordsCard } from "@/components/admin/company/Boards";
import { CompanyPreview } from "@/components/admin/company/CompanyPreview";
import { PersonForm } from "@/components/admin/company/PersonForm";
import { RecordForm } from "@/components/admin/company/RecordForm";
import type { Edit, PersonEdit, RecordEdit } from "@/components/admin/company/types";
import { CompanyConflict, DuplicateName, fetchCompany, removePerson, removeRecord, savePerson, saveRecord, skipEvent } from "@/lib/admin/companyClient";
import type { Candidate, CompanyBundle } from "@/lib/company/adminApi";
import {
  attendanceCounts,
  boardOf,
  nextQaRound,
  qaTitle,
  todayKst,
  type CompanyRecord,
  type CreditPerson,
  type RecordBoard,
  type RecordDraft,
} from "@/lib/company/model";

// 동심지키미 소개: 걸어온 길, 수상 이력, 고마운 분들 (#250).
// 왼쪽에서 고치면 오른쪽에 저장 전 값으로 실제 화면이 그려진다(docs/admin-ui.md "운영 화면 원칙", "회사 소개").

type Tab = RecordBoard | "people";

const EMPTY = { ko: "", en: "", ja: "" };
const SAVED = "저장했어요. 1분 안에 사이트와 앱에 보여요";

const blankRecord = (board: RecordBoard): RecordDraft => ({
  kind: board === "history" ? "event" : "award",
  occurredOn: todayKst(),
  precision: "day",
  title: EMPTY,
  badge: EMPTY,
  visible: true,
  eventId: null,
  attendees: [],
});

const openRecord = (row: CompanyRecord): RecordEdit => ({
  type: "record",
  id: row.id,
  version: row.version,
  updatedBy: row.updatedBy,
  updatedAt: row.updatedAt,
  newNames: [],
  draft: { kind: row.kind, occurredOn: row.occurredOn, precision: row.precision, title: row.title, badge: row.badge, visible: row.visible, eventId: row.eventId, attendees: row.attendees },
});

const openPerson = (row: CreditPerson): PersonEdit => ({
  type: "person",
  id: row.id,
  version: row.version,
  updatedBy: row.updatedBy,
  updatedAt: row.updatedAt,
  sameNameOk: false,
  duplicate: false,
  draft: { name: row.name, role: row.role, github: row.github, priorCount: row.priorCount, visible: row.visible },
});

const snapshot = (edit: Edit | null) => (edit ? JSON.stringify(edit.type === "record" ? [edit.draft, edit.newNames] : edit.draft) : "");
const message = (e: unknown) => (e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요.");

export default function CompanyPage() {
  const [bundle, setBundle] = useState<CompanyBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("history");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [baseline, setBaseline] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const toast = useToast();

  const dirty = snapshot(edit) !== baseline;
  const editingRef = useRef(false);
  useEffect(() => {
    editingRef.current = edit !== null;
  }, [edit]);

  const load = useCallback(() => {
    fetchCompany()
      .then((next) => {
        setBundle(next);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(message(e)));
  }, []);

  // 다른 관리자가 바꿨을 수 있으니 돌아올 때마다 다시 읽는다. 고치는 중에는 입력을 흔들지 않는다(저장할 때 버전으로 막는다)
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !editingRef.current) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const begin = (next: Edit) => {
    setEdit(next);
    setBaseline(snapshot(next));
    setError(undefined);
    setNotice(null);
  };

  /** 저장하지 않은 입력이 있으면 먼저 묻는다 */
  const guarded = (next: () => void) => {
    if (dirty) setLeave(() => next);
    else next();
  };
  const close = () => {
    setEdit(null);
    setBaseline("");
    setError(undefined);
  };

  const onConflict = (e: unknown) => {
    close();
    setNotice(message(e));
    load();
  };

  const save = async () => {
    if (!edit) return;
    setPending(true);
    setError(undefined);
    try {
      const next =
        edit.type === "record" ? await saveRecord(edit.id, edit.draft, edit.version, edit.newNames) : await savePerson(edit.id, edit.draft, edit.version, edit.sameNameOk);
      setBundle(next);
      close();
      toast(SAVED);
    } catch (e) {
      if (e instanceof CompanyConflict) onConflict(e);
      else if (e instanceof DuplicateName && edit.type === "person") {
        setEdit({ ...edit, duplicate: true });
        setError(e.message);
      } else setError(message(e));
    } finally {
      setPending(false);
    }
  };

  const destroy = async () => {
    if (!edit || edit.id === null) return;
    setPending(true);
    try {
      setBundle(edit.type === "record" ? await removeRecord(edit.id, edit.version) : await removePerson(edit.id, edit.version));
      close();
      setConfirmDelete(false);
      toast("지웠어요");
    } catch (e) {
      setConfirmDelete(false);
      if (e instanceof CompanyConflict) onConflict(e);
      else setError(message(e));
    } finally {
      setPending(false);
    }
  };

  const useCandidate = (item: Candidate) => {
    if (!bundle) return;
    const qa = item.category === "test";
    begin({
      type: "record",
      id: null,
      version: 0,
      newNames: [],
      draft: {
        ...blankRecord("history"),
        kind: qa ? "qa" : "event",
        occurredOn: item.day,
        title: qa ? qaTitle(nextQaRound(bundle.records)) : { ...EMPTY, ko: item.label },
        eventId: item.id,
      },
    });
  };

  const skip = async (item: Candidate) => {
    setBusyId(item.id);
    try {
      setBundle(await skipEvent(item.id));
      toast("올릴 일정에서 뺐어요");
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusyId(null);
    }
  };

  const switchTab = (next: Tab) =>
    guarded(() => {
      close();
      setTab(next);
    });

  const addRecord = (board: RecordBoard) => begin({ type: "record", id: null, version: 0, newNames: [], draft: blankRecord(board) });
  const addPerson = () => begin({ type: "person", id: null, version: 0, sameNameOk: false, duplicate: false, draft: { name: "", role: "qa", github: "", priorCount: 0, visible: true } });

  const canSave = edit !== null && (edit.id === null || dirty);
  const deleteName = edit?.type === "person" ? edit.draft.name : "";

  return (
    <ScrollPage>
      <PageHeader title="동심지키미 소개" description="동심지키미 소개 페이지의 이력과 앱 크레딧 명단을 고쳐요. 저장하면 1분 안에 사이트와 앱에 보여요." />

      <div className="mb-5">
        <SegmentedControl
          options={[
            { value: "history" as const, label: "걸어온 길" },
            { value: "awards" as const, label: "수상과 선정" },
            { value: "people" as const, label: "고마운 분들" },
          ]}
          value={tab}
          onChange={switchTab}
        />
      </div>

      {!bundle && !loadError && <p className="py-14 text-center text-[14px] text-sd-fg-subtle">불러오는 중이에요</p>}
      {!bundle && loadError && <ErrorBlock message={loadError} onRetry={load} />}

      {bundle && (
        <div className="space-y-5">
          {process.env.NODE_ENV !== "production" && <Callout>테스트용 화면이에요. 여기서 바꿔도 실제 사이트에는 적용되지 않아요.</Callout>}
          {!bundle.writable && <Callout variant="warning">여기서는 내용을 볼 수만 있어요. 실제 사이트의 관리 화면에서 바꿔 주세요.</Callout>}
          {notice && <Callout variant="warning">{notice}</Callout>}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="min-w-0 space-y-5">
              {edit?.type === "record" ? (
                <RecordForm
                  edit={edit}
                  records={bundle.records}
                  people={bundle.people}
                  writable={bundle.writable}
                  pending={pending}
                  error={error}
                  canSave={canSave}
                  onChange={setEdit}
                  onBack={() => guarded(close)}
                  onSave={save}
                  onDelete={() => setConfirmDelete(true)}
                />
              ) : edit?.type === "person" ? (
                <PersonForm
                  edit={edit}
                  attended={edit.id === null ? 0 : (attendanceCounts(bundle.records).get(edit.id) ?? 0)}
                  writable={bundle.writable}
                  pending={pending}
                  error={error}
                  canSave={canSave}
                  onChange={setEdit}
                  onBack={() => guarded(close)}
                  onSave={save}
                  onDelete={() => setConfirmDelete(true)}
                />
              ) : tab === "people" ? (
                <>
                  <PeopleCard people={bundle.people} records={bundle.records} writable={bundle.writable} onAdd={addPerson} onOpen={(p) => begin(openPerson(p))} />
                  <AuditCard rows={bundle.audit} />
                </>
              ) : (
                <>
                  {tab === "history" && <CandidatesCard items={bundle.candidates} writable={bundle.writable} busyId={busyId} onUse={useCandidate} onSkip={skip} />}
                  <RecordsCard board={tab} records={bundle.records} writable={bundle.writable} onAdd={() => addRecord(tab)} onOpen={(r) => begin(openRecord(r))} />
                  <AuditCard rows={bundle.audit} />
                </>
              )}
            </div>
            <CompanyPreview board={edit?.type === "record" ? boardOf(edit.draft.kind) : tab} records={bundle.records} people={bundle.people} edit={edit} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        pending={pending}
        title={edit?.type === "person" ? `${deleteName}님을 완전히 지울까요?` : "이 이력을 지울까요?"}
        message={
          edit?.type === "person"
            ? "이름과 GitHub 주소, 참여 기록이 바로 지워져요. 되돌릴 수 없어요. 수정 기록에도 이름이 남지 않아요. 잠깐 가리려면 \"사이트와 앱에 보이기\"를 꺼 주세요."
            : "사이트에서 바로 사라지고 되돌릴 수 없어요. 잠깐 가리려면 \"사이트에 보이기\"를 꺼 주세요."
        }
        confirmText={edit?.type === "person" ? "완전히 지우기" : "지우기"}
        onConfirm={destroy}
        onClose={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={leave !== null}
        title="저장하지 않은 내용이 있어요"
        message="지금 나가면 고친 내용이 사라져요."
        confirmText="버리고 나가기"
        cancelText="계속 고치기"
        danger
        onConfirm={() => {
          leave?.();
          close();
          setLeave(null);
        }}
        onClose={() => setLeave(null)}
      />
    </ScrollPage>
  );
}
