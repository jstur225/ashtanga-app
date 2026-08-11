-- 熬汤日记发布前 RLS 只读审计
-- 直接粘贴到 Supabase SQL Editor 执行；本文件不修改任何数据或权限。

-- 1. public 业务表是否已开启并强制 RLS。
-- rls_enabled 为 false 的业务表必须在发布前逐一确认并修复。
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 2. 找出“RLS 未开启，但 anon/authenticated 仍有表权限”的高风险表。
-- 期望返回 0 行。
select
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants grants
join pg_class c on c.relname = grants.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = grants.table_schema
where grants.table_schema = 'public'
  and grants.grantee in ('anon', 'authenticated')
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
group by grantee, table_schema, table_name
order by table_name, grantee;

-- 3. 查看每张业务表的策略。用户数据表应至少有按 auth.uid() 隔离的策略。
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual as using_expression,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 4. 找出可被客户端角色调用的 SECURITY DEFINER 函数。
-- 这些函数会绕过调用者权限，必须逐个确认 search_path、参数校验和数据归属校验。
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
order by p.proname;

-- 5. Storage bucket 是否公开。
-- 照片若为私有数据，public 应为 false，并通过带鉴权/签名的 URL 读取。
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

-- 6. 支付订单表必须开启 RLS，且 anon/authenticated 不得拥有任何表权限。
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', 'public.payment_orders', 'SELECT,INSERT,UPDATE,DELETE') as anon_has_data_privilege,
  has_table_privilege('authenticated', 'public.payment_orders', 'SELECT,INSERT,UPDATE,DELETE') as authenticated_has_data_privilege
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'payment_orders';

-- 7. 支付履约函数只能由 service_role 执行；前两列必须为 false，最后一列必须为 true。
select
  has_function_privilege('anon', 'public.fulfill_membership_payment(text,text,timestamptz,integer,text)', 'EXECUTE') as anon_can_fulfill,
  has_function_privilege('authenticated', 'public.fulfill_membership_payment(text,text,timestamptz,integer,text)', 'EXECUTE') as authenticated_can_fulfill,
  has_function_privilege('service_role', 'public.fulfill_membership_payment(text,text,timestamptz,integer,text)', 'EXECUTE') as service_role_can_fulfill;
