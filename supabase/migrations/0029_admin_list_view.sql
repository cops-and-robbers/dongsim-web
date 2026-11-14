-- 유저, 게임 목록을 어떤 모양으로 볼지 사람마다 고른 값 (docs/admin-ui.md "목록 보기 고르기").
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- split: 목록과 상세 두 칸(상세는 오른쪽에서 바뀐다)
-- table: 표(줄을 누르면 전체 화면 상세로 간다)
-- 비어 있으면(null) 두 칸으로 본다.

alter table admin_members add column if not exists list_view text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_members_list_view_check') then
    alter table admin_members add constraint admin_members_list_view_check check (list_view is null or list_view in ('split', 'table'));
  end if;
end $$;
