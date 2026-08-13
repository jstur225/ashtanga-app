-- 给审核/体验账号开通 Pro 会员（微信提审 3.1.4：付费功能可用测试号体验）
-- 用法：Supabase Dashboard → SQL Editor 执行（postgres 角色，可读写 auth.users）。
-- 幂等：profile 不存在会自动创建；已有有效会员则跳过。
-- 修改账号：把下方 v_email 换成实际审核账号邮箱。

do $$
declare
  v_email text := 'zaohezi2020@gmail.com';
  v_user_id uuid;
  v_profile_id uuid;
  v_has_active boolean;
begin
  select id into v_user_id from auth.users where email = v_email limit 1;
  if v_user_id is null then
    raise exception '账号不存在：% （请先注册，或用 scripts/create-review-account.mjs 创建）', v_email;
  end if;

  select id into v_profile_id from public.user_profiles where user_id = v_user_id limit 1;
  if v_profile_id is null then
    insert into public.user_profiles (user_id, name, signature)
    values (v_user_id, split_part(v_email, '@', 1), '')
    returning id into v_profile_id;
  end if;

  select exists(
    select 1 from public.user_memberships
    where user_id = v_profile_id and expires_at > now()
  ) into v_has_active;

  if v_has_active then
    raise notice '该账号已有有效会员，无需重复开通';
  else
    insert into public.user_memberships (user_id, type, started_at, expires_at)
    values (v_profile_id, 'year', now(), now() + interval '365 days');
    raise notice '已为 % 开通 365 天 Pro', v_email;
  end if;
end $$;
