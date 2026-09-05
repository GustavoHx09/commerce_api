'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function DashboardPage() {
  const { user, tenant, isLoading, logout } = useAuth();
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

  const displayName = tenant?.displayName || tenant?.name || 'Commerce API';
  const primaryColor = tenant?.colors?.primary || '#2563eb';

  return (
    <main className="p-8" style={{ backgroundColor: `${primaryColor}08` }}>
      <div className="mb-6 flex items-center gap-4">
        {tenant?.logoUrl && (
          <Image
            src={tenant.logoUrl}
            alt={displayName}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 rounded-lg object-contain shadow"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
          {tenant?.name && tenant.name !== displayName && (
            <p className="text-sm text-gray-500">{tenant.name}</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <p className="text-lg">
          Bem-vindo, <span className="font-semibold">{user.name}</span>
        </p>
        <p className="text-gray-600">{user.email}</p>
        <p className="mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
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
