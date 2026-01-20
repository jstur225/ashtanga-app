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

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
EXPOSE 8080

CMD ["pnpm", "start"]
