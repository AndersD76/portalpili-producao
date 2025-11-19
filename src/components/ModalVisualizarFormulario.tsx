'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { FormularioPreenchido, TipoFormulario } from '@/types/atividade';

interface ModalVisualizarFormularioProps {
  isOpen: boolean;
  onClose: () => void;
  atividadeId: number;
  numeroOpd: string;
  tipoFormulario: TipoFormulario;
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

  const carregarFormulario = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      if (tipoFormulario === 'REUNIAO_START') {
        endpoint = `/api/formularios-reuniao/${numeroOpd}?atividade_id=${atividadeId}`;
      } else if (tipoFormulario === 'PREPARACAO') {
        endpoint = `/api/formularios-preparacao/${numeroOpd}?atividade_id=${atividadeId}`;
      } else if (tipoFormulario === 'LIBERACAO_EMBARQUE') {
        endpoint = `/api/formularios-liberacao-embarque/${numeroOpd}?atividade_id=${atividadeId}`;
      }

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
        {/* Informações Estruturais */}
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES ESTRUTURAIS</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Equipamento:</span>
              <p>{dados.equipamento || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Modelo:</span>
              <p>{dados.modelo || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Nº de Série:</span>
              <p>{dados.numero_serie || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Tipo de Equipamento:</span>
              <p>{dados.tipo_equipamento || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Local de Instalação:</span>
              <p>{dados.local_instalacao || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Equipe */}
        <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
          <h4 className="font-bold text-lg mb-4 text-green-900">EQUIPE</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Técnico Responsável:</span>
              <p>{dados.tecnico_responsavel || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Equipe de Apoio:</span>
              <p>{dados.equipe_apoio || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Cronograma */}
        <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-bold text-lg mb-4 text-yellow-900">CRONOGRAMA</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Prazo de Entrega:</span>
              <p>{dados.prazo_entrega ? new Date(dados.prazo_entrega).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold">Duração Estimada (dias):</span>
              <p>{dados.duracao_estimada || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Observações */}
        {dados.observacoes && (
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
            <h4 className="font-bold text-lg mb-2">OBSERVAÇÕES</h4>
            <p className="text-sm whitespace-pre-wrap">{dados.observacoes}</p>
          </div>
        )}
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
    if (tipoFormulario === 'REUNIAO_START') return 'Formulário - Reunião de Start';
    if (tipoFormulario === 'PREPARACAO') return 'Formulário - Preparação';
    if (tipoFormulario === 'LIBERACAO_EMBARQUE') return 'Formulário - Liberação e Embarque';
    return 'Formulário';
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
                <span className="font-semibold">Data:</span> {new Date(formulario.data_preenchimento).toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Renderizar conteúdo específico */}
            {tipoFormulario === 'REUNIAO_START' && renderReuniaoStart()}
            {tipoFormulario === 'PREPARACAO' && renderPreparacao()}
            {tipoFormulario === 'LIBERACAO_EMBARQUE' && renderLiberacaoEmbarque()}
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
