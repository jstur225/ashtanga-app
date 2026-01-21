# Zeabur 部署指南

## 🚀 为什么选择 Zeabur？

- ✅ **国内访问友好** - 服务器在香港/中国大陆，速度快
- ✅ **免费额度充足** - 每月 $5 免费额度
- ✅ **自动 HTTPS** - 自动配置 SSL 证书
- ✅ **GitHub 集成** - 推送代码自动部署
- ✅ **支持 Next.js** - 官方支持，配置简单

---

## 📋 部署前准备

### 1️⃣ 确认项目已提交到 GitHub

```bash
# 检查当前 git 状态
git status

# 如果有未提交的更改，先提交
git add .
git commit -m "部署前最后的修改"
git push
```

### 2️⃣ 准备 Supabase 环境变量

你需要以下信息（从 Supabase 项目设置中获取）：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🛠️ 部署步骤

### 第1步：注册 Zeabur

1. 访问 **https://zeabur.com**
2. 点击 **Sign up** 注册账号
3. 使用 **GitHub 账号**登录（推荐，方便后续连接仓库）

### 第2步：创建新项目

1. 登录后点击 **New Project**
2. 选择 **Deploy from GitHub**
3. 授权 Zeabur 访问你的 GitHub 仓库

### 第3步：选择仓库

1. 找到你的阿斯汤加打卡app仓库
2. 选择仓库后，Zeabur 会自动检测到 **Next.js** 项目
3. 点击 **Import** 导入项目

### 第4步：配置服务

#### 基础配置

| 配置项 | 值 |
|--------|-----|
| **Service Name** | `ashtanga-tracker`（或自定义名称）|
| **Branch** | `master`（或 `main`）|
| **Root Directory** | `yoga-app-homepage`（重要！）|
| **Build Command** | `pnpm install && pnpm build`（自动检测）|
| **Start Command** | `pnpm start`（自动检测）|

**重要**：Root Directory 必须设置为 `yoga-app-homepage`，因为这是 Next.js 项目的根目录。

#### 环境变量配置

点击 **Environment Variables**，添加以下变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xojbgxvwgvjanxsowqik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取方式**：
1. 登录 Supabase
2. 进入你的项目
3. 点击左侧 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public** key

### 第5步：选择部署区域

为了获得最佳性能，选择离你用户最近的区域：

| 区域 | 代码 | 适用场景 |
|------|------|----------|
| **香港** | `hkg` | 推荐！国内用户访问快 |
| **东京** | `ner` | 备选 |
| **新加坡** | `sgp` | 备选 |

**建议**：选择 **香港 (hkg)**，国内访问速度最快。

### 第6步：开始部署

点击 **Deploy** 按钮，Zeabur 会：

1. 📥 从 GitHub 拉取代码
2. 🔨 安装依赖（`pnpm install`）
3. 🏗️ 构建项目（`pnpm build`）
4. 🚀 启动服务（`pnpm start`）

等待 **3-5分钟**，看到绿色✅就表示部署成功了！

---

## 🌐 获取部署地址

部署成功后，Zeabur 会自动生成一个域名：

```
https://your-project-name.zeabur.app
```

### 自定义域名（可选）

如果你想用自己的域名：

1. 在 Zeabur 项目中点击 **Domains**
2. 点击 **Add Custom Domain**
3. 输入你的域名（如 `ashtanga.yourdomain.com`）
4. 按照提示在域名服务商处配置 DNS：
   - 类型：`CNAME`
   - 名称：`ashtanga`（或你的子域名）
   - 值：`your-project-name.zeabur.app`

---

## 🔄 自动部署

配置完成后，每次你推送代码到 GitHub，Zeabur 会**自动重新部署**：

```bash
git add .
git commit -m "新增功能"
git push
# Zeabur 自动检测到推送，开始部署 🚀
```

---

## 📊 监控和日志

### 查看部署日志

1. 进入 Zeabur 项目
2. 点击 **Logs** 标签
3. 可以看到实时日志输出

### 查看资源使用

1. 点击 **Metrics** 标签
2. 查看 CPU、内存、网络使用情况
3. 确保在免费额度内（$5/月）

---

## 🧪 部署后测试

部署完成后，测试以下功能：

| 功能 | 测试方法 | 预期结果 |
|------|---------|---------|
| **访问首页** | 打开部署地址 | 页面正常加载 |
| **打卡功能** | 完成一次练习 | 能正常保存 |
| **照片上传** | 上传照片 | 能正常上传到 Supabase |
| **历史记录** | 查看觉察日记 | 能看到之前的记录 |
| **移动端** | 用手机浏览器打开 | 界面正常显示 |

---

## ⚠️ 常见问题

### Q1: 部署失败，提示 "Build failed"

**A**: 检查以下几点：

1. **Root Directory** 是否设置为 `yoga-app-homepage`
2. **package.json** 是否在 `yoga-app-homepage` 目录下
3. 查看日志，看具体错误信息

### Q2: 网站能访问，但 Supabase 数据加载失败

**A**: 检查环境变量：

1. 环境变量名称是否正确（必须以 `NEXT_PUBLIC_` 开头）
2. 环境变量值是否完整（没有遗漏字符）
3. Supabase 项目是否启用了 RLS（Row Level Security）

### Q3: 照片上传失败

**A**: 检查 Supabase Storage 配置：

1. Bucket 是否创建（名称：`practice-photos`）
2. Bucket 是否设置为 **Public**
3. 是否配置了正确的 Policy（允许 anon 角色访问）

### Q4: 部署成功，但打开显示 404

**A**: 检查 Next.js 配置：

1. `next.config.mjs` 是否存在
2. `app/page.tsx` 是否在正确位置
3. 查看部署日志，是否有构建错误

### Q5: 访问速度慢

**A**: 优化建议：

1. 确认选择的是 **香港** 区域
2. 检查 Supabase 项目区域（也建议选择新加坡或东京）
3. 启用 Next.js 的图片优化（`images.unoptimized: true` 已启用）

---

## 💰 费用说明

### Zeabur 免费额度

- **每月**：$5 免费额度
- **包含**：
  - 512MB RAM
  - 0.5 CPU 核心
  - 10GB 存储空间
  - 100GB 流量

### 预估使用量

**小型个人项目**（100用户/日）：
- CPU: ~$0.5/月
- 内存: ~$1/月
- 存储: ~$0.5/月
- 流量: ~$1/月
- **总计**: ~$3/月 ✅ 在免费额度内

**中等项目**（1000用户/日）：
- **总计**: ~$8-10/月（超出免费额度 $3-5）

---

## 🎉 完成！

部署完成后，你就拥有了一个：
- ✅ 国内访问快速的阿斯汤加打卡app
- ✅ 自动 HTTPS 加密
- ✅ 自动持续部署
- ✅ 实时监控和日志

**分享给朋友，让他们也能使用你的app吧！** 🚀

---

## 📞 需要帮助？

- Zeabur 文档：https://zeabur.com/docs
- Zeabur Discord：https://discord.gg/zeabur
- Next.js 部署文档：https://nextjs.org/docs/deployment

---

**创建时间**：2026-01-19
**适用版本**：Zeabur 最新版 + Next.js 16
**项目**：阿斯汤加打卡app
