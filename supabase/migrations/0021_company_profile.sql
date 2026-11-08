-- 회사 소개의 걸어온 길, 수상 이력, 고마운 분들 (#250).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 코드에 적혀 있어 고칠 때마다 세 언어를 고치고 배포해야 했고, 앱 크레딧과 웹 명단이 따로 있어 어긋났다.
-- 이력은 지표 일정(metrics_events)과 이어 두지만 표는 나눈다. 일정 이름은 내부용(40자)이고, 일정은 일 단위 날짜가 필수이며,
-- 수상이 지표 차트에 섞이면 안 되고, 달력을 정리해도 공개 이력은 남아야 해서다.
-- 명단(실명)은 여기에 적지 않는다. 공개 저장소에 남지 않게 첫 값은 SQL Editor 에서 따로 넣는다.

-- 이력. 월까지만 아는 날은 1일로 두고 precision 으로 가린다
create table if not exists company_records (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('milestone', 'event', 'qa', 'award', 'selection')),
  occurred_on date not null,
  precision   text not null default 'day' check (precision in ('day', 'month')),
  title_ko    text not null check (char_length(title_ko) between 1 and 50),
  title_en    text check (char_length(title_en) between 1 and 80),
  title_ja    text check (char_length(title_ja) between 1 and 50),
  badge_ko    text check (char_length(badge_ko) between 1 and 24),
  badge_en    text check (char_length(badge_en) between 1 and 40),
  badge_ja    text check (char_length(badge_ja) between 1 and 24),
  visible     boolean not null default true,
  event_id    bigint unique references metrics_events(id) on delete set null,  -- 달력을 정리해도 공개 이력은 남는다
  version     integer not null default 1,                                      -- 둘이 동시에 고칠 때 앞사람 것을 덮지 않게
  updated_by  text not null,
  updated_at  timestamptz not null default now()
);
create index if not exists company_records_day on company_records (occurred_on);

