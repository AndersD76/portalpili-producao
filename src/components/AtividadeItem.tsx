'use client';

import { Atividade, LogAtividade } from '@/types/atividade';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from './Modal';
import AtividadeForm from './AtividadeForm';

// Forms de Instalação
import FormPreparacao from './FormPreparacao';
import FormLiberacaoEmbarque from './FormLiberacaoEmbarque';
import FormDesembarque from './FormDesembarque';
import FormEntrega from './FormEntrega';
import FormReuniaoStart from './FormReuniaoStart';
import FormularioReuniaoStart2 from './FormularioReuniaoStart2';
import FormularioLiberacaoComercial from './FormularioLiberacaoComercial';

// Forms de Produção
import FormularioCorte from './FormularioCorte';
import FormularioSoldaInferior from './FormularioSoldaInferior';
import FormularioBracos from './FormularioBracos';
import FormularioPedestais from './FormularioPedestais';
import FormularioCentralSubconjuntos from './FormularioCentralSubconjuntos';
import FormularioPainelEletrico from './FormularioPainelEletrico';
import FormularioSobPlataforma from './FormularioSobPlataforma';
import FormularioMontagem from './FormularioMontagem';
import FormularioMontagemCalhas from './FormularioMontagemCalhas';
import FormularioMontagemEletricaHidraulica from './FormularioMontagemEletricaHidraulica';
import FormularioMontagemSoldaInferior from './FormularioMontagemSoldaInferior';
import FormularioMontagemHidraulicaSobPlataforma from './FormularioMontagemHidraulicaSobPlataforma';
import FormularioTravadorRodas from './FormularioTravadorRodas';
import FormularioCaixaTravaChassi from './FormularioCaixaTravaChassi';
import FormularioTravaChassi from './FormularioTravaChassi';
import FormularioCavaleteTravaChassi from './FormularioCavaleteTravaChassi';
import FormularioRampas from './FormularioRampas';
import FormularioPintura from './FormularioPintura';
import FormularioExpedicao from './FormularioExpedicao';

// Forms de Coletor
import FormularioColetorMontagemInicial from './FormularioColetorMontagemInicial';
import FormularioColetorCentralHidraulica from './FormularioColetorCentralHidraulica';
import FormularioColetorCiclone from './FormularioColetorCiclone';
import FormularioColetorTuboColeta from './FormularioColetorTuboColeta';
import FormularioColetorColunaInferior from './FormularioColetorColunaInferior';
import FormularioColetorColunaSuperior from './FormularioColetorColunaSuperior';
import FormularioColetorEscadaPlatibanda from './FormularioColetorEscadaPlatibanda';
import FormularioColetorPintura from './FormularioColetorPintura';

// Forms de Controle de Qualidade
import FormularioControleQualidade from './FormularioControleQualidade';
import FormularioControleQualidadeCentral from './FormularioControleQualidadeCentral';
import FormularioControleQualidadeSolda from './FormularioControleQualidadeSolda';
import FormularioControleQualidadeSoldaLado2 from './FormularioControleQualidadeSoldaLado2';

// Forms Extras
import FormularioInstalacao from './FormularioInstalacao';
import FormularioDesembarquePreInstalacao from './FormularioDesembarquePreInstalacao';

// Forms de Documentos
import FormularioObraCivil from './FormularioObraCivil';
import FormularioEngenhariaMecanica from './FormularioEngenhariaMecanica';
import FormularioEngenhariaEletricaHidraulica from './FormularioEngenhariaEletricaHidraulica';
import FormularioRevisaoProjetos from './FormularioRevisaoProjetos';

// Modal de Visualização de Formulário Preenchido
import ModalVisualizarFormulario from './ModalVisualizarFormulario';

interface AtividadeItemProps {
  atividade: Atividade;
  opdCliente?: string;
  onUpdate: (id: number, data: any) => Promise<void>;
  onRefresh: () => void | Promise<void>;
}

