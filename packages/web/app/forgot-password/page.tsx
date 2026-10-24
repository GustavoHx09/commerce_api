'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
      // A API responde igual para emails inexistentes; exibimos a mesma confirmação.
      setSent(true);
    } catch {
      setError('Não foi possível processar a solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          Recuperar senha
        </h1>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-700">
              Se o email estiver cadastrado, enviaremos as instruções de
              recuperação. Verifique sua caixa de entrada e o spam.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-gray-600">
              Informe seu email para receber o link de redefinição.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <p className="text-center text-sm">
                <Link href="/login" className="text-blue-600 hover:underline">
                  Voltar para o login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
