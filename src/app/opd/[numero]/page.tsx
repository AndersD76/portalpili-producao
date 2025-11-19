'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { OPD } from '@/types/opd';
import { Atividade } from '@/types/atividade';
import AtividadeItem from '@/components/AtividadeItem';
import Modal from '@/components/Modal';
import OPDForm from '@/components/OPDForm';
import AtividadeForm from '@/components/AtividadeForm';
import ChatOPD from '@/components/ChatOPD';

export default function OPDDetalhe({ params }: { params: Promise<{ numero: string }> }) {
  const router = useRouter();
  const { numero } = use(params);
  const [opd, setOpd] = useState<OPD | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('TODAS');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewAtividadeModal, setShowNewAtividadeModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOPDAndAtividades();
  }, [numero]);

  const fetchOPDAndAtividades = async () => {
    try {
      setLoading(true);

      // Buscar dados da OPD
      const opdResponse = await fetch('/api/opds');
      const opdData = await opdResponse.json();

      if (opdData.success) {
        const foundOpd = opdData.data.find((o: OPD) => o.numero === numero);
        setOpd(foundOpd || null);
      }

      // Buscar atividades da OPD
      const atividadesResponse = await fetch(`/api/atividades/${numero}`);
      const atividadesData = await atividadesResponse.json();

      if (atividadesData.success) {
        setAtividades(atividadesData.data);
      }

      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateAtividade = async (id: number, data: any) => {
    try {
      const response = await fetch(`/api/atividades/${numero}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar a lista local
        setAtividades(prevAtividades =>
          prevAtividades.map(ativ =>
            ativ.id === id ? { ...ativ, ...result.data } : ativ
          )
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      throw error;
    }
  };

  const handleDeleteOPD = async () => {
    if (!opd) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/opds/${opd.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Erro ao deletar OPD');
      }
    } catch (err) {
      setError('Erro ao deletar OPD');
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusStats = () => {
    const total = atividades.length;
    const concluidas = atividades.filter(a => a.status === 'CONCLUÍDA').length;
    const emAndamento = atividades.filter(a => a.status === 'EM ANDAMENTO').length;
    const aRealizar = atividades.filter(a => a.status === 'A REALIZAR').length;
    const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return { total, concluidas, emAndamento, aRealizar, percentual };
  };

  // Organizar atividades em hierarquia
  const organizeAtividades = () => {
    const parentAtividades = atividades.filter(a => !a.parent_id);
    const childAtividades = atividades.filter(a => a.parent_id);

    return parentAtividades.map(parent => ({
      ...parent,
      subtarefas: childAtividades.filter(child => child.parent_id === parent.id)
    }));
  };

  const filteredAtividades = organizeAtividades().filter(ativ => {
    if (filter === 'TODAS') return true;
    return ativ.status === filter || ativ.subtarefas?.some(sub => sub.status === filter);
  });

  const stats = getStatusStats();

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

  if (error || !opd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-600 text-xl font-bold mb-4">Erro</div>
          <p className="text-gray-700">{error || 'OPD não encontrada'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/')}
            className="text-red-600 hover:text-red-800 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Controle Geral
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OPD {opd.numero}</h1>
              {opd.cliente && (
                <div className="mt-2 inline-flex items-center px-4 py-2 bg-blue-100 border-2 border-blue-400 rounded-lg">
                  <svg className="w-5 h-5 mr-2 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">Cliente:</span>
                  <span className="ml-2 text-sm font-bold text-blue-900">{opd.cliente}</span>
                </div>
              )}
              {opd.data_entrega && (
                <div className="mt-2 inline-flex items-center px-4 py-2 bg-blue-100 border-2 border-blue-400 rounded-lg ml-2">
                  <svg className="w-5 h-5 mr-2 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">Previsão de Entrega:</span>
                  <span className="ml-2 text-sm font-bold text-blue-900">{formatDate(opd.data_entrega)}</span>
                </div>
              )}
              <p className="text-gray-600 mt-2">
                {opd.tipo_opd} - {opd.responsavel_opd}
              </p>
            </div>

            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Deletar</span>
              </button>

              <div className="bg-red-50 px-6 py-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.percentual}%</div>
                  <div className="text-sm text-gray-600">Completo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Informações da OPD */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Data do Pedido:</span>
              <p className="font-medium">{formatDate(opd.data_pedido)}</p>
            </div>
            <div>
              <span className="text-gray-500">Início Produção:</span>
              <p className="font-medium">{formatDate(opd.inicio_producao)}</p>
            </div>
            <div>
              <span className="text-gray-500">Prev. Início:</span>
              <p className="font-medium">{formatDate(opd.previsao_inicio)}</p>
            </div>
            <div>
              <span className="text-gray-500">Prev. Término:</span>
              <p className="font-medium">{formatDate(opd.previsao_termino)}</p>
            </div>
          </div>

          {/* Status Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-gray-100 px-4 py-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-green-100 px-4 py-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{stats.concluidas}</div>
              <div className="text-xs text-green-600">Concluídas</div>
            </div>
            <div className="bg-yellow-100 px-4 py-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.emAndamento}</div>
              <div className="text-xs text-yellow-600">Em Andamento</div>
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.aRealizar}</div>
              <div className="text-xs text-gray-600">A Realizar</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-6 flex space-x-2">
            <button
              onClick={() => setFilter('TODAS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'TODAS'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('A REALIZAR')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'A REALIZAR'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              A Realizar
            </button>
            <button
              onClick={() => setFilter('EM ANDAMENTO')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'EM ANDAMENTO'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Em Andamento
            </button>
            <button
              onClick={() => setFilter('CONCLUÍDA')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'CONCLUÍDA'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Concluídas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna de Atividades - 2/3 */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Atividades ({filteredAtividades.length})
              </h2>
              <button
                onClick={() => setShowNewAtividadeModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nova Atividade</span>
              </button>
            </div>

            {filteredAtividades.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nenhuma atividade encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAtividades.map((atividade) => (
                  <div key={atividade.id}>
                    <AtividadeItem
                      atividade={atividade}
                      opdCliente={opd?.cliente || undefined}
                      onUpdate={updateAtividade}
                      onRefresh={fetchOPDAndAtividades}
                    />
                    {/* Subtarefas */}
                    {atividade.subtarefas && atividade.subtarefas.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2 border-l-4 border-red-300 pl-4">
                        {atividade.subtarefas.map((subtarefa) => (
                          <AtividadeItem
                            key={subtarefa.id}
                            atividade={subtarefa}
                            opdCliente={opd?.cliente || undefined}
                            onUpdate={updateAtividade}
                            onRefresh={fetchOPDAndAtividades}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna de Chat - 1/3 */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ChatOPD numeroOPD={numero} />
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Edição */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar OPD"
      >
        <OPDForm
          opd={opd}
          onSuccess={() => {
            setShowEditModal(false);
            fetchOPDAndAtividades();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja deletar a OPD <strong>{opd?.numero}</strong>?
          </p>
          <p className="text-sm text-red-600">
            Esta ação não pode ser desfeita e todas as atividades relacionadas permanecerão no banco de dados.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteOPD}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? 'Deletando...' : 'Deletar OPD'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para Nova Atividade */}
      <Modal
        isOpen={showNewAtividadeModal}
        onClose={() => setShowNewAtividadeModal(false)}
        title="Criar Nova Atividade"
      >
        <AtividadeForm
          numeroOpd={numero}
          onSuccess={() => {
            setShowNewAtividadeModal(false);
            fetchOPDAndAtividades();
          }}
          onCancel={() => setShowNewAtividadeModal(false)}
        />
      </Modal>
    </div>
  );
}
