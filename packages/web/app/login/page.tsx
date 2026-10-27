'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/context/AuthContext';
import Icon from '../Icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (cause) {
      setError(
        axios.isAxiosError(cause) && cause.response?.status === 401
          ? 'Email ou senha incorretos. Confira seus dados e tente novamente.'
          : 'Não foi possível entrar agora. Verifique a conexão ou tente novamente em instantes.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative isolate hidden overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_80%,rgba(37,99,235,0.25),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-56 top-20 -z-10 h-[650px] w-[650px] rounded-full border border-white/[0.06]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-36 -z-10 h-[520px] w-[520px] rounded-full border border-white/[0.06]"
        />
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-xl font-bold shadow-lg shadow-blue-950">
            S
          </span>
          <span className="text-xl font-semibold tracking-tight">
            Stock-ly<span className="text-blue-400">.</span>
          </span>
        </div>
        <div className="my-auto max-w-lg py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium tracking-wide text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            GESTÃO SIMPLES. DECISÕES MELHORES.
          </span>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">
            Mais controle.
            <br />
            Menos complicação.
            <br />
            <span className="text-blue-400">Seu negócio à frente.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
            Do primeiro atendimento ao fechamento do caixa, organize a rotina da
            sua empresa em um só lugar.
          </p>
          <div className="mt-10 space-y-5">
            {[
              {
                icon: 'bag' as const,
                title: 'Vendas que fluem',
                text: 'PDV, clientes e pagamentos conectados.',
              },
              {
                icon: 'box' as const,
                title: 'Estoque sob controle',
                text: 'Produtos, movimentações e alertas de reposição.',
              },
              {
                icon: 'chart' as const,
                title: 'Clareza para crescer',
                text: 'Financeiro e relatórios para acompanhar a operação.',
              },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-4">
                <span className="rounded-xl border border-white/10 bg-white/5 p-3 text-blue-300">
                  <Icon name={feature.icon} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500">
          <span>Feito para a rotina do seu comércio.</span>
          <span className="flex items-center gap-1.5">
            <Icon name="shield" className="h-4 w-4" />
            Acesso autenticado
          </span>
        </div>
      </section>
      <section className="relative flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-10 xl:px-20">
        <div className="mb-12 flex items-center gap-2 lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white">
            S
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Stock-ly<span className="text-blue-600">.</span>
          </span>
        </div>
        <div className="m-auto w-full max-w-sm py-8 sm:max-w-md">
          <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Seu espaço de trabalho
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Bom ter você de volta.
          </h2>
          <p
            id="login-description"
            className="mb-9 mt-3 text-sm leading-6 text-slate-500"
          >
            Entre com suas credenciais para cuidar do que importa: o seu
            negócio.
          </p>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-describedby="login-description"
          >
            <fieldset
              disabled={isSubmitting}
              className="space-y-5 disabled:opacity-70"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Icon name="mail" className="h-5 w-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="voce@empresa.com.br"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Senha
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Icon name="lock" className="h-5 w-5" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 rounded-r-xl px-3.5 text-slate-400 hover:text-slate-700"
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                  </button>
                </div>
              </div>
            </fieldset>
            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar na plataforma
                  <Icon name="arrow" className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <Icon
              name="shield"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Acesso exclusivo para usuários cadastrados. Precisa de uma conta?
              Fale com o administrador da sua empresa.
            </p>
          </div>
        </div>
        <footer className="mt-8 text-center text-xs text-slate-400">
          Stock-ly · Gestão que acompanha o seu negócio.
        </footer>
      </section>
    </main>
  );
}