// Mapeamento de tipo_formulario para componente
const FORM_COMPONENTS: { [key: string]: React.ComponentType<any> } = {
  // Instalação
  'PREPARACAO': FormPreparacao,
  'LIBERACAO_EMBARQUE': FormLiberacaoEmbarque,
  'DESEMBARQUE': FormDesembarque,
  'DESEMBARQUE_PRE_INSTALACAO': FormularioDesembarquePreInstalacao,
  'ENTREGA': FormEntrega,
  'REUNIAO_START': FormReuniaoStart,
  'REUNIAO_START_2': FormularioReuniaoStart2,
  'LIBERACAO_COMERCIAL': FormularioLiberacaoComercial,
  'INSTALACAO': FormularioInstalacao,

  // Produção
  'CORTE': FormularioCorte,
  'SOLDA_INFERIOR': FormularioSoldaInferior,
  'BRACOS': FormularioBracos,
  'PEDESTAIS': FormularioPedestais,
  'CENTRAL_SUBCONJUNTOS': FormularioCentralSubconjuntos,
  'PAINEL_ELETRICO': FormularioPainelEletrico,
  'SOB_PLATAFORMA': FormularioSobPlataforma,
  'MONTAGEM': FormularioMontagem,
  'MONTAGEM_CALHAS': FormularioMontagemCalhas,
  'MONTAGEM_ELETRICA_HIDRAULICA': FormularioMontagemEletricaHidraulica,
  'MONTAGEM_SOLDA_INFERIOR': FormularioMontagemSoldaInferior,
  'MONTAGEM_HIDRAULICA_SOB_PLATAFORMA': FormularioMontagemHidraulicaSobPlataforma,
  'TRAVADOR_RODAS': FormularioTravadorRodas,
  'CAIXA_TRAVA_CHASSI': FormularioCaixaTravaChassi,
  'TRAVA_CHASSI': FormularioTravaChassi,
  'CAVALETE_TRAVA_CHASSI': FormularioCavaleteTravaChassi,
  'RAMPAS': FormularioRampas,
  'PINTURA': FormularioPintura,
  'EXPEDICAO': FormularioExpedicao,

  // Coletor
  'COLETOR_MONTAGEM_INICIAL': FormularioColetorMontagemInicial,
  'COLETOR_CENTRAL_HIDRAULICA': FormularioColetorCentralHidraulica,
  'COLETOR_CICLONE': FormularioColetorCiclone,
  'COLETOR_TUBO_COLETA': FormularioColetorTuboColeta,
  'COLETOR_COLUNA_INFERIOR': FormularioColetorColunaInferior,
  'COLETOR_COLUNA_SUPERIOR': FormularioColetorColunaSuperior,
  'COLETOR_ESCADA_PLATIBANDA': FormularioColetorEscadaPlatibanda,
  'COLETOR_PINTURA': FormularioColetorPintura,

  // Controle de Qualidade
  'CONTROLE_QUALIDADE': FormularioControleQualidade,
  'CONTROLE_QUALIDADE_CENTRAL': FormularioControleQualidadeCentral,
  'CONTROLE_QUALIDADE_SOLDA': FormularioControleQualidadeSolda,
  'CONTROLE_QUALIDADE_SOLDA_LADO2': FormularioControleQualidadeSoldaLado2,

  // Documentos
  'OBRA_CIVIL': FormularioObraCivil,
  'ENGENHARIA_MECANICA': FormularioEngenhariaMecanica,
  'ENGENHARIA_ELETRICA_HIDRAULICA': FormularioEngenhariaEletricaHidraulica,
  'REVISAO_PROJETOS': FormularioRevisaoProjetos,
};

