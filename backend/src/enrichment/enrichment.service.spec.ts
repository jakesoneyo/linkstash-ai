import { LinkStatus } from '@prisma/client';
import { EnrichmentService } from './enrichment.service';
import { CrawlerService } from './crawler.service';
import { SummarizerService } from './summarizer.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * EnrichmentService 단위 테스트 — 실제 크롤링/OpenAI 호출 없이 CrawlerService·
 * SummarizerService·PrismaService를 전부 목으로 교체해 상태 전이(PENDING -> READY/FAILED)
 * 로직만 검증한다. tags.util(replaceLinkTags)는 인터랙티브 트랜잭션 없이 this.prisma를
 * 직접 받으므로(Neon 서버리스 커넥션 이슈 회피), 태그 관련 메서드도 prisma 목에 바로 둔다.
 */
describe('EnrichmentService', () => {
  const link = {
    id: 'link-1',
    userId: 'user-1',
    url: 'https://example.com',
  };

  function buildService(overrides?: {
    crawl?: jest.Mock;
    summarize?: jest.Mock;
  }) {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const tagsOnLinksDeleteMany = jest.fn().mockResolvedValue(undefined);
    const tagsOnLinksCreateMany = jest.fn().mockResolvedValue(undefined);
    const tagUpsert = jest
      .fn()
      .mockImplementation(
        ({ where }: { where: { userId_name: { name: string } } }) =>
          Promise.resolve({ id: `tag-${where.userId_name.name}` }),
      );

    const prisma = {
      link: {
        findUnique: jest.fn().mockResolvedValue(link),
        update: updateMock,
      },
      tag: { upsert: tagUpsert },
      tagsOnLinks: {
        deleteMany: tagsOnLinksDeleteMany,
        createMany: tagsOnLinksCreateMany,
      },
    } as unknown as PrismaService;

    const crawler = {
      crawl: overrides?.crawl ?? jest.fn(),
    } as unknown as CrawlerService;
    const summarizer = {
      summarize: overrides?.summarize ?? jest.fn(),
    } as unknown as SummarizerService;

    const service = new EnrichmentService(prisma, crawler, summarizer);
    return { service, prisma, updateMock, tagUpsert, tagsOnLinksCreateMany };
  }

  it('크롤링+요약이 모두 성공하면 READY로 갱신하고 태그를 반영한다', async () => {
    const crawl = jest
      .fn()
      .mockResolvedValue({ title: '제목', ogImage: null, bodyText: '본문' });
    const summarize = jest.fn().mockResolvedValue({
      summary: '1줄\n2줄\n3줄',
      tags: ['react', 'nestjs', '면접'],
    });
    const { service, updateMock, tagUpsert, tagsOnLinksCreateMany } =
      buildService({ crawl, summarize });

    await service.enrich('link-1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: {
        title: '제목',
        ogImage: null,
        summary: '1줄\n2줄\n3줄',
        status: LinkStatus.READY,
        failReason: null,
      },
    });
    expect(tagUpsert).toHaveBeenCalledTimes(3);
    expect(tagsOnLinksCreateMany).toHaveBeenCalledTimes(1);
  });

  it('크롤링이 실패하면 CRAWL_ERROR로 FAILED 처리하고 요약은 호출하지 않는다', async () => {
    const crawl = jest.fn().mockRejectedValue(new Error('HTTP 404'));
    const summarize = jest.fn();
    const { service, updateMock } = buildService({ crawl, summarize });

    await service.enrich('link-1');

    expect(summarize).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { status: LinkStatus.FAILED, failReason: 'CRAWL_ERROR' },
    });
  });

  it('요약이 실패하면 LLM_ERROR로 FAILED 처리하되 title/ogImage는 저장한다', async () => {
    const crawl = jest.fn().mockResolvedValue({
      title: '크롤링된 제목',
      ogImage: 'https://example.com/og.png',
      bodyText: '본문',
    });
    const summarize = jest
      .fn()
      .mockRejectedValue(new Error('LLM 요약 실패: 401'));
    const { service, updateMock } = buildService({ crawl, summarize });

    await service.enrich('link-1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { title: '크롤링된 제목', ogImage: 'https://example.com/og.png' },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { status: LinkStatus.FAILED, failReason: 'LLM_ERROR' },
    });
  });

  it('링크가 이미 삭제됐으면 아무 것도 하지 않고 조용히 종료한다', async () => {
    const crawl = jest.fn();
    const { service, prisma } = buildService({ crawl });
    (prisma.link.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.enrich('missing')).resolves.toBeUndefined();
    expect(crawl).not.toHaveBeenCalled();
  });
});
