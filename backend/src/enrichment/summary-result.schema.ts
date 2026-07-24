import { z } from 'zod';

// DATA-MODEL.md 4절 "LLM 출력 계약"과 동일한 스키마.
// summary: 3줄(줄바꿈 구분) 문자열, tags: 3~5개 — OpenAI Structured Outputs로 이 형태를 강제한다.
export const SummaryResultSchema = z.object({
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).min(3).max(5),
});

export type SummaryResult = z.infer<typeof SummaryResultSchema>;
