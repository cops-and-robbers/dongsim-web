// GA4 커스텀 이벤트를 GTM dataLayer로 보낸다.
// 코드는 dataLayer에 밀어넣기만 하고, 실제 GA4 전송은 GTM의 GA4 이벤트 태그가
// 이 event 이름을 트리거로 받아 포워딩한다(대시보드에서 1회 설정 필요).
// SSR이나 광고 차단 등으로 dataLayer가 없을 수 있으니 방어적으로 초기화한다.
type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(event: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}
