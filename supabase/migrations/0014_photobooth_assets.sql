-- 포토부스 그림 보관함 (#224).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 프레임과 캐릭터 그림이 코드(public/photobooth)에 있어 행사마다 개발자가 넣고 다시 배포했다.
-- 디자이너가 어드민에서 올리고 행사마다 골라 쓴다. 파일은 팀 R2 photobooth 버킷의 assets/ 에 있다
-- (버킷 수명 규칙 expire-strips 는 손님 사진 strips/ 에만 걸려 있어 그림은 지워지지 않는다).
-- 행사가 쓰는 프레임은 칸 좌표까지 행사 설정(event_settings)에 옮겨 적어서, 부스는 이 표를 읽지 않는다.

create table if not exists photobooth_assets (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('frame', 'character')),
  key        text not null unique check (key ~ '^assets/(frame|character)/[a-z0-9-]+\.(png|webp)$'),
  label      text not null check (char_length(label) between 1 and 20),
  meta       jsonb not null default '{}'::jsonb,  -- 프레임: width, height, slots, swatch. 캐릭터: side(cop, thief)
  archived   boolean not null default false,       -- 지우지 않고 숨긴다. 쓰는 행사가 있으면 숨기지 못한다(화면에서 막음)
  created_by text not null,
  created_at timestamptz not null default now()
);

grant all on photobooth_assets to service_role;
grant usage, select on sequence photobooth_assets_id_seq to service_role;
alter table photobooth_assets enable row level security;
