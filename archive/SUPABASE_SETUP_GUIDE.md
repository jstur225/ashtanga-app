# Supabase 配置指南

## 第一步：创建Supabase项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 使用GitHub账号登录
4. 点击 "New Project"
5. 填写信息：
   - **Name**: `ashtanga-tracker` (或任意名称)
   - **Database Password**: 自己设置一个强密码（**记住这个密码！**）
   - **Region**: 选择 `Southeast Asia (Singapore)` 速度更快
   - **Pricing Plan**: 选择 Free 免费版足够
6. 点击 "Create new project"，等待2-3分钟

---

## 第二步：创建数据表

创建项目后，进入 **Table Editor**，创建3个表：

### 表1：`practice_records` - 练习记录表

点击 "New Table"，填写：

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| id | int8 | (auto increment) | 主键 |
| created_at | timestamp | now() | 创建时间 |
| date | date | - | 练习日期 |
| type | text | - | 练习类型（如"一序列Mysore"） |
| duration | int8 | - | 时长（秒） |
| notes | text | - | 觉察文字 |
| photos | text[] | '{}' | 照片数组（存储URL） |
| breakthrough | text | - | 突破性标题（可选，最多20字） |

**设置**：
- 勾选 `Make Row Level Security (RLS)` 后面再配置
- Primary Key: `id`
- 点击 "Save"

### 表2：`practice_options` - 练习选项表（用户自定义）

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| id | int8 | (auto increment) | 主键 |
| created_at | timestamp | now() | 创建时间 |
| label | text | - | 英文标签 |
| label_zh | text | - | 中文标签 |
| notes | text | - | 备注说明 |
| is_custom | boolean | true | 是否用户自定义 |

### 表3：`user_profiles` - 用户信息表

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| id | int8 | (auto increment) | 主键 |
| created_at | timestamp | now() | 创建时间 |
| name | text | - | 用户名 |
| signature | text | - | 个性签名 |
| avatar | text | - | 头像URL |
| phone | text | - | 手机号（可选） |
| email | text | - | 邮箱（可选） |
| is_pro | boolean | false | 是否付费会员 |

---

## 第三步：配置Row Level Security (RLS)

在 **SQL Editor** 中执行以下SQL（关闭RLS，v1.0给自己用，先不配置权限）：

```sql
-- 关闭 practice_records 的 RLS
ALTER TABLE practice_records DISABLE ROW LEVEL SECURITY;

-- 关闭 practice_options 的 RLS
ALTER TABLE practice_options DISABLE ROW LEVEL SECURITY;

-- 关闭 user_profiles 的 RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

**说明**：v1.0只给自己用，所以先关闭RLS。v1.5对外开放时再开启权限控制。

---

## 第四步：获取API密钥

1. 点击左侧 **Settings** → **API**
2. 复制以下两个信息（待会要用）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 第五步：配置照片存储（可选）

如果需要存储照片：

1. 点击左侧 **Storage**
2. 点击 "New bucket"
3. 填写：
   - **Name**: `practice-photos`
   - **Public bucket**: 勾选（公开访问）
4. 点击 "Create bucket"

**配置权限**（在SQL Editor执行）：

```sql
-- 允许公开上传
CREATE POLICY "Allow Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'practice-photos');

-- 允许公开访问
CREATE POLICY "Allow Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'practice-photos');
```

---

## 数据表设计说明

### practice_records 表结构
- `id`: 唯一标识
- `date`: 练习日期，用于日历热力图
- `type`: 练习类型，对应6个选项
- `duration`: 时长（秒），方便计算
- `notes`: 觉察文字（最多2000字）
- `photos`: 数组类型，存储多个照片URL
- `breakthrough`: 可选的突破性标题

### 存储策略
- **v1.0**（给自己用）：
  - 照片直接存储在Supabase Storage
  - 不压缩，保留原图（单张最大5MB）
  - 免费额度：1GB存储 + 2GB流量/月

- **v1.5**（公开发布）：
  - 免费用户：本地存储
  - 付费用户：云存储（¥28/年）

---

## 完成后

回到这个目录，告诉我你已经：
1. ✅ 创建了Supabase项目
2. ✅ 创建了3个数据表
3. ✅ 复制了 Project URL 和 anon key

然后我们继续下一步：安装依赖和配置环境变量。
