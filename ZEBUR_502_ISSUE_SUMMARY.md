# Zeabur部署502错误 - 问题总结

**项目名称**：阿斯汤加打卡app (Ashtanga Log)
**部署平台**：Zeabur (https://aotang.zeabur.app/)
**部署方式**：GitHub集成自动部署
**仓库地址**：https://github.com/jstur225/ashtanga-app
**问题时间**：2026-01-20

---

## 问题现象

访问 https://aotang.zeabur.app/ 出现 **502 Bad Gateway** 错误

**错误信息：**
```
502 Bad Gateway
Request ID: sjc1::9b48dfdf-8229-44d8-b8a8-8bbef5f3536e
```

**服务状态：**
- ✅ Zeabur控制台显示：绿色运行中（RUNNING）
- ✅ 端口配置正确：8080
- ✅ 容器启动成功
- ❌ 网关无法连接到应用

---

## 技术栈

- **框架**：Next.js 16.0.10
- **运行时**：Node.js 22
- **包管理器**：pnpm
- **构建工具**：Docker
- **数据库**：Supabase PostgreSQL

---

## 已尝试的方案（全部失败）

### 方案1：启用Next.js standalone模式
**操作**：在 `next.config.mjs` 添加 `output: 'standalone'`
```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',
  // ...
}
```
**结果**：❌ 失败 - 找不到 `/src/.next/standalone/server.js`

---

### 方案2：使用server.mjs启动
**操作**：修改Dockerfile启动命令
```dockerfile
CMD ["node", ".next/standalone/server.mjs"]
```
**结果**：❌ 失败 - 同样找不到文件

---

### 方案3：使用pnpm start
**操作**：修改Dockerfile启动命令
```dockerfile
CMD ["pnpm", "start"]
```
**结果**：❌ 失败 - 还是502错误

---

### 方案4：配置PORT环境变量
**操作**：修改 `package.json` 的start脚本
```json
"start": "next start -p $PORT"
```
**结果**：❌ 失败 - 应用启动但还是502

---

## 根本原因（已定位）

**Next.js默认只监听localhost（127.0.0.1）**

从Zeabur日志可以看到：
```
▲ Next.js 16.0.10
- Local:         http://service-xxx:8080
- Network:       http://service-xxx:8080
✓ Ready in 104ms
```

应用确实启动成功了，但Zeabur的网关无法连接到localhost。

**容器内监听地址 vs 网关访问：**
- ❌ Next.js默认：`localhost:8080` 或 `127.0.0.1:8080`
- ✅ Zeabur网关需要：`0.0.0.0:8080`

---

## 最新修复（已推送但未部署成功）

**修改 `package.json`：**
```json
"start": "next start -p $PORT -H 0.0.0.0"
```

**参数说明：**
- `-p $PORT`：监听环境变量PORT指定的端口（8080）
- `-H 0.0.0.0`：监听所有网络接口（关键修复）

**Commit：** `82fac8b` - "fix: 修复502错误 - Next.js监听0.0.0.0而不是localhost"

---

## 当前配置文件

### 1. Dockerfile
```dockerfile
FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="next.js"
WORKDIR /src
RUN npm install -f -g pnpm@latest || npm install -f -g pnpm@8
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 8080
CMD ["pnpm", "start"]
```

### 2. package.json（scripts部分）
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "eslint .",
  "start": "next start -p $PORT -H 0.0.0.0"
}
```

### 3. next.config.mjs
```javascript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react', 'framer-motion'],
  },
  output: 'standalone',
}
```

### 4. .zeabur.yaml
```yaml
version: v1
```

### 5. nixpacks.toml
```toml
[phases.build]
cmds = ["pnpm build"]

[phases.start]
cmd = "node .next/standalone/server.js"

[start]
cmd = "node .next/standalone/server.js"
```

---

## Zeabur部署日志（成功启动但502）

```
[Zeabur] Pod/service-xxx - Pulling: Pulling image "registry-oci.zeabur.cloud/..."
[Zeabur] Pod/service-xxx - Created: Created container: ashtanga-app
[Zeabur] Pod/service-xxx - Started: Started container ashtanga-app

   ▲ Next.js 16.0.10
   - Local:         http://service-xxx:8080
   - Network:       http://service-xxx:8080
 ✓ Starting...
 ✓ Ready in 104ms
