'use client';

import { useEffect, useState } from 'react';

interface Configuracao {
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'texto' | 'numero' | 'boolean' | 'json';
  editavel: boolean;
}

export default function AdminConfiguracoesPage() {
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [valorTemp, setValorTemp] = useState('');

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    try {
      const res = await fetch('/api/admin/configuracoes');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data || []);
      } else {
        // Se a API nao existir, mostrar configuracoes padrao
        setConfigs([
          { chave: 'EMPRESA_NOME', valor: 'PILI', descricao: 'Nome da empresa', tipo: 'texto', editavel: true },
          { chave: 'EMPRESA_CNPJ', valor: '', descricao: 'CNPJ da empresa', tipo: 'texto', editavel: true },
          { chave: 'EMAIL_NOTIFICACOES', valor: '', descricao: 'Email para notificacoes', tipo: 'texto', editavel: true },
          { chave: 'PRAZO_PADRAO_NC', valor: '7', descricao: 'Prazo padrao para NC (dias)', tipo: 'numero', editavel: true },
          { chave: 'PRAZO_PADRAO_AC', valor: '30', descricao: 'Prazo padrao para AC (dias)', tipo: 'numero', editavel: true },
          { chave: 'NOTIFICACOES_EMAIL_ATIVAS', valor: 'false', descricao: 'Ativar notificacoes por email', tipo: 'boolean', editavel: true },
          { chave: 'BACKUP_AUTOMATICO', valor: 'true', descricao: 'Backup automatico ativo', tipo: 'boolean', editavel: false },
        ]);
      }
    } catch {
      // Fallback para configs padrao
      setConfigs([
        { chave: 'EMPRESA_NOME', valor: 'PILI', descricao: 'Nome da empresa', tipo: 'texto', editavel: true },
        { chave: 'PRAZO_PADRAO_NC', valor: '7', descricao: 'Prazo padrao para NC (dias)', tipo: 'numero', editavel: true },
        { chave: 'PRAZO_PADRAO_AC', valor: '30', descricao: 'Prazo padrao para AC (dias)', tipo: 'numero', editavel: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (config: Configuracao) => {
    if (!config.editavel) return;
    setEditando(config.chave);
    setValorTemp(config.valor);
  };

  const handleSalvar = async (chave: string) => {
    setSaving(chave);
    try {
      const res = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, valor: valorTemp }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigs(prev => prev.map(c =>
          c.chave === chave ? { ...c, valor: valorTemp } : c
        ));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(null);
      setEditando(null);
    }
  };

  const handleCancelar = () => {
    setEditando(null);
    setValorTemp('');
  };

  const renderValor = (config: Configuracao) => {
    if (editando === config.chave) {
      if (config.tipo === 'boolean') {
        return (
          <select
            value={valorTemp}
            onChange={(e) => setValorTemp(e.target.value)}
            className="px-2 py-1 border rounded focus:ring-2 focus:ring-red-500"
          >
            <option value="true">Sim</option>
            <option value="false">Nao</option>
          </select>
        );
      }
      return (
        <input
          type={config.tipo === 'numero' ? 'number' : 'text'}
          value={valorTemp}
          onChange={(e) => setValorTemp(e.target.value)}
          className="px-2 py-1 border rounded focus:ring-2 focus:ring-red-500"
          autoFocus
        />
      );
    }

    if (config.tipo === 'boolean') {
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          config.valor === 'true' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {config.valor === 'true' ? 'Sim' : 'Nao'}
        </span>
      );
    }

    return <span className="text-gray-900">{config.valor || '-'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configuracoes do Sistema</h2>
        <p className="text-gray-600">Gerencie as configuracoes gerais do Portal PILI</p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-800 font-medium">Sobre as configuracoes</p>
            <p className="text-sm text-blue-600">
              Algumas configuracoes sao somente leitura e nao podem ser alteradas diretamente.
              Para alteracoes avancadas, entre em contato com o suporte tecnico.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Configuracoes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Configuracao</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acoes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {configs.map((config) => (
              <tr key={config.chave} className={!config.editavel ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{config.chave}</code>
                </td>
                <td className="px-6 py-4">
                  {renderValor(config)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {config.descricao}
                </td>
                <td className="px-6 py-4 text-right">
                  {editando === config.chave ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSalvar(config.chave)}
                        disabled={saving === config.chave}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {saving === config.chave ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={handleCancelar}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : config.editavel ? (
                    <button
                      onClick={() => handleEditar(config)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                    >
                      Editar
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Somente leitura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Secao de Informacoes do Sistema */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacoes do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Versao</div>
            <div className="text-xl font-bold text-gray-900">1.0.0</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ambiente</div>
            <div className="text-xl font-bold text-green-600">Producao</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ultima Atualizacao</div>
            <div className="text-xl font-bold text-gray-900">
              {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
