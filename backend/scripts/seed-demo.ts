/**
 * 포트폴리오 데모 계정 1회성 시드 스크립트.
 *
 * 목적: 면접관이 회원가입 없이 email='admin' / password='admin' 계정으로 로그인해
 * 이미 요약·태그까지 채워진 링크 목록을 바로 볼 수 있게 한다.
 * 크롤링/LLM 호출 없이 실제 서비스 흐름을 거친 것처럼 보이는 값을 하드코딩해 넣는다.
 *
 * 멱등성: admin 계정이 이미 존재하면 아무 것도 하지 않고 종료한다(재실행 안전).
 *
 * 실행 방법 (backend/ 디렉토리에서, 실제 DB 커넥션 문자열로):
 *   DATABASE_URL="<Neon 커넥션 문자열>" npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts
 *
 * backend/.env에 이미 대상 DATABASE_URL이 설정돼 있다면 dotenv로 로드해도 된다:
 *   npx dotenv -e .env -- npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts
 *
 * 주의: 이 스크립트는 애플리케이션 런타임 코드가 아니라 운영자가 직접 실행하는
 * 1회성 데이터 작업이다. 애플리케이션 부팅 경로(main.ts 등)에서 자동 호출하지 않는다.
 */
import { PrismaClient, LinkStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { replaceLinkTags } from '../src/links/tags.util';

const BCRYPT_SALT_ROUNDS = 10;
const DEMO_EMAIL = 'admin';
const DEMO_PASSWORD = 'admin';

// 실제 크롤링/LLM 호출 없이 하드코딩한 데모용 샘플 — 개발자 친화적인 실제 문서 링크로 구성.
const DEMO_LINKS: {
  url: string;
  title: string;
  ogImage: string;
  summary: string;
  tags: string[];
}[] = [
  {
    url: 'https://docs.nestjs.com',
    title: 'NestJS - A progressive Node.js framework',
    ogImage: 'https://docs.nestjs.com/assets/logo-small.svg',
    summary:
      '- NestJS는 데코레이터·모듈·DI를 활용해 확장 가능한 서버 아키텍처를 제공하는 Node.js 프레임워크다.\n' +
      '- Express/Fastify 위에서 동작하며 REST, GraphQL, WebSocket, 마이크로서비스를 동일한 구조로 지원한다.\n' +
      '- 공식 문서는 모듈, 프로바이더, 파이프, 가드, 인터셉터 등 핵심 개념을 단계별 예제로 안내한다.',
    tags: ['nestjs', 'backend', 'docs'],
  },
  {
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    title: 'The TypeScript Handbook',
    ogImage: 'https://www.typescriptlang.org/icons/icon-512x512.png',
    summary:
      '- TypeScript 핸드북은 타입 시스템 기초부터 제네릭, 유틸리티 타입까지 공식 가이드로 정리한다.\n' +
      '- 자바스크립트 코드베이스에 점진적으로 타입을 도입하는 방법과 tsconfig 옵션을 설명한다.\n' +
      '- 문법 나열보다 "왜 이 타입이 필요한가"에 초점을 맞춘 실전 예제 중심 문서다.',
    tags: ['typescript', 'docs', 'frontend'],
  },
  {
    url: 'https://www.prisma.io/docs',
    title: 'Prisma Documentation',
    ogImage: 'https://www.prisma.io/images/favicon-32x32.png',
    summary:
      '- Prisma는 스키마 파일 하나로 타입 안전한 클라이언트와 마이그레이션을 함께 생성하는 ORM이다.\n' +
      '- Prisma Migrate로 스키마 변경 이력을 관리하고, Prisma Studio로 데이터를 시각적으로 확인할 수 있다.\n' +
      '- PostgreSQL, MySQL, SQLite 등 다양한 데이터베이스를 동일한 쿼리 API로 다룰 수 있다.',
    tags: ['prisma', 'database', 'docs'],
  },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });
    if (existing) {
      console.log(
        `[seed-demo] admin 계정이 이미 존재합니다 (id=${existing.id}). 스킵.`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

    // 인터랙티브 $transaction으로 묶지 않는다 — Neon 서버리스 Postgres는 유휴
    // 커넥션을 재활용/일시중단해 왕복 지연이 늘어나고, 기본 5초 트랜잭션
    // 타임아웃을 넘기면 "Transaction already closed"로 실패한다(enrichment.
    // service.ts에서 겪은 것과 동일한 문제). 순차 쓰기로 바꿔 회피한다.
    const user = await prisma.user.create({
      data: { email: DEMO_EMAIL, passwordHash },
    });

    for (const demoLink of DEMO_LINKS) {
      const link = await prisma.link.create({
        data: {
          userId: user.id,
          url: demoLink.url,
          title: demoLink.title,
          ogImage: demoLink.ogImage,
          summary: demoLink.summary,
          status: LinkStatus.READY,
        },
      });
      // LinksService/EnrichmentService와 동일한 태그 upsert 로직을 재사용한다.
      await replaceLinkTags(prisma, user.id, link.id, demoLink.tags);
    }

    console.log(
      `[seed-demo] admin 계정(id=${user.id})과 링크 ${DEMO_LINKS.length}개를 생성했습니다.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('[seed-demo] 시드 실패:', err);
  process.exitCode = 1;
});