```

应用启动成功，但访问 https://aotang.zeabur.app/ 返回502。

---

## 环境变量配置

### 本地开发环境变量

**文件位置**：`yoga-app-homepage/.env.local`

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://xojbgxvwgvjanxsowqik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvamJneHZ3Z3ZqYW54c293cWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyNzU0MzMsImV4cCI6MjA1Mjg1MTQzM30.NQWjMgN-4xS3hG_JQ8i9XhZDN-P0jYlL8HhN9gZ9zY

# 本地开发端口（可选，默认3000）
PORT=3000
```

**注意**：
- `.env.local` 文件在 `.gitignore` 中，不会提交到Git
- 本地开发运行 `pnpm dev` 时自动读取

### Zeabur生产环境变量

**配置位置**：Zeabur控制台 → ashtanga-app服务 → 环境变量

**已配置的环境变量：**

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xojbgxvwgvjanxsowqik.supabase.co` | Supabase项目URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...（省略）` | Supabase匿名访问密钥 |
| `PORT` | `8080` | **Zeabur自动注入**，无需手动配置 |
| `NODE_ENV` | `production` | **构建时自动设置** |

**环境变量说明：**

1. **NEXT_PUBLIC_ 前缀**
   - 只有带 `NEXT_PUBLIC_` 前缀的变量才能在浏览器端访问
   - 不带前缀的变量只能在服务端（Node.js）访问

2. **PORT 变量**
   - Zeabur自动注入 `PORT=8080`
   - 不要在Zeabur控制台手动设置PORT
   - package.json 中的 `next start -p $PORT` 会读取这个变量

3. **HOSTNAME/网络绑定**
   - **关键**：Next.js默认监听localhost
   - 必须使用 `-H 0.0.0.0` 让Zeabur网关能访问
   - 或者设置环境变量 `HOSTNAME=0.0.0.0`

### 代码中读取环境变量

**服务端（Node.js/API Routes）：**
```javascript
// 可以读取所有环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const port = process.env.PORT;
```

**客户端（浏览器/React组件）：**
```javascript
// 只能读取 NEXT_PUBLIC_ 前缀的变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// ❌ 无法访问 process.env.PORT（只在服务端可用）
```

### Dockerfile中的环境变量

**当前Dockerfile未显式设置ENV，依赖Zeabur自动注入**

如果需要调试，可以添加：
```dockerfile
# 显示所有环境变量（调试用）
RUN env

# 或者设置特定变量
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
```

### 常见环境变量问题排查

**问题1：环境变量在代码中读取为undefined**
- 检查变量名拼写是否正确
- 客户端代码确保有 `NEXT_PUBLIC_` 前缀
- 重启开发服务器让新变量生效

**问题2：Supabase连接失败**
- 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
- 检查Supabase项目是否暂停
- 确认Supabase表的RLS权限设置

**问题3：502错误（本次问题）**
- 确认 `package.json` 中的start脚本包含 `-H 0.0.0.0`
- 确认Zeabur的PORT变量正确（8080）
- 检查应用是否真的监听在0.0.0.0而不是localhost

---

## Git提交历史

```
82fac8b fix: 修复502错误 - Next.js监听0.0.0.0而不是localhost
9f0ecf5 chore: 强制触发Zeabur部署 - PORT配置已完成
638a8a8 fix: 修正Zeabur部署 - 使用pnpm start并监听PORT环境变量
dcca01b fix: 修正Dockerfile启动命令 - 使用server.mjs而不是server.js或pnpm start
c42b222 fix: 添加Dockerfile使用pnpm start而不是standalone模式
```

---

## 需要帮助的地方

1. **验证最新部署**：确认Zeabur是否已经部署了commit `82fac8b`（包含 `-H 0.0.0.0` 修复）

2. **检查网关配置**：确认Zeabur网关是否正确路由到容器的8080端口

3. **查看最新日志**：如果还是502，需要最新的运行时日志确认问题

4. **替代方案**：如果 `-H 0.0.0.0` 还是不行，可能需要：
   - 使用环境变量 `HOSTNAME=0.0.0.0`
   - 或修改Next.js配置强制监听0.0.0.0

---

## 相关链接

- **GitHub仓库**：https://github.com/jstur225/ashtanga-app
- **Zeabur项目**：（请提供Zeabur项目链接）
- **部署地址**：https://aotang.zeabur.app/
- **本地项目路径**：`D:\BaiduSyncdisk\work\cursor app\claude code\XBB-APP\Ashtang_app\`

---

## 联系方式

- **开发者**：orange
- **角色**：产品经理（不会写代码，使用AI开发）
- **项目目标**：做一个自己愿意用的阿斯汤加打卡app

---

**最后更新**：2026-01-20
**问题状态**：待解决（已推送修复代码，等待验证）
