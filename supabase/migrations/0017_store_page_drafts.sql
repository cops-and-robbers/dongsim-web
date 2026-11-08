-- 어드민 스토어 페이지 초안.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 마케터와 디자이너가 스토어에 보내기 전에 고치는 문구를 칸마다 한 줄씩 둔다.
-- 지금 스토어에 있는 문구는 여기 두지 않고 스토어에서 읽는다. 스토어와 같아진 칸의 줄은 지운다.

create table if not exists store_page_drafts (
  platform   text not null check (platform in ('ios', 'android')),
  lang       text not null check (lang in ('ko', 'en', 'ja')),
  field      text not null,
  value      text not null,
  updated_by text not null,
  updated_at timestamptz not null default now(),
  primary key (platform, lang, field)
);

grant all on store_page_drafts to service_role;
alter table store_page_drafts enable row level security;
