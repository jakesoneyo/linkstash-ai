// API.md의 응답/요청 형태를 백엔드 DTO와 동일한 모양으로 재선언한 Zod 스키마.
// 모노레포 패키지 분리 없이(ponytail) 프론트에서 별도로 유지 — 응답 파싱 시 런타임 검증까지 겸한다.
import { z } from "zod";

export const LinkStatusSchema = z.enum(["PENDING", "READY", "FAILED"]);
export type LinkStatus = z.infer<typeof LinkStatusSchema>;

export const LinkSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  ogImage: z.string().nullable(),
  summary: z.string().nullable(),
  status: LinkStatusSchema,
  failReason: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Link = z.infer<typeof LinkSchema>;

export const LinksPageSchema = z.object({
  items: z.array(LinkSchema),
  nextCursor: z.string().nullable(),
});

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});
export type Tag = z.infer<typeof TagSchema>;

// 링크 저장 폼 입력 — 백엔드 CreateLinkSchema와 동일한 검증 규칙.
export const CreateLinkInputSchema = z.object({
  url: z.string().url("올바른 URL 형식이 아닙니다."),
});
export type CreateLinkInput = z.infer<typeof CreateLinkInputSchema>;

export const RegisterInputSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다."),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthUserSchema = z.object({ id: z.string(), email: z.string() });
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({ accessToken: z.string() });
