'use client';

import { Atividade } from '@/types/atividade';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import AtividadeForm from './AtividadeForm';
import FormularioReuniao from './FormularioReuniao';
import FormularioPreparacao from './FormularioPreparacao';
import FormularioLiberacaoEmbarque from './FormularioLiberacaoEmbarque';
import ModalVisualizarFormulario from './ModalVisualizarFormulario';
import ModalVisualizarArquivo from './ModalVisualizarArquivo';

interface AtividadeItemProps {
  atividade: Atividade;
  opdCliente?: string;
  onUpdate: (id: number, data: any) => Promise<void>;
  onRefresh: () => void;
}

export default function AtividadeItem({ atividade, opdCliente, onUpdate, onRefresh }: AtividadeItemProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReuniaoModal, setShowReuniaoModal] = useState(false);
  const [showPreparacaoModal, setShowPreparacaoModal] = useState(false);
  const [showLiberacaoModal, setShowLiberacaoModal] = useState(false);
  const [showVisualizarModal, setShowVisualizarModal] = useState(false);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [showDataHoraModal, setShowDataHoraModal] = useState(false);
  const [showArquivoModal, setShowArquivoModal] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<'iniciar' | 'finalizar' | 'desmarcar' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [temFormulario, setTemFormulario] = useState(false);
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Erro ao parsear dados do usuário');
      }
    }
  }, []);

  // Controlar o estado indeterminate do checkbox
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = atividade.status === 'EM ANDAMENTO';
    }
  }, [atividade.status]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const createAuditRecord = async (
    userId: number,
    userName: string,
    userIdFuncionario: string,
    acao: string,
    statusAnterior: string | null,
    statusNovo: string | null
  ) => {
    try {
      await fetch('/api/auditoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          atividade_id: atividade.id,
          numero_opd: atividade.numero_opd,
          usuario_id: userId,
          usuario_nome: userName,
          usuario_id_funcionario: userIdFuncionario,
          acao,
          status_anterior: statusAnterior,
          status_novo: statusNovo,
          observacoes: `Status alterado de ${statusAnterior || 'N/A'} para ${statusNovo || 'N/A'}`
        })
      });
    } catch (error) {
      console.error('Erro ao criar registro de auditoria:', error);
    }
  };

  const handleStatusChange = async (newStatus: string, justificativaReversao?: string, dataHoraCustom?: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const statusAnterior = atividade.status;
      const updateData: any = { status: newStatus };

      // Se está iniciando a atividade
      if (newStatus === 'EM ANDAMENTO' && statusAnterior === 'A REALIZAR') {
        updateData.data_inicio = dataHoraCustom ? new Date(dataHoraCustom).toISOString() : new Date().toISOString();
        updateData.iniciado_por_id = user.id;
        updateData.iniciado_por_nome = user.nome;
        updateData.iniciado_por_id_funcionario = user.id_funcionario;
      }

      // Se está finalizando a atividade
      if (newStatus === 'CONCLUÍDA' && statusAnterior === 'EM ANDAMENTO') {
        updateData.data_termino = dataHoraCustom ? new Date(dataHoraCustom).toISOString() : new Date().toISOString();
        updateData.finalizado_por_id = user.id;
        updateData.finalizado_por_nome = user.nome;
        updateData.finalizado_por_id_funcionario = user.id_funcionario;
      }

      // Se está revertendo para A REALIZAR (limpa tudo)
      if (newStatus === 'A REALIZAR' && (statusAnterior === 'EM ANDAMENTO' || statusAnterior === 'CONCLUÍDA')) {
        updateData.data_inicio = null;
        updateData.iniciado_por_id = null;
        updateData.iniciado_por_nome = null;
        updateData.iniciado_por_id_funcionario = null;
        updateData.data_termino = null;
        updateData.finalizado_por_id = null;
        updateData.finalizado_por_nome = null;
        updateData.finalizado_por_id_funcionario = null;
        updateData.justificativa_reversao = justificativaReversao;
      }

      // Se está revertendo de CONCLUÍDA para EM ANDAMENTO (limpa apenas data_termino)
      if (statusAnterior === 'CONCLUÍDA' && newStatus === 'EM ANDAMENTO') {
        updateData.data_termino = null;
        updateData.finalizado_por_id = null;
        updateData.finalizado_por_nome = null;
        updateData.finalizado_por_id_funcionario = null;
        updateData.justificativa_reversao = justificativaReversao;
      }

      await onUpdate(atividade.id, updateData);

      // Criar registro de auditoria
      let acao = 'EDITADA';
      if (newStatus === 'EM ANDAMENTO' && statusAnterior === 'A REALIZAR') acao = 'INICIADA';
      if (newStatus === 'CONCLUÍDA' && statusAnterior === 'EM ANDAMENTO') acao = 'CONCLUIDA';
      if (justificativaReversao) acao = 'REVERTIDA';

      await createAuditRecord(user.id, user.nome, user.id_funcionario, acao, statusAnterior, newStatus);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status da atividade');
    } finally {
      setLoading(false);
    }
  };

  const isReuniaoStart = () => {
    const atividadeLower = atividade.atividade?.toLowerCase() || '';
    return atividadeLower.includes('reunião de start') ||
           atividadeLower.includes('reuniao de start');
  };

  const isPreparacao = () => {
    const atividadeLower = atividade.atividade?.toLowerCase() || '';
    return atividadeLower.includes('preparação') ||
           atividadeLower.includes('preparacao') ||
           atividadeLower.includes('registro de instalação');
  };

  const isLiberacaoEmbarque = () => {
    const atividadeLower = atividade.atividade?.toLowerCase() || '';
    return atividadeLower.includes('liberação e embarque') ||
           atividadeLower.includes('liberacao e embarque');
  };

  const isDefinicaoObraCivil = () => {
    const atividadeLower = atividade.atividade?.toLowerCase() || '';
    return atividadeLower.includes('definição da obra civil') ||
           atividadeLower.includes('definicao da obra civil');
  };

  const getTipoFormulario = (): 'REUNIAO_START' | 'PREPARACAO' | 'LIBERACAO_EMBARQUE' | null => {
    if (isReuniaoStart()) return 'REUNIAO_START';
    if (isPreparacao()) return 'PREPARACAO';
    if (isLiberacaoEmbarque()) return 'LIBERACAO_EMBARQUE';
    return null;
  };

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const uploadArquivo = async (file: File): Promise<{ filename: string; url: string; size: number } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'obra_civil');
      formData.append('numero_opd', atividade.numero_opd);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        return {
          filename: result.filename,
          url: result.url,
          size: file.size
        };
      }

      throw new Error(result.error || 'Erro ao fazer upload');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };

  // Verificar se há formulário preenchido
  useEffect(() => {
    const verificarFormulario = async () => {
      const tipo = getTipoFormulario();
      if (!tipo) return;

      try {
        let endpoint = '';
        if (tipo === 'REUNIAO_START') {
          endpoint = `/api/formularios-reuniao/${atividade.numero_opd}?atividade_id=${atividade.id}`;
        } else if (tipo === 'PREPARACAO') {
          endpoint = `/api/formularios-preparacao/${atividade.numero_opd}?atividade_id=${atividade.id}`;
        } else if (tipo === 'LIBERACAO_EMBARQUE') {
          endpoint = `/api/formularios-liberacao-embarque/${atividade.numero_opd}?atividade_id=${atividade.id}`;
        }

        const response = await fetch(endpoint);
        const result = await response.json();

        if (result.success) {
          setTemFormulario(true);
        }
      } catch (error) {
        // Silenciar erro - formulário pode não existir ainda
      }
    };

    verificarFormulario();
  }, [atividade.id, atividade.numero_opd]);

  const handleCheckboxClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

    const isChecking = e.target.checked;

    // Se está marcando (progredindo)
    if (isChecking) {
      if (atividade.status === 'A REALIZAR') {
        // Verificar se é a reunião de start - abre formulário específico primeiro
        if (isReuniaoStart()) {
          setAcaoPendente('iniciar');
          setShowReuniaoModal(true);
          // Desmarcar temporariamente até preencher formulário
          if (checkboxRef.current) {
            checkboxRef.current.checked = false;
          }
          return;
        }

        // Verificar se é tarefa de preparação - abre formulário específico primeiro
        if (isPreparacao()) {
          setAcaoPendente('iniciar');
          setShowPreparacaoModal(true);
          // Desmarcar temporariamente até preencher formulário
          if (checkboxRef.current) {
            checkboxRef.current.checked = false;
          }
          return;
        }

        // Verificar se é tarefa de liberação e embarque - abre formulário específico primeiro
        if (isLiberacaoEmbarque()) {
          setAcaoPendente('iniciar');
          setShowLiberacaoModal(true);
          // Desmarcar temporariamente até preencher formulário
          if (checkboxRef.current) {
            checkboxRef.current.checked = false;
          }
          return;
        }

        // Primeiro clique: abre modal para informar data/hora de início
        setAcaoPendente('iniciar');
        setDataHora(new Date().toISOString().slice(0, 16)); // Formato datetime-local
        setShowDataHoraModal(true);
        // Desmarcar temporariamente até confirmar
        if (checkboxRef.current) {
          checkboxRef.current.checked = false;
        }
      } else if (atividade.status === 'EM ANDAMENTO') {
        // Segundo clique: abre modal para informar data/hora de término
        setAcaoPendente('finalizar');
        setDataHora(new Date().toISOString().slice(0, 16));
        setShowDataHoraModal(true);
        // Desmarcar temporariamente até confirmar
        if (checkboxRef.current) {
          checkboxRef.current.checked = false;
          checkboxRef.current.indeterminate = true;
        }
      } else {
        return;
      }
    } else {
      // Se está desmarcando (revertendo), pedir justificativa
      setAcaoPendente('desmarcar');
      setShowJustificativaModal(true);
    }
  };

  const handleConfirmarReversao = async () => {
    if (!justificativa.trim()) {
      alert('Por favor, informe uma justificativa para reverter o status');
      return;
    }

    // Sempre volta para "A REALIZAR" quando desmarca
    const proximoStatus = 'A REALIZAR';

    try {
      await handleStatusChange(proximoStatus, justificativa);
      setShowJustificativaModal(false);
      setJustificativa('');
      setAcaoPendente(null);
      // Aguardar um pouco e depois atualizar
      setTimeout(() => {
        onRefresh();
      }, 500);
    } catch (error) {
      console.error('Erro ao reverter status:', error);
      alert('Erro ao reverter o status da atividade');
    }
  };

  const handleConfirmarDataHora = async () => {
    if (!dataHora.trim()) {
      alert('Por favor, informe a data e hora');
      return;
    }

    // Se é definição da obra civil e está iniciando, o arquivo é obrigatório
    if (isDefinicaoObraCivil() && acaoPendente === 'iniciar' && !arquivo) {
      alert('Por favor, anexe o arquivo da obra civil');
      return;
    }

    setLoading(true);
    try {
      let formularioAnexo = null;

      // Se tem arquivo, fazer upload primeiro
      if (arquivo) {
        setUploadingFile(true);
        try {
          formularioAnexo = await uploadArquivo(arquivo);
        } catch (error) {
          alert('Erro ao fazer upload do arquivo');
          setUploadingFile(false);
          setLoading(false);
          return;
        }
        setUploadingFile(false);
      }

      // Preparar dados de atualização
      const updateData: any = {};

      if (acaoPendente === 'iniciar') {
        updateData.status = 'EM ANDAMENTO';
        updateData.data_inicio = dataHora ? new Date(dataHora).toISOString() : new Date().toISOString();
        updateData.iniciado_por_id = user?.id;
        updateData.iniciado_por_nome = user?.nome;
        updateData.iniciado_por_id_funcionario = user?.id_funcionario;

        if (formularioAnexo) {
          updateData.formulario_anexo = formularioAnexo;
        }
      } else if (acaoPendente === 'finalizar') {
        updateData.status = 'CONCLUÍDA';
        updateData.data_termino = dataHora ? new Date(dataHora).toISOString() : new Date().toISOString();
        updateData.finalizado_por_id = user?.id;
        updateData.finalizado_por_nome = user?.nome;
        updateData.finalizado_por_id_funcionario = user?.id_funcionario;
      }

      await onUpdate(atividade.id, updateData);

      // Criar registro de auditoria
      let acao: any = 'EDITADA';
      if (acaoPendente === 'iniciar') acao = 'INICIADA';
      if (acaoPendente === 'finalizar') acao = 'CONCLUIDA';

      if (user) {
        await createAuditRecord(
          user.id,
          user.nome,
          user.id_funcionario,
          acao,
          atividade.status,
          updateData.status
        );
      }

      setShowDataHoraModal(false);
      setDataHora('');
      setArquivo(null);
      setAcaoPendente(null);
      setTimeout(() => {
        onRefresh();
      }, 500);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar o status da atividade');
    } finally {
      setLoading(false);
    }
  };

  const handleReuniaoFormSuccess = () => {
    setShowReuniaoModal(false);
    setTemFormulario(true);
    // Após preencher o formulário de reunião, abrir modal para informar data/hora de início
    setAcaoPendente('iniciar');
    setDataHora(new Date().toISOString().slice(0, 16));
    setShowDataHoraModal(true);
  };

  const handlePreparacaoFormSuccess = () => {
    setShowPreparacaoModal(false);
    setTemFormulario(true);
    // Após preencher o formulário de preparação, abrir modal para informar data/hora de início
    setAcaoPendente('iniciar');
    setDataHora(new Date().toISOString().slice(0, 16));
    setShowDataHoraModal(true);
  };

  const handleLiberacaoFormSuccess = () => {
    setShowLiberacaoModal(false);
    setTemFormulario(true);
    // Após preencher o formulário de liberação e embarque, abrir modal para informar data/hora de início
    setAcaoPendente('iniciar');
    setDataHora(new Date().toISOString().slice(0, 16));
    setShowDataHoraModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={atividade.status === 'CONCLUÍDA'}
                onChange={handleCheckboxClick}
                disabled={loading}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 focus:ring-2 cursor-pointer disabled:opacity-50"
                title={
                  atividade.status === 'A REALIZAR'
                    ? '1º clique: Iniciar atividade'
                    : atividade.status === 'EM ANDAMENTO'
                    ? '2º clique: Concluir atividade | Desmarque para reverter'
                    : '3º estado: Concluída | Desmarque para reverter'
                }
              />
              <span className="text-2xl">{getStatusIcon(atividade.status)}</span>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{atividade.atividade}</h3>
                {temFormulario && (
                  <button
                    onClick={() => setShowVisualizarModal(true)}
                    className="p-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    title="Visualizar formulário preenchido"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
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
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Prev: {formatDate(atividade.previsao_inicio)}
                </span>
              )}

              {atividade.data_inicio && atividade.status === 'EM ANDAMENTO' && (
                <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-semibold">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Iniciada em: {formatDateTime(atividade.data_inicio)}
                </span>
              )}

              {atividade.data_termino && atividade.status === 'CONCLUÍDA' && (
                <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md font-semibold">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Finalizada em: {formatDateTime(atividade.data_termino)}
                </span>
              )}
            </div>

            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(atividade.status)}`}>
              {atividade.status}
            </div>
          </div>

          <div className="flex flex-col space-y-2 ml-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? '▲ Menos detalhes' : '▼ Mais detalhes'}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm space-y-2">
            {/* Data de Finalização Destacada */}
            {atividade.data_termino && atividade.status === 'CONCLUÍDA' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="font-bold text-green-900 text-base">Finalizada em:</span>
                      <p className="text-green-800 font-semibold text-lg">{formatDateTime(atividade.data_termino)}</p>
                    </div>
                  </div>
                  {atividade.dias !== null && atividade.dias !== undefined && (
                    <div className="flex items-center space-x-2 bg-green-200 px-4 py-2 rounded-lg border border-green-400">
                      <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">{atividade.dias}</div>
                        <div className="text-xs font-semibold text-green-700">{atividade.dias === 1 ? 'dia' : 'dias'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data de Início Destacada quando EM ANDAMENTO */}
            {atividade.data_inicio && atividade.status === 'EM ANDAMENTO' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-bold text-blue-900 text-base">Iniciada em:</span>
                    <p className="text-blue-800 font-semibold text-lg">{formatDateTime(atividade.data_inicio)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-gray-700">Data do Pedido:</span>
                <p className="text-gray-600">{formatDate(atividade.data_pedido)}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Data de Início:</span>
                <p className="text-gray-600">{formatDate(atividade.data_inicio)}</p>
              </div>
            </div>

            {/* Informações de quem iniciou e finalizou */}
            {(atividade.iniciado_por_nome || atividade.finalizado_por_nome) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Histórico de Execução</h4>
                <div className="space-y-2">
                  {atividade.iniciado_por_nome && (
                    <div className="flex items-start space-x-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-800">Iniciada em: {formatDateTime(atividade.data_inicio)}</p>
                        <p className="text-sm text-blue-900">{atividade.iniciado_por_nome}</p>
                        <p className="text-xs text-blue-700">{atividade.iniciado_por_id_funcionario}</p>
                      </div>
                    </div>
                  )}
                  {atividade.finalizado_por_nome && (
                    <div className="flex items-start space-x-2 bg-green-50 p-3 rounded-lg border border-green-200">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-800">Finalizada em: {formatDateTime(atividade.data_termino)}</p>
                        <p className="text-sm text-green-900">{atividade.finalizado_por_nome}</p>
                        <p className="text-xs text-green-700">{atividade.finalizado_por_id_funcionario}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Justificativa de reversão se existir */}
            {atividade.justificativa_reversao && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-yellow-800 mb-1">Justificativa de Reversão:</p>
                      <p className="text-sm text-yellow-900">{atividade.justificativa_reversao}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {atividade.observacoes && (
              <div className="mt-2">
                <span className="font-semibold text-gray-700">Observações:</span>
                <p className="text-gray-600 mt-1">{atividade.observacoes}</p>
              </div>
            )}

            {atividade.formulario_anexo && (
              <div className="mt-3 bg-blue-50 p-3 rounded border border-blue-200">
                <span className="font-semibold text-gray-700 text-sm">
                  {isDefinicaoObraCivil() ? 'Arquivo da Obra Civil:' : 'Formulário Anexado:'}
                </span>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">{atividade.formulario_anexo.filename}</span>
                  </div>
                  <button
                    onClick={() => setShowArquivoModal(true)}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Visualizar
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowEditModal(true)}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* Modal de Justificativa para Reversão */}
      <Modal
        isOpen={showJustificativaModal}
        onClose={() => {
          setShowJustificativaModal(false);
          setJustificativa('');
          setAcaoPendente(null);
        }}
        title="Justificativa Necessária"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">Atenção: Reversão de Status</h4>
                <p className="text-sm text-yellow-700">
                  Você está revertendo o status da atividade de <strong>{atividade.status}</strong> para{' '}
                  <strong>{atividade.status === 'CONCLUÍDA' ? 'EM ANDAMENTO' : 'A REALIZAR'}</strong>.
                  Por favor, informe o motivo desta reversão.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="justificativa" className="block text-sm font-semibold text-gray-700 mb-2">
              Justificativa *
            </label>
            <textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da reversão..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowJustificativaModal(false);
                setJustificativa('');
                setAcaoPendente(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarReversao}
              disabled={!justificativa.trim() || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Revertendo...' : 'Confirmar Reversão'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Data e Hora */}
      <Modal
        isOpen={showDataHoraModal}
        onClose={() => {
          setShowDataHoraModal(false);
          setDataHora('');
          setArquivo(null);
          setAcaoPendente(null);
        }}
        title={acaoPendente === 'iniciar' ? 'Informar Data/Hora de Início' : 'Informar Data/Hora de Término'}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">
                  {acaoPendente === 'iniciar' ? 'Início da Atividade' : 'Término da Atividade'}
                </h4>
                <p className="text-sm text-blue-700">
                  {acaoPendente === 'iniciar'
                    ? 'Informe a data e hora em que a atividade foi iniciada.'
                    : 'Informe a data e hora em que a atividade foi concluída.'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="dataHora" className="block text-sm font-semibold text-gray-700 mb-2">
              Data e Hora *
            </label>
            <input
              type="datetime-local"
              id="dataHora"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              required
            />
          </div>

          {/* Campo de upload para Definição da Obra Civil */}
          {isDefinicaoObraCivil() && acaoPendente === 'iniciar' && (
            <div>
              <label htmlFor="arquivoObraCivil" className="block text-sm font-semibold text-gray-700 mb-2">
                Arquivo da Obra Civil *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="arquivoObraCivil"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleArquivoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center py-3"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {arquivo ? arquivo.name : 'Clique para selecionar um arquivo'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (máx. 10MB)</span>
                </button>
              </div>
              {arquivo && (
                <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-800">{arquivo.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArquivo(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowDataHoraModal(false);
                setDataHora('');
                setArquivo(null);
                setAcaoPendente(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarDataHora}
              disabled={!dataHora.trim() || loading || uploadingFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingFile ? 'Enviando arquivo...' : loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Formulário Reunião de Start */}
      {isReuniaoStart() && (
        <Modal
          isOpen={showReuniaoModal}
          onClose={() => setShowReuniaoModal(false)}
          title={`Formulário - ${atividade.atividade}`}
        >
          <FormularioReuniao
            opd={atividade.numero_opd}
            cliente={opdCliente || 'N/A'}
            atividadeId={atividade.id}
            onSubmit={handleReuniaoFormSuccess}
            onCancel={() => setShowReuniaoModal(false)}
          />
        </Modal>
      )}

      {/* Modal de Formulário Preparação */}
      {isPreparacao() && (
        <Modal
          isOpen={showPreparacaoModal}
          onClose={() => setShowPreparacaoModal(false)}
          title={`Formulário - ${atividade.atividade}`}
        >
          <FormularioPreparacao
            opd={atividade.numero_opd}
            cliente={opdCliente || 'N/A'}
            atividadeId={atividade.id}
            onSubmit={handlePreparacaoFormSuccess}
            onCancel={() => setShowPreparacaoModal(false)}
          />
        </Modal>
      )}

      {/* Modal de Formulário Liberação e Embarque */}
      {isLiberacaoEmbarque() && (
        <Modal
          isOpen={showLiberacaoModal}
          onClose={() => setShowLiberacaoModal(false)}
          title={`Formulário - ${atividade.atividade}`}
        >
          <FormularioLiberacaoEmbarque
            opd={atividade.numero_opd}
            cliente={opdCliente || 'N/A'}
            atividadeId={atividade.id}
            onSubmit={handleLiberacaoFormSuccess}
            onCancel={() => setShowLiberacaoModal(false)}
          />
        </Modal>
      )}

      {/* Modal de Visualização de Formulário */}
      {getTipoFormulario() && (
        <ModalVisualizarFormulario
          isOpen={showVisualizarModal}
          onClose={() => setShowVisualizarModal(false)}
          atividadeId={atividade.id}
          numeroOpd={atividade.numero_opd}
          tipoFormulario={getTipoFormulario()!}
        />
      )}

      {/* Modal de Visualização de Arquivo */}
      <ModalVisualizarArquivo
        isOpen={showArquivoModal}
        onClose={() => setShowArquivoModal(false)}
        arquivo={atividade.formulario_anexo}
        titulo={isDefinicaoObraCivil() ? 'Arquivo da Obra Civil' : 'Formulário Anexado'}
      />

    </div>
  );
}
