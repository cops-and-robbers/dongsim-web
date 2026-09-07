/**
 * 유튜브 (ADR-0051 · ADR-0054).
 *
 * 플레이어를 바로 끼운다 (팀원 결정: 썸네일 대기 화면 없이 프레임이 바로 보이게).
 * `loading="lazy"` 라 화면에 들어오기 전에는 유튜브 요청이 나가지 않고,
 * `youtube-nocookie.com` 이라 재생 전에는 추적 쿠키도 덜 남는다.
 *
 * 쇼츠(세로 영상)는 16:9 칸에 넣으면 양옆이 검은 띠가 된다.
 * 9:16 세로 칸을 좁게 세워 가운데 둔다 - 폰에서 보는 쇼츠와 같은 생김새다.
 *
 * 제목과 채널은 **동기화가 이미 받아 마크다운에 박아 둔 것**을 그대로 받는다.
 * 이 화면은 유튜브에 아무것도 묻지 않는다(ADR-0054).
 */

/**
 * 재생 파라미터.
 *
 * `hl`·`cc_lang_pref` 로 플레이어를 한국어로 연다. 넣지 않으면 도구 설명과 자막이
 * 방문자와 상관없는 언어로 뜬다 - 한국어 글을 읽다가 영어 플레이어를 만나게 된다.
 *
 * `rel=0` 은 관련 영상을 없애지 못한다. 2018년부터 **같은 채널로 좁힐 뿐**이다.
 * 그래도 남의 채널로 끌려가는 것보다는 낫다.
 *
 * `color=white` 로 진행 막대의 빨강을 지운다. 이 화면에 빨강은 어디에도 없다.
 * `autoplay` 는 넣지 않는다 - 글을 읽는데 소리부터 나면 안 된다.
 */
const PARAMS = new URLSearchParams({
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
 * 예전에 올린 글이면 이것이 그대로 남아 있는데, iframe 의 title 로는
 * 일반 명칭이 낫다.
 */
const PLACEHOLDER = /^(video|영상|youtube|유튜브)$/i;

export function YouTube({
  id,
  title,
  channel,
  vertical = false,
}: {
  id: string;
  title?: string;
  channel?: string;
  vertical?: boolean;
}) {
  const named = title?.trim() && !PLACEHOLDER.test(title.trim()) ? title.trim() : undefined;
  const label = named ?? "유튜브 영상";

  const frame = (
    <iframe
      src={`${ORIGIN}/embed/${id}?${PARAMS}`}
      title={label}
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
      className="absolute inset-0 size-full border-0"
    />
  );

  if (vertical) {
    return (
      <div className="my-6">
        <div className="relative mx-auto aspect-[9/16] w-2/3 max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-app-black-900">
          {frame}
        </div>
        {named && (
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            {named}
            {channel ? ` · ${channel}` : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-app-black-900">
      <div className="relative aspect-video">{frame}</div>
      {named && (
        <div className="border-t border-slate-200 dark:border-white/10 px-4 py-3">
          <span className="block text-[15px] font-medium leading-snug text-brand-ink dark:text-white">
            {named}
          </span>
          {channel && (
            <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">
              {channel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
