'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import api from '@/lib/api';

interface SalesSummary {
  count: number;
  total: number;
}

interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  quantityInStock: number;
  minStock: number;
}

interface DashboardData {
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  salesToday: SalesSummary;
  salesWeek: SalesSummary;
  salesMonth: SalesSummary;
  lowStockProducts: LowStockProduct[];
  openCashiersCount: number;
  totalInCashier: number;
}

function formatCurrency(value: number) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function DashboardPage() {
  const { user, tenant, isLoading, logout } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setDashboard(response.data.data);
      } catch {
        setError('Não foi possível carregar o dashboard.');
      }
    };

    loadDashboard();
  }, [user]);

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

  const displayName = tenant?.displayName || tenant?.name || 'Stock-ly';
  const primaryColor = tenant?.colors?.primary || '#2563eb';

  const cards = [
    { label: 'Vendas hoje', value: formatCurrency(dashboard?.salesToday.total || 0), sub: `${dashboard?.salesToday.count || 0} venda(s)` },
    { label: 'Vendas da semana', value: formatCurrency(dashboard?.salesWeek.total || 0), sub: `${dashboard?.salesWeek.count || 0} venda(s)` },
    { label: 'Vendas do mês', value: formatCurrency(dashboard?.salesMonth.total || 0), sub: `${dashboard?.salesMonth.count || 0} venda(s)` },
    { label: 'Total em caixa', value: formatCurrency(dashboard?.totalInCashier || 0), sub: `${dashboard?.openCashiersCount || 0} caixa(s) aberto(s)` },
    { label: 'Produtos', value: dashboard?.totalProducts ?? '-', sub: 'cadastrados' },
    { label: 'Clientes', value: dashboard?.totalCustomers ?? '-', sub: 'cadastrados' },
  ];

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: `${primaryColor}08` }}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
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

        <button
          onClick={logout}
          className="rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
        >
          Sair
        </button>
      </div>

      <p className="mb-6 text-lg text-gray-700">
        Bem-vindo, <span className="font-semibold">{user.name}</span>
      </p>

      {error && (
        <div className="mb-6 rounded-md bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white p-6 shadow transition hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: primaryColor }}>
              {card.value}
            </p>
            <p className="mt-1 text-sm text-gray-600">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Produtos com estoque baixo</h2>
        {dashboard && dashboard.lowStockProducts.length === 0 ? (
          <p className="text-gray-600">Nenhum produto com estoque baixo no momento.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {dashboard?.lowStockProducts.map((product) => (
              <li key={product._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {product.quantityInStock} / {product.minStock}
                  </p>
                  <p className="text-xs text-gray-500">atual / mínimo</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
