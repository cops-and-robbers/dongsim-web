"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PreviewPane } from "@/components/admin/ops/PreviewPane";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { RecordColumn } from "@/components/team/TeamRecordsSection";
import CreditsCard from "@/components/team/CreditsCard";
import { getMessages } from "@/lib/i18n/messages";
import { renderCreditsEmbedHtml } from "@/lib/credits/embed-html";
import {
  LOCALES,
  boardOf,
  creditHelpers,
  missingLocales,
  normalizePerson,
  normalizeRecord,
  participation,
  attendanceCounts,
  publicHelpers,
  publicRecords,
  type CompanyRecord,
  type CreditPerson,
  type RecordBoard,
  type RecordLocale,
} from "@/lib/company/model";
import { LOCALE_KOREAN, LOCALE_NAME } from "./fields";
import type { Edit } from "./types";

// 오른쪽 "사용자에게 이렇게 보여요" (#250). 손으로 그린 그림이 아니라 소개 페이지, 구성원 페이지, 앱 크레딧의 실제 코드를
// 저장 전 값으로 그린다. 고치는 줄은 파란 테두리로 짚는다(행사 미리보기와 같은 색).

export type Surface = "records" | "people" | "app";
type Theme = "light" | "dark";

const NEW_ID = -1;
const SURFACE_LABEL: Record<Surface, string> = { records: "사이트", people: "사이트", app: "앱 크레딧" };

// 실제 화면의 칸 폭으로 그리고 상자에 맞춰 줄인다. 그래야 줄바꿈이 사이트와 같다
const WIDTH: Record<Exclude<Surface, "app">, number> = { records: 560, people: 720 };

function Scaled({ width, children }: { width: number; children: ReactNode }) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!box || !inner) return;
    const measure = () => {
      setBoxWidth(box.clientWidth);
      setHeight(inner.offsetHeight);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  }, [box, inner]);

  const scale = boxWidth ? Math.min(1, boxWidth / width) : 0;
  return (
    <div ref={setBox} className="w-full overflow-hidden" style={{ height: scale ? height * scale : undefined }}>
      <div ref={setInner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  );
}

const SPOT_COLOR = "#339DFF";

function Spot({ id }: { id: number | null }) {
  if (id === null) return null;
  return <style>{`[data-spot-id="${id}"]{outline:3px solid ${SPOT_COLOR};outline-offset:4px;border-radius:8px;}`}</style>;
}

/** 저장 전 값까지 합친 목록. 새로 넣는 줄과 붙여넣은 새 이름은 임시 번호로 그린다 */
function useMerged(records: CompanyRecord[], people: CreditPerson[], edit: Edit | null) {
  return useMemo(() => {
    if (!edit) return { records, people, spotRecord: null, spotPerson: null };
    if (edit.type === "person") {
      const row: CreditPerson = { ...normalizePerson(edit.draft), id: edit.id ?? NEW_ID, version: edit.version, updatedBy: "", updatedAt: "" };
      return { records, people: edit.id === null ? [...people, row] : people.map((p) => (p.id === edit.id ? row : p)), spotRecord: null, spotPerson: row.id };
    }
    const temporary: CreditPerson[] = edit.newNames.map((name, i) => ({ id: NEW_ID - 1 - i, name, role: "qa", github: "", priorCount: 0, visible: true, version: 0, updatedBy: "", updatedAt: "" }));
    const clean = normalizeRecord(edit.draft);
    const row: CompanyRecord = { ...clean, attendees: clean.kind === "qa" ? [...clean.attendees, ...temporary.map((p) => p.id)] : [], id: edit.id ?? NEW_ID, version: edit.version, updatedBy: "", updatedAt: "" };
    return { records: edit.id === null ? [...records, row] : records.map((r) => (r.id === edit.id ? row : r)), people: [...people, ...temporary], spotRecord: row.id, spotPerson: null };
  }, [records, people, edit]);
}

/** 고치는 값 때문에 이 화면에서 보이지 않는 이유 */
function noteFor(edit: Edit | null, surface: Surface, locale: RecordLocale, records: CompanyRecord[]): string | null {
  if (surface === "app") return "앱 크레딧 화면 아래쪽에서 이름이 옆으로 흘러가요. 이름 색은 참여 횟수에 따라 달라져요.";
  if (!edit) return null;
  if (edit.type === "record") {
    if (surface !== "records") return null;
    if (!edit.draft.visible) return "\"사이트에 보이기\"를 꺼서 이 줄은 사이트에 보이지 않아요.";
    if (missingLocales(edit.draft).includes(locale)) return `${LOCALE_KOREAN[locale]} 이름이 비어 있어 이 줄은 ${LOCALE_KOREAN[locale]} 페이지에 보이지 않아요.`;
    return null;
  }
  if (!edit.draft.visible) return "\"사이트와 앱에 보이기\"를 꺼서 이분은 보이지 않아요.";
  const attended = edit.id === null ? 0 : (attendanceCounts(records).get(edit.id) ?? 0);
  if (edit.draft.role === "qa" && participation(edit.draft, attended) === 0) return "참여 횟수가 0회라 아직 보이지 않아요.";
  return null;
}

