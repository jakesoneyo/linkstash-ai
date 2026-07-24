import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OPENAI_CLIENT } from './openai-client.provider';
import { SummaryResult, SummaryResultSchema } from './summary-result.schema';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * 크롤링된 본문을 OpenAI Chat Completions에 1회 호출해 3줄 요약 + 태그 3~5개를 생성한다.
 * `zodResponseFormat`(Structured Outputs)으로 출력 스키마를 강제해 파싱 실패 가능성을 줄인다.
 * RAG/임베딩 없음 — SPEC.md Out 스코프.
 */
@Injectable()
export class SummarizerService {
  private readonly logger = new Logger(SummarizerService.name);
  private readonly model: string;

  constructor(
    @Inject(OPENAI_CLIENT) private readonly client: OpenAI,
    config: ConfigService,
  ) {
    this.model = config.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL;
  }

  /**
   * @param title 크롤링으로 얻은 페이지 제목(없으면 null) — LLM에 맥락으로 함께 전달
   * @param bodyText 정규화된 본문 텍스트
   * @throws Error OpenAI 호출 실패·rate limit·스키마 위반 등 모든 실패를 하나로 흡수해서 던진다
   *   (EnrichmentService가 이를 LLM_ERROR 상태 전이 사유로만 사용하기 때문에 원인 구분이 불필요).
   */
  async summarize(
    title: string | null,
    bodyText: string,
  ): Promise<SummaryResult> {
    try {
      const completion = await this.client.chat.completions.parse({
        model: this.model,
        messages: [
          {
            role: 'system',
            // 한국어 고정 지시 + 정확히 3줄 요약 요구 — DATA-MODEL.md LLM 출력 계약(summary 3줄, tags 3~5개)에 맞춤.
            content:
              '너는 웹페이지 본문을 읽고 핵심을 정리하는 어시스턴트다. ' +
              '반드시 한국어로, 정확히 3줄의 요약(줄바꿈으로 구분)과 ' +
              '본문 주제를 나타내는 소문자 태그 3~5개를 생성하라. 태그는 짧은 단어/슬러그로.',
          },
          {
            role: 'user',
            content: `제목: ${title ?? '(제목 없음)'}\n\n본문:\n${bodyText}`,
          },
        ],
        response_format: zodResponseFormat(SummaryResultSchema, 'summary'),
      });

      const parsed = completion.choices[0]?.message.parsed;
      if (!parsed) {
        throw new Error('OpenAI 응답에서 구조화된 결과를 받지 못했습니다.');
      }
      return parsed;
    } catch (err) {
      this.logger.warn(`OpenAI 요약 실패: ${(err as Error).message}`);
      throw new Error(`LLM 요약 실패: ${(err as Error).message}`);
    }
  }
}
