// 셔터 효과음 - public/photobooth/shutter.mp3 재생.

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio("/photobooth/shutter.mp3");
    audio.preload = "auto";
    audio.volume = 0.7;
  }
  return audio;
}

/** 셔터음 한 번 재생(연속 촬영 대비 매번 처음부터). */
export function playShutter() {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    // 재생 실패는 무시(소리만 없을 뿐 촬영엔 영향 없음)
  }
}
