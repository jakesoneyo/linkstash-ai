import { z } from 'zod';

// 목록 조회 쿼리 — query string은 항상 문자열로 들어오므로 coerce/transform으로 정규화한다.
export const ListLinksQuerySchema = z.object({
  tags: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : undefined,
    ),
  q: z.string().trim().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListLinksQuery = z.infer<typeof ListLinksQuerySchema>;
