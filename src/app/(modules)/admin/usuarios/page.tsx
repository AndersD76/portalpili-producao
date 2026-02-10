'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Modulo {
  id: number;
  codigo: string;
  nome: string;
}

interface Permissao {
  modulo_id: number;
  modulo: string;
  modulo_nome: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
}

interface Perfil {
  id: number;
  nome: string;
  descricao: string;
  nivel: number;
  total_usuarios: number;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  id_funcionario: string;
  cargo?: string;
  departamento?: string;
  ativo: boolean;
  is_admin: boolean;
  perfil_id?: number;
  perfil_nome?: string;
  perfil_nivel?: number;
  ultimo_acesso?: string;
  permissoes?: Permissao[];
}

// Lista padronizada de departamentos
const DEPARTAMENTOS_PADRAO = [
  'COMERCIAL',
  'COMPRAS',
  'DIREÇÃO',
  'ENGENHARIA',
  'LOGÍSTICA',
  'PCP',
  'PRODUÇÃO',
  'QUALIDADE',
  'RECURSOS HUMANOS',
  'ADMINISTRAÇÃO',
] as const;

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { authenticated, loading: authLoading, recarregarPermissoes } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usuarioVisualizando, setUsuarioVisualizando] = useState<Usuario | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<Usuario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchDados();
  }, [authLoading, authenticated, router]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const [usuariosRes, perfisRes, modulosRes] = await Promise.all([
        fetch(`/api/admin/usuarios?ativo=${filtroAtivo}&departamento=${filtroDepartamento}&search=${searchTerm}`),
        fetch('/api/admin/perfis'),
        fetch('/api/admin/modulos'),
      ]);

      const [usuariosData, perfisData, modulosData] = await Promise.all([
        usuariosRes.json(),
        perfisRes.json(),
        modulosRes.json(),
      ]);

      if (usuariosData.success) {
        setUsuarios(usuariosData.data || []);
        setDepartamentos(usuariosData.departamentos || []);
      }
      if (perfisData.success) {
        setPerfis(perfisData.data || []);
      }
      if (modulosData.success) {
        setModulos(modulosData.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchDados();
    }
  }, [filtroDepartamento, filtroAtivo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDados();
  };

  const handleEditarUsuario = async (usuario: Usuario) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`);
      const data = await res.json();
      if (data.success) {
        setUsuarioEditando(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  const handleSalvarUsuario = async () => {
    if (!usuarioEditando) return;
    setSalvando(true);
    setMensagem(null);

    try {
      // Atualiza dados básicos
      const resUsuario = await fetch(`/api/admin/usuarios/${usuarioEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: usuarioEditando.nome,
          cargo: usuarioEditando.cargo,
          departamento: usuarioEditando.departamento,
          perfil_id: usuarioEditando.perfil_id,
          is_admin: usuarioEditando.is_admin,
          ativo: usuarioEditando.ativo,
        }),
      });

      const dataUsuario = await resUsuario.json();

      if (!dataUsuario.success) {
        setMensagem({ tipo: 'erro', texto: dataUsuario.error });
        return;
      }

      // Atualiza permissões personalizadas
      if (usuarioEditando.permissoes) {
        const permissoesFormatadas = usuarioEditando.permissoes.map(p => ({
          modulo_id: p.modulo_id,
          visualizar: p.visualizar,
          criar: p.criar,
          editar: p.editar,
          excluir: p.excluir,
          aprovar: p.aprovar,
        })).filter(p => p.modulo_id);

        console.log('[Permissoes] Salvando:', JSON.stringify(permissoesFormatadas));

        const resPerms = await fetch(`/api/admin/usuarios/${usuarioEditando.id}/permissoes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissoes: permissoesFormatadas }),
        });

        const dataPerms = await resPerms.json();
        console.log('[Permissoes] Resposta:', dataPerms);

        if (!dataPerms.success) {
          setMensagem({ tipo: 'erro', texto: dataPerms.error || 'Erro ao salvar permissões' });
          return;
        }
      }

      setMensagem({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso!' });
      fetchDados();
      // Atualizar cache de permissões do contexto global
      recarregarPermissoes();

      setTimeout(() => {
        setUsuarioEditando(null);
        setMensagem(null);
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar usuário' });
    } finally {
      setSalvando(false);
    }
  };

  const togglePermissao = (moduloCodigo: string, tipo: keyof Permissao) => {
    if (!usuarioEditando?.permissoes) return;

    setUsuarioEditando({
      ...usuarioEditando,
      permissoes: usuarioEditando.permissoes.map(p => {
        if (p.modulo === moduloCodigo && tipo !== 'modulo' && tipo !== 'modulo_nome') {
          return { ...p, [tipo]: !p[tipo] };
        }
        return p;
      }),
    });
  };

  const handleToggleAtivo = async (usuario: Usuario) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !usuario.ativo }),
      });

      const data = await res.json();
      if (data.success) {
        fetchDados();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleVisualizarUsuario = async (usuario: Usuario) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`);
      const data = await res.json();
      if (data.success) {
        setUsuarioVisualizando(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  const handleExcluirUsuario = async () => {
    if (!usuarioExcluindo) return;
    setSalvando(true);

    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioExcluindo.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setMensagem({ tipo: 'sucesso', texto: 'Usuário excluído com sucesso!' });
        fetchDados();
        setTimeout(() => {
          setUsuarioExcluindo(null);
          setMensagem(null);
        }, 1500);
      } else {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao excluir usuário' });
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir usuário' });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Gestão de Usuários</h1>
                <p className="text-xs text-gray-500 hidden sm:block">{usuarios.length} usuário(s) cadastrado(s)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/usuarios/novo"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Usuário
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Todos Departamentos</option>
              {DEPARTAMENTOS_PADRAO.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Perfis Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {perfis.map(perfil => (
            <div key={perfil.id} className="bg-white rounded-lg shadow-sm p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{perfil.total_usuarios}</p>
              <p className="text-xs text-gray-500">{perfil.nome}</p>
            </div>
          ))}
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Departamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map(usuario => (
                <tr key={usuario.id} className={!usuario.ativo ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{usuario.nome}</p>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {usuario.id_funcionario}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {usuario.departamento || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usuario.is_admin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {usuario.is_admin && (
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {usuario.perfil_nome || 'Sem perfil'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleAtivo(usuario)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        usuario.ativo ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        usuario.ativo ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleVisualizarUsuario(usuario)}
                        className="text-gray-600 hover:text-gray-800 transition p-1 rounded hover:bg-gray-100"
                        title="Visualizar detalhes"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditarUsuario(usuario)}
                        className="text-blue-600 hover:text-blue-800 transition p-1 rounded hover:bg-blue-50"
                        title="Editar usuário"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setUsuarioExcluindo(usuario)}
                        className="text-red-600 hover:text-red-800 transition p-1 rounded hover:bg-red-50"
                        title="Excluir usuário"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197" />
              </svg>
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Permissões */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="p-4 sm:p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Editar Permissões
                  </h2>
                  <p className="text-sm text-gray-500">{usuarioEditando.nome}</p>
                </div>
                <button
                  onClick={() => setUsuarioEditando(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Mensagem */}
              {mensagem && (
                <div className={`mb-4 p-3 rounded-lg ${
                  mensagem.tipo === 'sucesso'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {mensagem.texto}
                </div>
              )}

              {/* Dados Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={usuarioEditando.nome}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <select
                    value={usuarioEditando.departamento || ''}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecione um departamento</option>
                    {DEPARTAMENTOS_PADRAO.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
                  <select
                    value={usuarioEditando.perfil_id || ''}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, perfil_id: Number(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecione um perfil</option>
                    {perfis.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usuarioEditando.is_admin}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, is_admin: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Administrador</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usuarioEditando.ativo}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, ativo: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Ativo</span>
                  </label>
                </div>
              </div>

              {/* Permissões por Módulo */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Permissões por Módulo</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ver</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Criar</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Editar</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Excluir</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Aprovar</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usuarioEditando.permissoes?.map(perm => (
                        <tr key={perm.modulo}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {perm.modulo_nome}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={perm.visualizar}
                              onChange={() => togglePermissao(perm.modulo, 'visualizar')}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={perm.criar}
                              onChange={() => togglePermissao(perm.modulo, 'criar')}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={perm.editar}
                              onChange={() => togglePermissao(perm.modulo, 'editar')}
                              className="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={perm.excluir}
                              onChange={() => togglePermissao(perm.modulo, 'excluir')}
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={perm.aprovar}
                              onChange={() => togglePermissao(perm.modulo, 'aprovar')}
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setUsuarioEditando(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarUsuario}
                disabled={salvando}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {salvando && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {usuarioVisualizando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Detalhes do Usuário
                </h2>
                <button
                  onClick={() => setUsuarioVisualizando(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-red-600">
                    {usuarioVisualizando.nome?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{usuarioVisualizando.nome}</h3>
                  <p className="text-sm text-gray-500">{usuarioVisualizando.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500 uppercase">ID Funcionário</p>
                  <p className="font-medium text-gray-900">{usuarioVisualizando.id_funcionario || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cargo</p>
                  <p className="font-medium text-gray-900">{usuarioVisualizando.cargo || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Departamento</p>
                  <p className="font-medium text-gray-900">{usuarioVisualizando.departamento || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Perfil</p>
                  <p className="font-medium text-gray-900">{usuarioVisualizando.perfil_nome || 'Sem perfil'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    usuarioVisualizando.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {usuarioVisualizando.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Admin</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    usuarioVisualizando.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {usuarioVisualizando.is_admin ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              {usuarioVisualizando.ultimo_acesso && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 uppercase">Último Acesso</p>
                  <p className="font-medium text-gray-900">
                    {new Date(usuarioVisualizando.ultimo_acesso).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setUsuarioVisualizando(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setUsuarioVisualizando(null);
                  handleEditarUsuario(usuarioVisualizando);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {usuarioExcluindo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Excluir Usuário
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Tem certeza que deseja <strong>excluir permanentemente</strong> o usuário <strong>{usuarioExcluindo.nome}</strong>?
                Esta ação não pode ser desfeita.
              </p>

              {mensagem && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  mensagem.tipo === 'sucesso'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {mensagem.texto}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setUsuarioExcluindo(null);
                  setMensagem(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirUsuario}
                disabled={salvando}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {salvando && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
