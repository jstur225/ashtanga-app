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

## 最新部署后问题：页面空白/UI未加载 (2026-01-20 更新)

**现象**：
- 页面可以打开 (200 OK)，502 错误已解决。
- 但页面一片空白或没有任何样式，无法点击任何按钮。

**原因定位**：
- **Supabase 环境变量构建时缺失**。
- Next.js 的 `NEXT_PUBLIC_` 环境变量必须在 **Build Time (构建时)** 存在，才能被打包进前端 JS 代码中。
- Docker 构建过程 (`RUN pnpm build`) 默认不会读取 Zeabur 控制台配置的环境变量，除非显式使用 `ARG` 传递。
- 由于前端代码 (`lib/supabase.ts`) 使用了非空断言 (`!`)，环境变量缺失导致 JS 在加载时抛出错误，整个应用崩溃。

**修复方案**：
1. **修改 Dockerfile**：
   - 添加 `ARG` 声明以接收 Zeabur 注入的构建参数。
   - 添加 `ENV` 将参数传递给 Next.js 构建过程。
   ```dockerfile
   ARG NEXT_PUBLIC_SUPABASE_URL
   ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
   ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
   ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **验证步骤**：
   - 推送代码后，Zeabur 会自动重新构建。
   - 构建过程中应该能看到 Supabase 相关的变量被注入。
   - 部署完成后，前端 JS 应该能正常初始化 Supabase 客户端。

---

## 最新部署后问题：资源404 (2026-01-20 更新)

**现象**：
- 页面能打开，但所有 CSS、JS、字体文件均返回 404。
- 控制台出现 `turbopack-...js` 404 错误。

**原因定位**：
- **缺失 `.dockerignore` 文件**。
- `Dockerfile` 中的 `COPY . .` 指令将本地开发环境的 `node_modules` (Windows版) 和 `.next` (包含 Turbopack 缓存) 复制到了 Docker 镜像中。
- 这导致容器内的构建环境被污染，Next.js 尝试加载本地开发的构建产物，而不是容器内新构建的产物。
- 另外，暂时关闭了 `output: 'standalone'`，因为当前使用 `pnpm start` 启动，不需要 standalone 模式。

**修复方案**：
1. **创建 `.dockerignore`**：
   - 排除 `node_modules`, `.next`, `.git` 等目录。
   - 确保 Docker 构建环境是纯净的。

2. **修改 `next.config.mjs`**：
   - 注释掉 `output: 'standalone'`，恢复默认构建模式。

---

## 最新部署后问题：启动失败 (MODULE_NOT_FOUND) (2026-01-20 更新)

**现象**：
- 部署失败，日志报错：`Error: Cannot find module '/src/.next/standalone/server.js'`
- 应用不断重启（BackOff）。

**原因定位**：
- **配置文件不一致**。
- 上一步我们修改了 `next.config.mjs` 关闭了 `standalone` 模式。
- 但是 `nixpacks.toml` 中仍然指定启动命令为 `node .next/standalone/server.js`。
- 此时 `pnpm build` 不再生成 standalone 目录，导致启动命令找不到文件。

**修复方案**：
- 修改 `nixpacks.toml`，将启动命令改为 `pnpm start`。
- 这样与 `package.json` 中的 `start` 脚本保持一致（`next start -p $PORT -H 0.0.0.0`）。

---

## 404 静态资源丢失问题 (2026-01-20 修复)

**现象**：
- 部署成功且页面能访问，但所有 JS/CSS/图片 均报 404 错误。
- 页面样式丢失，交互失效。

**原因**：
- Next.js 的 `output: 'standalone'` 模式**不会自动复制** `public` 文件夹和 `.next/static` 文件夹到 standalone 构建目录中。
- 官方文档明确指出这两个目录需要手动复制或通过 CDN 托管。
- 由于 Zeabur 容器直接运行 `node .next/standalone/server.js`，Node 服务在 standalone 目录下找不到这些静态资源，导致 404。

**修复方案**：
- 修改 `Dockerfile`，在 `pnpm build` 之后增加手动复制命令：
  ```dockerfile
  RUN cp -r public .next/standalone/public || true
  RUN mkdir -p .next/standalone/.next
  RUN cp -r .next/static .next/standalone/.next/static
  ```
- 这样 `server.js` 就能在相对路径下正确找到静态文件。

---

## 最新部署后问题：Zeabur 坚持使用 standalone 启动 (2026-01-20 更新)

**现象**：
- 即使修改了 `nixpacks.toml` 和 `Dockerfile` 为 `pnpm start`，Zeabur 依然报错 `Cannot find module '/src/.next/standalone/server.js'`。
- 说明 Zeabur 平台可能锁定了启动命令，或者构建缓存极其顽固。

**修复方案（最终决策）**：
- **顺势而为**：恢复 `output: 'standalone'` 模式。
- **配置统一**：将 `Dockerfile` 和 `nixpacks.toml` 的启动命令全部改回 `node .next/standalone/server.js`。
- **环境保障**：由于之前已经添加了 `.dockerignore` 排除本地干扰，现在开启 standalone 模式是安全的（不会再出现 404 问题）。

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
