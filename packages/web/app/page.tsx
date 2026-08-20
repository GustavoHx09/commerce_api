'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.push(user ? '/dashboard' : '/login');
    }
  }, [isLoading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>Carregando...</p>
    </main>
  );
}
