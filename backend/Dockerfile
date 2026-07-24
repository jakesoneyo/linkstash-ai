# linkstash-ai backend — 멀티스테이지 빌드.
# build 스테이지에서 컴파일+Prisma 클라이언트 생성 후, devDependencies를 정리(prune)해
# runtime 스테이지로 넘긴다(레이어 재사용 위해 npm ci를 한 번만 수행).

FROM node:24-alpine AS build
WORKDIR /app

# Prisma 엔진은 alpine(musl)에서 OpenSSL을 요구한다 — generate/runtime 동일 베이스라 한 번만 설치.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# 빌드에만 필요한 devDependencies(nest-cli, typescript, jest 등)는 런타임에 불필요.
RUN npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# 공식 node 이미지에 내장된 비루트 `node` 유저로 실행.
USER node

EXPOSE 3000

# 컨테이너 기동 시 최신 마이그레이션을 적용(idempotent)한 뒤 앱을 시작한다.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
