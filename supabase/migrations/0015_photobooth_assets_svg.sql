-- 그림 보관함 캐릭터에 SVG 도 받는다 (#227).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 올리는 SVG 는 서버가 그리는 데 필요한 것만 남겨 새로 짓고(lib/event/svgSafe.ts), 내줄 때 스크립트를 막는 헤더를 붙인다.
-- 프레임은 그대로 PNG 만(투명한 칸을 재고 사진과 합성한다).

alter table photobooth_assets drop constraint if exists photobooth_assets_key_check;
alter table photobooth_assets add constraint photobooth_assets_key_check
  check (key ~ '^assets/(frame/[a-z0-9-]+\.png|character/[a-z0-9-]+\.(png|webp|svg))$');
