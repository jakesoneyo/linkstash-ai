import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

/** 크롤링 결과 — EnrichmentService가 SummarizerService에 그대로 넘기는 형태. */
export interface CrawlResult {
  title: string | null;
  ogImage: string | null;
  bodyText: string;
}

const DEFAULT_TIMEOUT_MS = 8000;
// LLM 호출 토큰/비용 상한 — 3줄 요약에는 충분하면서 과금 폭주를 막는 컷.
const MAX_BODY_LENGTH = 6000;

/**
 * 대상 URL을 fetch로 가져와 cheerio로 제목/OG 메타/본문 텍스트를 추출한다.
 * ARCHITECTURE.md 판단대로 Puppeteer 등 렌더링 프레임워크 없이 fetch+cheerio만 사용(ponytail).
 */
@Injectable()
export class CrawlerService {
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = Number(
      this.config.get<string>('CRAWL_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS,
    );
  }

  /**
   * @param url 사용자가 저장한 원본 URL
   * @returns 정규화된 title/ogImage/bodyText
   * @throws Error 타임아웃·네트워크 실패·4xx/5xx·본문 추출 실패 시 — 호출자(EnrichmentService)가
   *   메시지를 그대로 failReason 흡수 로직에 사용하므로 사람이 읽을 수 있는 문장으로 던진다.
   */
  async crawl(url: string): Promise<CrawlResult> {
    const controller = new AbortController();
    // fetch는 기본적으로 무한 대기할 수 있음 — AbortController로 강제 타임아웃해
    // fire-and-forget 백그라운드 파이프라인이 영영 끝나지 않는 상황을 막는다.
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'linkstash-ai/1.0 (+bookmark summarizer bot)',
        },
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new Error(
        isAbort
          ? `크롤링 타임아웃(${this.timeoutMs}ms): ${url}`
          : `크롤링 요청 실패: ${url} (${(err as Error).message})`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`크롤링 실패: HTTP ${res.status} (${url})`);
    }

    const html = await res.text();
    return this.extract(html);
  }

  private extract(html: string): CrawlResult {
    const $ = cheerio.load(html);
    // 스크립트/스타일/네비/푸터 등은 본문이 아니라 요약 품질을 해치는 노이즈라 제거.
    $('script, style, noscript, nav, footer, header, svg').remove();

    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').text().trim() ||
      null;
    const ogImage =
      $('meta[property="og:image"]').attr('content')?.trim() || null;

    const bodyText = $('body')
      .text()
      .replace(/\s+/g, ' ') // 공백/줄바꿈 뭉침 정리 — LLM 프롬프트에 불필요한 토큰 낭비 방지
      .trim()
      .slice(0, MAX_BODY_LENGTH);

    if (!bodyText) {
      // HTTP 응답 자체는 성공(2xx)했지만 파싱 가능한 본문이 없는 경우(예: 순수 SPA 쉘) —
      // EnrichmentService 입장에선 크롤링 실패와 동일하게 CRAWL_ERROR로 흡수한다.
      throw new Error('본문 텍스트를 추출하지 못했습니다.');
    }

    return { title, ogImage, bodyText };
  }
}
