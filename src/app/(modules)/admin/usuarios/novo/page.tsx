'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Perfil {
  id: number;
  nome: string;
  descricao: string;
}

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    id_funcionario: '',
    cargo: '',
    departamento: '',
    perfil_id: '',
    is_admin: false,
    senha: '',
    confirmarSenha: '',
  });

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchPerfis();
  }, [router]);

  const fetchPerfis = async () => {
    try {
      const res = await fetch('/api/admin/perfis');
      const data = await res.json();
      if (data.success) {
        setPerfis(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    // Validações
    if (!formData.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Nome é obrigatório' });
      return;
    }

    if (!formData.email.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Email é obrigatório' });
      return;
    }

    if (!formData.id_funcionario.trim()) {
      setMensagem({ tipo: 'erro', texto: 'ID do Funcionário é obrigatório' });
      return;
    }

    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem' });
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          id_funcionario: formData.id_funcionario,
          cargo: formData.cargo || null,
          departamento: formData.departamento || null,
          perfil_id: formData.perfil_id ? parseInt(formData.perfil_id) : null,
          is_admin: formData.is_admin,
          senha: formData.senha || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMensagem({ tipo: 'sucesso', texto: 'Usuário criado com sucesso!' });
        setTimeout(() => {
          router.push('/admin/usuarios');
        }, 1500);
      } else {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao criar usuário' });
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao criar usuário' });
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/usuarios"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Novo Usuário</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Cadastrar novo usuário no sistema</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Formulário */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          {/* Mensagem */}
          {mensagem && (
            <div className={`mb-6 p-4 rounded-lg ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {mensagem.texto}
            </div>
          )}

          <div className="space-y-6">
            {/* Dados Básicos */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                Dados Básicos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="email@pili.com.br"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Funcionário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="id_funcionario"
                    value={formData.id_funcionario}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ex: USER123"
                  />
                </div>
              </div>
            </div>

            {/* Cargo e Departamento */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                Cargo e Departamento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ex: Analista"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    name="departamento"
                    value={formData.departamento}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ex: COMERCIAL"
                  />
                </div>
              </div>
            </div>

            {/* Perfil e Permissões */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                Perfil e Permissões
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
                  <select
                    name="perfil_id"
                    value={formData.perfil_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Selecione um perfil</option>
                    {perfis.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_admin"
                      checked={formData.is_admin}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Usuário Administrador</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Senha */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                Senha de Acesso
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Digite a senha"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para usar senha padrão</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Confirme a senha"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="mt-8 pt-6 border-t flex justify-end gap-3">
            <Link
              href="/admin/usuarios"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {salvando && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Criar Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
