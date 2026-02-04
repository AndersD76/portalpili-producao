'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModalPoliticaQualidade from '@/components/ModalPoliticaQualidade';

export default function LoginPage() {
  const [idFuncionario, setIdFuncionario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirecionar se já estiver autenticado
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated === 'true') {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Adicionar prefixo USER se o usuário digitou apenas números
      let idParaLogin = idFuncionario.trim().toUpperCase();
      if (/^\d+$/.test(idParaLogin)) {
        idParaLogin = 'USER' + idParaLogin;
      }

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
        // Salvar dados do usuário no localStorage
        localStorage.setItem('user_data', JSON.stringify(data.user));
        localStorage.setItem('authenticated', 'true');

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Portal Pili</h1>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ID */}
            <div>
              <label htmlFor="idFuncionario" className="block text-sm font-semibold text-gray-700 mb-2">
                ID do Usuário
              </label>
              <input
                type="text"
                id="idFuncionario"
                value={idFuncionario}
                onChange={(e) => setIdFuncionario(e.target.value)}
                placeholder="Digite seu ID (ex: 100 ou USER100)"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                id="senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Entre com seu ID e senha</p>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center mt-6 text-red-100 text-sm">
          <p>Portal Pili v1.0</p>
        </div>
      </div>

      {/* Modal de Política da Qualidade */}
      <ModalPoliticaQualidade
        isOpen={showPoliticaModal}
        onClose={handleClosePolitica}
      />
    </div>
  );
}
