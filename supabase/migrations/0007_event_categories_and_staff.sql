-- 일정 카테고리, 행사 시간과 장소, 운영진 계정 (#165).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 지표는 세 기록을 겹쳐 읽는다.
--   일정(metrics_events): 그날 무슨 일이 있었나. 성격(category)으로 나눈다
--   사람(metrics_staff_accounts + 백엔드 ADMIN 권한): 누가 했나
--   게임(백엔드 게임 기록): 참가자로 운영진만, 섞임, 사용자만을 가른다
-- 테스트를 지표에서 빼는 건 사람 기록이 하고, 행사 게임을 찾는 건 일정의 시간과 장소가 한다.

-- 일정 성격. event 행사, promo 홍보, release 출시(수집기가 자동으로 넣는다), test 테스트(QA 포함), etc 기타
alter table metrics_events add column if not exists category text not null default 'etc';
alter table metrics_events drop constraint if exists metrics_events_category_check;
alter table metrics_events add constraint metrics_events_category_check
  check (category in ('event', 'promo', 'release', 'test', 'etc'));

-- 행사의 시간(한국 시각)과 장소. 이 시간과 장소에 맞는 게임을 행사 게임으로 본다. 행사가 아니면 비워 둔다
alter table metrics_events add column if not exists starts_at time;
alter table metrics_events add column if not exists ends_at   time;
alter table metrics_events add column if not exists lat       double precision;
alter table metrics_events add column if not exists lng       double precision;
alter table metrics_events add column if not exists radius_m  integer;
alter table metrics_events drop constraint if exists metrics_events_place_check;
alter table metrics_events add constraint metrics_events_place_check check (
  (lat is null) = (lng is null)
  and (lat is null or (lat between -90 and 90 and lng between -180 and 180))
  and (radius_m is null or radius_m between 50 and 5000)
);

-- 지금 있는 일정 옮기기. 이름으로 가르고, 이미 고른 성격은 건드리지 않는다(etc 만 바꾼다).
-- 순서가 중요하다: "청춘대로 포스터 QR 시험"은 포스터(홍보)보다 시험(테스트)이 먼저다
update metrics_events set category = 'release' where category = 'etc' and label ~ '^(iOS|Android) .+ 출시$';
update metrics_events set category = 'test'    where category = 'etc' and label ~ '(QA|테스트|시험)';
update metrics_events set category = 'event'   where category = 'etc' and label ~ '(부스|축제| vs )';
update metrics_events set category = 'promo'   where category = 'etc' and label ~ '(홍보|포스터|광고)';

-- 지난 행사의 시간과 장소. 장소는 그날 게임 구역의 가운데(백엔드 게임 기록, 2026-10-11 확인)
update metrics_events set starts_at = '12:00', ends_at = '17:00', lat = 37.4007, lng = 127.1089, radius_m = 500
  where day = '2026-07-04' and label like '서울게임타운2 부스%' and lat is null;
update metrics_events set starts_at = '14:00', ends_at = '20:00', lat = 37.5110, lng = 126.9966, radius_m = 500
  where day = '2026-09-19' and label like '서대페 부스%' and lat is null;
update metrics_events set starts_at = '14:00', ends_at = '16:00', lat = 37.5498, lng = 127.0799, radius_m = 500
  where day = '2026-09-19' and label like '청춘대로 건국대 vs 세종대%' and lat is null;
-- 노원 축제는 장소 좌표를 확인하지 못해 시간만 넣는다. 지표 화면 달력에서 좌표를 넣는다
update metrics_events set starts_at = '13:00', ends_at = '17:00'
  where day = '2026-10-24' and label like '노원 청소년축제%' and starts_at is null;

-- 운영진 계정. 백엔드에서 ADMIN 권한인 계정은 자동으로 운영진이라 여기 넣지 않는다.
-- 권한 없는 팀원 계정과 테스트 계정만 넣는다. 지표 화면이 운영진만 한 게임과 운영진 사람을 빼고 센다
create table if not exists metrics_staff_accounts (
  user_id    text primary key,            -- 백엔드 사용자 id
  note       text not null default '' check (char_length(note) <= 40),
  created_at timestamptz not null default now()
);

-- 2026-10-11 지난 게임 455개에서 운영진하고만 했거나 혼자 시험한 계정을 찾아 팀이 확인했다
insert into metrics_staff_accounts (user_id, note) values
  ('131', '팀원'),
  ('208', '테스트 계정'),
  ('68',  '테스트 계정'),
  ('17',  '테스트 계정')
on conflict (user_id) do nothing;

grant all on metrics_staff_accounts to service_role;
alter table metrics_staff_accounts enable row level security;
