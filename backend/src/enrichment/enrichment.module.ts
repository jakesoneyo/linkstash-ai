import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlerService } from './crawler.service';
import { SummarizerService } from './summarizer.service';
import { EnrichmentService } from './enrichment.service';
import { OPENAI_CLIENT, createOpenAIClient } from './openai-client.provider';

/** 크롤링+LLM 요약 파이프라인. LinksModule이 EnrichmentService만 가져다 쓴다. */
@Module({
  providers: [
    CrawlerService,
    SummarizerService,
    EnrichmentService,
    {
      provide: OPENAI_CLIENT,
      useFactory: createOpenAIClient,
      inject: [ConfigService],
    },
  ],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
