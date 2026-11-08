"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PhoneFrame } from "@/components/game/PhoneMockup";
import { PREVIEW_FONT, slotOf, STAGE_WIDTH, type Slot, type Surface } from "@/lib/store-page/display";
import { videoThumb, type Art, type FieldId, type Platform, type Values } from "@/lib/store-page/fields";

// 스토어 페이지 화면 오른쪽의 폰 (docs/admin-ui.md "스토어 페이지"). 운영진만 보는 미리보기다.
// 실제 스토어 앱 캡처(iPhone App Store, Galaxy Google Play, 2026-11-07)를 픽셀로 잰 값으로 앱 화면과 같게 그리고,
// 폰 크기에 맞춰 통째로 줄인다. 그래서 줄바꿈과 잘리는 자리가 앱과 같다. 스토어 화면은 늘 밝은 화면으로 그린다.

const IOS = { text: "#000", gray: "#8a8a8e", blue: "#007aff", line: "#e5e5ea" };
const PLAY = { text: "#1f1f1f", gray: "#444746", blue: "#0b57d0", line: "#c4c7c5", tint: "#e9eef6" };

const SPOT: CSSProperties = { outline: "3px solid #339DFF", outlineOffset: 3, borderRadius: 6 };

function slotStyle(slot: Slot): CSSProperties {
  return {
    width: slot.width,
    fontSize: slot.fontSize,
    lineHeight: `${slot.lineHeight}px`,
    fontWeight: slot.fontWeight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    whiteSpace: slot.preLine ? "pre-line" : "normal",
    ...(slot.maxLines === null ? {} : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: slot.maxLines, overflow: "hidden" }),
  };
}

function Text({ platform, field, surface, value, spot, color }: { platform: Platform; field: FieldId; surface: Surface; value: string; spot: FieldId | null; color: string }) {
  const slot = slotOf(platform, field, surface);
  const ref = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    if (ref.current) setCut(ref.current.scrollHeight > ref.current.clientHeight + 1);
  }, [value, slot]);
  if (!slot) return null;
  const on = spot === field;
  return (
    <div style={{ position: "relative", width: slot.width }}>
      <div ref={ref} data-spot={on ? "on" : undefined} data-slot={`${field}-${surface}`} style={{ ...slotStyle(slot), color, ...(on ? SPOT : {}) }}>
        {value}
      </div>
      {cut && slot.more && <span style={{ position: "absolute", right: 0, bottom: 0, paddingLeft: 24, background: "linear-gradient(90deg,transparent,#fff 18px)", color: IOS.blue, fontSize: slot.fontSize, lineHeight: `${slot.lineHeight}px` }}>더 보기</span>}
    </div>
  );
}

function Img({ src, style }: { src: string | null | undefined; style: CSSProperties }) {
  // 스토어 이미지는 외부 주소 그대로 쓴다
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" style={style} /> : <span style={{ display: "block", background: "#e5e7eb", ...style }} />;
}

function Shots({ art, width, height, gap, left, radius, first }: { art: Art; width: number; height: number; gap: number; left: number; radius: number; first?: ReactNode }) {
  const urls: (string | null)[] = art.screenshots.length ? art.screenshots : [null, null, null];
  return (
    <div style={{ display: "flex", gap, paddingLeft: left, overflow: "hidden" }}>
      {first}
      {urls.map((u, i) => (
        <Img key={u ?? i} src={u} style={{ width, height, flex: "none", objectFit: "cover", borderRadius: radius }} />
      ))}
    </div>
  );
}

