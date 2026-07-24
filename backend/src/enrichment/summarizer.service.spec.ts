import { ConfigService } from '@nestjs/config';
import type OpenAI from 'openai';
import { SummarizerService } from './summarizer.service';

/**
 * SummarizerService 단위 테스트 — 실제 OpenAI API 키 없이도 검증 가능하도록
 * OpenAI 클라이언트를 목으로 주입한다(OPENAI_CLIENT DI 토큰 덕분에 가능).
 * 실제 네트워크 호출/실키 검증은 하지 않음 — README에 명시.
 */
describe('SummarizerService', () => {
  function buildService(parseMock: jest.Mock) {
    const client = {
      chat: { completions: { parse: parseMock } },
    } as unknown as OpenAI;
    const config = { get: () => undefined } as unknown as ConfigService;
    return new SummarizerService(client, config);
  }

  it('OpenAI 구조화 출력의 parsed 결과를 그대로 반환한다', async () => {
    const parsed = {
      summary: '1줄\n2줄\n3줄',
      tags: ['react', 'nestjs', '면접'],
    };
    const parseMock = jest
      .fn()
      .mockResolvedValue({ choices: [{ message: { parsed } }] });
    const service = buildService(parseMock);

    const result = await service.summarize('제목', '본문 텍스트');

    expect(result).toEqual(parsed);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it('OpenAI 호출이 실패하면 LLM_ERROR로 식별 가능한 에러를 던진다', async () => {
    const parseMock = jest
      .fn()
      .mockRejectedValue(new Error('401 Unauthorized'));
    const service = buildService(parseMock);

    await expect(service.summarize('제목', '본문')).rejects.toThrow(
      /LLM 요약 실패/,
    );
  });

  it('parsed가 비어있으면(스키마 강제 실패) 에러를 던진다', async () => {
    const parseMock = jest
      .fn()
      .mockResolvedValue({ choices: [{ message: { parsed: null } }] });
    const service = buildService(parseMock);

    await expect(service.summarize('제목', '본문')).rejects.toThrow(
      /LLM 요약 실패/,
    );
  });
});
