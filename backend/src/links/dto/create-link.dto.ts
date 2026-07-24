import { z } from 'zod';

// 링크 저장 요청 — 크롤링/요약은 저장 이후 별도 파이프라인(Stage 3)에서 채워진다.
export const CreateLinkSchema = z.object({
  url: z.string().url('올바른 URL 형식이 아닙니다.'),
});

export type CreateLinkDto = z.infer<typeof CreateLinkSchema>;
