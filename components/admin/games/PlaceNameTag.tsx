/**
 * 플레이 구역 카드 머리에 붙는 동네 이름(BE #241, #315). 지도를 보기 전에 어디서 한 판인지 먼저 읽힌다.
 * 상세는 칸이 넉넉해 시도까지 다 보여 준다. 목록은 lib/admin/gameExtras.ts shortPlaceName 으로 줄인다
 */
export function PlaceNameTag({ name }: { name: string }) {
  return (
    <span title="플레이 구역 가운데의 동네" className="max-w-[60vw] truncate text-[13px] font-semibold text-sd-fg-muted sm:max-w-xs">
      {name}
    </span>
  );
}
