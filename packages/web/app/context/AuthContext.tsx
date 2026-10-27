'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  // Permissões efetivas retornadas por /auth/session (usadas só para UX).
  permissions?: string[];
}

interface Tenant {
  _id: string;
  name: string;
  displayName?: string;
  logoUrl?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  // Dados fiscais/comerciais usados no cabeçalho do cupom de venda.
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

interface AuthContextData {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenant = async (tenantId: string | null) => {
    if (!tenantId) {
      setTenant(null);
      return;
    }

    try {
      const response = await api.get('/tenants/me');
      setTenant(response.data.data.tenant);
    } catch {
      setTenant(null);
    }
  };

  useEffect(() => {
    // Restaura a sessão porque o cookie HttpOnly não pode ser lido pelo JavaScript.
    const initSession = async () => {
      try {
        const response = await api.get('/auth/session');
        setUser(response.data.data.user);
        await fetchTenant(response.data.data.user.tenantId);
      } catch {
        setUser(null);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  // O backend grava o JWT no cookie e retorna apenas os dados públicos do usuário.
  const login = async (email: string, password: string) => {
    await api.post('/auth/login', { email, password });
    // Após o login, carrega a sessão completa (inclui permissões efetivas).
    const response = await api.get('/auth/session');
    setUser(response.data.data.user);
    await fetchTenant(response.data.data.user.tenantId);
  };

  // O backend remove o cookie; o estado local é limpo mesmo se a chamada falhar.
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setTenant(null);
    }
  };

  // Recarrega os dados da sessão (nome do usuário, empresa) sem reload da página.
  // Usado após edições de perfil ou da empresa para refletir no cabeçalho.
  const refreshSession = async () => {
    try {
      const response = await api.get('/auth/session');
      setUser(response.data.data.user);
      await fetchTenant(response.data.data.user.tenantId);
    } catch {
      // Mantém a sessão local se a recarga falhar.
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, tenant, isLoading, login, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