// Mapeamento de nome de atividade para tipo de formulário (fallback)
const ATIVIDADE_TO_FORM: { [key: string]: string } = {
  'PREPARAÇÃO': 'PREPARACAO',
  'LIBERAÇÃO E EMBARQUE': 'LIBERACAO_EMBARQUE',
  'DESEMBARQUE E PRÉ-INSTALAÇÃO': 'DESEMBARQUE_PRE_INSTALACAO',
  'ENTREGA': 'ENTREGA',
  'REUNIÃO DE START 1': 'REUNIAO_START',
  'REUNIÃO DE START 2': 'REUNIAO_START_2',
  'LIBERAÇÃO COMERCIAL': 'LIBERACAO_COMERCIAL',
  'INSTALAÇÃO': 'INSTALACAO',
  'CORTE': 'CORTE',
  'SOLDA INFERIOR': 'SOLDA_INFERIOR',
  'BRAÇOS': 'BRACOS',
  'PEDESTAIS': 'PEDESTAIS',
  'CENTRAL/SUBCONJUNTOS': 'CENTRAL_SUBCONJUNTOS',
  'PAINEL ELÉTRICO': 'PAINEL_ELETRICO',
  'SOB PLATAFORMA': 'SOB_PLATAFORMA',
  'MONTAGEM': 'MONTAGEM',
  'MONTAGEM CALHAS': 'MONTAGEM_CALHAS',
  'MONTAGEM ELÉTRICA/HIDRÁULICA': 'MONTAGEM_ELETRICA_HIDRAULICA',
  'MONTAGEM SOLDA INFERIOR': 'MONTAGEM_SOLDA_INFERIOR',
  'MONTAGEM HIDRÁULICA SOB PLATAFORMA': 'MONTAGEM_HIDRAULICA_SOB_PLATAFORMA',
  'TRAVADOR DE RODAS': 'TRAVADOR_RODAS',
  'CAIXA TRAVA CHASSI': 'CAIXA_TRAVA_CHASSI',
  'TRAVA CHASSI': 'TRAVA_CHASSI',
  'CAVALETE TRAVA CHASSI': 'CAVALETE_TRAVA_CHASSI',
  'RAMPAS': 'RAMPAS',
  'PINTURA': 'PINTURA',
  'EXPEDIÇÃO': 'EXPEDICAO',
  // Coletor - formato "COLETOR - X"
  'COLETOR - MONTAGEM INICIAL': 'COLETOR_MONTAGEM_INICIAL',
  'COLETOR - CENTRAL HIDRÁULICA': 'COLETOR_CENTRAL_HIDRAULICA',
  'COLETOR - CICLONE': 'COLETOR_CICLONE',
  'COLETOR - TUBO COLETA': 'COLETOR_TUBO_COLETA',
  'COLETOR - COLUNA INFERIOR': 'COLETOR_COLUNA_INFERIOR',
  'COLETOR - COLUNA SUPERIOR': 'COLETOR_COLUNA_SUPERIOR',
  'COLETOR - ESCADA PLATIBANDA': 'COLETOR_ESCADA_PLATIBANDA',
  'COLETOR - PINTURA': 'COLETOR_PINTURA',
  // Coletor - formato alternativo
  'MONTAGEM INICIAL (COLETOR)': 'COLETOR_MONTAGEM_INICIAL',
  'CENTRAL HIDRÁULICA (COLETOR)': 'COLETOR_CENTRAL_HIDRAULICA',
  'CICLONE (COLETOR)': 'COLETOR_CICLONE',
  'TUBO DE COLETA (COLETOR)': 'COLETOR_TUBO_COLETA',
  'COLUNA INFERIOR (COLETOR)': 'COLETOR_COLUNA_INFERIOR',
  'COLUNA SUPERIOR (COLETOR)': 'COLETOR_COLUNA_SUPERIOR',
  'ESCADA/PLATIBANDA (COLETOR)': 'COLETOR_ESCADA_PLATIBANDA',
  'PINTURA (COLETOR)': 'COLETOR_PINTURA',
  // QC
  'CONTROLE DE QUALIDADE': 'CONTROLE_QUALIDADE',
  'QC - CENTRAL': 'CONTROLE_QUALIDADE_CENTRAL',
  'QC - SOLDA': 'CONTROLE_QUALIDADE_SOLDA',
  'QC - SOLDA LADO 2': 'CONTROLE_QUALIDADE_SOLDA_LADO2',
  // Documentos
  'DEFINIÇÃO DA OBRA CIVIL': 'OBRA_CIVIL',
  'ENGENHARIA (MEC)': 'ENGENHARIA_MECANICA',
  'ENGENHARIA (ELE/HID)': 'ENGENHARIA_ELETRICA_HIDRAULICA',
  'REVISÃO FINAL DE PROJETOS': 'REVISAO_PROJETOS',
};

