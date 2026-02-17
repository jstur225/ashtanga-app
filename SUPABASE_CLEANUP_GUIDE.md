# Supabase 数据库清理指南

## 📅 清理日期
2026-02-18

## 🎯 清理目标
移除设备限制功能相关的数据库字段和配置

---

## 1️⃣ 删除 logged_in_devices 字段

### 方法1：使用 SQL 脚本（推荐）

1. 打开 Supabase Dashboard
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. 进入 SQL Editor
   - 左侧菜单 → SQL Editor
   - 点击 "New query" 创建新查询

3. 执行清理脚本
   - 打开文件：`supabase/migrations/20260218_remove_device_fields.sql`
   - 复制 SQL 内容到 SQL Editor
   - 点击 "Run" 执行

4. 验证删除结果
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'user_profiles'
     AND table_schema = 'public';
   ```
   - 确认结果中**没有** `logged_in_devices` 字段

### 方法2：使用 Table Editor（图形界面）

1. 打开 Supabase Dashboard → Database
2. 点击 "Table Editor"
3. 选择 `user_profiles` 表
4. 点击表名右侧的设置图标 ⚙️
5. 选择 "Edit table"
6. 找到 `logged_in_devices` 字段
7. 点击 "Delete" 删除
8. 点击 "Save" 保存

---

## 2️⃣ 关闭 Realtime 功能

Realtime 功能用于实时推送数据变更，现在已经不需要了。

### 步骤：

1. 打开 Supabase Dashboard → Database

2. 进入 Replication（复制）设置
   - 左侧菜单 → Database → Replication

3. 找到 `user_profiles` 表
   - 在 "Realtime" 列表中
   - 找到 `user_profiles` 表

4. 关闭 Realtime
   - 点击 `user_profiles` 表右侧的开关
   - 确保开关显示为 **灰色（关闭状态）**

5. 验证关闭成功
   - 开关应该是灰色状态
   - 不显示 "Enabled" 标识

---

## ⚠️ 注意事项

1. **备份建议**（可选）
   - 执行前可以先备份 `user_profiles` 表
   - 但当前代码已不再使用这些字段，删除是安全的

2. **不可逆操作**
   - 删除字段后，数据将永久丢失
   - 但当前代码已经不依赖这些字段

3. **影响范围**
   - ✅ 不影响用户登录功能
   - ✅ 不影响同步功能
   - ✅ 不影响现有数据
   - ❌ 删除后无法恢复（但不需要恢复）

---

## ✅ 执行完成检查清单

- [ ] SQL 脚本执行成功
- [ ] `logged_in_devices` 字段已删除
- [ ] `user_profiles` 表的 Realtime 已关闭
- [ ] 应用功能正常（登录、同步都正常）

---

## 📝 相关代码提交

- `78878cf` - feat: 移除设备限制逻辑，支持多设备登录
- `d2bdf87` - fix: 回滚冲突检测功能，删除设备限制提示

---

## 🆘 遇到问题？

如果执行过程中遇到错误：

1. **权限错误**
   - 确保你是项目的 Owner 或 Admin 角色
   - 联系 Supabase 支持团队

2. **字段不存在**
   - 这是正常的，SQL 使用了 `IF EXISTS`
   - 不会报错，继续执行即可

3. **表被锁定**
   - 等待几分钟后重试
   - 确保没有正在运行的长事务

---

## 📚 参考资料

- Supabase SQL 文档：https://supabase.com/docs/guides/database
- Supabase Replication 文档：https://supabase.com/docs/guides/realtime
