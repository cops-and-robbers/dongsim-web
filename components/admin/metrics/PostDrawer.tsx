"use client";

import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { TrendChart } from "@/components/admin/metrics/TrendChart";
import type { PostRow } from "@/lib/metrics/dashboard/data";
import { dailyGains, earlyShare, type PostMetric } from "@/lib/metrics/dashboard/posts";
import { MIN_REACH, engagementOf, smallReach } from "@/lib/metrics/dashboard/engagement";
import { Tooltip } from "@/components/admin/Tooltip";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

/** 썸네일 주소. 인스타 이미지 주소는 며칠 뒤 만료돼서 열 때마다 서버에 묻는다(/api/admin/metrics/post-media) */
async function fetchThumb(id: string): Promise<string | null> {
  const send = () => fetch(`/api/admin/metrics/post-media?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` } });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  if (!res.ok) return null;
  return ((await res.json().catch(() => ({}))) as { imageUrl?: string | null }).imageUrl ?? null;
}

/** 본 사람이 적은 게시물의 반응률 설명. 표와 상세 창의 툴팁이 같이 쓴다 */
export function SmallReachNote({ reach }: { reach: number }) {
  return (
    <>
      <span className="font-bold">참고만 해요</span>
      <span className="mt-0.5 block text-sd-fg-muted">
        본 사람이 {reach.toLocaleString("ko-KR")}명으로 {MIN_REACH}명보다 적어서, 몇 명만 반응해도 반응률이 크게 뛰어요.
      </span>
    </>
  );
}

/**
 * 게시물 하나의 상세 (#145). 지표 화면의 게시물 표에서 줄을 누르면 오른쪽에서 열린다(폰에서는 아래에서).
 *
 * - 위: 어떤 게시물인지(썸네일, 피드/릴스, 올린 날, 캡션 첫 줄, 인스타에서 열기). 캡션 전문은 펼쳐 본다.
 *   게시물을 통째로 띄우는 인스타 임베드는 쓰지 않는다. 무겁고 추적 쿠키가 따라오며, 좁은 창에서 깨지거나 로그인 화면이 뜬다
 * - 가운데: 하루에 늘어난 숫자 추세. 지표를 바꿔 볼 수 있다. 올린 뒤 3일 안에 붙은 몫도 적는다
 * - 아래: 지금까지의 누적 숫자
 *
 * 수집기가 매일 아침 찍는 누적값의 차이로 그린다(dashboard/posts.ts). 인스타 API 는 게시물의 하루 숫자를
 * 따로 주지 않아, 기록을 시작한 날(2026-10-06) 전은 그릴 수 없다.
 * Esc 나 바깥을 누르면 닫히고, 닫으면 눌렀던 줄로 초점이 돌아간다.
 */

const METRICS: { label: string; value: PostMetric }[] = [
  { label: "조회수", value: "views" },
  { label: "본 사람", value: "reach" },
  { label: "공유", value: "shares" },
  { label: "프로필 방문", value: "profileVisits" },
];

const fmt = (n: number | null) => (n === null ? "-" : Math.round(n).toLocaleString("ko-KR"));
const md = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
};
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

