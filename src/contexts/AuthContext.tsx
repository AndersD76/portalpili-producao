'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Permissao {
  modulo_id: number;
  codigo: string;
  nome: string;
  rota: string;
  icone: string;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_aprovar: boolean;
}

interface UserData {
  id: number;
  nome: string;
  email: string;
  id_funcionario: string;
  cargo?: string;
  departamento?: string;
  is_admin: boolean;
  perfil_id?: number;
}

interface AuthContextType {
  user: UserData | null;
  isAdmin: boolean;
  permissoes: Permissao[];
  loading: boolean;
  authenticated: boolean;
  podeAcessarModulo: (codigoOuRota: string) => boolean;
  podeExecutarAcao: (moduloCodigo: string, acao: 'visualizar' | 'criar' | 'editar' | 'excluir' | 'aprovar') => boolean;
  recarregarPermissoes: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  permissoes: [],
  loading: true,
  authenticated: false,
  podeAcessarModulo: () => false,
  podeExecutarAcao: () => false,
  recarregarPermissoes: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Mapeamento de rotas para código de módulo
const ROTA_PARA_MODULO: Record<string, string> = {
  '/producao': 'PRODUCAO',
  '/qualidade': 'QUALIDADE',
  '/comercial': 'COMERCIAL',
  '/dashboard': 'PRODUCAO',
  '/producao/calendario': 'PRODUCAO',
  '/admin': 'ADMIN',
};

const CACHE_KEY = 'permissoes_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  permissoes: Permissao[];
  isAdmin: boolean;
  timestamp: number;
  userId: number;
}

function getPermissoesCache(userId: number): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: CacheEntry = JSON.parse(raw);
    if (cache.userId !== userId) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
}

function setPermissoesCache(userId: number, permissoes: Permissao[], isAdmin: boolean) {
  try {
    const entry: CacheEntry = { permissoes, isAdmin, timestamp: Date.now(), userId };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

function clearPermissoesCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  // Carregar dados do usuário do localStorage
  useEffect(() => {
    const authFlag = localStorage.getItem('authenticated');
    if (authFlag !== 'true') {
      setLoading(false);
      setAuthenticated(false);
      return;
    }

    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed: UserData = JSON.parse(userData);
        setUser(parsed);
        setAuthenticated(true);
        if (parsed.is_admin === true) {
          setIsAdmin(true);
        }
      } catch {
        setLoading(false);
        setAuthenticated(false);
      }
    } else {
      setLoading(false);
      setAuthenticated(false);
    }
  }, []);

  // Buscar permissões quando o user estiver definido
  const fetchPermissoes = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    // Tentar usar cache
    if (!forceRefresh) {
      const cached = getPermissoesCache(user.id);
      if (cached) {
        setPermissoes(cached.permissoes);
        setIsAdmin(cached.isAdmin);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/auth/permissoes?usuario_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const perms = data.data || [];
          const admin = data.isAdmin || false;
          setPermissoes(perms);
          setIsAdmin(admin);
          setPermissoesCache(user.id, perms, admin);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao buscar permissões:', error);
      // Tentar usar cache expirado como fallback
      const cached = getPermissoesCache(user.id);
      if (cached) {
        setPermissoes(cached.permissoes);
        setIsAdmin(cached.isAdmin);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPermissoes();
    }
  }, [user?.id, fetchPermissoes]);

  const podeAcessarModulo = useCallback((codigoOuRota: string): boolean => {
    if (isAdmin) return true;

    const moduloCodigo = ROTA_PARA_MODULO[codigoOuRota] || codigoOuRota.replace('/', '').toUpperCase();
    const perm = permissoes.find(p => p.codigo === moduloCodigo);
    if (!perm) return false;
    return perm.pode_visualizar === true;
  }, [isAdmin, permissoes]);

  const podeExecutarAcao = useCallback((moduloCodigo: string, acao: 'visualizar' | 'criar' | 'editar' | 'excluir' | 'aprovar'): boolean => {
    if (isAdmin) return true;
    const perm = permissoes.find(p => p.codigo === moduloCodigo);
    if (!perm) return false;
    const campo = `pode_${acao}` as keyof Permissao;
    return perm[campo] === true;
  }, [isAdmin, permissoes]);

  const recarregarPermissoes = useCallback(async () => {
    clearPermissoesCache();
    await fetchPermissoes(true);
  }, [fetchPermissoes]);

  const logout = useCallback(() => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('user_data');
    sessionStorage.removeItem('politica_vista');
    clearPermissoesCache();
    setUser(null);
    setIsAdmin(false);
    setPermissoes([]);
    setAuthenticated(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      permissoes,
      loading,
      authenticated,
      podeAcessarModulo,
      podeExecutarAcao,
      recarregarPermissoes,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
