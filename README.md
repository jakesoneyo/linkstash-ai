# linkstash-ai

> URL을 저장하면 서버가 페이지를 **크롤링**하고 **OpenAI API**로 3줄 요약 + 태그 3~5개를 자동 생성해주는 개인용 북마크 SaaS.

크롤링 파이프라인과 LLM API 연동을 실제로 배포까지 이어지도록 구현한 프로젝트. 외부 요청(크롤링/LLM) 실패를 5xx로 흘리지 않고 상태 머신(`PENDING → READY/FAILED`)으로 흡수하는 데 초점을 맞췄다.

## 핵심 기능

| 기능           | 설명                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| 인증           | 이메일/비밀번호 + JWT(Passport). 링크는 전부 유저 소유(멀티테넌시 격리).                           |
| 링크 저장      | URL 입력 → 즉시 `PENDING`으로 저장·응답, 크롤링/요약은 백그라운드로 이어짐.                        |
| 크롤링         | `fetch` + `cheerio`로 제목/OG메타/본문 텍스트 추출·정규화.                                         |
| LLM 요약/태그  | OpenAI Chat Completions(Structured Outputs)로 3줄 요약 + 태그 3~5개 생성.                          |
| 실패 처리      | 크롤링/LLM 실패 시 5xx 없이 링크를 `FAILED`+사유로 저장, 수동 재처리(`/links/:id/reprocess`) 지원. |
| 목록/필터/검색 | 태그 다중 필터(AND), 제목/요약 텍스트 검색(`ILIKE`), 커서 페이지네이션.                            |

## 아키텍처

```mermaid
graph TD
  subgraph Client["프론트 (Vercel)"]
    UI["React SPA<br/>저장 폼 · 카드 목록 · 태그필터/검색"]
  end

  subgraph API["백엔드 NestJS (Docker)"]
    Auth["AuthModule<br/>Passport-JWT"]
    Links["LinksModule<br/>CRUD · 소유권 가드"]
    Enrich["EnrichmentService<br/>크롤링→LLM 파이프라인"]
    Crawl["CrawlerService<br/>fetch + cheerio"]
    LLM["SummarizerService<br/>openai-node"]
  end

  DB[("Neon Postgres<br/>User · Link · Tag")]
  Ext1["대상 웹페이지"]
  Ext2["OpenAI API"]

  UI -->|JWT| Auth
  UI -->|REST| Links
  Links --> DB
  Links -->|저장 직후 fire-and-forget| Enrich
  Enrich --> Crawl --> Ext1
  Enrich --> LLM --> Ext2
  Enrich -->|상태·요약·태그 갱신| DB
  UI -.->|폴링 refetchInterval| Links
```

저장 요청은 `PENDING`으로 즉시 응답하고, 크롤링·요약은 백그라운드에서 이어져 `READY` 또는 `FAILED`로 전이한다.

## 로컬 실행

### 사전 준비

- Node.js 24+, Docker(로컬 Postgres 컨테이너 또는 Neon Postgres 연결 문자열), OpenAI API 키(선택 — 없으면 크롤링만 되고 요약은 `FAILED(LLM_ERROR)`로 남음).

### 백엔드

```bash
# 로컬 Postgres가 없다면 우선 컨테이너로 하나 띄운다
docker run -d --name linkstash-pg-dev -e POSTGRES_USER=linkstash \
  -e POSTGRES_PASSWORD=linkstash -e POSTGRES_DB=linkstash \
  -p 5433:5432 postgres:16-alpine

cd backend
cp .env.example .env   # DATABASE_URL, JWT_SECRET, OPENAI_API_KEY 등 채우기
npm install
npx prisma migrate deploy   # 최초 1회 (또는 스키마 수정 시 npx prisma migrate dev)
npm run start:dev
```

- API: http://localhost:3000
- Swagger 문서: **http://localhost:3000/api/docs**
- 헬스체크: http://localhost:3000/health

### 프론트

```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

- http://localhost:5173

### Docker로 백엔드만 실행

```bash
cd backend
docker build -t linkstash-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://linkstash:linkstash@host.docker.internal:5433/linkstash?schema=public" \
  -e JWT_SECRET="change-me" \
  -e OPENAI_API_KEY="" \
  linkstash-backend
```

컨테이너 기동 시 `prisma migrate deploy`를 실행한 뒤 앱을 시작한다(`backend/Dockerfile` 참고).

## 테스트

```bash
cd backend
npm test         # 단위 테스트 (Jest) — 소유권 가드, 태그 필터 쿼리, 크롤러/요약기/enrichment 파이프라인
npm run test:e2e # 통합 테스트 (Testcontainers Postgres + supertest)
                  # 회원가입→로그인→링크 저장→enrich(모킹)→상태 전이→소유권 격리(403)를 실제 DB로 검증.
                  # 실행에 Docker가 필요하다(로컬 Docker 데몬이 떠 있어야 함).
```

CI(`.github/workflows/ci.yml`)는 매 push/PR마다 백엔드 lint→build→단위→통합 테스트, 프론트 lint→build를 게이트한다.

## 기술 스택

- **백엔드:** NestJS + TypeScript, Prisma, Neon Postgres, Passport-JWT, `@nestjs/swagger`, Zod, cheerio, openai(Structured Outputs)
- **프론트:** Vite + React + TypeScript + Tailwind v4, Zustand, TanStack Query, Axios, Zod
- **테스트:** Jest + supertest + Testcontainers(Postgres)
- **인프라:** Dockerfile(백엔드, 멀티스테이지), GitHub Actions CI

## 스코프 아웃 (의도적 제외)

과대포장 방지를 위해 명시적으로 제외한 범위:

- 벡터DB/임베딩/RAG/멀티턴 대화 — 전부 없음(pgvector 미사용, 일반 Prisma 모델만).
- BullMQ 등 무거운 잡 큐 — in-process fire-and-forget으로 충분(M티어).
- 소셜 로그인/OAuth — 이메일/비밀번호 JWT만.
- Puppeteer/Playwright 등 브라우저 크롤링 프레임워크 — `fetch` + `cheerio`로 충분(SSR 렌더링 불필요).

## 배포

- 프론트(Vercel), 백엔드(Docker 이미지 로컬 실행/데모) — **배포 예정** (사용자 승인 후 진행).
