import { Button, Card, Input } from '@tour/ui';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context';

interface LoginLocationState {
  from?: string;
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = (location.state as LoginLocationState | null)?.from || '/';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10">
      <Card className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-300/30 backdrop-blur">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">Leaders ERP</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {mode === 'login' ? '직원 로그인' : '직원 회원가입'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login'
              ? '인증 후 ERP 전체 메뉴에 접근할 수 있습니다.'
              : '첫 가입자는 관리자, 이후 가입자는 일반 직원으로 생성됩니다.'}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
          >
            회원가입
          </button>
        </div>

        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setErrorMessage(null);

            try {
              if (mode === 'signup') {
                await register(name.trim(), email.trim(), password);
              } else {
                await login(email.trim(), password);
              }
              navigate(redirectTo, { replace: true });
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : '인증 처리에 실패했습니다.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {mode === 'signup' ? (
            <label className="grid gap-1.5 text-sm text-slate-700">
              <span>이름</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" autoComplete="name" />
            </label>
          ) : null}

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>이메일</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>비밀번호</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}

          <Button
            type="submit"
            variant="primary"
            disabled={(!email.trim() || !password || (mode === 'signup' && !name.trim()) || submitting)}
            className="mt-2"
          >
            {submitting ? (mode === 'login' ? '로그인 중...' : '가입 중...') : mode === 'login' ? '로그인' : '회원가입'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