-- 올릴 일정에서 건너뛴 일정. 지우면 다시 후보로 뜬다
create table if not exists company_record_skips (
  event_id   bigint primary key references metrics_events(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 고마운 분들. name_key 는 띄어쓰기를 뺀 이름이라 "홍 길동"과 "홍길동"이 둘로 갈리지 않는다.
-- 동명이인이면 뒤에 구분값이 붙는다. prior_count 는 회차로 기록하기 전에 참여한 횟수다
create table if not exists credit_people (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 20),
  name_key    text not null unique,
  role        text not null default 'qa' check (role in ('qa', 'infra')),
  github      text check (github ~ '^[A-Za-z0-9-]{1,39}$'),                    -- 주소가 아니라 아이디만. 다른 주소를 넣지 못하게
  prior_count integer not null default 0 check (prior_count between 0 and 50),
  visible     boolean not null default true,
  version     integer not null default 1,
  updated_by  text not null,
  updated_at  timestamptz not null default now()
);

-- QA 회차에 온 사람. 횟수는 prior_count + 이 표의 줄 수로 계산한다. 사람을 지우면 줄도 지워진다
create table if not exists qa_attendance (
  record_id bigint not null references company_records(id) on delete cascade,
  person_id bigint not null references credit_people(id) on delete cascade,
  primary key (record_id, person_id)
);
create index if not exists qa_attendance_person on qa_attendance (person_id);

-- 누가 언제 어느 줄을 바꿨나. 본인이 빼 달라고 해서 지운 이름이 남지 않게 번호만 적는다
create table if not exists company_audit (
  id        bigint generated always as identity primary key,
  action    text not null check (action in ('create', 'update', 'delete')),
  target    text not null check (target in ('record', 'person')),
  target_id bigint not null,
  actor     text not null,
  at        timestamptz not null default now()
);
create index if not exists company_audit_recent on company_audit (at desc);

grant all on company_records, company_record_skips, credit_people, qa_attendance, company_audit to service_role;
grant usage, select on sequence company_records_id_seq, credit_people_id_seq, company_audit_id_seq to service_role;
alter table company_records enable row level security;
alter table company_record_skips enable row level security;
alter table credit_people enable row level security;
alter table qa_attendance enable row level security;
alter table company_audit enable row level security;

-- 이력, 새 참가자, 참석 기록, 고친 기록을 한 번에 저장한다. 중간에 실패하면 모두 되돌린다.
-- 고칠 때는 version 이 맞을 때만 그 줄을 잠그고 바꿔서, 늦게 도착한 요청이 다른 사람의 참가자를 덮지 못한다
create or replace function company_save_record(
  p_id bigint,
  p_version integer,
  p_row jsonb,
  p_attendees bigint[],
  p_new_people jsonb,
  p_actor text
) returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_id bigint;
  v_person bigint;
  v_item jsonb;
  v_attendees bigint[] := coalesce(p_attendees, '{}');
begin
  for v_item in select value from jsonb_array_elements(coalesce(p_new_people, '[]'::jsonb)) loop
    v_person := null;
    insert into credit_people (name, name_key, updated_by)
    values (v_item->>'name', v_item->>'key', p_actor)
    on conflict (name_key) do nothing
    returning id into v_person;
    if v_person is null then
      select id into v_person from credit_people where name_key = v_item->>'key';
    else
      insert into company_audit (action, target, target_id, actor) values ('create', 'person', v_person, p_actor);
    end if;
    v_attendees := v_attendees || v_person;
  end loop;

  if p_id is null then
    insert into company_records (kind, occurred_on, precision, title_ko, title_en, title_ja, badge_ko, badge_en, badge_ja, visible, event_id, updated_by)
    values (
      p_row->>'kind', (p_row->>'occurred_on')::date, p_row->>'precision',
      p_row->>'title_ko', p_row->>'title_en', p_row->>'title_ja',
      p_row->>'badge_ko', p_row->>'badge_en', p_row->>'badge_ja',
      (p_row->>'visible')::boolean, (p_row->>'event_id')::bigint, p_actor
    )
    returning id into v_id;
    insert into company_audit (action, target, target_id, actor) values ('create', 'record', v_id, p_actor);
  else
    update company_records set
      kind = p_row->>'kind',
      occurred_on = (p_row->>'occurred_on')::date,
      precision = p_row->>'precision',
      title_ko = p_row->>'title_ko',
      title_en = p_row->>'title_en',
      title_ja = p_row->>'title_ja',
      badge_ko = p_row->>'badge_ko',
      badge_en = p_row->>'badge_en',
      badge_ja = p_row->>'badge_ja',
      visible = (p_row->>'visible')::boolean,
      event_id = (p_row->>'event_id')::bigint,
      version = version + 1,
      updated_by = p_actor,
      updated_at = now()
    where id = p_id and version = p_version
    returning id into v_id;
    if v_id is null then
      raise exception 'company record version conflict' using errcode = 'CO409';
    end if;
    insert into company_audit (action, target, target_id, actor) values ('update', 'record', v_id, p_actor);
  end if;

  delete from qa_attendance where record_id = v_id and not (person_id = any (v_attendees));
  insert into qa_attendance (record_id, person_id)
  select v_id, unnest(v_attendees)
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function company_save_record(bigint, integer, jsonb, bigint[], jsonb, text) from public, anon, authenticated;
grant execute on function company_save_record(bigint, integer, jsonb, bigint[], jsonb, text) to service_role;

-- 지금 사이트에 있는 이력과 2026년 10월 수상. 표가 비어 있을 때만 넣어 다시 실행해도 지운 줄이 되살아나지 않는다
insert into company_records (kind, occurred_on, precision, title_ko, title_en, title_ja, badge_ko, badge_en, badge_ja, updated_by)
select v.kind, v.occurred_on::date, v.precision, v.title_ko, v.title_en, v.title_ja, v.badge_ko, v.badge_en, v.badge_ja, '처음 옮긴 값'
from (values
  ('qa',        '2026-03-24', 'day',   '경찰과 도둑 1차 QA 진행', 'Cops and Robbers - first QA round', 'ケイドロ 第1回QA実施', null, null, null),
  ('milestone', '2026-04-08', 'day',   '동심지키미 설립', 'Team Dongsim founded', 'チーム・トンシム設立', null, null, null),
  ('qa',        '2026-04-28', 'day',   '경찰과 도둑 2차 QA 진행', 'Cops and Robbers - second QA round', 'ケイドロ 第2回QA実施', null, null, null),
  ('event',     '2026-07-04', 'day',   '서울게임타운 박람회 ‘경찰과 도둑’ 부스 참여', 'Seoul Game Town Expo - Cops and Robbers booth', 'ソウルゲームタウン博覧会「ケイドロ」ブース出展', null, null, null),
  ('award',     '2026-05-08', 'day',   '세종 창업 아이디어 리그', 'Sejong Startup Idea League', '世宗 創業アイデアリーグ', '대상', 'Grand Prize', '大賞'),
  ('award',     '2026-03-06', 'day',   '세종대학교 아롬 데모데이', 'Sejong University Arom Demo Day', '世宗大学 アロム・デモデー', '특별상', 'Special Award', '特別賞'),
  ('award',     '2026-07-01', 'month', '세종대학교 하반기 입주공모전', 'Sejong University H2 Residency Contest', '世宗大学 下半期入居コンペ', '우수 창업 아이템상', 'Outstanding Startup Project', '優秀創業アイテム賞'),
  ('selection', '2026-07-01', 'month', '세종대학교 창업 동아리 SSUP', 'Sejong University startup club SSUP', '世宗大学 創業サークルSSUP', '선정', 'Accepted', '選定'),
  ('award',     '2026-10-01', 'month', '세종대학교 창업아이템 경진대회', 'Sejong University Startup Idea Competition', '世宗大学 創業アイデアコンテスト', '우수상', 'Excellence Award', '優秀賞')
) as v(kind, occurred_on, precision, title_ko, title_en, title_ja, badge_ko, badge_en, badge_ja)
where not exists (select 1 from company_records);

-- 이미 사이트에 있는 행사와 QA 는 일정과 이어 두어 올릴 일정에 다시 뜨지 않게 한다
update company_records r set event_id = (
  select e.id from metrics_events e
  where e.day = r.occurred_on and e.category = 'event'
    and not exists (select 1 from company_records x where x.event_id = e.id)
  order by e.id limit 1
)
where r.kind = 'event' and r.event_id is null and r.precision = 'day' and r.updated_by = '처음 옮긴 값';

update company_records r set event_id = (
  select e.id from metrics_events e
  where e.day = r.occurred_on and e.category = 'test' and e.label ~ 'QA'
    and not exists (select 1 from company_records x where x.event_id = e.id)
  order by e.id limit 1
)
where r.kind = 'qa' and r.event_id is null and r.precision = 'day' and r.updated_by = '처음 옮긴 값';
