import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/** SummarizerService에 OpenAI 클라이언트를 주입하기 위한 DI 토큰(테스트에서 목으로 교체). */
export const OPENAI_CLIENT = Symbol('OPENAI_CLIENT');

/**
 * OpenAI 클라이언트 팩토리.
 * 키가 비어 있어도(`.env`에 `OPENAI_API_KEY=""`) 앱 부팅은 성공해야 한다(SPEC.md 성공 기준) —
 * 생성자에 빈 문자열을 그대로 넘기면 SDK가 즉시 "Missing credentials" 에러를 던지므로,
 * 실제 인증 실패는 요약 호출 시점(401)에만 나도록 플레이스홀더 키를 채워 넣는다.
 */
export function createOpenAIClient(config: ConfigService): OpenAI {
  const apiKey = config.get<string>('OPENAI_API_KEY');
  return new OpenAI({
    apiKey: apiKey && apiKey.length > 0 ? apiKey : 'sk-not-configured',
  });
}