export function PostDrawer({ post, onClose }: { post: PostRow; onClose: () => void }) {
  const isReel = post.productType === "REELS";
  // 릴스는 인스타가 프로필 방문을 주지 않는다
  const options = METRICS.filter((m) => !(isReel && m.value === "profileVisits"));
  const [metric, setMetric] = useState<PostMetric>("views");
  const closeRef = useRef<HTMLButtonElement>(null);
  // 썸네일: undefined 는 받는 중, null 은 못 받음
  const [thumb, setThumb] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    fetchThumb(post.id)
      .then((url) => alive && setThumb({ id: post.id, url }))
      .catch(() => alive && setThumb({ id: post.id, url: null }));
    return () => {
      alive = false;
    };
  }, [post.id]);
  const thumbUrl = thumb?.id === post.id ? thumb.url : undefined;
  const postedDay = seoulDay(post.postedAt);
  const gains = dailyGains(post.series, metric);
  const early = earlyShare(post.series, postedDay, metric);
  const er = engagementOf(post);
  const metricLabel = options.find((o) => o.value === metric)?.label ?? "";
  const caption = post.caption?.trim() || "(캡션 없음)";

  // onClose 는 부모가 그릴 때마다 새로 만들어져서, 효과가 다시 돌며 초점을 빼앗지 않게 ref 로 든다
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cells: [string, string][] = [
    ["조회수", fmt(post.views)],
    ["본 사람", fmt(post.reach)],
    ["반응률", er === null ? "-" : `${(er * 100).toFixed(1)}%`],
    ["공유", fmt(post.shares)],
    ["저장", fmt(post.saved)],
    ["팔로우", fmt(post.follows)],
    ["프로필 방문", fmt(post.profileVisits)],
    ["링크 클릭", fmt(post.bioLinkClicks)],
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="게시물 상세"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border border-sd-line bg-sd-surface shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[520px] sm:rounded-none sm:rounded-l-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-sd-hairline px-5 py-4">
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            aria-label="인스타에서 게시물 보기"
            className="h-[90px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-sd-gray-200"
          >
            {thumbUrl ? (
              // 인스타 CDN 주소는 날마다 바뀌고 서명이 붙어 next/image 최적화를 거치지 않는다
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className={`block h-full w-full ${thumbUrl === undefined ? "animate-pulse" : ""}`} />
            )}
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-sd-fg-subtle">
              {isReel ? "릴스" : "피드"}, {md(postedDay)} 올림
            </p>
            <p className="mt-1 line-clamp-2 text-[15px] font-bold text-sd-fg">{caption.split(/\r?\n/).find((l) => l.trim()) ?? caption}</p>
            <a href={post.permalink} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[13px] text-accent hover:underline">
              인스타에서 보기
            </a>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-lg px-2 py-1 text-[13px] text-sd-fg-subtle transition-colors hover:bg-sd-gray-200 hover:text-sd-fg"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {caption.split(/\r?\n/).length > 1 || caption.length > 60 ? (
            <details className="group mb-4 rounded-xl bg-sd-fill px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-sd-fg-muted">
                캡션 전체 보기
                <span className="text-sd-fg-subtle transition-transform group-open:rotate-90" aria-hidden>
                  ›
                </span>
              </summary>
              <p className="mt-2 whitespace-pre-line break-words text-[13px] leading-relaxed text-sd-fg">{caption}</p>
            </details>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold text-sd-fg">{metric === "reach" ? "하루에 새로 본 사람" : `하루에 늘어난 ${metricLabel}`}</h3>
            <SegmentedControl options={options} value={metric} onChange={setMetric} />
          </div>
          <div className="mt-4">
            {gains.days.length === 0 ? (
              <div className="rounded-xl bg-sd-fill px-4 py-6 text-center text-[13px] leading-relaxed text-sd-fg-muted">
                기록이 쌓이는 중이에요.
                <br />
                매일 아침 누적 숫자를 찍어서, 이틀치가 모이면 하루에 늘어난 양을 그려요.
                {post.series[0] && <span className="mt-1 block text-sd-fg-subtle">{md(post.series[0].day)}부터 기록하고 있어요</span>}
              </div>
            ) : (
              <TrendChart days={gains.days} series={[{ label: metricLabel, values: gains.values }]} unit={metric === "views" ? "회" : ""} />
            )}
          </div>
          {early !== null && (
            <p className="mt-3 text-[13px] text-sd-fg-muted">
              지금까지 {metricLabel} 중 <b className="text-sd-fg">{Math.round(early * 100)}%</b>가 올린 뒤 3일 안에 나왔어요.
            </p>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
            매일 아침 9시쯤 찍은 누적 숫자의 차이예요. 인스타그램은 게시물의 지난 날짜별 숫자를 주지 않아 기록을 시작하기 전은 비어 있어요.
          </p>

          <h3 className="mt-6 text-[14px] font-bold text-sd-fg">지금까지 누적</h3>
          <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline sm:grid-cols-4">
            {cells.map(([k, v]) => (
              <div key={k} className="bg-sd-surface px-3 py-3">
                <dt className="text-[12px] text-sd-fg-muted">{k}</dt>
                {/* 본 사람이 적은 게시물의 반응률은 흐린 색으로만 구분하고, 이유는 마우스를 올리면 보인다 */}
                <dd className="mt-0.5 text-[18px] font-bold text-sd-fg">
                  {k === "반응률" && smallReach(post) ? (
                    <Tooltip content={<SmallReachNote reach={post.reach ?? 0} />} className="text-sd-fg-subtle">
                      {v}
                    </Tooltip>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] text-sd-fg-subtle">
            본 사람은 게시물을 한 번이라도 본 계정 수예요. 반응률은 본 사람 중 좋아요, 댓글, 저장, 공유를 한 비율이에요.
            {smallReach(post) ? ` 이 게시물은 본 사람이 ${MIN_REACH}명보다 적어 몇 명만 반응해도 크게 뛰어서 반응률은 참고만 해요.` : ""}
            {isReel ? " 릴스는 인스타그램이 프로필 방문과 링크 클릭을 주지 않아요." : ""}
          </p>
        </div>
      </div>
    </>
  );
}
