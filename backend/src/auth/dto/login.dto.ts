import { z } from 'zod';

// 포트폴리오 데모 편의: 리터럴 'admin' 하나만 이메일 형식 검증을 예외 처리한다.
// 면접관이 회원가입 없이 곧바로 시연 데이터를 볼 수 있게 하려는 목적이며,
// 다른 어떤 문자열도 이 예외를 타지 않고 여전히 정상 이메일 형식만 허용된다.
// 비밀번호 검증(bcrypt 비교)은 AuthService.login에서 그대로 수행되므로 인증 우회는 아니다.
// 회원가입(RegisterSchema)에는 이 예외를 두지 않는다 — 일반 가입은 항상 실제 이메일이 필요하다.
export const LoginSchema = z.object({
  email: z.union([z.literal('admin'), z.string().email()]),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
