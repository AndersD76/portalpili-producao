'use client';

import { useState } from 'react';
import Modal from './Modal';

interface AuthenticationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (userId: number, userName: string, userIdFuncionario: string) => void;
  title?: string;
  message?: string;
}

export default function AuthenticationModal({
  isOpen,
  onClose,
  onAuthenticate,
  title = 'Autenticação Necessária',
  message = 'Por favor, confirme sua identidade para prosseguir'
}: AuthenticationModalProps) {
  const [idFuncionario, setIdFuncionario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_funcionario: idFuncionario,
          senha
        })
      });

      const result = await response.json();

      if (result.success && result.user) {
        // Salvar token no localStorage
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
          localStorage.setItem('user_data', JSON.stringify(result.user));
        }

        onAuthenticate(result.user.id, result.user.nome, result.user.id_funcionario);

        // Limpar campos
        setIdFuncionario('');
        setSenha('');
      } else {
        setError(result.error || 'Falha na autenticação');
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError('Erro ao realizar autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdFuncionario('');
    setSenha('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
          <p className="text-sm text-blue-800">{message}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID do Funcionário *
          </label>
          <input
            type="text"
            value={idFuncionario}
            onChange={(e) => setIdFuncionario(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: FIN001, ENG001"
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha *
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Digite sua senha"
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Autenticar</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