const Icon = ({ d, size = 24, color = "currentColor", width = 2 }: { d: string; size?: number; color?: string; width?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const PATH = {
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  back: "M15 5l-7 7 7 7",
  share: "M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
  chevron: "M9 5l7 7-7 7",
  arrowBack: "M20 12H5M11 5l-7 7 7 7",
  arrow: "M4 12h15M13 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  close: "M6 6l12 12M18 6L6 18",
  today: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h8M8 12h8",
  rocket: "M5 19c1-3 2-4 4-5l1 1c-1 2-2 3-5 4zM9 12c1-5 5-9 11-9 0 6-4 10-9 11z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  arcade: "M12 11V5M9 3.5a3 3 0 1 0 6 0M4 15l8-4 8 4-8 4z",
  game: "M7 7h10a5 5 0 0 1 5 5v3a3 3 0 0 1-5.5 1.6L15 14H9l-1.5 2.6A3 3 0 0 1 2 15v-3a5 5 0 0 1 5-5z",
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  book: "M6 3h12v18l-6-4-6 4z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};

function Stars({ size }: { size: number }) {
  return <span style={{ color: IOS.gray, fontSize: size, letterSpacing: -0.5 }}>★★★★★</span>;
}

function GetButton() {
  return <span style={{ flex: "none", background: "#eef0f5", color: IOS.blue, borderRadius: 999, padding: "6px 22px", fontSize: 15, fontWeight: 700 }}>받기</span>;
}

type ScreenProps = { v: Values; art: Art; spot: FieldId | null; go: (m: Surface) => void };

function AppStorePage({ v, art, spot }: ScreenProps) {
  const circle: CSSProperties = { width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.9)", boxShadow: "0 1px 6px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center" };
  const stat = (label: string, big: ReactNode, small: ReactNode, last = false) => (
    <div style={{ width: 105, flex: "none", textAlign: "center", borderRight: last ? "none" : `1px solid ${IOS.line}` }}>
      <p style={{ fontSize: 10, lineHeight: "14px", color: IOS.gray }}>{label}</p>
      <div style={{ fontSize: 20, lineHeight: "30px", fontWeight: 700, color: IOS.gray }}>{big}</div>
      <div style={{ fontSize: 10.5, lineHeight: "14px", color: IOS.gray }}>{small}</div>
    </div>
  );
  return (
    <div style={{ background: "#fff", paddingBottom: 110 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 16px", height: 44 }}>
        <span style={circle}>
          <Icon d={PATH.back} size={22} color="#000" />
        </span>
        <span style={circle}>
          <Icon d={PATH.share} size={20} color="#000" />
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, padding: "20px 20px 0" }}>
        <Img src={art.icon} style={{ width: 118, height: 118, borderRadius: 27, flex: "none", border: "1px solid rgba(0,0,0,.06)" }} />
        <div style={{ display: "flex", flexDirection: "column", minHeight: 118 }}>
          <Text platform="ios" field="name" surface="page" value={v.name ?? ""} spot={spot} color={IOS.text} />
          <p style={{ marginTop: 6, fontSize: 14, lineHeight: "18px", color: IOS.gray }}>{art.developer}</p>
          <div style={{ marginTop: "auto" }}>
            <GetButton />
          </div>
        </div>
      </div>
      <div style={{ margin: "20px 20px 0", borderTop: `1px solid ${IOS.line}`, borderBottom: `1px solid ${IOS.line}`, padding: "14px 0", overflow: "hidden" }}>
        <div style={{ display: "flex" }}>
          {stat(`${art.ratingCount ?? 0}개의 평가`, art.rating?.toFixed(1) ?? "-", <Stars size={11} />)}
          {stat("연령 등급", art.age ?? "-", "앱 내 제어")}
          {stat("카테고리", "⚽", art.category ?? "")}
          {stat("개발자", "◉", art.developer ?? "", true)}
        </div>
      </div>
      <div style={{ padding: "14px 20px 0" }}>
        <p style={{ fontSize: 18.9, lineHeight: "24px", fontWeight: 700, color: IOS.text }}>새로운 소식 ›</p>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 13.2, lineHeight: "18px", color: IOS.gray }}>
          <span>버전 3.2.8</span>
          <span>오늘</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Text platform="ios" field="whatsNew" surface="page" value={v.whatsNew ?? ""} spot={spot} color={IOS.text} />
        </div>
      </div>
      <p style={{ padding: "26px 20px 0", fontSize: 18.9, lineHeight: "24px", fontWeight: 700, color: IOS.text }}>미리 보기</p>
      <div style={{ marginTop: 16 }}>
        <Shots art={art} width={227.5} height={495} gap={10.6} left={20} radius={28} />
      </div>
      <p style={{ margin: "12px 20px 0", paddingBottom: 14, borderBottom: `1px solid ${IOS.line}`, fontSize: 13.2, lineHeight: "18px", fontWeight: 600, color: IOS.gray }}>iPhone</p>
      {v.promotionalText && (
        <div data-spot={spot === "promotionalText" ? "on" : undefined} style={{ margin: "20px 20px 0", fontSize: 13.2, lineHeight: "24px", color: IOS.text, wordBreak: "keep-all", whiteSpace: "pre-line", ...(spot === "promotionalText" ? SPOT : {}) }}>
          {v.promotionalText}
        </div>
      )}
      <div style={{ padding: "20px 20px 0" }}>
        <Text platform="ios" field="description" surface="page" value={v.description ?? ""} spot={spot} color={IOS.text} />
      </div>
    </div>
  );
}

function AppStoreSearch({ v, art, spot }: ScreenProps) {
  return (
    <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 20px 0" }}>
        <div style={{ flex: 1, height: 40, borderRadius: 20, background: "#f2f2f4", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", fontSize: 15, color: "#000" }}>
          <Icon d={PATH.search} size={18} color="#000" />
          경찰과 도둑
        </div>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: "#f2f2f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={PATH.close} size={18} color="#000" />
        </span>
      </div>
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Img src={art.icon} style={{ width: 60, height: 60, borderRadius: 13, flex: "none", border: "1px solid rgba(0,0,0,.06)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text platform="ios" field="name" surface="search" value={v.name ?? ""} spot={spot} color={IOS.text} />
            <Text platform="ios" field="subtitle" surface="search" value={v.subtitle ?? ""} spot={spot} color={IOS.gray} />
          </div>
          <GetButton />
        </div>
        <div style={{ marginTop: 15, display: "flex", justifyContent: "space-between", fontSize: 11, lineHeight: "14px", fontWeight: 600, color: IOS.gray }}>
          <span>
            <Stars size={11} />
            {art.ratingCount ?? 0}
          </span>
          <span>{art.developer}</span>
          <span>{art.category}</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Shots art={art} width={111} height={241} gap={9.5} left={0} radius={14} />
        </div>
      </div>
    </div>
  );
}

function PlayBar({ title }: { title?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 20px", gap: 20, color: PLAY.text }}>
      <Icon d={PATH.arrowBack} size={24} color={PLAY.text} />
      {title && <span style={{ fontSize: 16 }}>{title}</span>}
      <span style={{ marginLeft: "auto", fontSize: 22, lineHeight: "22px" }}>⋮</span>
    </div>
  );
}

/** Play 앱 상세의 첫 칸. 등록한 YouTube 영상의 썸네일 위에 재생 버튼이 있다 */
function PlayVideo({ url, on }: { url: string | undefined; on: boolean }) {
  const thumb = videoThumb(url);
  if (!thumb) return null;
  return (
    <div data-spot={on ? "on" : undefined} style={{ position: "relative", width: 294.8, height: 165.7, flex: "none", ...(on ? SPOT : {}) }}>
      <Img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      <span style={{ position: "absolute", left: "50%", top: "50%", width: 56, height: 56, marginLeft: -28, marginTop: -28, borderRadius: 28, background: "rgba(60,64,67,.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" width={30} height={30} fill="#fff" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </div>
  );
}

/** 설치 전 화면의 왼쪽 칸. 기기마다 다르고 읽어 올 공개 경로가 없어 캡처의 값을 그대로 쓴다 */
const PLAY_SIZE = "26MB";

function PlayStat({ center, children }: { center: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: center, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", whiteSpace: "nowrap" }}>{children}</div>;
}

/** 이름이 한 줄을 넘는지. 넘으면 앱이 화면 구성을 바꾼다 */
function useWraps(value: string): { wraps: boolean; probe: ReactNode } {
  const slot = slotOf("android", "title", "page")!;
  const ref = useRef<HTMLDivElement>(null);
  const [wraps, setWraps] = useState(false);
  useLayoutEffect(() => {
    if (ref.current) setWraps(ref.current.offsetHeight > slot.lineHeight * 1.5);
  }, [value, slot]);
  return { wraps, probe: <div ref={ref} aria-hidden style={{ ...slotStyle(slot), position: "absolute", visibility: "hidden", pointerEvents: "none" }}>{value || " "}</div> };
}

/** 이름이 길 때의 머리. 개발자 이름, 큰 이름, 아이콘과 숫자 줄 순서다(캡처) */
function PlayLongHead({ v, art, spot }: Pick<ScreenProps, "v" | "art" | "spot">) {
  const stat = (top: ReactNode, bottom: string) => (
    <div style={{ flex: "none", width: 83, color: PLAY.gray, fontSize: 10.9, lineHeight: "20px" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: PLAY.text }}>{top}</div>
      {bottom}
    </div>
  );
  return (
    <>
      <p style={{ padding: "0 24px", fontSize: 15.7, lineHeight: "22px", fontWeight: 500, color: PLAY.blue }}>{art.developer}</p>
      <div style={{ padding: "8px 24px 0" }}>
        <Text platform="android" field="title" surface="pageLong" value={v.title ?? ""} spot={spot} color={PLAY.text} />
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 0 0 24px", gap: 12 }}>
        <Img src={art.icon} style={{ width: 48, height: 48, borderRadius: 11, flex: "none", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        {stat(<span style={{ color: "#f29900", fontWeight: 600 }}>⑫</span>, "12세 이상")}
        {stat(<Icon d={PATH.download} size={14} color={PLAY.text} />, PLAY_SIZE)}
        {stat(art.downloads ?? "-", "다운로드")}
      </div>
    </>
  );
}

function PlayPage({ v, art, spot, go }: ScreenProps) {
  const { wraps, probe } = useWraps(v.title ?? "");
  return (
    <div style={{ background: "#fff", paddingBottom: 130, position: "relative" }}>
      {probe}
      <PlayBar />
      {wraps ? (
        <PlayLongHead v={v} art={art} spot={spot} />
      ) : (
        <>
      <div style={{ display: "flex", gap: 25.6, padding: "4px 24px 0" }}>
        <Img src={art.icon} style={{ width: 72, height: 72, borderRadius: 16, flex: "none", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        <div>
          <Text platform="android" field="title" surface="page" value={v.title ?? ""} spot={spot} color={PLAY.text} />
          <p style={{ marginTop: 6, fontSize: 12.7, lineHeight: "18px", fontWeight: 500, color: PLAY.blue }}>{art.developer}</p>
        </div>
      </div>
      <div style={{ position: "relative", height: 40, marginTop: 22, color: PLAY.gray, fontSize: 12.5, lineHeight: "20px" }}>
        <PlayStat center={71}>
          <Icon d={PATH.download} size={16} color={PLAY.text} />
          <div>{PLAY_SIZE}</div>
        </PlayStat>
        <span style={{ position: "absolute", left: 133, top: 8, height: 24, width: 1, background: PLAY.line }} />
        <PlayStat center={196}>
          <div style={{ fontWeight: 600, color: "#f29900" }}>⑫</div>
          <div>12세 이상</div>
        </PlayStat>
        <span style={{ position: "absolute", left: 259, top: 8, height: 24, width: 1, background: PLAY.line }} />
        <PlayStat center={322}>
          <div style={{ fontWeight: 700, color: PLAY.text }}>{art.downloads ?? "-"}</div>
          <div>다운로드</div>
        </PlayStat>
      </div>
        </>
      )}
      <div style={{ margin: wraps ? "16px 24px 0" : "32px 24px 0", height: 40, borderRadius: 20, background: PLAY.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500 }}>설치</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 24px 0" }}>
        <p style={{ fontSize: 16.3, lineHeight: "24px", fontWeight: 500, color: PLAY.text }}>앱 정보</p>
        <button type="button" aria-label="세부정보 보기" onClick={() => go("details")} style={{ width: 28, height: 32, borderRadius: 16, border: 0, cursor: "pointer", background: PLAY.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={PATH.arrow} size={16} color={PLAY.text} />
        </button>
      </div>
      <div style={{ padding: "26px 24px 0" }}>
        <Text platform="android" field="shortDescription" surface="page" value={v.shortDescription ?? ""} spot={spot} color={PLAY.gray} />
      </div>
      {art.category && <span style={{ display: "inline-block", margin: "32px 24px 0", padding: "0 16px", height: 32, lineHeight: "30px", border: `1px solid ${PLAY.line}`, borderRadius: 9, fontSize: 13, color: PLAY.gray }}>{art.category}</span>}
      <div style={{ marginTop: 22 }}>
        <Shots art={art} width={93} height={165.7} gap={13} left={24} radius={8} first={<PlayVideo url={v.video} on={spot === "video"} />} />
      </div>
    </div>
  );
}

function PlaySearch({ v, art, spot }: ScreenProps) {
  // 앱에서 검색 결과의 화살표를 연 화면이 기본이다. 영상과 스크린샷까지 보여서 고칠 때 더 쓸모 있다
  const [open, setOpen] = useState(true);
  const chip: CSSProperties = { flex: "none", height: 32, lineHeight: "30px", padding: "0 14px", border: `1px solid ${PLAY.line}`, borderRadius: 9, fontSize: 13, color: PLAY.gray };
  const round: CSSProperties = { width: 28, height: 32, borderRadius: 16, background: PLAY.tint, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" };
  const installs = art.downloads?.replace("회", "");
  return (
    <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 130 }}>
      <PlayBar title="경찰과 도둑" />
      <div style={{ display: "flex", gap: 8, padding: "8px 24px 0", overflow: "hidden" }}>
        {["평점", "가족", "프리미엄", "New", "게임패스"].map((c) => (
          <span key={c} style={chip}>
            {c}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16.7, padding: "29px 24px 0" }}>
        <Img src={art.icon} style={{ width: 56, height: 56, borderRadius: 12, flex: "none", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text platform="android" field="title" surface="search" value={v.title ?? ""} spot={spot} color={PLAY.text} />
          <p style={{ fontSize: 11.5, lineHeight: "18px", color: PLAY.gray }}>
            {art.developer}
            {art.category ? ` • ${art.category}` : ""}
          </p>
          {open && installs && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 18, marginTop: 2, padding: "0 7px", borderRadius: 9, background: PLAY.tint, fontSize: 12.4, color: PLAY.gray }}>
              <Icon d={PATH.download} size={12} color={PLAY.blue} />
              {installs}
            </span>
          )}
        </div>
        <button type="button" aria-expanded={open} aria-label={open ? "접기" : "펼치기"} onClick={() => setOpen((o) => !o)} style={{ ...round, marginTop: 10, border: 0, cursor: "pointer", transform: open ? "rotate(180deg)" : undefined }}>
          <Icon d={PATH.down} size={16} color={PLAY.text} />
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 14.6 }}>
          <Shots art={art} width={93} height={165.7} gap={13} left={24} radius={8} first={<PlayVideo url={v.video} on={spot === "video"} />} />
        </div>
      )}
      {[0, 1].map((i) => (
        <div key={i} aria-hidden style={{ display: "flex", alignItems: "center", gap: 16.7, padding: `${i === 0 && open ? 34.5 : 24}px 24px 0` }}>
          <span style={{ width: 56, height: 56, borderRadius: 12, background: "#eceff3", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <span style={{ display: "block", width: 150, height: 13, borderRadius: 4, background: "#eceff3" }} />
            <span style={{ display: "block", width: 100, height: 10, borderRadius: 4, background: "#f1f3f6", marginTop: 8 }} />
          </div>
          <span style={round}>
            <Icon d={PATH.down} size={16} color={PLAY.gray} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** 앱 정보의 화살표를 누르면 나오는 세부정보. 간단한 설명 다음에 빈 줄 하나를 두고 자세한 설명이 끝까지 이어진다 */
function PlayDetails({ v, art, spot, go }: ScreenProps) {
  return (
    <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 60 }}>
      <div style={{ display: "flex", alignItems: "center", height: 50, borderBottom: `1px solid ${PLAY.line}`, padding: "0 0 0 20px" }}>
        <button type="button" aria-label="앱 상세로 돌아가기" onClick={() => go("page")} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <Icon d={PATH.arrowBack} size={20} color={PLAY.text} />
        </button>
        <Img src={art.icon} style={{ width: 31, height: 31, borderRadius: 7, flex: "none", marginLeft: 18 }} />
        <div style={{ marginLeft: 22, minWidth: 0 }}>
          <p style={{ fontSize: 14.9, lineHeight: "20px", fontWeight: 500, color: PLAY.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</p>
          <p style={{ fontSize: 11.2, lineHeight: "15px", color: PLAY.gray }}>세부정보</p>
        </div>
      </div>
      <div style={{ padding: "21px 24px 0" }}>
        <p style={{ fontSize: 14.9, lineHeight: "22px", fontWeight: 500, color: PLAY.text }}>앱 정보</p>
        <div style={{ marginTop: 18 }}>
          <Text platform="android" field="shortDescription" surface="details" value={v.shortDescription ?? ""} spot={spot} color={PLAY.gray} />
        </div>
        <div style={{ marginTop: 21 }}>
          <Text platform="android" field="fullDescription" surface="details" value={v.fullDescription ?? ""} spot={spot} color={PLAY.gray} />
        </div>
      </div>
    </div>
  );
}

function IosTabs() {
  const items = [
    ["투데이", PATH.today],
    ["게임", PATH.rocket],
    ["앱", PATH.layers],
    ["Arcade", PATH.arcade],
    ["검색", PATH.search],
  ] as const;
  return (
    <div style={{ margin: "0 21px 22px", height: 61, borderRadius: 31, background: "rgba(250,250,252,.95)", boxShadow: "0 2px 12px rgba(0,0,0,.14)", display: "flex", alignItems: "center", padding: "0 4px" }}>
      {items.map(([label, d], i) => (
        <div key={label} style={{ flex: 1, height: 53, borderRadius: 27, background: i === 4 ? "#e3e3e8" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: i === 4 ? IOS.blue : "#000", fontSize: 10, fontWeight: 600 }}>
          <Icon d={d} size={23} color={i === 4 ? IOS.blue : "#000"} />
          {label}
        </div>
      ))}
    </div>
  );
}

function PlayTabs() {
  const items = [
    ["게임", PATH.game],
    ["앱", PATH.apps],
    ["검색", PATH.search],
    ["도서", PATH.book],
    ["내 페이지", PATH.user],
  ] as const;
  return (
    <div style={{ background: "#eff1f7", height: 112, display: "flex", padding: "6px 0 0" }}>
      {items.map(([label, d], i) => (
        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", fontSize: 12, lineHeight: "20px", color: i === 2 ? PLAY.blue : PLAY.gray, fontWeight: i === 2 ? 600 : 500 }}>
          <span style={{ width: 56, height: 32, borderRadius: 16, background: i === 2 ? "#c2e7ff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={d} size={22} color={i === 2 ? PLAY.blue : PLAY.gray} />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

/** 앱 폭의 무대를 폰 폭에 맞춰 통째로 줄인다. 고치는 칸이 보이도록 알아서 스크롤한다. 아래 탭은 앱처럼 화면에 붙어 있다 */
function Stage({ width, spot, watch, tabs, children }: { width: number; spot: FieldId | null; watch: string; tabs: ReactNode; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.68);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    const el = box.current;
    const on = inner.current?.querySelector<HTMLElement>('[data-spot="on"]');
    if (!el || !inner.current) return;
    const top = on ? on.getBoundingClientRect().top - inner.current.getBoundingClientRect().top : 0;
    el.scrollTo({ top: Math.max(top - el.clientHeight / 3, 0), behavior: "smooth" });
  }, [spot, watch]);

  return (
    <>
      <div ref={box} className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none]">
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0" style={{ width, transform: `scale(${scale})`, transformOrigin: "bottom left" }}>
        {tabs}
      </div>
    </>
  );
}

export function StorePreview({ platform, mode, values, art, spot, onMode }: { platform: Platform; mode: Surface; values: Values; art: Art; spot: FieldId | null; onMode: (m: Surface) => void }) {
  const Screen = platform === "ios" ? (mode === "search" ? AppStoreSearch : AppStorePage) : mode === "search" ? PlaySearch : mode === "details" ? PlayDetails : PlayPage;
  const tabs = mode === "details" ? null : platform === "ios" ? <IosTabs /> : <PlayTabs />;
  return (
    <div className="mx-auto w-full max-w-[300px] lg:max-w-[clamp(220px,calc((100svh_-_250px)*9/19),300px)]">
      <PhoneFrame clock="9:41" unbounded>
        <div className="relative h-full" style={{ fontFamily: PREVIEW_FONT }}>
          <Stage width={STAGE_WIDTH[platform]} spot={spot} watch={`${platform}-${mode}`} tabs={tabs}>
            <Screen v={values} art={art} spot={spot} go={onMode} />
          </Stage>
        </div>
      </PhoneFrame>
    </div>
  );
}
