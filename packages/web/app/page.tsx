'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { hasPermission } from '@/lib/permissions';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      // Sem dashboard:read o usuário cai na primeira área que pode usar —
      // quem só opera vendas vai direto para o PDV.
      const target = hasPermission(user.permissions, 'dashboard:read')
        ? '/dashboard'
        : hasPermission(user.permissions, 'orders:write')
          ? '/management/pos'
          : '/management/account';
      router.push(target);
    }
  }, [isLoading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>Carregando...</p>
    </main>
  );
}
