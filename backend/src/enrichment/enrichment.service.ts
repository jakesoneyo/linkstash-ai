import { Injectable, Logger } from '@nestjs/common';
import { LinkStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { replaceLinkTags } from '../links/tags.util';
import { CrawlerService } from './crawler.service';
import { SummarizerService } from './summarizer.service';

// FAILED 상태의 사람이 읽는 사유 코드 — API.md/DATA-MODEL.md failReason 계약과 일치.
const FAIL_REASON = {
  CRAWL_ERROR: 'CRAWL_ERROR',
  LLM_ERROR: 'LLM_ERROR',
} as const;

/**
 * 링크 저장/재처리 시 실행되는 크롤링→LLM 요약 파이프라인의 오케스트레이터.
 * ARCHITECTURE.md 시퀀스대로: crawl → summarize → DB 갱신(READY) 이며,
 * 어느 단계든 실패해도 절대 throw하지 않고 FAILED 상태로 흡수한다 —
 * 컨트롤러가 이 메서드를 await 없이 fire-and-forget으로 호출하기 때문에
 * 여기서 던지면 처리되지 않는 rejection으로 새어나간다.
 */
@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawler: CrawlerService,
    private readonly summarizer: SummarizerService,
  ) {}

  /**
   * @param linkId enrich 대상 Link.id (PENDING 상태로 이미 저장돼 있어야 함)
   */
  async enrich(linkId: string): Promise<void> {
    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link) {
      // 삭제 레이스 등으로 이미 사라진 링크 — 알릴 대상이 없으니 조용히 종료.
      this.logger.warn(`enrich 대상 링크를 찾을 수 없음: ${linkId}`);
      return;
    }

    let crawled: Awaited<ReturnType<CrawlerService['crawl']>>;
    try {
      crawled = await this.crawler.crawl(link.url);
    } catch (err) {
      await this.markFailed(linkId, FAIL_REASON.CRAWL_ERROR, err as Error);
      return;
    }

    try {
      const result = await this.summarizer.summarize(
        crawled.title,
        crawled.bodyText,
      );

      // 상태 전이 PENDING -> READY: 요약 저장 후 태그를 반영한다.
      // 원래는 인터랙티브 $transaction으로 묶어 "요약은 있는데 태그가 비어있는"
      // 중간 상태를 없애려 했으나, Neon 서버리스 Postgres는 유휴 커넥션을
      // 재활용/일시중단하기 때문에 인터랙티브 트랜잭션이 그 사이에 끊긴 커넥션을
      // 참조하며 "Transaction not found"로 실패하는 사례가 있었다(prod에서 재현됨).
      // 순차 실행으로 바꿔 이 문제를 피한다 — 두 쓰기 사이 수 ms의 원자성 손실은
      // 폴링 UI에서 사실상 관측되지 않아 감수 가능하다고 판단.
      await this.prisma.link.update({
        where: { id: linkId },
        data: {
          title: crawled.title,
          ogImage: crawled.ogImage,
          summary: result.summary,
          status: LinkStatus.READY,
          failReason: null,
        },
      });
      await replaceLinkTags(this.prisma, link.userId, linkId, result.tags);
    } catch (err) {
      // 크롤링은 성공했으므로 title/ogImage는 남겨 재처리 시 참고할 수 있게 한다.
      await this.prisma.link.update({
        where: { id: linkId },
        data: { title: crawled.title, ogImage: crawled.ogImage },
      });
      await this.markFailed(linkId, FAIL_REASON.LLM_ERROR, err as Error);
    }
  }

  /** 상태 전이 PENDING -> FAILED: DB에는 코드(failReason)만 남기고 상세 사유는 서버 로그로만 남긴다. */
  private async markFailed(
    linkId: string,
    reason: (typeof FAIL_REASON)[keyof typeof FAIL_REASON],
    err: Error,
  ): Promise<void> {
    this.logger.warn(`enrich 실패(${reason}): link=${linkId} ${err.message}`);
    await this.prisma.link.update({
      where: { id: linkId },
      data: { status: LinkStatus.FAILED, failReason: reason },
    });
  }
}
