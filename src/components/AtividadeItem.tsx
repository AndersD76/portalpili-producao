'use client';

import { Atividade } from '@/types/atividade';
import { useState } from 'react';
import Modal from './Modal';
import AtividadeForm from './AtividadeForm';
import FormPreparacao from './FormPreparacao';
import FormLiberacaoEmbarque from './FormLiberacaoEmbarque';
import FormDesembarque from './FormDesembarque';
import FormEntrega from './FormEntrega';
import FormReuniaoStart from './FormReuniaoStart';
import FormularioLiberacaoComercial from './FormularioLiberacaoComercial';
import ConfirmacaoAtividade from './ConfirmacaoAtividade';

interface AtividadeItemProps {
  atividade: Atividade;
  opdCliente?: string;
  onUpdate: (id: number, data: any) => Promise<void>;
  onRefresh: () => void | Promise<void>;
}

export default function AtividadeItem({ atividade, onUpdate, onRefresh }: AtividadeItemProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFormPreparacao, setShowFormPreparacao] = useState(false);
  const [showFormLiberacaoEmbarque, setShowFormLiberacaoEmbarque] = useState(false);
  const [showFormDesembarque, setShowFormDesembarque] = useState(false);
  const [showFormEntrega, setShowFormEntrega] = useState(false);
  const [showFormReuniaoStart, setShowFormReuniaoStart] = useState(false);
  const [showFormLiberacaoComercial, setShowFormLiberacaoComercial] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONCLUÍDA':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'EM ANDAMENTO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'A REALIZAR':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONCLUÍDA':
        return '✓';
      case 'EM ANDAMENTO':
        return '↻';
      case 'A REALIZAR':
        return '○';
      default:
        return '○';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'EM ANDAMENTO' && !atividade.data_inicio) {
        updateData.data_inicio = new Date().toISOString();
      }

      if (newStatus === 'CONCLUÍDA' && !atividade.data_termino) {
        updateData.data_termino = new Date().toISOString();
      }

      await onUpdate(atividade.id, updateData);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status da atividade');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResponsavel = async (data: { responsavel: string; dataFinalizacao: string; horaFinalizacao: string; fotoComprovacao: string }) => {
    if (!pendingStatus) return;

    setShowConfirmacao(false);
    setLoading(true);

    try {
      const updateData: any = {
        status: pendingStatus,
        responsavel_execucao: data.responsavel,
        data_execucao: data.dataFinalizacao,
        hora_execucao: data.horaFinalizacao,
        foto_comprovacao: data.fotoComprovacao
      };

      if (pendingStatus === 'EM ANDAMENTO' && !atividade.data_inicio) {
        updateData.data_inicio = new Date().toISOString();
      }

      if (pendingStatus === 'CONCLUÍDA' && !atividade.data_termino) {
        updateData.data_termino = new Date().toISOString();
      }

      await onUpdate(atividade.id, updateData);
      setPendingStatus(null);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      alert('Erro ao confirmar atividade');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (loading) return;

    // Verificar se é uma atividade especial que requer formulário
    const atividadesComFormulario = ['PREPARAÇÃO', 'LIBERAÇÃO E EMBARQUE', 'DESEMBARQUE E PRÉ-INSTALAÇÃO', 'ENTREGA', 'REUNIÃO DE START 1', 'REUNIÃO DE START 2', 'LIBERAÇÃO COMERCIAL'];
    const requerFormulario = atividadesComFormulario.includes(atividade.atividade);

    // Lógica de progressão com suporte a desmarcar (ciclo reverso)
    if (atividade.status === 'CONCLUÍDA') {
      // CONCLUÍDA → EM ANDAMENTO (desmarcar)
      setPendingStatus('EM ANDAMENTO');
      setShowConfirmacao(true);
    } else if (atividade.status === 'EM ANDAMENTO') {
      // EM ANDAMENTO → A REALIZAR (desmarcar completamente)
      setPendingStatus('A REALIZAR');
      setShowConfirmacao(true);
    } else if (atividade.status === 'A REALIZAR') {
      // A REALIZAR → EM ANDAMENTO ou abre formulário para concluir diretamente
      if (requerFormulario) {
        // Para atividades com formulário, abrir o formulário diretamente
        if (atividade.atividade === 'PREPARAÇÃO') {
          setShowFormPreparacao(true);
        } else if (atividade.atividade === 'LIBERAÇÃO E EMBARQUE') {
          setShowFormLiberacaoEmbarque(true);
        } else if (atividade.atividade === 'DESEMBARQUE E PRÉ-INSTALAÇÃO') {
          setShowFormDesembarque(true);
        } else if (atividade.atividade === 'ENTREGA') {
          setShowFormEntrega(true);
        } else if (atividade.atividade === 'REUNIÃO DE START 1' || atividade.atividade === 'REUNIÃO DE START 2') {
          setShowFormReuniaoStart(true);
        } else if (atividade.atividade === 'LIBERAÇÃO COMERCIAL') {
          setShowFormLiberacaoComercial(true);
        }
      } else {
        // Atividade normal: A REALIZAR → EM ANDAMENTO
        setPendingStatus('EM ANDAMENTO');
        setShowConfirmacao(true);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Checkbox visual baseado no status */}
            <div
              onClick={handleCheckboxClick}
              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${
                atividade.status === 'CONCLUÍDA'
                  ? 'bg-green-500 border-green-500'
                  : atividade.status === 'EM ANDAMENTO'
                  ? 'bg-yellow-100 border-yellow-500'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              } ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {atividade.status === 'CONCLUÍDA' && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {atividade.status === 'EM ANDAMENTO' && (
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{atividade.atividade}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {atividade.responsavel}
                </span>
                {atividade.previsao_inicio && (
                  <span>Prev: {formatDate(atividade.previsao_inicio)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(atividade.status)}`}>
              {atividade.status}
            </div>

            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="pt-4 border-t border-gray-200">
            {/* Mudar Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Alterar Status:</label>
              <select
                value={atividade.status}
                onChange={(e) => {
                  e.stopPropagation();
                  handleStatusChange(e.target.value);
                }}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="A REALIZAR">A Realizar</option>
                <option value="EM ANDAMENTO">Em Andamento</option>
                <option value="CONCLUÍDA">Concluída</option>
              </select>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Data do Pedido:</span>
                <p className="text-gray-600">{formatDate(atividade.data_pedido)}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Data de Início:</span>
                <p className="text-gray-600">{formatDate(atividade.data_inicio)}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Data de Término:</span>
                <p className="text-gray-600">{formatDate(atividade.data_termino)}</p>
              </div>
              {atividade.tempo_medio && (
                <div>
                  <span className="font-semibold text-gray-700">Tempo Médio:</span>
                  <p className="text-gray-600">{atividade.tempo_medio.toFixed(2)} dias</p>
                </div>
              )}
              {atividade.dias && (
                <div>
                  <span className="font-semibold text-gray-700">Duração:</span>
                  <p className="text-gray-600">{atividade.dias} dias</p>
                </div>
              )}
            </div>

            {atividade.observacoes && (
              <div className="mt-2">
                <span className="font-semibold text-gray-700">Observações:</span>
                <p className="text-gray-600 mt-1">{atividade.observacoes}</p>
              </div>
            )}

            {atividade.formulario_anexo && (
              <div className="mt-3 bg-blue-50 p-3 rounded border border-blue-200">
                <span className="font-semibold text-gray-700 text-sm">Formulário Anexado:</span>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">{atividade.formulario_anexo.filename}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(atividade.formulario_anexo?.url, '_blank');
                    }}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar Detalhes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Atividade"
      >
        <AtividadeForm
          atividade={atividade}
          numeroOpd={atividade.numero_opd}
          onSuccess={() => {
            setShowEditModal(false);
            onRefresh();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Modal de Formulário de Preparação */}
      <Modal
        isOpen={showFormPreparacao}
        onClose={() => setShowFormPreparacao(false)}
        title="Registro de Instalação - Preparação"
      >
        <FormPreparacao
          numeroOpd={atividade.numero_opd}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormPreparacao(false);
            alert('Formulário de Preparação enviado com sucesso!');
          }}
          onCancel={() => setShowFormPreparacao(false)}
        />
      </Modal>

      {/* Modal de Formulário de Liberação e Embarque */}
      <Modal
        isOpen={showFormLiberacaoEmbarque}
        onClose={() => setShowFormLiberacaoEmbarque(false)}
        title="Registro de Instalação - Liberação e Embarque"
      >
        <FormLiberacaoEmbarque
          numeroOpd={atividade.numero_opd}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormLiberacaoEmbarque(false);
            alert('Formulário de Liberação e Embarque enviado com sucesso!');
          }}
          onCancel={() => setShowFormLiberacaoEmbarque(false)}
        />
      </Modal>

      {/* Modal de Formulário de Desembarque e Pré-Instalação */}
      <Modal
        isOpen={showFormDesembarque}
        onClose={() => setShowFormDesembarque(false)}
        title="Registro de Instalação - Desembarque e Pré-Instalação"
      >
        <FormDesembarque
          numeroOpd={atividade.numero_opd}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormDesembarque(false);
            alert('Formulário de Desembarque enviado com sucesso!');
          }}
          onCancel={() => setShowFormDesembarque(false)}
        />
      </Modal>

      {/* Modal de Formulário de Entrega */}
      <Modal
        isOpen={showFormEntrega}
        onClose={() => setShowFormEntrega(false)}
        title="Registro de Instalação - Entrega Final"
      >
        <FormEntrega
          numeroOpd={atividade.numero_opd}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormEntrega(false);
            alert('Formulário de Entrega enviado com sucesso!');
          }}
          onCancel={() => setShowFormEntrega(false)}
        />
      </Modal>

      {/* Modal de Formulário de Reunião de Start */}
      <Modal
        isOpen={showFormReuniaoStart}
        onClose={() => setShowFormReuniaoStart(false)}
        title={`Registro - ${atividade.atividade}`}
      >
        <FormReuniaoStart
          numeroOpd={atividade.numero_opd}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormReuniaoStart(false);
            alert('Formulário de Reunião de Start enviado com sucesso!');
          }}
          onCancel={() => setShowFormReuniaoStart(false)}
        />
      </Modal>

      {/* Modal de Formulário de Liberação Comercial */}
      <Modal
        isOpen={showFormLiberacaoComercial}
        onClose={() => setShowFormLiberacaoComercial(false)}
        title="Liberação Comercial"
      >
        <FormularioLiberacaoComercial
          opd={atividade.numero_opd}
          cliente={atividade.responsavel || ''}
          atividadeId={atividade.id}
          onSubmit={async (data) => {
            // Salvar o formulário e mudar status para CONCLUÍDA
            await handleStatusChange('CONCLUÍDA');
            setShowFormLiberacaoComercial(false);
          }}
          onCancel={() => setShowFormLiberacaoComercial(false)}
        />
      </Modal>

      {/* Confirmação de Responsável */}
      <ConfirmacaoAtividade
        isOpen={showConfirmacao}
        onClose={() => {
          setShowConfirmacao(false);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirmResponsavel}
        atividade={atividade.atividade}
        novoStatus={pendingStatus || ''}
      />
    </div>
  );
}
