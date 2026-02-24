'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ModalPoliticaQualidade from '@/components/ModalPoliticaQualidade';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [idFuncionario, setIdFuncionario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);
  const router = useRouter();
  const { authenticated, loading: authLoading, login: authLogin } = useAuth();

  useEffect(() => {
    // Redirecionar se já estiver autenticado (via AuthContext, não localStorage direto)
    if (!authLoading && authenticated) {
      router.push('/');
    }
  }, [authLoading, authenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Usar o ID como digitado pelo usuário
      const idParaLogin = idFuncionario.trim();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_funcionario: idParaLogin,
          senha: senha,
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Atualizar AuthContext + localStorage atomicamente
        authLogin(data.user);

        // Mostrar modal de política da qualidade
        setShowPoliticaModal(true);
      } else {
        setError(data.error || 'Erro ao fazer login');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePolitica = () => {
    setShowPoliticaModal(false);
    // Marcar que a política foi vista nesta sessão
    sessionStorage.setItem('politica_vista', 'true');
    // Redirecionar para página de módulos após fechar o modal
    router.push('/');
  };

  // Enquanto verifica autenticação, não mostrar formulário (evita flash)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-600 to-red-800">
      {/* Top section with logo */}
      <div className="flex-shrink-0 flex items-center justify-center pt-12 pb-6 sm:pt-16 sm:pb-8">
        <Image
          src="/logo-pili.png"
          alt="PILI"
          width={280}
          height={94}
          priority
          className="h-16 sm:h-20 w-auto drop-shadow-lg brightness-0 invert"
        />
      </div>

      {/* Card centralizado */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header do card */}
            <div className="bg-gray-50 px-8 pt-8 pb-5 text-center border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Portal de Gestao</h2>
              <p className="text-sm text-gray-500 mt-1">Entre com suas credenciais</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label htmlFor="idFuncionario" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ID do Usuario
                </label>
                <input
                  type="text"
                  id="idFuncionario"
                  value={idFuncionario}
                  onChange={(e) => setIdFuncionario(e.target.value)}
                  placeholder="Ex: 100"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  id="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-red-600/30"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="flex-shrink-0 text-center py-4 text-red-200 text-xs tracking-wide">
        <p>Portal Pili v1.0</p>
      </div>

      {/* Modal de Política da Qualidade */}
      <ModalPoliticaQualidade
        isOpen={showPoliticaModal}
        onClose={handleClosePolitica}
      />
    </div>
  );
}
