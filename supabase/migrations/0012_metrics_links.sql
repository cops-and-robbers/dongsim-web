-- 행사 링크: 짧은 주소 /q/<코드> 와 QR (#171).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 행사 QR 과 링크트리는 /download?utm_... 긴 주소를 손으로 이어 붙여 썼다(#144). 주소가 길면 QR 점이 촘촘해져
-- 멀리서 잘 안 읽히고, 사람이 지은 꼬리표는 같은 행사가 다른 이름으로 갈리거나 App Store 캠페인 토큰(30자)을 넘겨 잘렸다.
-- 그래서 링크를 여기 한 번 등록하고, /q/<코드> 가 등록된 꼬리표를 붙여 /download 로 보낸다.
--
-- 결과는 새로 모으지 않는다. GA4 수집이 이미 출처|매체|캠페인 조합별로 방문, 스토어로 이동, Android 첫 실행을 쌓는다.
-- 그래서 출처, 매체, 캠페인 조합은 링크마다 달라야 한다(구분 utm_content 는 GA4 다운로드 집계에 칸이 없어 링크를 가르지 못한다).

create table if not exists metrics_links (
  id           bigint generated always as identity primary key,
  code         text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$'),
  label        text not null check (char_length(label) between 1 and 40),
  utm_source   text not null check (utm_source ~ '^[A-Za-z0-9_.-]{1,64}$'),
  utm_medium   text not null default 'qr' check (utm_medium ~ '^[A-Za-z0-9_.-]{1,64}$'),
  utm_campaign text not null check (utm_campaign ~ '^[A-Za-z0-9_.-]{1,64}$'),
  utm_content  text check (utm_content is null or utm_content ~ '^[A-Za-z0-9_.-]{1,64}$'),
  event_id     bigint references metrics_events(id) on delete set null,  -- 연결한 일정(선택). 일정을 지워도 링크는 남는다
  created_at   timestamptz not null default now()
);

-- 결과를 꼬리표로 찾으므로 같은 조합은 하나만
create unique index if not exists metrics_links_utm on metrics_links (utm_source, utm_medium, utm_campaign);

grant all on metrics_links to service_role;
grant usage, select on sequence metrics_links_id_seq to service_role;
alter table metrics_links enable row level security;
