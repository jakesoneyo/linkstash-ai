// Zustand: 인증 상태(액세스 토큰 + 유저) — 새로고침 후에도 로그인 유지를 위해 localStorage에 persist.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "../lib/schemas";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      login: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: "linkstash-auth" },
  ),
);
