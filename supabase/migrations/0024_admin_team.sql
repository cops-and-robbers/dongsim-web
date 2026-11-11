-- 어드민 운영진과 역할 (docs/admin-ui.md "운영진").
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 역할은 개요에 먼저 보일 내용만 정한다. 볼 수 있는 화면은 줄이지 않는다.
-- 구성원은 어드민에 들어온 사람이 저절로 쌓인다. 백엔드 어드민 계정을 따로 묻지 않는다.

create table if not exists admin_roles (
  key         text primary key,
  name        text not null,
  description text not null default '',
  icon        text not null,
  -- 이 역할의 개요 기본 카드. 개요 카드가 생기는 다음 단계에서 쓴다
  cards       text[] not null default '{}',
  position    integer not null default 0,
  archived_at timestamptz,
  updated_by  text not null default '',
  updated_at  timestamptz not null default now()
);

insert into admin_roles (key, name, description, icon, cards, position) values
  ('dev', '개발', '출시, 안정성, 버그', 'dev', '{crash,anr,rel,bug}', 0),
  ('des', '디자인', '프레임, 스토어 이미지', 'des', '{frame,draft,post,views}', 1),
  ('mkt', '마케팅', '유입, 스토어, 인스타', 'mkt', '{fun,newu,ig,site}', 2),
  ('ops', '운영', '행사, 신고, 고객 응대', 'ops', '{rep,ev,ret,chk}', 3)
on conflict (key) do nothing;

create table if not exists admin_members (
  user_id      text primary key,
  nickname     text not null,
  role_keys    text[] not null default '{}',
  -- 처음 들어와서 역할을 고르거나 건너뛴 때. 비어 있으면 고르는 화면을 띄운다
  onboarded_at timestamptz,
  last_seen_at timestamptz not null default now(),
  updated_by   text not null default '',
  updated_at   timestamptz not null default now()
);

grant all on admin_roles to service_role;
grant all on admin_members to service_role;
alter table admin_roles enable row level security;
alter table admin_members enable row level security;
