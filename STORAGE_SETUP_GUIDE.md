# Supabase Storage 配置指南

## 第一步：创建Storage Bucket

### 1. 打开Supabase项目
访问 https://supabase.com，进入你的项目

### 2. 进入Storage管理
点击左侧菜单的 **Storage** 图标

### 3. 创建新Bucket
1. 点击 **"New bucket"** 按钮
2. 填写信息：
   - **Name**: `practice-photos`
   - **Public bucket**: ✅ 勾选（公开访问，方便图片展示）
   - **File size limit**: 5MB (单个文件最大5MB)
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/webp`
3. 点击 **"Create bucket"**

---

## 第二步：配置Bucket权限

### 方法1：通过UI配置（推荐）

1. 创建bucket后，点击 `practice-photos` 进入bucket
2. 点击 **"Policies"** 标签
3. 点击 **"New policy"** 按钮
4. 填写策略：
   - **Policy Name**: `Public Access`
   - **Allowed Operation**: ✅ SELECT
   - **Target Role**: `anon` (public)
5. 点击 **"Review"** → **"Create policy"**

### 方法2：通过SQL配置（快速）

在 **SQL Editor** 中执行以下SQL：

```sql
-- 允许公开上传
CREATE POLICY "Allow Public Upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'practice-photos');

-- 允许公开访问
CREATE POLICY "Allow Public Select"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'practice-photos');

-- 允许公开删除
CREATE POLICY "Allow Public Delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'practice-photos');
```

**说明**：v1.0只给自己用，公开访问没问题。v1.5对外开放时再调整权限。

---

## 第三步：验证配置

### 测试上传
1. 在Storage中点击 `practice-photos` bucket
2. 点击 **"Upload file"**
3. 选择一张图片上传
4. 上传成功后，点击图片查看
5. 复制图片URL，在浏览器中访问验证

### 检查权限
在 **SQL Editor** 中执行：

```sql
SELECT * FROM storage.buckets
WHERE name = 'practice-photos';
```

应该能看到你刚创建的bucket信息。

---

## 第四步：获取Storage URL

照片上传后会得到这样的URL：

```
https://xojbgxvwgvjanxsowqik.supabase.co/storage/v1/object/public/practice-photos/文件夹名/文件名
```

- **Base URL**: `https://xojbgxvwgvjanxsowqik.supabase.co/storage/v1/object/public`
- **Bucket**: `practice-photos`

---

## 常见问题

### Q1: 上传失败，提示权限错误
**A**: 检查RLS策略是否正确配置，确保anon角色有INSERT权限

### Q2: 图片访问404
**A**: 确保bucket是Public的，并且有SELECT策略

### Q3: 想要文件夹组织怎么办？
**A**: 上传时在文件名前加文件夹路径，如 `2026-01/2026-01-19-photo.jpg`

### Q4: 如何限制上传文件大小？
**A**: 在代码中验证，超过5MB的文件拒绝上传

---

## 存储配额

Supabase免费版：
- **存储空间**: 1GB
- **流量**: 2GB/月
- **文件大小**: 单个文件最大5MB（在bucket设置中限制）

**预估**：
- 100张照片（每张2MB）= 200MB
- 可以存储约 **5000张照片**

v1.5发布时，如果用户增多，可以升级付费版。

---

## 下一步

配置完成后，告诉我已经创建好bucket，我们继续实现照片上传功能！
