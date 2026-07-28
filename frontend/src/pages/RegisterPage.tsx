import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useRegister, useLogin } from "../api/auth";
import { useAuthStore } from "../store/auth.store";
import { RegisterInputSchema } from "../lib/schemas";

export function RegisterPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) navigate("/", { replace: true });
  }, [accessToken, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = RegisterInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
      return;
    }
    setError(null);
    try {
      await registerMutation.mutateAsync(parsed.data);
      // 가입 직후 바로 로그인까지 이어서 처리 — 데모/사용성을 위해 2단계를 자동화.
      await loginMutation.mutateAsync(parsed.data);
      navigate("/");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.status === 409
          ? "이미 가입된 이메일입니다."
          : "회원가입에 실패했습니다.";
      setError(message);
    }
  }

  const pending = registerMutation.isPending || loginMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-border bg-surface p-6"
      >
        <h1 className="mb-6 font-mono text-lg font-semibold">
          Link<span className="text-accent">Brief</span>
        </h1>

        <label className="mb-1 block font-mono text-xs text-muted">
          이메일
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="mb-4 w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block font-mono text-xs text-muted">
          비밀번호
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          className="mb-4 w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus:border-accent focus:outline-none"
        />

        {error && <p className="mb-3 font-mono text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded border border-accent bg-accent-soft px-3 py-2 font-mono text-sm text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "가입 중..." : "회원가입"}
        </button>

        <p className="mt-4 text-center font-mono text-xs text-muted">
          이미 계정이 있으신가요?{" "}
          <RouterLink to="/login" className="text-accent hover:underline">
            로그인
          </RouterLink>
        </p>
      </form>
    </div>
  );
}