export function CompanyPreview({ board, records, people, edit }: { board: RecordBoard | "people"; records: CompanyRecord[]; people: CreditPerson[]; edit: Edit | null }) {
  const [locale, setLocale] = useState<RecordLocale>("ko");
  const [theme, setTheme] = useState<Theme>("light");
  const [picked, setPicked] = useState<Surface>("records");

  // QA 회차를 고칠 때는 명단이 어떻게 바뀌는지도 볼 수 있어야 한다
  const editingQa = edit?.type === "record" && edit.draft.kind === "qa";
  const surfaces: Surface[] = board === "people" ? ["people", "app"] : editingQa ? ["records", "people", "app"] : ["records"];
  const surface = surfaces.includes(picked) ? picked : surfaces[0];

  const merged = useMerged(records, people, edit);
  const recordBoard: RecordBoard = board === "people" ? "history" : edit?.type === "record" ? boardOf(edit.draft.kind) : board;
  const copy = getMessages(locale).team.records;
  const rows = publicRecords(merged.records, locale)[recordBoard];
  const helpers = publicHelpers(merged.people, merged.records);
  const note = noteFor(edit, surface, locale, merged.records);
  const dark = theme === "dark" ? "dark" : "force-light";
  const spot = surface === "records" ? merged.spotRecord : surface === "people" ? merged.spotPerson : null;

  // 새로 고른 줄이 보이게 미리보기 안에서만 옮긴다
  useEffect(() => {
    if (spot === null) return;
    document.querySelector(`[data-preview-root] [data-spot-id="${spot}"]`)?.scrollIntoView({ block: "nearest" });
  }, [spot, surface, locale]);

  return (
    <PreviewPane>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {surfaces.length > 1 && (
          <SegmentedControl
            options={surfaces.map((value) => ({ value, label: value === "records" ? (recordBoard === "history" ? "걸어온 길" : "수상과 선정") : value === "people" ? (board === "people" ? SURFACE_LABEL.people : "고마운 분들") : SURFACE_LABEL.app }))}
            value={surface}
            onChange={setPicked}
          />
        )}
        {surface === "records" && <SegmentedControl options={LOCALES.map((value) => ({ value, label: LOCALE_NAME[value] }))} value={locale} onChange={setLocale} />}
        {surface !== "app" && (
          <SegmentedControl
            options={[
              { value: "light" as const, label: "밝게" },
              { value: "dark" as const, label: "어둡게" },
            ]}
            value={theme}
            onChange={setTheme}
          />
        )}
      </div>

      <div data-preview-root className="max-h-[calc(100dvh-220px)] overflow-y-auto overscroll-contain rounded-xl shadow-[0_0_0_1px_var(--sd-line)]">
        {surface === "app" ? (
          // 크레딧 화면은 스스로 폭에 맞춰 커지고 줄어서 줄이지 않는다. 앱 웹뷰와 같이 스크립트 없이 연다
          <iframe title="앱 크레딧 미리보기" sandbox="" srcDoc={renderCreditsEmbedHtml(creditHelpers(helpers), { thanksOnly: true })} className="block h-[420px] w-full border-0" />
        ) : (
          <div className={dark} aria-hidden inert>
            <Spot id={spot} />
            <Scaled width={WIDTH[surface]}>
              {surface === "records" ? (
                <div className="bg-slate-50 p-8 dark:bg-app-black-900">
                  <RecordColumn heading={recordBoard === "history" ? copy.historyHeading : copy.awardsHeading} items={rows} reveal={false} />
                </div>
              ) : (
                <div className="bg-white p-6 dark:bg-app-black">
                  <CreditsCard helpers={helpers} />
                </div>
              )}
            </Scaled>
          </div>
        )}
      </div>
      {note && (
        <p aria-live="polite" className="mt-3 text-center text-[13px] leading-relaxed text-sd-fg-muted">
          {note}
        </p>
      )}
    </PreviewPane>
  );
}
