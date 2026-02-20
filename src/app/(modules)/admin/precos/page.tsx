'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type Produto = 'TOMBADOR' | 'COLETOR' | 'EXAUSTOR';
type TabType = 'base' | 'opcoes' | 'reajuste';

interface PrecoBase {
  id: number;
  tipo_produto: string;
  modelo: string;
  comprimento?: number;
  descricao: string;
  preco: number;
  ativo: boolean;
  qt_cilindros?: number;
  qt_motores?: number;
  qt_oleo?: number;
  angulo_inclinacao?: string;
}

interface PrecoOpcional {
  id: number;
  categoria_nome: string;
  codigo: string;
  nome: string;
  tipo_valor: string;
  valor: number;
  ativo: boolean;
  produto: string;
  tamanhos_aplicaveis?: number[];
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

const PRODUTOS: { value: Produto | ''; label: string }[] = [
  { value: '', label: 'Todos os Produtos' },
  { value: 'TOMBADOR', label: 'Tombador' },
  { value: 'COLETOR', label: 'Coletor' },
  { value: 'EXAUSTOR', label: 'Exaustor' },
];

export default function AdminPrecosPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('base');
  const [produtoFiltro, setProdutoFiltro] = useState<string>('');
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<PrecoOpcional[]>([]);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [reajustePercentual, setReajustePercentual] = useState<string>('');
  const [reajusteTipo, setReajusteTipo] = useState<string>('todos');
  const [simulacao, setSimulacao] = useState<SimulacaoReajuste | null>(null);

  // Modal de novo/editar preco base
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrecoBase | null>(null);
  const [formBase, setFormBase] = useState({
    tipo_produto: 'TOMBADOR' as string,
    modelo: '',
    comprimento: '',
    descricao: '',
    preco: '',
    qt_cilindros: '',
    qt_motores: '',
    qt_oleo: '',
    angulo_inclinacao: '',
  });