export default function AtividadeItem({ atividade, onUpdate, onRefresh }: AtividadeItemProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewFormModal, setShowViewFormModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  // Timer atualizado a cada segundo quando atividade está em andamento
  useEffect(() => {
    if (atividade.status !== 'EM ANDAMENTO') {
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
        toast.error(result.error || 'Erro ao executar acao');
      }
    } catch (error) {
      console.error('Erro ao controlar timer:', error);
      toast.error('Erro ao controlar timer');
    } finally {
      setLoading(false);
    }
  };

  // Determinar qual formulário usar
  const getTipoFormulario = (): string | null => {
    // Primeiro verificar se há tipo_formulario definido na atividade
    if ((atividade as any).tipo_formulario) {
      return (atividade as any).tipo_formulario;
    }
    // Fallback para mapeamento por nome da atividade
    return ATIVIDADE_TO_FORM[atividade.atividade] || null;
  };

  const tipoFormulario = getTipoFormulario();
  const FormComponent = tipoFormulario ? FORM_COMPONENTS[tipoFormulario] : null;
  const requerFormulario = (atividade as any).requer_formulario || FormComponent !== null;

  const handleFinalizarComFormulario = () => {
    if (FormComponent) {
      setShowFormModal(true);
    } else {
      handleTimerAction('FINALIZAR');
    }
  };

  // Parse logs
  const logs: LogAtividade[] = atividade.logs
    ? (typeof atividade.logs === 'string' ? JSON.parse(atividade.logs) : atividade.logs)
    : [];

  // Renderizar formulário dinâmico
  const renderFormulario = () => {
    if (!FormComponent) return null;

    const commonProps = {
      numeroOpd: atividade.numero_opd,
      opd: atividade.numero_opd,
      onSubmit: async () => {
        await handleTimerAction('FINALIZAR');
        setShowFormModal(false);
      },
      onCancel: () => setShowFormModal(false),
    };

    // Alguns forms precisam de props extras
    if (tipoFormulario === 'LIBERACAO_COMERCIAL') {
      return (
        <FormComponent
          {...commonProps}
          cliente={atividade.responsavel || ''}
          atividadeId={atividade.id}
        />
      );
    }

    // Formulários de documentos precisam de atividadeId
    if (tipoFormulario === 'OBRA_CIVIL' || tipoFormulario === 'ENGENHARIA_MECANICA' || tipoFormulario === 'ENGENHARIA_ELETRICA_HIDRAULICA' || tipoFormulario === 'REVISAO_PROJETOS') {
      return (
        <FormComponent
          {...commonProps}
          atividadeId={atividade.id}
        />
      );
    }

    // Formulário Start 2 precisa de cliente e atividadeId
    if (tipoFormulario === 'REUNIAO_START_2') {
      return (
        <FormComponent
          {...commonProps}
          cliente={(atividade as any).cliente || ''}
          atividadeId={atividade.id}
        />
      );
    }

    return <FormComponent {...commonProps} />;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition">
      <div
        className="p-3 sm:p-4 cursor-pointer"
        onClick={() => {
          // Se tem formulário e a atividade não está "A REALIZAR", abre o formulário direto
          if (FormComponent && atividade.status !== 'A REALIZAR') {
            setShowFormModal(true);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            {/* Botões de controle do Timer */}
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {atividade.status === 'A REALIZAR' && (
                <button
                  onClick={() => handleTimerAction('INICIAR')}
                  disabled={loading}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition disabled:opacity-50"
                  title="Iniciar"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              )}

              {atividade.status === 'EM ANDAMENTO' && (
                <>
                  <button
                    onClick={() => handleTimerAction('PAUSAR')}
                    disabled={loading}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Pausar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => requerFormulario && FormComponent ? handleFinalizarComFormulario() : handleTimerAction('FINALIZAR')}
                    disabled={loading}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
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
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Retomar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => requerFormulario && FormComponent ? handleFinalizarComFormulario() : handleTimerAction('FINALIZAR')}
                    disabled={loading}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
                    title="Finalizar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                  </button>
                </>
              )}

              {atividade.status === 'CONCLUÍDA' && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">{atividade.atividade}</h3>
                {FormComponent && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Formulário
                  </span>
                )}
                {/* Badge de Não Conformidade */}
                {(atividade as any).tem_nao_conformidade && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    NC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mt-1">
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

          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Timer Display - só mostra se em andamento, pausada ou se tem tempo > 0 */}
            {(atividade.status === 'EM ANDAMENTO' || atividade.status === 'PAUSADA' || (atividade.tempo_acumulado_segundos !== null && atividade.tempo_acumulado_segundos > 0)) && (
              <div className={`font-mono text-sm sm:text-lg font-bold ${
                atividade.status === 'EM ANDAMENTO' ? 'text-yellow-600' :
                atividade.status === 'PAUSADA' ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {timerDisplay}
              </div>
            )}

            {/* Botão de visualizar formulário preenchido - aparece quando atividade concluída com formulário */}
            {atividade.status === 'CONCLUÍDA' && FormComponent && tipoFormulario && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewFormModal(true);
                }}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                title="Visualizar formulário preenchido"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}

            <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(atividade.status)}`}>
              <span className="hidden sm:inline">{atividade.status}</span>
              <span className="sm:hidden">{atividade.status === 'EM ANDAMENTO' ? 'ANDAMENTO' : atividade.status === 'A REALIZAR' ? 'REALIZAR' : atividade.status}</span>
            </div>

            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
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
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="pt-3 sm:pt-4 border-t border-gray-200">
            {/* Detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
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

            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2">
              {/* Botão para abrir formulário manualmente */}
              {FormComponent && atividade.status !== 'A REALIZAR' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFormModal(true);
                  }}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Formulário</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center space-x-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
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

      {/* Modal de Formulário Dinâmico */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={`Formulário - ${atividade.atividade}`}
      >
        {renderFormulario()}
      </Modal>

      {/* Modal de Visualização de Formulário Preenchido */}
      {tipoFormulario && (
        <ModalVisualizarFormulario
          isOpen={showViewFormModal}
          onClose={() => setShowViewFormModal(false)}
          atividadeId={atividade.id}
          numeroOpd={atividade.numero_opd}
          tipoFormulario={tipoFormulario}
        />
      )}
    </div>
  );
}
