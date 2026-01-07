'use client';

import { Atividade, LogAtividade } from '@/types/atividade';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import AtividadeForm from './AtividadeForm';
import FormPreparacao from './FormPreparacao';
import FormLiberacaoEmbarque from './FormLiberacaoEmbarque';
import FormDesembarque from './FormDesembarque';
import FormEntrega from './FormEntrega';
import FormReuniaoStart from './FormReuniaoStart';
import FormularioLiberacaoComercial from './FormularioLiberacaoComercial';

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
  const [showLogs, setShowLogs] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  // Timer atualizado a cada segundo quando atividade está em andamento
  useEffect(() => {
    if (atividade.status !== 'EM ANDAMENTO') {
      // Mostrar tempo acumulado se existir
      if (atividade.tempo_acumulado_segundos) {
        setTimerDisplay(formatarTempo(atividade.tempo_acumulado_segundos));
      }
      return;
    }

    const interval = setInterval(() => {
      let segundosTotais = atividade.tempo_acumulado_segundos || 0;

      if (atividade.ultimo_inicio) {
        const diff = Math.floor((new Date().getTime() - new Date(atividade.ultimo_inicio).getTime()) / 1000);
        segundosTotais += diff;
      }

      setTimerDisplay(formatarTempo(segundosTotais));
    }, 1000);

    return () => clearInterval(interval);
  }, [atividade.status, atividade.ultimo_inicio, atividade.tempo_acumulado_segundos]);

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONCLUÍDA':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'EM ANDAMENTO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'PAUSADA':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'A REALIZAR':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUsuario = () => {
    const userDataString = localStorage.getItem('user_data');
    if (userDataString) {
      try {
        const usuario = JSON.parse(userDataString);
        return { nome: usuario.nome || 'Anônimo', id: usuario.id };
      } catch {
        return { nome: 'Anônimo' };
      }
    }
    return { nome: 'Anônimo' };
  };

  const handleTimerAction = async (acao: 'INICIAR' | 'PAUSAR' | 'RETOMAR' | 'FINALIZAR') => {
    setLoading(true);
    try {
      const usuario = getUsuario();
      const response = await fetch(`/api/atividades/${atividade.numero_opd}/${atividade.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao,
          usuario_nome: usuario.nome,
          usuario_id: usuario.id
        })
      });

      const result = await response.json();
      if (result.success) {
        onRefresh();
      } else {
        alert(result.error || 'Erro ao executar ação');
      }
    } catch (error) {
      console.error('Erro ao controlar timer:', error);
      alert('Erro ao controlar timer');
    } finally {
      setLoading(false);
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

  // Verificar se atividade requer formulário especial
  const atividadesComFormulario = ['PREPARAÇÃO', 'LIBERAÇÃO E EMBARQUE', 'DESEMBARQUE E PRÉ-INSTALAÇÃO', 'ENTREGA', 'REUNIÃO DE START 1', 'REUNIÃO DE START 2', 'LIBERAÇÃO COMERCIAL'];
  const requerFormulario = atividadesComFormulario.includes(atividade.atividade);

  const handleFinalizarComFormulario = () => {
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
  };

  // Parse logs
  const logs: LogAtividade[] = atividade.logs
    ? (typeof atividade.logs === 'string' ? JSON.parse(atividade.logs) : atividade.logs)
    : [];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Botões de controle do Timer */}
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              {atividade.status === 'A REALIZAR' && (
                <button
                  onClick={() => handleTimerAction('INICIAR')}
                  disabled={loading}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition disabled:opacity-50"
                  title="Iniciar"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              )}

              {atividade.status === 'EM ANDAMENTO' && (
                <>
                  <button
                    onClick={() => handleTimerAction('PAUSAR')}
                    disabled={loading}
                    className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Pausar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => requerFormulario ? handleFinalizarComFormulario() : handleTimerAction('FINALIZAR')}
                    disabled={loading}
                    className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Finalizar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                  </button>
                </>
              )}

              {atividade.status === 'PAUSADA' && (
                <>
                  <button
                    onClick={() => handleTimerAction('RETOMAR')}
                    disabled={loading}
                    className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Retomar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => requerFormulario ? handleFinalizarComFormulario() : handleTimerAction('FINALIZAR')}
                    disabled={loading}
                    className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Finalizar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                  </button>
                </>
              )}

              {atividade.status === 'CONCLUÍDA' && (
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
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
            {/* Timer Display */}
            {(atividade.status === 'EM ANDAMENTO' || atividade.status === 'PAUSADA' || atividade.tempo_acumulado_segundos) && (
              <div className={`font-mono text-lg font-bold ${
                atividade.status === 'EM ANDAMENTO' ? 'text-yellow-600' :
                atividade.status === 'PAUSADA' ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {timerDisplay}
              </div>
            )}

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
              {atividade.tempo_acumulado_segundos && (
                <div>
                  <span className="font-semibold text-gray-700">Tempo Total:</span>
                  <p className="text-gray-600">{formatarTempo(atividade.tempo_acumulado_segundos)}</p>
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

            {/* Logs de Ações */}
            {logs.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogs(!showLogs);
                  }}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Histórico de Ações ({logs.length})</span>
                  <svg className={`w-4 h-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showLogs && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {logs.slice().reverse().map((log, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            log.acao === 'INICIOU' ? 'bg-green-100 text-green-800' :
                            log.acao === 'PAUSOU' ? 'bg-orange-100 text-orange-800' :
                            log.acao === 'RETOMOU' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.acao}
                          </span>
                          <span className="text-sm text-gray-700">{log.usuario_nome}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormPreparacao(false);
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormLiberacaoEmbarque(false);
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormDesembarque(false);
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormEntrega(false);
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormReuniaoStart(false);
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
          onSubmit={async () => {
            await handleTimerAction('FINALIZAR');
            setShowFormLiberacaoComercial(false);
          }}
          onCancel={() => setShowFormLiberacaoComercial(false)}
        />
      </Modal>
    </div>
  );
}
