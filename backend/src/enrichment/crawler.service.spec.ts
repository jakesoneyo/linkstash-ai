import { ConfigService } from '@nestjs/config';
import { CrawlerService } from './crawler.service';

/**
 * CrawlerService 단위 테스트 — 전역 fetch를 목으로 교체해 실제 네트워크 없이
 * 성공/실패(4xx·5xx·타임아웃·빈 본문) 분기를 검증한다.
 */
describe('CrawlerService', () => {
  const originalFetch = global.fetch;
  let service: CrawlerService;

  beforeEach(() => {
    const config = { get: () => '5000' } as unknown as ConfigService;
    service = new CrawlerService(config);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('title/OG메타/본문을 정규화해서 추출한다', async () => {
    const html = `
      <html>
        <head>
          <title>fallback title</title>
          <meta property="og:title" content="OG 제목" />
          <meta property="og:image" content="https://example.com/thumb.png" />
          <style>.x{color:red}</style>
          <script>console.log('noise')</script>
        </head>
        <body>
          <nav>메뉴</nav>
          <p>실제   본문   내용입니다.</p>
          <footer>푸터</footer>
        </body>
      </html>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    });

    const result = await service.crawl('https://example.com');

    expect(result.title).toBe('OG 제목');
    expect(result.ogImage).toBe('https://example.com/thumb.png');
    expect(result.bodyText).toContain('실제 본문 내용입니다.');
    expect(result.bodyText).not.toContain('메뉴');
    expect(result.bodyText).not.toContain('noise');
  });

  it('HTTP 4xx/5xx 응답이면 에러를 던진다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    });

    await expect(service.crawl('https://example.com/404')).rejects.toThrow(
      /HTTP 404/,
    );
  });

  it('fetch가 AbortError로 실패하면(타임아웃) 타임아웃 메시지로 에러를 던진다', async () => {
    const abortError = Object.assign(new Error('aborted'), {
      name: 'AbortError',
    });
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(service.crawl('https://slow.example.com')).rejects.toThrow(
      /타임아웃/,
    );
  });

  it('본문이 비어 있으면 에러를 던진다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><head></head><body></body></html>'),
    });

    await expect(service.crawl('https://example.com/empty')).rejects.toThrow(
      /본문 텍스트/,
    );
  });
});
