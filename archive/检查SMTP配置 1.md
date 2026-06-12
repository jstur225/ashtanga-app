# 检查 Supabase Custom SMTP 配置

## 步骤1：检查SMTP设置

1. 访问：https://supabase.com/dashboard/project/xojbgxvwgvjanxsowqik/auth/settings
2. 找到 **"SMTP Settings"** 部分
3. 查看是否启用了 **"Enable Custom SMTP"**

## 步骤2：如果启用了Custom SMTP

**临时测试方案：**
1. 取消勾选 "Enable Custom SMTP"
2. 保存设置
3. 重新测试注册流程

这样可以确认是不是Custom SMTP导致的504超时。

## 步骤3：查看邮件发送设置

在同一个页面检查：
- **"Email Templates"** - Signup相关的邮件模板
- **"Email Auth"** - 邮箱认证的配置

## 可能的问题

如果启用了Custom SMTP（Resend），Supabase在注册时会：
1. 接收注册请求
2. 创建用户（可能）
3. **通过Custom SMTP发送确认邮件** ← 这一步可能超时
4. 返回响应

如果第3步超时，整个请求就会504。
