// AuthModule 대응 TanStack Query 훅 — register/login/me.
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/auth.store";
import {
  AuthResponseSchema,
  AuthUserSchema,
  type LoginInput,
  type RegisterInput,
} from "../lib/schemas";

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post("/auth/register", input);
      return AuthUserSchema.parse(data);
    },
  });
}

/**
 * 로그인 성공 시 액세스 토큰만 오므로(API.md), `/auth/me`를 한 번 더 호출해
 * 유저 정보까지 함께 확보한 뒤 Zustand 스토어에 저장한다.
 */
export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post("/auth/login", input);
      const { accessToken } = AuthResponseSchema.parse(data);
      const me = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = AuthUserSchema.parse(me.data);
      login(accessToken, user);
      return user;
    },
  });
}
