'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PrecoBase {
  id: number;
  tipo_produto: string;
  modelo: string;
  comprimento?: number;
  descricao: string;
  preco: number;
  ativo: boolean;
}

interface PrecoOpcional {
  id: number;
  categoria_nome: string;
  codigo: string;
  nome: string;
  tipo_valor: string;
  valor: number;
  ativo: boolean;
}

interface ConfigPreco {
  chave: string;
  valor: string;
  descricao: string;
}

interface SimulacaoReajuste {
  simulacao_base?: {
    quantidade?: number;
    exemplos?: { modelo: string; preco_atual: number; preco_novo: number }[];
  };
  simulacao_opcoes?: {
    quantidade?: number;
    exemplos?: { nome: string; valor_atual: number; valor_novo: number }[];
  };
}

export default function AdminPrecosPage() {
  const [user, setUser] = useState<{ nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'base' | 'opcoes' | 'config' | 'reajuste'>('base');
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<PrecoOpcional[]>([]);
  const [config, setConfig] = useState<ConfigPreco[]>([]);
  const [reajustePercentual, setReajustePercentual] = useState<string>('');
  const [reajusteTipo, setReajusteTipo] = useState<string>('todos');
  const [simulacao, setSimulacao] = useState<SimulacaoReajuste | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    const userData = localStorage.getItem('user_data');

    if (authenticated !== 'true' || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [baseRes, opcoesRes, configRes] = await Promise.all([
        fetch('/api/comercial/admin/precos?tipo=base'),
        fetch('/api/comercial/admin/precos?tipo=opcoes'),
        fetch('/api/comercial/admin/precos?tipo=config'),
      ]);

      const [baseData, opcoesData, configData] = await Promise.all([
        baseRes.json(),
        opcoesRes.json(),
        configRes.json(),
      ]);

      if (baseData.success) setPrecosBase(baseData.data || []);
      if (opcoesData.success) setOpcionais(opcoesData.data || []);
      if (configData.success) setConfig(configData.data || []);
    } catch (error) {
      console.error('Erro ao buscar preços:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSimularReajuste = async () => {
    if (!reajustePercentual) return;

    try {
      const response = await fetch('/api/comercial/admin/precos/reajuste', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: reajusteTipo,
          percentual: parseFloat(reajustePercentual),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSimulacao(result.data);
      }
    } catch (error) {
      console.error('Erro ao simular reajuste:', error);
    }
  };

  const handleAplicarReajuste = async () => {
    if (!reajustePercentual || !window.confirm(`Confirma o reajuste de ${reajustePercentual}%?`)) return;

    try {
      const response = await fetch('/api/comercial/admin/precos/reajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: reajusteTipo,
          percentual: parseFloat(reajustePercentual),
          motivo: `Reajuste de ${reajustePercentual}%`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: result.message });
        setSimulacao(null);
        setReajustePercentual('');
        fetchData();
      } else {
        setMensagem({ tipo: 'erro', texto: result.error });
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao aplicar reajuste' });
    }
  };

  const handleToggleAtivo = async (tipo: string, id: number, ativo: boolean) => {
    try {
      const response = await fetch(`/api/comercial/admin/precos/${tipo}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: { ativo: !ativo } }),
      });

      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
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
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Administração de Preços</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Gerencie tabelas de preços configuráveis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mensagem */}
      {mensagem && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4`}>
          <div className={`p-4 rounded-lg ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {mensagem.texto}
            <button onClick={() => setMensagem(null)} className="float-right">×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'base', label: 'Precos Base', svgPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'opcoes', label: 'Opcionais', svgPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
            { id: 'config', label: 'Configuracoes', svgPath: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
            { id: 'reajuste', label: 'Reajuste', svgPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-2 ${
                tab === t.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.svgPath} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* Preços Base */}
        {tab === 'base' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Preços Base de Equipamentos</h2>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                + Novo Preço
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprimento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {precosBase.map((preco) => (
                    <tr key={preco.id} className={!preco.ativo ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-3 text-sm">{preco.tipo_produto}</td>
                      <td className="px-4 py-3 text-sm">{preco.modelo}</td>
                      <td className="px-4 py-3 text-sm">{preco.comprimento ? `${preco.comprimento}m` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{preco.descricao}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                        {formatCurrency(preco.preco)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${preco.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {preco.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAtivo('base', preco.id, preco.ativo)}
                          className="text-gray-500 hover:text-red-600 p-1"
                          title={preco.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={preco.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Opcionais */}
        {tab === 'opcoes' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Opcionais e Acessórios</h2>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                + Novo Opcional
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {opcionais.map((opc) => (
                    <tr key={opc.id} className={!opc.ativo ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-3 text-sm">{opc.categoria_nome}</td>
                      <td className="px-4 py-3 text-sm font-mono">{opc.codigo}</td>
                      <td className="px-4 py-3 text-sm">{opc.nome}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {opc.tipo_valor}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {opc.tipo_valor === 'PERCENTUAL' ? `${opc.valor}%` : formatCurrency(opc.valor)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${opc.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {opc.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configurações */}
        {tab === 'config' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Configurações do Sistema de Preços</h2>
            </div>
            <div className="p-4 space-y-4">
              {config.map((c) => (
                <div key={c.chave} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{c.chave}</p>
                    <p className="text-sm text-gray-500">{c.descricao}</p>
                  </div>
                  <div className="font-semibold text-lg text-red-600">{c.valor}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reajuste */}
        {tab === 'reajuste' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Reajuste de Preços em Massa</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reajuste</label>
                  <select
                    value={reajusteTipo}
                    onChange={(e) => setReajusteTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="todos">Todos os Preços</option>
                    <option value="base">Apenas Preços Base</option>
                    <option value="opcoes">Apenas Opcionais</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentual (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={reajustePercentual}
                    onChange={(e) => setReajustePercentual(e.target.value)}
                    placeholder="Ex: 5.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleSimularReajuste}
                    disabled={!reajustePercentual}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Simular
                  </button>
                  <button
                    onClick={handleAplicarReajuste}
                    disabled={!reajustePercentual || !simulacao}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Aplicar Reajuste
                  </button>
                </div>
              </div>

              {simulacao && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Simulação do Reajuste de {reajustePercentual}%</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">Preços Base Afetados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {simulacao.simulacao_base?.quantidade || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">Opcionais Afetados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {simulacao.simulacao_opcoes?.quantidade || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alerta */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-800">Atenção</p>
                  <p className="text-sm text-yellow-700">
                    Reajustes são permanentes e afetam todas as propostas futuras. Propostas já enviadas não são alteradas.
                    Todas as alterações são registradas no histórico para auditoria.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
