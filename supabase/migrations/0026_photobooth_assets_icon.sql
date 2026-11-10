-- 그림 보관함에 QR 아이콘도 둔다 (#296).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 디자이너가 QR 인쇄물(어드민 콘텐츠 > QR 인쇄물)에 쓸 아이콘을 올려 두고, 누구나 계속 골라 쓴다.
-- 파일은 프레임, 캐릭터와 같은 R2 photobooth 버킷 assets/icon/ 에 둔다. SVG 는 캐릭터처럼 정리한 뒤 올린다.

alter table photobooth_assets drop constraint if exists photobooth_assets_kind_check;
alter table photobooth_assets add constraint photobooth_assets_kind_check
  check (kind in ('frame', 'character', 'icon'));

alter table photobooth_assets drop constraint if exists photobooth_assets_key_check;
alter table photobooth_assets add constraint photobooth_assets_key_check
  check (key ~ '^assets/(frame/[a-z0-9-]+\.png|(character|icon)/[a-z0-9-]+\.(png|webp|svg))$');
