# 小程序发布与数据安全检查

更新日期：2026-07-28

## 自动检查

发布前在项目根目录执行：

```bash
npm run check:weapp-release
npm run test:weapp
```

自动检查覆盖：

- 新主体 AppID；
- 微信合法域名检查和作用域检查已开启；
- API 与 Supabase 均使用 HTTPS；
- 客户端只包含 Supabase publishable key，不包含 service role/secret key；
- 认证入口、独立隐私页不进入微信搜索索引；
- 小程序源码包低于 1.9 MiB 安全门槛。

## Supabase 人工检查

1. 在 Supabase SQL Editor 执行 `supabase/rls_release_audit.sql`。
2. 第二组查询“RLS 未开启但客户端仍有权限”的结果必须为 0 行。
3. 第一、三组结果逐表核对：练习记录、选项、资料、照片、标注、会员等用户数据必须启用 RLS，并按 `auth.uid()` 隔离。
4. 第四组列出的 `SECURITY DEFINER` 函数逐个检查参数、用户归属和固定 `search_path`。
5. 第五组核对照片 bucket：私有照片不应使用公开 bucket。
6. Supabase Dashboard 的 Security Advisor 不应有未处理的高危项。

说明：`sb_publishable_...` 是设计给网页和小程序公开使用的客户端标识，不是服务器密钥。真正的数据隔离依赖 RLS；`service_role` 和 `sb_secret_...` 只能留在服务端环境变量。

## 微信后台人工检查

- request 合法域名包含 `https://ash.ashtangalife.online` 与 Supabase HTTPS 域名；
- uploadFile/downloadFile 合法域名覆盖实际照片上传和读取域名；
- 隐私保护指引与代码实际调用的照片、相册、存储能力一致；
- 体验版完成游客、注册、登录、同步、照片上传、退出再登录回归；
- 上传审核前再次运行自动检查，并确认开发者工具没有关闭域名校验。
