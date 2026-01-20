FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="next.js"
WORKDIR /src
RUN npm install -f -g pnpm@latest || npm install -f -g pnpm@8
COPY . .
RUN pnpm install

# 接收构建参数（由 Zeabur 注入）
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# 设置环境变量供构建过程使用
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm build

# 关键修复：Standalone 模式必须手动复制静态资源
# 1. 复制 public 目录（如果存在）
RUN cp -r public .next/standalone/public || true
# 2. 复制 .next/static 目录到 standalone/.next/static
RUN mkdir -p .next/standalone/.next
RUN cp -r .next/static .next/standalone/.next/static

ENV HOSTNAME="0.0.0.0"
EXPOSE 8080

# 切换工作目录到 standalone，确保 server.js 能正确找到相对路径的静态资源
WORKDIR /src/.next/standalone
CMD ["node", "server.js"]
