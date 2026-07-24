import { z } from 'zod';

// 수동 수정 — 제목/태그만 편집 가능(요약·상태는 파이프라인 전용 필드).
export const UpdateLinkSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

export type UpdateLinkDto = z.infer<typeof UpdateLinkSchema>;
