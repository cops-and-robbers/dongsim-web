"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, ScrollPage, SectionCard } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { useToast } from "@/components/admin/Toast";
import { DownloadIcon } from "@/components/admin/icons";
import { Chips } from "@/components/admin/company/fields";
import { CaptionFields, IconFields, LinkFields, TitleFields, type IconLibrary, type LinksState } from "@/components/admin/qr-print/Fields";
import { fetchAssets } from "@/lib/admin/assetsClient";
import type { Asset } from "@/lib/event/assets";
import { Preview } from "@/components/admin/qr-print/Preview";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { BRAND, SITE_URL } from "@/lib/constants";
import type { MetricsLink } from "@/lib/download/links";
import { MODULE_WARN_MM, loadFonts, type DrawReport, type Fonts } from "@/lib/qr-print/draw";
import { downloadPdf, downloadPng, fileBase } from "@/lib/qr-print/export";
import { PRESETS, isOpenableUrl, linkUrl, preset, type DoubleRow, type LinkChoice, type PresetId, type Sheet } from "@/lib/qr-print/layout";

// QR 인쇄물 (docs/qr-print.md).
// 디자이너가 만든 A6 QR 틀 그대로, 문구와 링크와 아이콘만 바꿔 인쇄용 PDF 로 받는다.
// 틀, 무늬, 캐릭터, 로고, 자리는 고정이다. 사람이 고르는 건 틀 종류, 문구, 찍으면 열릴 곳뿐이다.

const URLS = { site: SITE_URL, instagram: BRAND.instagram, youtube: BRAND.youtube };

