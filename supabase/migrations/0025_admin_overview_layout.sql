-- 각자 고친 개요 카드 (docs/admin-ui.md "내 개요 구성").
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- overview_cards 가 비어 있으면(null) 맡은 역할의 기본 카드를 보여 준다.
-- overview_roles 는 구성을 고칠 때 맡고 있던 역할이다. 그 뒤에 새 역할을 맡으면 그 카드를 더할지 묻는 데 쓴다.

alter table admin_members add column if not exists overview_cards text[];
alter table admin_members add column if not exists overview_roles text[];
