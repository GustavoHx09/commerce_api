'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import api from '@/lib/api';
import PresetList from './components/PresetList';
import UserPermissionsEditor from './components/UserPermissionsEditor';
import type { PanelUser, PermissionPreset } from './types';

// Painel de autorizações: gerencia presets de permissões do tenant e os
// ajustes individuais de cada usuário (preset + extras + revogações).
export default function PermissionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<PanelUser[]>([]);
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  const canManage = user?.role === 'master' || user?.role === 'admin';

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !canManage) {
      router.push('/dashboard');
    }
  }, [isLoading, user, canManage, router]);

  // Recarrega usuários, presets e o catálogo de permissões da API.
  const loadData = async () => {
    try {
      const [usersRes, presetsRes, catalogRes] = await Promise.all([
        api.get('/users', { params: { limit: 100 } }),
        api.get('/permission-presets', { params: { limit: 100 } }),
        api.get('/permission-presets/available-permissions'),
      ]);

      setUsers(usersRes.data.data.data);
      setPresets(presetsRes.data.data.data);
      setCatalog(catalogRes.data.data.permissions);
    } catch {
      setError('Não foi possível carregar o painel de permissões.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!user || !canManage) return;

    const loadInitialData = async () => {
      await loadData();
    };

    loadInitialData();
  }, [user, canManage]);

  if (isLoading || !user || !canManage) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </main>
    );
  }

  const selectedUser = users.find((u) => u._id === selectedUserId) || null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Painel de autorizações</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100"
          >
            Voltar ao dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-100 p-4 text-red-700">{error}</div>
        )}

        {isLoadingData ? (
          <p className="text-gray-600">Carregando dados...</p>
        ) : (
          <div className="space-y-8">
            <PresetList
              presets={presets}
              users={users}
              catalog={catalog}
              canWrite={canManage}
              userRole={user.role}
              onChanged={loadData}
            />

            <section className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Usuários</h2>
              {users.length === 0 ? (
                <p className="text-gray-600">Nenhum usuário encontrado.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const preset = presets.find((p) => p._id === u.permissionPresetId);

                    return (
                      <li key={u._id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {u.name}
                            {!u.isActive && (
                              <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                                inativo
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {u.email} · {u.role}
                            {preset ? ` · preset: ${preset.name}` : ' · sem preset'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedUserId(u._id)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
                        >
                          Editar permissões
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {selectedUser && (
              <UserPermissionsEditor
                key={selectedUser._id}
                user={selectedUser}
                presets={presets}
                catalog={catalog}
                onSaved={loadData}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
