FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="next.js"
WORKDIR /src
RUN npm install -f -g pnpm@latest || npm install -f -g pnpm@8
COPY . .
RUN pnpm install
RUN pnpm build
ENV HOSTNAME="0.0.0.0"
EXPOSE 8080
CMD ["pnpm", "start"]