  // Modal de novo/editar opcional
  const [showModalOpcional, setShowModalOpcional] = useState(false);
  const [editingOpcional, setEditingOpcional] = useState<PrecoOpcional | null>(null);
  const [formOpcional, setFormOpcional] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    preco_tipo: 'FIXO',
    preco: '',
    produto: '',
    tamanhos_aplicaveis: '' as string,
  });

  const router = useRouter();
  const { authenticated, loading: authLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated || !isAdmin) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, authenticated, isAdmin]);

  useEffect(() => {
    if (!authLoading && authenticated) {
      fetchBase();
    }
  }, [produtoFiltro]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBase(), fetchOpcoes()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBase = async () => {
    try {
      let url = '/api/comercial/admin/precos?tipo=base';
      if (produtoFiltro) url += `&tipo_produto=${produtoFiltro}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setPrecosBase(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar precos base:', error);
    }
  };

  const fetchOpcoes = async () => {
    try {
      const res = await fetch('/api/comercial/admin/precos?tipo=opcoes');
      const data = await res.json();
      if (data.success) setOpcionais(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar opcionais:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        setMensagem({ tipo: 'sucesso', texto: `Item ${!ativo ? 'ativado' : 'desativado'} com sucesso` });
        fetchData();
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || `Erro ao ${ativo ? 'desativar' : 'ativar'}` });
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro de conexao ao atualizar preco' });
    }
  };

  // === CRUD Preco Base ===
  const openNewBase = () => {
    setEditingItem(null);
    setFormBase({
      tipo_produto: produtoFiltro || 'TOMBADOR',
      modelo: '',
      comprimento: '',
      descricao: '',
      preco: '',
      qt_cilindros: '',
      qt_motores: '',
      qt_oleo: '',
      angulo_inclinacao: '',
    });
    setShowModal(true);
  };

  const openEditBase = (item: PrecoBase) => {
    setEditingItem(item);
    setFormBase({
      tipo_produto: item.tipo_produto,
      modelo: item.modelo || '',
      comprimento: item.comprimento ? String(item.comprimento) : '',
      descricao: item.descricao || '',
      preco: String(item.preco),
      qt_cilindros: item.qt_cilindros ? String(item.qt_cilindros) : '',
      qt_motores: item.qt_motores ? String(item.qt_motores) : '',
      qt_oleo: item.qt_oleo ? String(item.qt_oleo) : '',
      angulo_inclinacao: item.angulo_inclinacao || '',
    });
    setShowModal(true);
  };

  const handleSaveBase = async () => {
    if (!formBase.descricao || !formBase.preco) {
      setMensagem({ tipo: 'erro', texto: 'Preencha pelo menos descricao e preco' });
      return;
    }

    try {
      if (editingItem) {
        // Editar
        const res = await fetch(`/api/comercial/admin/precos/base/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dados: {
              produto: formBase.tipo_produto,
              tipo: formBase.modelo,
              tamanho: formBase.comprimento ? parseInt(formBase.comprimento) : 0,
              descricao: formBase.descricao,
              preco: parseFloat(formBase.preco),
              qt_cilindros: formBase.qt_cilindros ? parseInt(formBase.qt_cilindros) : null,
              qt_motores: formBase.qt_motores ? parseInt(formBase.qt_motores) : null,
              qt_oleo: formBase.qt_oleo ? parseInt(formBase.qt_oleo) : null,
              angulo_inclinacao: formBase.angulo_inclinacao || null,
            }
          }),
        });
        const result = await res.json();
        if (result.success) {
          setMensagem({ tipo: 'sucesso', texto: 'Preco atualizado com sucesso' });
          setShowModal(false);
          fetchBase();
        } else {
          setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao atualizar' });
        }
      } else {
        // Criar
        const res = await fetch('/api/comercial/admin/precos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'base',
            dados: {
              produto: formBase.tipo_produto,
              tipo: formBase.modelo,
              tamanho: formBase.comprimento ? parseInt(formBase.comprimento) : 0,
              descricao: formBase.descricao,
              preco: parseFloat(formBase.preco),
              qt_cilindros: formBase.qt_cilindros ? parseInt(formBase.qt_cilindros) : null,
              qt_motores: formBase.qt_motores ? parseInt(formBase.qt_motores) : null,
              qt_oleo: formBase.qt_oleo ? parseInt(formBase.qt_oleo) : null,
              angulo_inclinacao: formBase.angulo_inclinacao || null,
            }
          }),
        });
        const result = await res.json();
        if (result.success) {
          setMensagem({ tipo: 'sucesso', texto: 'Preco criado com sucesso' });
          setShowModal(false);
          fetchBase();
        } else {
          setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao criar' });
        }
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar' });
    }
  };

  // === CRUD Opcional ===
  const openNewOpcional = () => {
    setEditingOpcional(null);
    setFormOpcional({ codigo: '', nome: '', descricao: '', preco_tipo: 'FIXO', preco: '', produto: '', tamanhos_aplicaveis: '' });
    setShowModalOpcional(true);
  };

  const openEditOpcional = (item: PrecoOpcional) => {
    setEditingOpcional(item);
    setFormOpcional({
      codigo: item.codigo || '',
      nome: item.nome || '',
      descricao: '',
      preco_tipo: item.tipo_valor || 'FIXO',
      preco: String(item.valor),
      produto: item.produto || '',
      tamanhos_aplicaveis: item.tamanhos_aplicaveis ? item.tamanhos_aplicaveis.join(', ') : '',
    });
    setShowModalOpcional(true);
  };

  const handleSaveOpcional = async () => {
    if (!formOpcional.nome || !formOpcional.preco) {
      setMensagem({ tipo: 'erro', texto: 'Preencha pelo menos nome e preco' });
      return;
    }
    try {
      const tamArr = formOpcional.tamanhos_aplicaveis
        ? formOpcional.tamanhos_aplicaveis.split(/[,;\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        : null;

      if (editingOpcional) {
        const res = await fetch(`/api/comercial/admin/precos/opcoes/${editingOpcional.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dados: {
              codigo: formOpcional.codigo,
              nome: formOpcional.nome,
              descricao: formOpcional.descricao,
              preco_tipo: formOpcional.preco_tipo,
              preco: parseFloat(formOpcional.preco),
              produto: formOpcional.produto || null,
              tamanhos_aplicaveis: tamArr && tamArr.length > 0 ? `{${tamArr.join(',')}}` : null,
            }
          }),
        });
        const result = await res.json();
        if (result.success) {
          setMensagem({ tipo: 'sucesso', texto: 'Opcional atualizado com sucesso' });
          setShowModalOpcional(false);
          fetchOpcoes();
        } else {
          setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao atualizar' });
        }
      } else {
        const res = await fetch('/api/comercial/admin/precos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'opcoes',
            dados: {
              codigo: formOpcional.codigo || formOpcional.nome.substring(0, 10).toUpperCase().replace(/\s/g, '_'),
              nome: formOpcional.nome,
              descricao: formOpcional.descricao,
              preco_tipo: formOpcional.preco_tipo,
              preco: parseFloat(formOpcional.preco),
              produto: formOpcional.produto || null,
              tamanhos_aplicaveis: tamArr && tamArr.length > 0 ? `{${tamArr.join(',')}}` : null,
            }
          }),
        });
        const result = await res.json();
        if (result.success) {
          setMensagem({ tipo: 'sucesso', texto: 'Opcional criado com sucesso' });
          setShowModalOpcional(false);
          fetchOpcoes();
        } else {
          setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao criar' });
        }
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar opcional' });
    }
  };

  const handleDelete = async (tipo: string, id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"? Esta acao nao pode ser desfeita.`)) return;
    try {
      const response = await fetch(`/api/comercial/admin/precos/${tipo}/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: 'Item excluido com sucesso' });
        fetchData();
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao excluir' });
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir' });
    }
  };

  // === Reajuste ===
  const handleSimularReajuste = async () => {
    if (!reajustePercentual) return;
    try {
      const response = await fetch('/api/comercial/admin/precos/reajuste', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: reajusteTipo, percentual: parseFloat(reajustePercentual) }),
      });
      const result = await response.json();
      if (result.success) setSimulacao(result.data);
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
        body: JSON.stringify({ tipo: reajusteTipo, percentual: parseFloat(reajustePercentual), motivo: `Reajuste de ${reajustePercentual}%` }),
      });
      const result = await response.json();
      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: result.message || 'Reajuste aplicado' });
        setSimulacao(null);
        setReajustePercentual('');
        fetchData();
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao aplicar reajuste' });
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao aplicar reajuste' });
    }
  };

  // Filtrar opcionais por produto selecionado
  const opcionaisFiltrados = produtoFiltro
    ? opcionais.filter(o => !o.produto || o.produto === produtoFiltro)
    : opcionais;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestao de Precos</h2>
          <p className="text-gray-600">Administre precos base e opcionais</p>
        </div>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{mensagem.texto}</span>
          <button onClick={() => setMensagem(null)} className="ml-4 text-lg font-bold">&times;</button>
        </div>
      )}

      {/* Filtro de Produto + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Dropdown de Produto */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Produto:</label>
          <select
            value={produtoFiltro}
            onChange={(e) => setProdutoFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
          >
            {PRODUTOS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'base' as TabType, label: 'Precos Base' },
            { id: 'opcoes' as TabType, label: 'Opcionais' },
            { id: 'reajuste' as TabType, label: 'Reajuste' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                tab === t.id ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* === TAB: Precos Base === */}
      {tab === 'base' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Precos Base {produtoFiltro ? `- ${produtoFiltro}` : '- Todos'}
              <span className="ml-2 text-sm font-normal text-gray-500">({precosBase.length} itens)</span>
            </h3>
            <button
              onClick={openNewBase}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              + Novo Preco
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Tipo</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tamanho</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Descricao</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Motores</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Cilindros</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Status</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {precosBase.map((preco) => (
                  <tr key={preco.id} className={`${!preco.ativo ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-medium">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        preco.tipo_produto === 'TOMBADOR' ? 'bg-blue-100 text-blue-800' :
                        preco.tipo_produto === 'COLETOR' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>{preco.tipo_produto}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm hidden sm:table-cell">{preco.modelo || '-'}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm hidden md:table-cell">
                      {preco.comprimento ? (
                        preco.tipo_produto === 'COLETOR' ? `${preco.comprimento}\u00B0` : `${preco.comprimento}m`
                      ) : '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 hidden lg:table-cell">{preco.descricao}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-semibold text-green-700 text-right">{formatCurrency(preco.preco)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-center hidden lg:table-cell">{preco.qt_motores || '-'}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-center hidden lg:table-cell">{preco.qt_cilindros || '-'}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${preco.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {preco.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditBase(preco)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleAtivo('base', preco.id, preco.ativo)}
                          className={`p-1.5 rounded transition ${preco.ativo ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={preco.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={preco.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete('base', preco.id, preco.descricao)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {precosBase.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      Nenhum preco base encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === TAB: Opcionais === */}
      {tab === 'opcoes' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Opcionais e Acessorios
              <span className="ml-2 text-sm font-normal text-gray-500">({opcionaisFiltrados.length} itens)</span>
            </h3>
            <button
              onClick={openNewOpcional}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              + Novo Opcional
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tamanhos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {opcionaisFiltrados.map((opc) => (
                  <tr key={opc.id} className={`${!opc.ativo ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-sm">{opc.categoria_nome || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{opc.codigo}</td>
                    <td className="px-4 py-3 text-sm">{opc.nome}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{opc.tipo_valor}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      {opc.tipo_valor === 'PERCENTUAL' ? `${opc.valor}%` : formatCurrency(opc.valor)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {opc.tamanhos_aplicaveis && opc.tamanhos_aplicaveis.length > 0 ? (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">{opc.tamanhos_aplicaveis.join(', ')}m</span>
                      ) : (
                        <span className="text-gray-400">Todos</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${opc.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {opc.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditOpcional(opc)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleAtivo('opcoes', opc.id, opc.ativo)}
                          className={`p-1.5 rounded transition ${opc.ativo ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={opc.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opc.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete('opcoes', opc.id, opc.nome)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {opcionaisFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Nenhum opcional encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === TAB: Reajuste === */}
      {tab === 'reajuste' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reajuste de Precos em Massa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reajuste</label>
                <select
                  value={reajusteTipo}
                  onChange={(e) => setReajusteTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="todos">Todos os Precos</option>
                  <option value="base">Apenas Precos Base</option>
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 text-sm"
                >
                  Simular
                </button>
                <button
                  onClick={handleAplicarReajuste}
                  disabled={!reajustePercentual || !simulacao}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
                >
                  Aplicar
                </button>
              </div>
            </div>
            {simulacao && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Simulacao do Reajuste de {reajustePercentual}%</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600">Precos Base Afetados</p>
                    <p className="text-2xl font-bold text-gray-900">{simulacao.simulacao_base?.quantidade || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600">Opcionais Afetados</p>
                    <p className="text-2xl font-bold text-gray-900">{simulacao.simulacao_opcoes?.quantidade || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Atencao</p>
                <p className="text-sm text-yellow-700">Reajustes sao permanentes e afetam todas as propostas futuras. Propostas ja enviadas nao sao alteradas.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: Novo/Editar Preco Base === */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? 'Editar Preco Base' : 'Novo Preco Base'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                  <select
                    value={formBase.tipo_produto}
                    onChange={e => setFormBase({...formBase, tipo_produto: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="TOMBADOR">Tombador</option>
                    <option value="COLETOR">Coletor</option>
                    <option value="EXAUSTOR">Exaustor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo (Modelo)</label>
                  <input
                    type="text"
                    value={formBase.modelo}
                    onChange={e => setFormBase({...formBase, modelo: e.target.value})}
                    placeholder="FIXO, MOVEL, etc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho (m ou graus)</label>
                  <input
                    type="number"
                    value={formBase.comprimento}
                    onChange={e => setFormBase({...formBase, comprimento: e.target.value})}
                    placeholder="Ex: 18"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preco (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBase.preco}
                    onChange={e => setFormBase({...formBase, preco: e.target.value})}
                    placeholder="Ex: 335600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input
                  type="text"
                  value={formBase.descricao}
                  onChange={e => setFormBase({...formBase, descricao: e.target.value})}
                  placeholder="Ex: Tombador 18m FIXO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cilindros</label>
                  <input
                    type="number"
                    value={formBase.qt_cilindros}
                    onChange={e => setFormBase({...formBase, qt_cilindros: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motores</label>
                  <input
                    type="number"
                    value={formBase.qt_motores}
                    onChange={e => setFormBase({...formBase, qt_motores: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Oleo (L)</label>
                  <input
                    type="number"
                    value={formBase.qt_oleo}
                    onChange={e => setFormBase({...formBase, qt_oleo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Angulo Inclinacao</label>
                <input
                  type="text"
                  value={formBase.angulo_inclinacao}
                  onChange={e => setFormBase({...formBase, angulo_inclinacao: e.target.value})}
                  placeholder="Ex: 40"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-5 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBase}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                {editingItem ? 'Salvar Alteracoes' : 'Criar Preco'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: Novo Opcional === */}
      {showModalOpcional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModalOpcional(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingOpcional ? 'Editar Opcional' : 'Novo Opcional'}</h3>
              <button onClick={() => setShowModalOpcional(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
                  <input
                    type="text"
                    value={formOpcional.codigo}
                    onChange={e => setFormOpcional({...formOpcional, codigo: e.target.value})}
                    placeholder="AUTO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto (aplicavel)</label>
                  <select
                    value={formOpcional.produto}
                    onChange={e => setFormOpcional({...formOpcional, produto: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Todos</option>
                    <option value="TOMBADOR">Tombador</option>
                    <option value="COLETOR">Coletor</option>
                    <option value="EXAUSTOR">Exaustor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formOpcional.nome}
                  onChange={e => setFormOpcional({...formOpcional, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamanhos aplicaveis (metros)</label>
                <input
                  type="text"
                  value={formOpcional.tamanhos_aplicaveis}
                  onChange={e => setFormOpcional({...formOpcional, tamanhos_aplicaveis: e.target.value})}
                  placeholder="Ex: 11, 12, 18 (vazio = todos)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input
                  type="text"
                  value={formOpcional.descricao}
                  onChange={e => setFormOpcional({...formOpcional, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Valor</label>
                  <select
                    value={formOpcional.preco_tipo}
                    onChange={e => setFormOpcional({...formOpcional, preco_tipo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="FIXO">Fixo (R$)</option>
                    <option value="POR_METRO">Por Metro</option>
                    <option value="POR_UNIDADE">Por Unidade</option>
                    <option value="POR_LITRO">Por Litro</option>
                    <option value="PERCENTUAL">Percentual (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formOpcional.preco}
                    onChange={e => setFormOpcional({...formOpcional, preco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModalOpcional(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOpcional}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                {editingOpcional ? 'Salvar Alteracoes' : 'Criar Opcional'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
