import { execSync } from 'child_process';
import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { CrawlerService } from '../src/enrichment/crawler.service';
import { SummarizerService } from '../src/enrichment/summarizer.service';

/** 링크 응답 바디 형태 — supertest의 res.body(any)를 안전하게 다루기 위한 최소 타입. */
interface LinkResponseBody {
  id: string;
  status: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  failReason: string | null;
}

/**
 * Testcontainers 기반 통합 테스트 — 실제 Postgres 컨테이너 위에서
 * 회원가입→로그인→링크 저장→enrichment(모킹)→상태 전이→소유권 격리까지
 * API.md/SPEC.md에 정의된 핵심 시나리오를 end-to-end로 검증한다.
 *
 * 외부 의존(대상 웹페이지 fetch, OpenAI API)은 CrawlerService/SummarizerService를
 * overrideProvider로 교체해 완전히 제거한다 — CI가 네트워크 없이도 그린이어야 한다.
 */
describe('Enrichment flow (e2e, Testcontainers Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let httpServer: Server;
  let crawlMock: jest.Mock;
  let summarizeMock: jest.Mock;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    // 최소한의 인증 부트스트랩에 필요한 값 — 이 테스트에서만 쓰이는 실행 시점 env.
    process.env.JWT_SECRET ??= 'test-secret';

    // 컨테이너에 커밋된 마이그레이션을 그대로 적용(prod과 동일 경로: migrate deploy).
    execSync('npx prisma migrate deploy', {
      cwd: __dirname + '/..',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    crawlMock = jest.fn();
    summarizeMock = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CrawlerService)
      .useValue({ crawl: crawlMock })
      .overrideProvider(SummarizerService)
      .useValue({ summarize: summarizeMock })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  /** enrich()는 컨트롤러가 await하지 않으므로, 폴링으로 상태 전이(READY/FAILED)를 기다린다. */
  async function waitForStatus(
    token: string,
    linkId: string,
    target: 'READY' | 'FAILED',
    attempts = 20,
  ): Promise<LinkResponseBody> {
    for (let i = 0; i < attempts; i++) {
      const res = await request(httpServer)
        .get(`/links/${linkId}`)
        .set('Authorization', `Bearer ${token}`);
      const body = res.body as LinkResponseBody;
      if (body.status === target) return body;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`status가 ${target}로 전이되지 않음 (linkId=${linkId})`);
  }

  async function registerAndLogin(email: string): Promise<string> {
    await request(httpServer)
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    const loginRes = await request(httpServer)
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (loginRes.body as { accessToken: string }).accessToken;
  }

  it('저장→PENDING 즉시 응답→enrich 성공 시 READY로 전이→타 유저는 403', async () => {
    crawlMock.mockResolvedValueOnce({
      title: '크롤링된 제목',
      ogImage: 'https://example.com/og.png',
      bodyText: '본문 텍스트',
    });
    summarizeMock.mockResolvedValueOnce({
      summary: '1줄 요약\n2줄 요약\n3줄 요약',
      tags: ['react', 'nestjs', '테스트'],
    });

    const tokenA = await registerAndLogin('user-a@example.com');

    const createRes = await request(httpServer)
      .post('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com/article' })
      .expect(201);
    const created = createRes.body as LinkResponseBody;
    expect(created.status).toBe('PENDING');

    const ready = await waitForStatus(tokenA, created.id, 'READY');
    expect(ready.title).toBe('크롤링된 제목');
    expect(ready.summary).toBe('1줄 요약\n2줄 요약\n3줄 요약');
    expect(ready.tags.sort()).toEqual(['nestjs', 'react', '테스트'].sort());

    const tokenB = await registerAndLogin('user-b@example.com');
    await request(httpServer)
      .get(`/links/${created.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('크롤링이 실패하면 5xx 없이 FAILED(CRAWL_ERROR)로 저장된다', async () => {
    crawlMock.mockRejectedValueOnce(new Error('HTTP 404'));

    const token = await registerAndLogin('user-c@example.com');
    const createRes = await request(httpServer)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/dead-link' })
      .expect(201);
    const created = createRes.body as LinkResponseBody;

    const failed = await waitForStatus(token, created.id, 'FAILED');
    expect(failed.failReason).toBe('CRAWL_ERROR');
  });
});