async function call(url: string): Promise<Response> {
  const send = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

/** 아직 QR 에 담을 주소가 없는 칸 */
function missingLinks(sheet: Sheet): number {
  const bad = (l: LinkChoice) => !linkUrl(l, SITE_URL) || (l.kind === "url" && !isOpenableUrl(l.url));
  return sheet.layout === "single" ? Number(bad(sheet.link)) : sheet.rows.filter((r) => bad(r.link)).length;
}

type Bleed = "0" | "1" | "2" | "3";

const titleOf = (sheet: Sheet) => (sheet.layout === "single" ? sheet.title : sheet.rows[0].title).filter(Boolean).join(" ");

export default function QrPrintPage() {
  const toast = useToast();
  const [presetId, setPresetId] = useState<PresetId>("event");
  const [sheet, setSheet] = useState<Sheet>(() => preset("event", URLS));
  const [links, setLinks] = useState<LinksState>({ state: "loading" });
  const [library, setLibrary] = useState<IconLibrary>({ state: "loading", icons: [], writable: false });
  const [fonts, setFonts] = useState<Fonts | null>(null);
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const [bleed, setBleed] = useState<Bleed>("0");
  const [report, setReport] = useState<DrawReport | null>(null);

  useEffect(() => {
    let alive = true;
    call("/api/admin/metrics/links")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as MetricsLink[] | null;
        if (!alive) return;
        setLinks(res.ok && Array.isArray(body) ? { state: "ready", links: body } : { state: "failed" });
      })
      .catch(() => alive && setLinks({ state: "failed" }));
    return () => {
      alive = false;
    };
  }, []);

  // 그림 보관함의 QR 아이콘(#296). 숨긴 것은 빼고 새것부터
  useEffect(() => {
    let alive = true;
    fetchAssets()
      .then((d) => alive && setLibrary({ state: "ready", icons: d.assets.filter((a) => a.kind === "icon" && !a.archived), writable: d.writable }))
      .catch(() => alive && setLibrary({ state: "failed", icons: [], writable: false }));
    return () => {
      alive = false;
    };
  }, []);
  const onUploaded = useCallback((a: Asset) => setLibrary((l) => ({ ...l, icons: [a, ...l.icons] })), []);

  const onFonts = useCallback((f: Fonts) => setFonts(f), []);
  const onReport = useCallback((r: DrawReport) => setReport(r), []);
  const denseQr = report?.qr.filter((q) => q.moduleMm < MODULE_WARN_MM) ?? [];

  const choosePreset = (id: PresetId) => {
    setPresetId(id);
    setSheet(preset(id, URLS));
  };

  const setRow = (i: 0 | 1, row: DoubleRow) => setSheet((s) => (s.layout === "double" ? { ...s, rows: (i === 0 ? [row, s.rows[1]] : [s.rows[0], row]) as [DoubleRow, DoubleRow] } : s));

  const missing = useMemo(() => missingLinks(sheet), [sheet]);

  const save = async (kind: "pdf" | "png") => {
    if (missing > 0) {
      toast(sheet.layout === "single" ? "찍으면 열릴 곳을 먼저 정해 주세요." : `찍으면 열릴 곳이 ${missing}칸 비어 있어요.`);
      return;
    }
    setBusy(kind);
    try {
      const input = { sheet, siteUrl: SITE_URL, fonts: fonts ?? (await loadFonts()) };
      const name = fileBase(titleOf(sheet));
      const mm = Number(bleed);
      await (kind === "pdf" ? downloadPdf(input, name, mm) : downloadPng(input, name, mm));
      toast(kind === "pdf" ? "PDF를 받았어요. 인쇄 전에 실제 크기로 뽑아 폰으로 찍어 봐 주세요." : "PNG를 받았어요.");
    } catch (e) {
      toast((e as Error).message || "파일을 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollPage>
      <PageHeader
        title="QR 인쇄물"
        description="디자이너가 만든 A6 QR 틀에 문구와 링크만 바꿔 인쇄용 PDF로 받아요."
        actions={
          <>
            <Button variant="neutral" onClick={() => save("png")} disabled={busy !== null}>
              {busy === "png" ? "만드는 중" : "PNG"}
            </Button>
            <Button onClick={() => save("pdf")} disabled={busy !== null}>
              <DownloadIcon className="h-4 w-4" />
              {busy === "pdf" ? "만드는 중" : "PDF 받기"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <div className="mx-auto max-w-[420px]">
            <Preview sheet={sheet} siteUrl={SITE_URL} onFonts={onFonts} onReport={onReport} />
            <p className="mt-2 text-center text-[12px] text-sd-fg-subtle">
              A6 (105 x 148.5mm){bleed !== "0" && `, 재단 여백 사방 ${bleed}mm`}, 600dpi로 받아요
            </p>
            {(report?.shrunk.length || denseQr.length) ? (
              <div className="mt-3 space-y-2">
                {report?.shrunk.map((l) => (
                  <Callout key={l.where} variant="warning" title={`${l.where}이 길어 글자가 ${Math.round(l.k * 100)}%로 작아졌어요`}>
                    줄을 나누거나 조금 줄여 주세요. 멀리서 읽기 어려워요.
                  </Callout>
                ))}
                {denseQr.map((q) => (
                  <Callout key={q.where} variant="warning" title={`${q.where}이 촘촘해요 (한 칸 ${q.moduleMm.toFixed(2)}mm)`}>
                    주소가 길어서 그래요. 행사 링크를 만들어 짧은 주소로 바꾸면 점이 커져 더 잘 읽혀요.
                  </Callout>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          {fonts?.titleFallback && (
            <Callout variant="warning" title="제목 글꼴 파일이 아직 없어요">
              카페24 아네모네 대신 Pretendard로 그렸어요. 글꼴 파일을 넣으면 원본과 같은 모양으로 바뀌어요.
            </Callout>
          )}

          <SectionCard title="틀">
            <Chips<PresetId> label="틀" options={PRESETS.map((p) => ({ value: p.id, label: p.label }))} value={presetId} onChange={choosePreset} />
            <p className="mt-2 text-[12px] text-sd-fg-subtle">틀을 바꾸면 그 틀의 처음 문구로 돌아가요.</p>
          </SectionCard>

          {sheet.layout === "single" ? (
            <SectionCard title="내용">
              <div className="space-y-5">
                <TitleFields value={sheet.title} onChange={(title) => setSheet({ ...sheet, title })} />
                <LinkFields value={sheet.link} onChange={(link) => setSheet({ ...sheet, link })} links={links} siteUrl={SITE_URL} />
                <CaptionFields value={sheet.caption} onChange={(caption) => setSheet({ ...sheet, caption })} />
              </div>
            </SectionCard>
          ) : (
            ([0, 1] as const).map((i) => {
              const row = sheet.rows[i];
              return (
                <SectionCard key={i} title={i === 0 ? "위 칸" : "아래 칸"}>
                  <div className="space-y-5">
                    <IconFields value={row.icon} onChange={(icon) => setRow(i, { ...row, icon })} library={library} onUploaded={onUploaded} />
                    <TitleFields value={row.title} onChange={(title) => setRow(i, { ...row, title })} />
                    <LinkFields value={row.link} onChange={(link) => setRow(i, { ...row, link })} links={links} siteUrl={SITE_URL} />
                    <CaptionFields value={row.caption} onChange={(caption) => setRow(i, { ...row, caption })} />
                  </div>
                </SectionCard>
              );
            })
          )}

          <SectionCard title="인쇄">
            <Chips<Bleed>
              label="재단 여백"
              options={[
                { value: "0", label: "여백 없음" },
                { value: "1", label: "사방 1mm" },
                { value: "2", label: "사방 2mm" },
                { value: "3", label: "사방 3mm" },
              ]}
              value={bleed}
              onChange={setBleed}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
              인쇄소에 맡길 땐 그곳이 말하는 재단 여백을 골라요. 바깥 파란 테두리를 그만큼 더 칠해서, 자를 때 밀려도 흰 줄이 생기지 않아요. 직접 뽑을 땐 여백 없음으로 받아 실제 크기로 인쇄해요.
            </p>
          </SectionCard>
        </div>
      </div>
    </ScrollPage>
  );
}
