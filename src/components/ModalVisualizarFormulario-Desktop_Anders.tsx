'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { FormularioPreenchido, TipoFormulario } from '@/types/atividade';

interface ModalVisualizarFormularioProps {
  isOpen: boolean;
  onClose: () => void;
  atividadeId: number;
  numeroOpd: string;
  tipoFormulario: string;
}

export default function ModalVisualizarFormulario({
  isOpen,
  onClose,
  atividadeId,
  numeroOpd,
  tipoFormulario
}: ModalVisualizarFormularioProps) {
  const [formulario, setFormulario] = useState<FormularioPreenchido | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      carregarFormulario();
    }
  }, [isOpen, atividadeId]);

  // Mapeamento de tipo de formulário para endpoint da API
  const ENDPOINT_MAP: Record<string, string> = {
    // Instalação
    'REUNIAO_START': 'formularios-reuniao',
    'REUNIAO_START_2': 'formularios-start2',
    'PREPARACAO': 'formularios-preparacao',
    'LIBERACAO_EMBARQUE': 'formularios-liberacao-embarque',
    'LIBERACAO_COMERCIAL': 'formularios-liberacao-comercial',
    'DESEMBARQUE': 'formularios-desembarque',
    'DESEMBARQUE_PRE_INSTALACAO': 'formularios-desembarque',
    'ENTREGA': 'formularios-entrega',
    'INSTALACAO': 'formularios-instalacao',

    // Produção - Tombador
    'CORTE': 'formularios-corte',
    'SOLDA_INFERIOR': 'formularios-solda-inferior',
    'BRACOS': 'formularios-bracos',
    'PEDESTAIS': 'formularios-pedestais',
    'CENTRAL_SUBCONJUNTOS': 'formularios-central-subconjuntos',
    'PAINEL_ELETRICO': 'formularios-painel-eletrico',
    'SOB_PLATAFORMA': 'formularios-sob-plataforma',
    'MONTAGEM': 'formularios-montagem',
    'MONTAGEM_CALHAS': 'formularios-montagem-calhas',
    'MONTAGEM_ELETRICA_HIDRAULICA': 'formularios-montagem-eletrica-hidraulica',
    'MONTAGEM_SOLDA_INFERIOR': 'formularios-montagem-solda-inferior',
    'MONTAGEM_HIDRAULICA_SOB_PLATAFORMA': 'formularios-montagem-hidraulica-sob-plataforma',
    'TRAVADOR_RODAS': 'formularios-travador-rodas',
    'CAIXA_TRAVA_CHASSI': 'formularios-caixa-trava-chassi',
    'TRAVA_CHASSI': 'formularios-trava-chassi',
    'CAVALETE_TRAVA_CHASSI': 'formularios-cavalete-trava-chassi',
    'RAMPAS': 'formularios-rampas',
    'PINTURA': 'formularios-pintura',
    'EXPEDICAO': 'formularios-expedicao',

    // Produção - Coletor
    'COLETOR_MONTAGEM_INICIAL': 'formularios-coletor-montagem-inicial',
    'COLETOR_CENTRAL_HIDRAULICA': 'formularios-coletor-central-hidraulica',
    'COLETOR_CICLONE': 'formularios-coletor-ciclone',
    'COLETOR_TUBO_COLETA': 'formularios-coletor-tubo-coleta',
    'COLETOR_COLUNA_INFERIOR': 'formularios-coletor-coluna-inferior',
    'COLETOR_COLUNA_SUPERIOR': 'formularios-coletor-coluna-superior',
    'COLETOR_ESCADA_PLATIBANDA': 'formularios-coletor-escada-platibanda',
    'COLETOR_PINTURA': 'formularios-coletor-pintura',

    // Controle de Qualidade (prefixo CONTROLE_QUALIDADE_)
    'CONTROLE_QUALIDADE_CORTE': 'formularios-corte',
    'CONTROLE_QUALIDADE_MONTAGEM': 'formularios-montagem',
    'CONTROLE_QUALIDADE_CENTRAL': 'formularios-controle-qualidade-central',
    'CONTROLE_QUALIDADE_SOLDA': 'formularios-controle-qualidade-solda',
    'CONTROLE_QUALIDADE_TRAVADOR_RODAS': 'formularios-travador-rodas',
    'CONTROLE_QUALIDADE_CAIXA_TRAVA_CHASSI': 'formularios-caixa-trava-chassi',
    'CONTROLE_QUALIDADE_TRAVA_CHASSI': 'formularios-trava-chassi',
    'CONTROLE_QUALIDADE_CAVALETE_TRAVA_CHASSI': 'formularios-cavalete-trava-chassi',
    'CONTROLE_QUALIDADE_CENTRAL_SUBCONJUNTOS': 'formularios-central-subconjuntos',
    'CONTROLE_QUALIDADE_PAINEL_ELETRICO': 'formularios-painel-eletrico',
    'CONTROLE_QUALIDADE_PEDESTAIS': 'formularios-pedestais',
    'CONTROLE_QUALIDADE_SOB_PLATAFORMA': 'formularios-sob-plataforma',
    'CONTROLE_QUALIDADE_SOLDA_INFERIOR': 'formularios-solda-inferior',
    'CONTROLE_QUALIDADE_BRACOS': 'formularios-bracos',
    'CONTROLE_QUALIDADE_RAMPAS': 'formularios-rampas',
    'CONTROLE_QUALIDADE_PINTURA': 'formularios-pintura',
    'CONTROLE_QUALIDADE_MONTAGEM_HIDRAULICA_SOB_PLATAFORMA': 'formularios-montagem-hidraulica-sob-plataforma',
    'CONTROLE_QUALIDADE_EXPEDICAO': 'formularios-expedicao',
    'CONTROLE_QUALIDADE_COLETOR_MONTAGEM_INICIAL': 'formularios-coletor-montagem-inicial',
    'CONTROLE_QUALIDADE_COLETOR_CENTRAL_HIDRAULICA': 'formularios-coletor-central-hidraulica',
    'CONTROLE_QUALIDADE_COLETOR_CICLONE': 'formularios-coletor-ciclone',
    'CONTROLE_QUALIDADE_COLETOR_TUBO_COLETA': 'formularios-coletor-tubo-coleta',
    'CONTROLE_QUALIDADE_COLETOR_COLUNA_INFERIOR': 'formularios-coletor-coluna-inferior',
    'CONTROLE_QUALIDADE_COLETOR_COLUNA_SUPERIOR': 'formularios-coletor-coluna-superior',
    'CONTROLE_QUALIDADE_COLETOR_ESCADA_PLATIBANDA': 'formularios-coletor-escada-platibanda',
    'CONTROLE_QUALIDADE_COLETOR_PINTURA': 'formularios-coletor-pintura',

    // Documentos
    'OBRA_CIVIL': 'formularios-documentos',
    'ENGENHARIA_MECANICA': 'formularios-documentos',
    'ENGENHARIA_ELETRICA_HIDRAULICA': 'formularios-documentos',
    'REVISAO_PROJETOS': 'formularios-revisao-projetos',
  };

  const carregarFormulario = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar o endpoint no mapeamento
      const apiEndpoint = ENDPOINT_MAP[tipoFormulario];

      if (!apiEndpoint) {
        console.warn('Tipo de formulário não mapeado:', tipoFormulario);
        setError(`Tipo de formulário não suportado: ${tipoFormulario}`);
        setLoading(false);
        return;
      }

      // Para formulários de documentos, adiciona o tipo como parâmetro
      let endpoint = `/api/${apiEndpoint}/${numeroOpd}?atividade_id=${atividadeId}`;
      if (['OBRA_CIVIL', 'ENGENHARIA_MECANICA', 'ENGENHARIA_ELETRICA_HIDRAULICA'].includes(tipoFormulario)) {
        endpoint += `&tipo=${tipoFormulario}`;
      }
      console.log('Carregando formulário:', endpoint);

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        setFormulario(result.data);
      } else {
        setError(result.error || 'Formulário não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregar formulário');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderReuniaoStart = () => {
    if (!formulario || !formulario.dados_formulario) return null;

    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    return (
      <div className="space-y-6">
        {/* INFORMAÇÕES ESTRUTURAIS */}
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES ESTRUTURAIS</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Equipamento:</span>
              <p>{dados.equipamento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data de Entrega:</span>
              <p>{dados.data_entrega ? new Date(dados.data_entrega).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Vigas:</span>
              <p>{dados.vigas || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Cilindros (Tipo):</span>
              <p>{dados.cilindros_tipo || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Cilindros (Estágios):</span>
              <p>{dados.cilindros_estagios || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Moldura:</span>
              <p>{dados.moldura || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Calhas Laterais:</span>
              <p>{dados.calhas_laterais || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Calhas Inferiores:</span>
              <p>{dados.calhas_inferiores || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Qtd de Trava Rodas:</span>
              <p>{dados.qtd_trava_rodas || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Qtd de Trava Chassi:</span>
              <p>{dados.qtd_trava_chassis || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Modelo de Trava Chassi:</span>
              <p>{dados.modelo_trava_chassis || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Trava Pino:</span>
              <p>{dados.trava_pino || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Rodas de Deslocamento:</span>
              <p>{dados.rodas_deslocamento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Braços:</span>
              <p>{dados.bracos || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Qtd de Dentes da Cinta:</span>
              <p>{dados.qtd_dentes_cinta || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Calhas Montadas para Transporte:</span>
              <p>{dados.calhas_montadas_transporte || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data de Entrega de Chumbadores:</span>
              <p>{dados.data_entrega_chumbadores ? new Date(dados.data_entrega_chumbadores).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES DA CENTRAL E PAINEL */}
        <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
          <h4 className="font-bold text-lg mb-4 text-green-900">INFORMAÇÕES DA CENTRAL E PAINEL</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Voltagem do Cliente:</span>
              <p>{dados.voltagem_cliente || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Tipo de Acionamento:</span>
              <p>{dados.tipo_acionamento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Sensor Moega Cheia:</span>
              <p>{dados.sensor_moega_cheia || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Sensor 40°:</span>
              <p>{dados.sensor_40 || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Sensor Trava Roda Aberto:</span>
              <p>{dados.sensor_trava_roda_aberto || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Relé de Segurança:</span>
              <p>{dados.rele_seguranca || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Pedestal do Motorista:</span>
              <p>{dados.pedestal_motorista || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Óleo Especial:</span>
              <p>{dados.oleo_especial || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Central Auxiliar:</span>
              <p>{dados.central_auxiliar || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Calço de Segurança:</span>
              <p>{dados.calco_seguranca || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Espera Sensor Portão:</span>
              <p>{dados.espera_sensor_portao || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Kit Descida Rápida:</span>
              <p>{dados.kit_descida_rapida || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Corte Central:</span>
              <p>{dados.prazo_corte_central ? new Date(dados.prazo_corte_central).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Dobra Central:</span>
              <p>{dados.prazo_dobra_central ? new Date(dados.prazo_dobra_central).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Solda Central:</span>
              <p>{dados.prazo_solda_central ? new Date(dados.prazo_solda_central).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Eng Planos Central:</span>
              <p>{dados.prazo_eng_planos_central ? new Date(dados.prazo_eng_planos_central).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Outras Informações:</span>
              <p className="whitespace-pre-wrap">{dados.outras_informacoes || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES DE CILINDROS */}
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-bold text-lg mb-4 text-purple-900">INFORMAÇÕES DE CILINDROS</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Trava Roda:</span>
              <p>{dados.cilindros_trava_roda || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Trava Chassi (Gaveta):</span>
              <p>{dados.cilindros_trava_chassis_gaveta || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Trava Chassi (Telesc Articulação):</span>
              <p>{dados.cilindros_trava_chassis_telesc_articulacao || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Trava Chassi (Telesc Elevação):</span>
              <p>{dados.cilindros_trava_chassis_telesc_elevacao || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Rodas:</span>
              <p>{dados.cilindros_rodas || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Rampas:</span>
              <p>{dados.cilindros_rampas || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Freio:</span>
              <p>{dados.cilindros_freio || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Abertura Trava Pino:</span>
              <p>{dados.cilindros_abertura_trava_pino || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Cabeçote Trava Pino:</span>
              <p>{dados.cilindros_cabecote_trava_pino || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data Máxima de Entrega:</span>
              <p>{dados.data_max_entrega_cilindros ? new Date(dados.data_max_entrega_cilindros).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES IN LOCO */}
        <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-bold text-lg mb-4 text-yellow-900">INFORMAÇÕES IN LOCO</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Obra Civil Definida:</span>
              <p>{dados.obra_civil_definida || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo para Definição:</span>
              <p>{dados.prazo_definicao_obra ? new Date(dados.prazo_definicao_obra).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Fixação de Pedestais:</span>
              <p>{dados.fixacao_pedestais || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Localização da Central:</span>
              <p>{dados.localizacao_central === 'OUTRA' && dados.localizacao_central_outra ? dados.localizacao_central_outra : dados.localizacao_central || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Suporte Ripas Laterais:</span>
              <p>{dados.suporte_ripas_laterais || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Suporte Tubulação da Moega:</span>
              <p>{dados.suporte_tubulacao_moega || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Conj. de Munhões:</span>
              <p>{dados.conj_munhoes || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Qtd de Munhões:</span>
              <p>{dados.qtd_munhoes || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Enclausuramento:</span>
              <p>{dados.enclausuramento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Fabricar Portões:</span>
              <p>{dados.fabricar_portoes || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data Máxima Montagem In Loco:</span>
              <p>{dados.data_max_montagem_loco ? new Date(dados.data_max_montagem_loco).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Informações Adicionais:</span>
              <p className="whitespace-pre-wrap">{dados.info_adicional_loco || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES SOB PLATAFORMA */}
        <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
          <h4 className="font-bold text-lg mb-4 text-orange-900">INFORMAÇÕES SOB PLATAFORMA</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Hidráulica:</span>
              <p>{dados.hidraulica || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Passagem:</span>
              <p>{dados.passagem || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data de Início de Montagem:</span>
              <p>{dados.data_inicio_montagem ? new Date(dados.data_inicio_montagem).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* PRAZO PARA LIBERAÇÕES */}
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <h4 className="font-bold text-lg mb-4 text-red-900">PRAZO PARA LIBERAÇÕES</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Prazo Estrutura:</span>
              <p>{dados.prazo_estrutura ? new Date(dados.prazo_estrutura).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Central:</span>
              <p>{dados.prazo_central ? new Date(dados.prazo_central).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Painel:</span>
              <p>{dados.prazo_painel ? new Date(dados.prazo_painel).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo In Loco:</span>
              <p>{dados.prazo_in_loco ? new Date(dados.prazo_in_loco).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Prazo Sob Plataforma:</span>
              <p>{dados.prazo_sob_plataforma ? new Date(dados.prazo_sob_plataforma).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreparacao = () => {
    if (!formulario || !formulario.dados_formulario) return null;

    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    const renderAnexos = (anexos: any[], titulo: string) => {
      if (!anexos || anexos.length === 0) return null;

      return (
        <div className="mt-2">
          <p className="text-xs font-semibold text-gray-600 mb-1">{titulo}:</p>
          <div className="space-y-1">
            {anexos.map((arquivo, index) => (
              <a
                key={index}
                href={arquivo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{arquivo.filename}</span>
              </a>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Dados Iniciais */}
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <h4 className="font-bold text-lg mb-4 text-blue-900">DADOS INICIAIS</h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-semibold">Número da OPD:</span>
              <p>{dados.numero_opd || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Nome do cliente:</span>
              <p>{dados.nome_cliente || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Modelo do equipamento:</span>
              <p>{dados.modelo_equipamento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Local de instalação (Cidade - UF):</span>
              <p>{dados.cidade_uf || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Data prevista para início da instalação:</span>
              <p>{dados.data_prevista_inicio ? new Date(dados.data_prevista_inicio).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Técnicos designados:</span>
              <p className="whitespace-pre-wrap">{dados.tecnicos_designados || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Documentos Obrigatórios */}
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <h4 className="font-bold text-lg mb-4 text-red-900">DOCUMENTOS OBRIGATÓRIOS</h4>
          <div className="space-y-3">
            {renderAnexos(dados.doc_liberacao_montagem, 'Documentos de Liberação de Montagem')}
            {renderAnexos(dados.esquema_eletrico, 'Esquema Elétrico')}
            {renderAnexos(dados.esquema_hidraulico, 'Esquema Hidráulico')}
            {renderAnexos(dados.projeto_executivo, 'Projeto Executivo')}
            {renderAnexos(dados.projeto_civil, 'Projeto Civil')}
          </div>
        </div>
      </div>
    );
  };

  const renderLiberacaoEmbarque = () => {
    if (!formulario || !formulario.dados_formulario) return null;

    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    const renderResposta = (valor: string, outroValor?: string) => {
      if (valor === 'Outro' && outroValor) {
        return <span className="text-gray-900">Outro: {outroValor}</span>;
      }
      return <span className={valor === 'Sim' ? 'text-green-700 font-semibold' : valor === 'Não' ? 'text-red-700 font-semibold' : 'text-gray-900'}>{valor || 'N/A'}</span>;
    };

    const renderImagens = (imagens: any[], titulo: string) => {
      if (!imagens || imagens.length === 0) return null;

      return (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">{titulo}:</p>
          <div className="space-y-2">
            {imagens.map((imagem, index) => (
              <a
                key={index}
                href={imagem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{imagem.filename}</span>
              </a>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* DOCUMENTAÇÃO */}
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <h4 className="font-bold text-lg mb-4 text-blue-900">DOCUMENTAÇÃO</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">1. A nota fiscal e o romaneio estão presentes, foram conferidos e estão corretos?</span>
              <p className="mt-1">{renderResposta(dados.nota_fiscal_romaneio, dados.nota_fiscal_romaneio_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">2. O check-list final está completamente preenchido e está assinado?</span>
              <p className="mt-1">{renderResposta(dados.checklist_completo, dados.checklist_completo_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">3. O manual técnico e o certificado de garantia foram anexados?</span>
              <p className="mt-1">{renderResposta(dados.manual_certificado, dados.manual_certificado_outro)}</p>
            </div>
          </div>
        </div>

        {/* ESTRUTURA MECÂNICA */}
        <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
          <h4 className="font-bold text-lg mb-4 text-green-900">ESTRUTURA MECÂNICA</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">4. Foi conferido a fixação de partes móveis (trava de segurança, cilindros recolhidos, plataforma travada)?</span>
              <p className="mt-1">{renderResposta(dados.fixacao_partes_moveis, dados.fixacao_partes_moveis_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">5. Foi conferido o aperto dos parafusos estruturais principais?</span>
              <p className="mt-1">{renderResposta(dados.aperto_parafusos, dados.aperto_parafusos_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">6. Foi verificado se não há peças soltas, batentes, dobradiças ou pinos desalinhados?</span>
              <p className="mt-1">{renderResposta(dados.pecas_soltas, dados.pecas_soltas_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">7. Todas as superfícies pintadas foram protegidas com lonas ou espuma?</span>
              <p className="mt-1">{renderResposta(dados.superficies_protegidas, dados.superficies_protegidas_outro)}</p>
            </div>
            {renderImagens(dados.imagem_superficies, '8. Imagem das superfícies protegidas')}
          </div>
        </div>

        {/* SISTEMA HIDRÁULICO */}
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-bold text-lg mb-4 text-purple-900">SISTEMA HIDRÁULICO</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">9. O nível do óleo foi verificado?</span>
              <p className="mt-1">{renderResposta(dados.nivel_oleo, dados.nivel_oleo_outro)}</p>
            </div>
            {renderImagens(dados.imagem_nivel_oleo, '10. Imagem do nível do óleo')}
            <div>
              <span className="font-semibold">11. Os conectores hidráulicos estão com tampas de proteção?</span>
              <p className="mt-1">{renderResposta(dados.conectores_protegidos, dados.conectores_protegidos_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">12. As mangueiras e válvulas foram fixadas e estão protegidas contra vibração?</span>
              <p className="mt-1">{renderResposta(dados.mangueiras_fixadas, dados.mangueiras_fixadas_outro)}</p>
            </div>
          </div>
        </div>

        {/* SISTEMA ELÉTRICO E DE CONTROLE */}
        <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-bold text-lg mb-4 text-yellow-900">SISTEMA ELÉTRICO E DE CONTROLE</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">13. O painel elétrico está devidamente fechado e está identificados?</span>
              <p className="mt-1">{renderResposta(dados.painel_fechado, dados.painel_fechado_outro)}</p>
            </div>
            {renderImagens(dados.imagem_painel, '14. Imagem do painel elétrico')}
            <div>
              <span className="font-semibold">15. Os cabos e chicotes estão protegidos (sem dobras bruscas)?</span>
              <p className="mt-1">{renderResposta(dados.cabos_protegidos, dados.cabos_protegidos_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">16. Os sensores, botões e chicotes estão etiquetados?</span>
              <p className="mt-1">{renderResposta(dados.sensores_etiquetados, dados.sensores_etiquetados_outro)}</p>
            </div>
          </div>
        </div>

        {/* EMBALAGEM E TRANSPORTE */}
        <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
          <h4 className="font-bold text-lg mb-4 text-orange-900">EMBALAGEM E TRANSPORTE</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">17. O equipamento, seus componentes e conjuntos estão fixados com cintas e calços de segurança?</span>
              <p className="mt-1">{renderResposta(dados.equipamento_fixado, dados.equipamento_fixado_outro)}</p>
            </div>
            <div>
              <span className="font-semibold">18. O equipamento, seus componentes e conjuntos estão protegidos contra intempéries (lonas, plástico, etc.)?</span>
              <p className="mt-1">{renderResposta(dados.equipamento_protegido, dados.equipamento_protegido_outro)}</p>
            </div>
            {renderImagens(dados.imagem_carga, '19. Imagem da carga em cima do caminhão')}
          </div>
        </div>

        {/* LIBERAÇÃO */}
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <h4 className="font-bold text-lg mb-4 text-red-900">LIBERAÇÃO</h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-semibold">20. Nome do responsável pela liberação:</span>
              <p>{dados.responsavel_liberacao || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">21. Data da liberação:</span>
              <p>{dados.data_liberacao ? new Date(dados.data_liberacao).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getTitulo = () => {
    const titulos: Record<string, string> = {
      'REUNIAO_START': 'Formulário - Reunião de Start',
      'PREPARACAO': 'Formulário - Preparação',
      'LIBERACAO_EMBARQUE': 'Formulário - Liberação e Embarque',
      'CONTROLE_QUALIDADE_CORTE': 'Controle de Qualidade - Corte',
      'CONTROLE_QUALIDADE_MONTAGEM': 'Controle de Qualidade - Montagem Superior e Esquadro',
      'CONTROLE_QUALIDADE_CENTRAL': 'Controle de Qualidade - Central Hidráulica',
      'CONTROLE_QUALIDADE_SOLDA': 'Controle de Qualidade - Solda Lado 1',
      // Tombadores (I-V)
      'CONTROLE_QUALIDADE_TRAVADOR_RODAS': 'CQ - Travador de Rodas',
      'CONTROLE_QUALIDADE_CAIXA_TRAVA_CHASSI': 'CQ - Caixa Trava Chassi',
      'CONTROLE_QUALIDADE_TRAVA_CHASSI': 'CQ - Trava Chassi',
      'CONTROLE_QUALIDADE_CAVALETE_TRAVA_CHASSI': 'CQ - Cavalete Trava Chassi',
      'CONTROLE_QUALIDADE_CENTRAL_SUBCONJUNTOS': 'CQ - Central e Subconjuntos',
      'CONTROLE_QUALIDADE_PAINEL_ELETRICO': 'CQ - Painel Elétrico',
      'CONTROLE_QUALIDADE_PEDESTAIS': 'CQ - Pedestais',
      'CONTROLE_QUALIDADE_SOB_PLATAFORMA': 'CQ - Sob Plataforma',
      'CONTROLE_QUALIDADE_SOLDA_INFERIOR': 'CQ - Solda Inferior',
      'CONTROLE_QUALIDADE_BRACOS': 'CQ - Braços',
      'CONTROLE_QUALIDADE_RAMPAS': 'CQ - Rampas',
      'CONTROLE_QUALIDADE_PINTURA': 'CQ - Pintura',
      'CONTROLE_QUALIDADE_MONTAGEM_HIDRAULICA_SOB_PLATAFORMA': 'CQ - Montagem Hidráulica Sob Plataforma',
      'CONTROLE_QUALIDADE_EXPEDICAO': 'CQ - Expedição',
      // Coletores (Ac-Hc)
      'CONTROLE_QUALIDADE_COLETOR_MONTAGEM_INICIAL': 'CQ Coletor - Montagem Inicial',
      'CONTROLE_QUALIDADE_COLETOR_CENTRAL_HIDRAULICA': 'CQ Coletor - Central Hidráulica',
      'CONTROLE_QUALIDADE_COLETOR_CICLONE': 'CQ Coletor - Ciclone',
      'CONTROLE_QUALIDADE_COLETOR_TUBO_COLETA': 'CQ Coletor - Tubo de Coleta',
      'CONTROLE_QUALIDADE_COLETOR_COLUNA_INFERIOR': 'CQ Coletor - Coluna Inferior',
      'CONTROLE_QUALIDADE_COLETOR_COLUNA_SUPERIOR': 'CQ Coletor - Coluna Superior',
      'CONTROLE_QUALIDADE_COLETOR_ESCADA_PLATIBANDA': 'CQ Coletor - Escada e Platibanda',
      'CONTROLE_QUALIDADE_COLETOR_PINTURA': 'CQ Coletor - Pintura',
      // Documentos
      'OBRA_CIVIL': 'Documentos da Obra Civil',
      'ENGENHARIA_MECANICA': 'Documentos de Engenharia Mecânica',
      'ENGENHARIA_ELETRICA_HIDRAULICA': 'Documentos de Engenharia Elétrica/Hidráulica',
      'REVISAO_PROJETOS': 'Revisão Final de Projetos',
    };
    return titulos[tipoFormulario] || 'Formulário';
  };

  const renderGenericCQ = () => {
    if (!formulario || !formulario.dados_formulario) return null;
    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    return (
      <div className="space-y-4">
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p className="font-semibold">{getTitulo()}</p>
          <p className="text-sm">Formulário de controle de qualidade preenchido.</p>
        </div>
        {dados.itens && dados.itens.length > 0 && (
          <div className="space-y-2">
            {dados.itens.map((item: any, idx: number) => (
              <div key={idx} className={`p-3 rounded border ${item.conforme ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-sm font-semibold">{item.codigo} - {item.descricao}</p>
                <p className="text-sm mt-1">
                  Status: <span className={item.conforme ? 'text-green-700' : 'text-red-700'}>{item.conforme ? 'Conforme' : 'Não Conforme'}</span>
                </p>
                {item.observacao && <p className="text-sm text-gray-600 mt-1">Obs: {item.observacao}</p>}
              </div>
            ))}
          </div>
        )}
        {(!dados.itens || dados.itens.length === 0) && (
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">Formulário preenchido com sucesso.</p>
          </div>
        )}
      </div>
    );
  };

  const isNovoCQ = () => {
    return tipoFormulario.startsWith('CONTROLE_QUALIDADE_') &&
           !['CONTROLE_QUALIDADE_CORTE', 'CONTROLE_QUALIDADE_MONTAGEM', 'CONTROLE_QUALIDADE_CENTRAL', 'CONTROLE_QUALIDADE_SOLDA'].includes(tipoFormulario);
  };

  const isDocumentos = () => {
    return ['OBRA_CIVIL', 'ENGENHARIA_MECANICA', 'ENGENHARIA_ELETRICA_HIDRAULICA'].includes(tipoFormulario);
  };

  const renderDocumentos = () => {
    if (!formulario || !formulario.dados_formulario) return null;
    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    const getCor = () => {
      if (tipoFormulario === 'OBRA_CIVIL') return { border: 'border-blue-300', bg: 'bg-blue-50', title: 'text-blue-900' };
      if (tipoFormulario === 'ENGENHARIA_MECANICA') return { border: 'border-green-300', bg: 'bg-green-50', title: 'text-green-900' };
      return { border: 'border-orange-300', bg: 'bg-orange-50', title: 'text-orange-900' };
    };

    const cor = getCor();

    const formatFileSize = (bytes: number) => {
      if (!bytes) return '';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
      <div className="space-y-4">
        <div className={`border-2 ${cor.border} rounded-lg p-4 ${cor.bg}`}>
          <h4 className={`font-bold text-lg ${cor.title}`}>{getTitulo()}</h4>
          <p className="text-sm text-gray-600 mt-1">Documentos anexados a esta atividade.</p>
        </div>

        {/* Lista de Documentos */}
        {dados.documentos && dados.documentos.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-900">Documentos:</h5>
            {dados.documentos.map((doc: any, index: number) => {
              // Construct URL from arquivo data - try multiple possible paths
              const getDocUrl = () => {
                if (doc.arquivo?.url) return doc.arquivo.url;
                if (doc.arquivo?.filename) return `/api/uploads/${doc.arquivo.filename}`;
                if (doc.url) return doc.url;
                if (doc.filename) return `/api/uploads/${doc.filename}`;
                return null;
              };
              const docUrl = getDocUrl();

              return (
                <a
                  key={index}
                  href={docUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!docUrl) {
                      e.preventDefault();
                      alert('URL do documento não encontrada');
                    }
                  }}
                  className={`block bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer ${!docUrl ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Ícone PDF */}
                    <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{doc.nome || 'Documento sem nome'}</p>
                      {(doc.arquivo?.filename || doc.filename) && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500 truncate">{doc.arquivo?.filename || doc.filename}</p>
                          {(doc.arquivo?.size || doc.size) && (
                            <span className="text-xs text-gray-400">({formatFileSize(doc.arquivo?.size || doc.size)})</span>
                          )}
                        </div>
                      )}
                    </div>
                    {docUrl ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Abrir
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-400 text-white text-sm rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Sem URL
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Observações */}
        {dados.observacoes && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-2">Observações:</h5>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{dados.observacoes}</p>
          </div>
        )}
      </div>
    );
  };

  const isRevisaoProjetos = () => {
    return tipoFormulario === 'REVISAO_PROJETOS';
  };

  const renderRevisaoProjetos = () => {
    if (!formulario || !formulario.dados_formulario) return null;
    const dados = typeof formulario.dados_formulario === 'string'
      ? JSON.parse(formulario.dados_formulario)
      : formulario.dados_formulario;

    const FONTE_LABELS: Record<string, { label: string; cor: string; bg: string; border: string }> = {
      'OBRA_CIVIL': { label: 'Obra Civil', cor: 'text-blue-900', bg: 'bg-blue-50', border: 'border-blue-300' },
      'ENGENHARIA_MECANICA': { label: 'Engenharia Mecânica', cor: 'text-green-900', bg: 'bg-green-50', border: 'border-green-300' },
      'ENGENHARIA_ELETRICA_HIDRAULICA': { label: 'Engenharia Elétrica/Hidráulica', cor: 'text-orange-900', bg: 'bg-orange-50', border: 'border-orange-300' }
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-bold text-lg text-purple-900">Revisão Final de Projetos</h4>
          <p className="text-sm text-gray-600 mt-1">Resultado da revisão dos documentos.</p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">{dados.total_documentos || 0}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-100 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{dados.total_aprovados || 0}</p>
            <p className="text-xs text-green-600">Aprovados</p>
          </div>
          <div className="bg-red-100 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{dados.total_reprovados || 0}</p>
            <p className="text-xs text-red-600">Reprovados</p>
          </div>
        </div>

        {/* Lista de Aprovações */}
        {dados.aprovacoes && dados.aprovacoes.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-900">Documentos Revisados:</h5>
            {dados.aprovacoes.map((aprovacao: any, index: number) => {
              const config = FONTE_LABELS[aprovacao.fonte] || { label: aprovacao.fonte, cor: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-300' };
              return (
                <div key={index} className={`rounded-lg p-4 border ${aprovacao.aprovado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    {aprovacao.aprovado ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{aprovacao.nome}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${config.bg} ${config.cor} ${config.border} border mt-1`}>
                        {config.label}
                      </span>
                      {!aprovacao.aprovado && aprovacao.motivo_reprovacao && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                          <span className="font-semibold">Motivo:</span> {aprovacao.motivo_reprovacao}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Observações Gerais */}
        {dados.observacoes_gerais && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-2">Observações Gerais:</h5>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{dados.observacoes_gerais}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitulo()}
    >
      <div className="max-h-[70vh] overflow-y-auto px-1">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {formulario && !loading && !error && (
          <>
            {/* Informações de preenchimento */}
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Preenchido por:</span> {formulario.preenchido_por}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Data:</span> {new Date(formulario.data_preenchimento || formulario.created).toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Seção de Anexos - Ícone de Clips */}
            {(() => {
              const dados = formulario.dados_formulario
                ? (typeof formulario.dados_formulario === 'string'
                    ? JSON.parse(formulario.dados_formulario)
                    : formulario.dados_formulario)
                : {};

              // Coletar todos os anexos de diferentes campos
              const todosAnexos: Array<{ nome: string; arquivos: any[] }> = [];

              // Anexos do campo principal
              if ((formulario as any).anexos && Array.isArray((formulario as any).anexos) && (formulario as any).anexos.length > 0) {
                todosAnexos.push({ nome: 'Anexos', arquivos: (formulario as any).anexos });
              }

              // Anexos dentro de dados_formulario
              if (dados.anexos && Array.isArray(dados.anexos) && dados.anexos.length > 0) {
                todosAnexos.push({ nome: 'Anexos do Formulário', arquivos: dados.anexos });
              }

              // Desenhos técnicos
              if (dados.desenhos_tecnicos && Array.isArray(dados.desenhos_tecnicos) && dados.desenhos_tecnicos.length > 0) {
                todosAnexos.push({ nome: 'Desenhos Técnicos', arquivos: dados.desenhos_tecnicos });
              }

              // Fotos/Evidências
              if (dados.fotos && Array.isArray(dados.fotos) && dados.fotos.length > 0) {
                todosAnexos.push({ nome: 'Fotos/Evidências', arquivos: dados.fotos });
              }

              // Imagens gerais
              if (dados.imagens && Array.isArray(dados.imagens) && dados.imagens.length > 0) {
                todosAnexos.push({ nome: 'Imagens', arquivos: dados.imagens });
              }

              // Documentos (formato específico de FormularioDocumentos)
              if (dados.documentos && Array.isArray(dados.documentos) && dados.documentos.length > 0) {
                const arquivosDocumentos = dados.documentos
                  .filter((doc: any) => doc.arquivo && doc.arquivo.url)
                  .map((doc: any) => ({
                    url: doc.arquivo.url,
                    filename: doc.arquivo.filename || doc.nome || 'Documento',
                    size: doc.arquivo.size
                  }));
                if (arquivosDocumentos.length > 0) {
                  todosAnexos.push({ nome: 'Documentos', arquivos: arquivosDocumentos });
                }
              }

              // Coletar imagens de campos específicos (cq1a_imagem, cq2b_imagem, etc.)
              const imagensColetadas: Array<{ url: string; filename: string; size?: number }> = [];
              Object.entries(dados).forEach(([key, value]) => {
                if (key.endsWith('_imagem') && Array.isArray(value) && value.length > 0) {
                  value.forEach((img: any) => {
                    if (img && img.url) {
                      imagensColetadas.push({
                        url: img.url,
                        filename: img.filename || `${key.replace('_imagem', '')}.jpg`,
                        size: img.size
                      });
                    }
                  });
                }
              });
              if (imagensColetadas.length > 0) {
                todosAnexos.push({ nome: 'Imagens do Checklist', arquivos: imagensColetadas });
              }

              if (todosAnexos.length === 0) return null;

              return (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    {/* Ícone de Clips */}
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="font-semibold text-blue-900">Anexos do Formulário</span>
                  </div>
                  <div className="space-y-3">
                    {todosAnexos.map((grupo, idx) => (
                      <div key={idx}>
                        {todosAnexos.length > 1 && (
                          <p className="text-xs font-semibold text-gray-600 mb-1">{grupo.nome}:</p>
                        )}
                        <div className="space-y-1">
                          {grupo.arquivos.map((arquivo: any, index: number) => (
                            <a
                              key={index}
                              href={arquivo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition group"
                            >
                              {/* Ícone baseado no tipo de arquivo */}
                              {arquivo.filename?.toLowerCase().endsWith('.pdf') ? (
                                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (arquivo.filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) ? (
                                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              )}
                              <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate flex-1">{arquivo.filename || 'Arquivo'}</span>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Renderizar conteúdo específico */}
            {tipoFormulario === 'REUNIAO_START' && renderReuniaoStart()}
            {tipoFormulario === 'REUNIAO_START_2' && renderReuniaoStart()}
            {tipoFormulario === 'PREPARACAO' && renderPreparacao()}
            {tipoFormulario === 'LIBERACAO_EMBARQUE' && renderLiberacaoEmbarque()}
            {tipoFormulario === 'CONTROLE_QUALIDADE_CORTE' && (
              <div className="space-y-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <p className="font-semibold">Controle de Qualidade - Corte</p>
                  <p className="text-sm">Este formulário contém 3 checkpoints específicos de qualidade (CQ1-A a CQ3-A) para a etapa de Corte.</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">Para visualizar os detalhes completos dos 3 checkpoints de corte, consulte o formulário original ou os anexos associados.</p>
                  <p className="text-sm text-gray-600 mt-2">Formulário de controle de qualidade corte preenchido com sucesso.</p>
                </div>
              </div>
            )}
            {tipoFormulario === 'CONTROLE_QUALIDADE_MONTAGEM' && (
              <div className="space-y-6">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  <p className="font-semibold">Controle de Qualidade - Montagem Superior e Esquadro</p>
                  <p className="text-sm">Este formulário contém 43 checkpoints específicos de qualidade (CQ1-B a CQ43-B) para a etapa de Montagem Superior e Esquadro.</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">Para visualizar os detalhes completos dos 43 checkpoints de montagem, consulte o formulário original ou os anexos associados.</p>
                  <p className="text-sm text-gray-600 mt-2">Formulário de controle de qualidade montagem preenchido com sucesso.</p>
                </div>
              </div>
            )}
            {tipoFormulario === 'CONTROLE_QUALIDADE_CENTRAL' && (
              <div className="space-y-6">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  <p className="font-semibold">Controle de Qualidade - Central Hidráulica</p>
                  <p className="text-sm">Este formulário contém 15 checkpoints específicos de qualidade (CQ1-C a CQ15-C) para Central Hidráulica.</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">Para visualizar os detalhes completos dos 15 checkpoints, consulte o formulário original ou os anexos associados.</p>
                  <p className="text-sm text-gray-600 mt-2">Formulário de controle de qualidade central hidráulica preenchido com sucesso.</p>
                </div>
              </div>
            )}
            {tipoFormulario === 'CONTROLE_QUALIDADE_SOLDA' && (
              <div className="space-y-6">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  <p className="font-semibold">Controle de Qualidade - Solda Lado 1</p>
                  <p className="text-sm">Este formulário contém 17 checkpoints específicos de qualidade (CQ1-D a CQ17-D) para Solda Lado 1.</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">Para visualizar os detalhes completos dos 17 checkpoints, consulte o formulário original ou os anexos associados.</p>
                  <p className="text-sm text-gray-600 mt-2">Formulário de controle de qualidade solda lado 1 preenchido com sucesso.</p>
                </div>
              </div>
            )}
            {isNovoCQ() && renderGenericCQ()}
            {isDocumentos() && renderDocumentos()}
            {isRevisaoProjetos() && renderRevisaoProjetos()}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
