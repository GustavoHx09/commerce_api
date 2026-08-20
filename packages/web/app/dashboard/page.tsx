'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <p className="text-lg">
          Bem-vindo, <span className="font-semibold">{user.name}</span>
        </p>
        <p className="text-gray-600">{user.email}</p>
        <p className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          {user.role}
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-6 rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
      >
        Sair
      </button>
    </main>
  );
}
