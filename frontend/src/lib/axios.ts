// Axios 인스턴스 — 요청마다 Zustand에 보관된 JWT를 자동 첨부하고,
// 401 응답이면 로컬 인증 상태를 비워 로그인 화면으로 돌아가게 한다.
import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // 토큰 만료/무효 — 재로그인을 유도하기 위해 저장된 인증 정보를 즉시 비운다.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
