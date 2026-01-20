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

# 修复 404 问题：手动复制静态资源到 standalone 目录
# 必须确保 public 和 .next/static 在 standalone 模式下可访问
RUN cp -r public .next/standalone/public || true
RUN mkdir -p .next/standalone/.next
RUN cp -r .next/static .next/standalone/.next/static

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
EXPOSE 8080

# 明确指定启动命令
CMD ["node", ".next/standalone/server.js"]
