import { z } from 'zod';

// 이메일/비밀번호 회원가입 요청 스키마. 비밀번호 최소 길이는 bcrypt 해시 대상이므로 여기서 강제.
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
