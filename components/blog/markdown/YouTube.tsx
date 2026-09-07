"use client";

import { useState } from "react";
import { preconnect } from "react-dom";

/**
 * 유튜브 (ADR-0051 · ADR-0054).
 *
 * 영상을 링크로만 두면 아무도 누르지 않는다. 그렇다고 `<iframe>` 을 바로 심으면
 * 유튜브의 스크립트 묶음이 문서와 함께 내려온다 — 한 편에 1MB 가까이 되고,
 * 읽기만 하고 재생하지 않는 사람이 대부분인데 그 값을 모두가 치른다.
 *
 * 그래서 **누르기 전에는 그림 한 장**만 둔다. 썸네일과 재생 단추를 우리가 그리고,
 * 누른 뒤에야 `<iframe>` 을 끼운다. 안 누르면 비용은 이미지 하나다.
 *
 * `youtube-nocookie.com` 을 쓴다. 재생하기 전까지는 유튜브가 방문자를 알 수 없고,
 * 재생한 뒤에도 추적 쿠키를 덜 남긴다. 읽으러 온 사람에게 그 대가를 미리 물릴 이유가 없다.
 *
 * 썸네일은 유튜브에서 바로 받는다. 우리 R2 로 옮길 수도 있지만, 그러면 동기화가
 * 유튜브 주소를 따라다니며 그림을 굽는 일까지 해야 한다 — 영상 하나 붙이자고
 * 동기화에 새 실패 지점을 만들 이유가 없다.
 *
 * 제목과 채널은 **동기화가 이미 받아 마크다운에 박아 둔 것**을 그대로 받는다.
 * 이 화면은 유튜브에 아무것도 묻지 않는다(ADR-0054).
 */

/**
 * 재생 파라미터.
 *
 * `hl`·`cc_lang_pref` 로 플레이어를 한국어로 연다. 넣지 않으면 도구 설명과 자막이
 * 방문자와 상관없는 언어로 뜬다 — 한국어 글을 읽다가 영어 플레이어를 만나게 된다.
 *
 * `rel=0` 은 관련 영상을 없애지 못한다. 2018년부터 **같은 채널로 좁힐 뿐**이다.
 * 그래도 남의 채널로 끌려가는 것보다는 낫다.
 *
 * `color=white` 로 진행 막대의 빨강을 지운다. 이 화면에 빨강은 어디에도 없다.
 *
 * `modestbranding` 은 넣지 않는다. **2023-08-15 에 폐지돼 아무 효과가 없다** —
 * 효과 없는 값을 남겨 두면 다음 사람이 "이미 처리했다"고 믿는다.
 */
const PLAY = new URLSearchParams({
  autoplay: "1",
  hl: "ko",
  cc_lang_pref: "ko",
  playsinline: "1",
  rel: "0",
  color: "white",
}).toString();

const ORIGIN = "https://www.youtube-nocookie.com";

/**
 * 제목 자리에 쓸 수 없는 텍스트.
 *
 * 노션이 주는 기본 링크 텍스트다. 동기화가 제목을 받아오지 못했거나
 * 예전에 올린 글이면 이것이 그대로 남아 있는데, 화면에 "video" 한 줄을 띄우느니
 * 그림만 보여주는 편이 낫다.
 */
const PLACEHOLDER = /^(video|영상|youtube|유튜브)$/i;

export function YouTube({ id, title, channel }: { id: string; title?: string; channel?: string }) {
  const [playing, setPlaying] = useState(false);
  /*
    `maxresdefault` 는 1280px 이고 레터박스가 없다. 본문 폭에서 선명한 유일한 크기다.
    다만 2010년 즈음 이전 영상에는 없다 — 없으면 `hqdefault` 로 물러난다.
    `hqdefault` 는 480×360 의 4:3 이라 위아래에 검은 띠가 있는데,
    16:9 칸에 `object-cover` 로 채우면 그 띠가 잘려 나가 그림만 남는다.
  */
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);

  const named = title?.trim() && !PLACEHOLDER.test(title.trim()) ? title.trim() : undefined;
  const label = named ?? "유튜브 영상";

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-app-black-900">
      <div className="relative aspect-video">
        {playing ? (
          <iframe
            src={`${ORIGIN}/embed/${id}?${PLAY}`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            // 누를 것 같으면 미리 연결해 둔다. 누른 뒤에 손을 대면 그만큼 늦는다
            onMouseEnter={() => preconnect(ORIGIN)}
            onFocus={() => preconnect(ORIGIN)}
            aria-label={`${label} 재생`}
            className="group absolute inset-0 size-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
              alt=""
              aria-hidden
              loading="lazy"
              className="size-full object-cover"
            />
            {/*
              재생 단추. 유튜브의 빨간 단추를 그대로 쓰지 않는다 —
              이 화면에서 빨강은 어디에도 없어서 혼자 튄다.
              대신 우리 악센트로 그리고, 흐린 막을 깔아 어떤 썸네일 위에서도 보이게 한다.
            */}
            <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/35" />
            <span className="absolute left-1/2 top-1/2 flex size-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-blue dark:bg-brand-green shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="ml-[3px]">
                <path d="M7 4.5v15l13-7.5z" fill="#000" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {/*
        제목이 있을 때만 띠를 단다. 무엇을 누르는지 알려주는 것이 이 줄의 전부라,
        보여줄 것이 없으면 빈 띠를 남기지 않는다.
      */}
      {/*
        `<figure>` 로 감싸고 싶지만 그러지 않는다. `.prose figure img` 가 그림에 테두리와
        모서리를 다시 얹고, `.prose figcaption` 이 이 띠를 가운데 정렬된 회색 글씨로 바꾼다 —
        둘 다 본문 그림을 위해 만든 규칙이라 여기서는 방해만 된다.
      */}
      {named && (
        <div className="border-t border-slate-200 dark:border-white/10 px-4 py-3">
          <span className="block text-[15px] font-medium leading-snug text-brand-ink dark:text-white">
            {named}
          </span>
          {channel && <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">{channel}</span>}
        </div>
      )}
    </div>
  );
}
