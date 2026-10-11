-- 행사 게임을 좌표 대신 직접 고르기 (#165).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 처음엔 행사 장소 좌표와 반경으로 행사 게임을 찾았는데, 근처의 남의 게임이 잡히고 반경을 조금 벗어난
-- 부스 게임은 빠지는 짐작이었다. 어느 게임이 우리 것인지는 팀이 안다. 그래서 그날 게임 중에서 고른다.
-- 고르기 쉽게 화면이 행사 시간 안에 시작한 게임을 미리 체크하고 장소별로 묶어 보여 준다.

create table if not exists metrics_event_games (
  event_id   bigint not null references metrics_events(id) on delete cascade,
  game_id    text not null,                -- 백엔드 게임 기록(AdminGameHistory) id. 라운드 하나
  created_at timestamptz not null default now(),
  primary key (event_id, game_id)
);

grant all on metrics_event_games to service_role;
alter table metrics_event_games enable row level security;

-- 좌표와 반경은 더 쓰지 않는다
alter table metrics_events drop constraint if exists metrics_events_place_check;
alter table metrics_events drop column if exists lat;
alter table metrics_events drop column if exists lng;
alter table metrics_events drop column if exists radius_m;
