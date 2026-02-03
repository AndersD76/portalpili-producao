'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Atividade {
  id: number;
  atividade: string;
  responsavel: string;
  status: string;
  previsao_inicio: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  tempo_acumulado_segundos: number | null;
  logs: any;
  tem_nao_conformidade: boolean;
  tem_pendencia_formulario: boolean;
  formulario_anexo: any;
  parent_id: number | null;
}

interface TimelineEvent {
  tipo: string;
  data: string;
  descricao: string;
  usuario: string;
}

interface ReportData {
  opd: any;
  atividades: Atividade[];
  formularios: any[];
  comentarios: any[];
  postits: any[];
  naoConformidades: any[];
  acoesCorretivas: any[];
  stats: {
    total: number;
    concluidas: number;
    em_andamento: number;
    pausadas: number;
    a_realizar: number;
    com_nc: number;
    com_pendencia: number;
  };
  tempoTotalSegundos: number;
  timeline: TimelineEvent[];
}

export default function RelatorioOPDPage() {
  const params = useParams();
  const router = useRouter();
  const numero = params.numero as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showFormularios, setShowFormularios] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showPostits, setShowPostits] = useState(true);
  const [showNCs, setShowNCs] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/opds/${numero}/relatorio`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Erro ao carregar relatório');
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar relatório');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [numero]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'A REALIZAR': 'bg-gray-100 text-gray-800',
      'EM ANDAMENTO': 'bg-yellow-100 text-yellow-800',
      'PAUSADA': 'bg-orange-100 text-orange-800',
      'CONCLUÍDA': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-600 mb-4">{error || 'Dados não encontrados'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          Voltar
        </button>
      </div>
    );
  }

  const { opd, atividades, formularios, comentarios, postits, naoConformidades, acoesCorretivas, stats, tempoTotalSegundos, timeline } = data;
  const percentualConclusao = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

  // Separar atividades principais e subatividades
  const atividadesPrincipais = atividades.filter(a => !a.parent_id);
  const subatividades = atividades.filter(a => a.parent_id);

  return (
    <>
      {/* Barra de controles - não imprime */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <h1 className="text-lg font-bold">Relatório OPD {numero}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle de seções */}
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showTimeline} onChange={(e) => setShowTimeline(e.target.checked)} />
                Timeline
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showFormularios} onChange={(e) => setShowFormularios(e.target.checked)} />
                Formulários
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showChat} onChange={(e) => setShowChat(e.target.checked)} />
                Chat
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showPostits} onChange={(e) => setShowPostits(e.target.checked)} />
                Post-its
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showNCs} onChange={(e) => setShowNCs(e.target.checked)} />
                NCs
              </label>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div ref={printRef} className="max-w-7xl mx-auto p-6 pt-20 print:pt-0 print:p-4">
        {/* Cabeçalho do relatório */}
        <div className="border-2 border-gray-300 rounded-lg p-6 mb-6 print:border print:p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Relatório OPD {numero}</h1>
              <p className="text-lg text-gray-600 mt-1">{opd.cliente}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${percentualConclusao === 100 ? 'text-green-600' : 'text-red-600'} print:text-2xl`}>
                {percentualConclusao}%
              </div>
              <p className="text-sm text-gray-500">Concluído</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tipo:</span>
              <p className="font-semibold">{opd.tipo_produto || opd.tipo_opd || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Data do Pedido:</span>
              <p className="font-semibold">{formatDate(opd.data_pedido)}</p>
            </div>
            <div>
              <span className="text-gray-500">Previsão Entrega:</span>
              <p className="font-semibold">{formatDate(opd.data_prevista_entrega || opd.data_entrega)}</p>
            </div>
            <div>
              <span className="text-gray-500">Responsável:</span>
              <p className="font-semibold">{opd.responsavel_opd || '-'}</p>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Relatório gerado em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.concluidas}</div>
            <div className="text-xs text-green-600">Concluídas</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.em_andamento}</div>
            <div className="text-xs text-yellow-600">Em Andamento</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.pausadas}</div>
            <div className="text-xs text-orange-600">Pausadas</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.a_realizar}</div>
            <div className="text-xs text-gray-600">A Realizar</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{stats.com_nc}</div>
            <div className="text-xs text-red-600">Com NC</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{formatTempo(tempoTotalSegundos)}</div>
            <div className="text-xs text-purple-600">Tempo Total</div>
          </div>
        </div>

        {/* Atividades */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Atividades</h2>
          <div className="space-y-2">
            {atividadesPrincipais.map((atividade) => {
              const subs = subatividades.filter(s => s.parent_id === atividade.id);

              return (
                <div key={atividade.id}>
                  {/* Atividade principal */}
                  <div className={`border rounded-lg p-3 ${atividade.tem_nao_conformidade ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{atividade.atividade}</span>
                          {atividade.tem_nao_conformidade && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">NC</span>
                          )}
                          {atividade.tem_pendencia_formulario && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Pendência</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Responsável: {atividade.responsavel || '-'} |
                          Previsão: {formatDate(atividade.previsao_inicio)} |
                          Início: {formatDate(atividade.data_inicio)} |
                          Término: {formatDate(atividade.data_termino)}
                          {atividade.tempo_acumulado_segundos ? ` | Tempo: ${formatTempo(atividade.tempo_acumulado_segundos)}` : ''}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(atividade.status)}`}>
                        {atividade.status}
                      </span>
                    </div>

                    {/* Logs da atividade */}
                    {atividade.logs && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Histórico: {(() => {
                            const logs = typeof atividade.logs === 'string' ? JSON.parse(atividade.logs) : atividade.logs;
                            if (!Array.isArray(logs)) return '-';
                            return logs.map((l: any) => `${l.acao} por ${l.usuario_nome} (${formatDateTime(l.timestamp)})`).join(' → ');
                          })()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subatividades */}
                  {subs.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className={`border rounded-lg p-2 text-sm ${sub.tem_nao_conformidade ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{sub.atividade}</span>
                              {sub.tem_nao_conformidade && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">NC</span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(sub.status)}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {sub.responsavel && `${sub.responsavel} | `}
                            {sub.tempo_acumulado_segundos ? `${formatTempo(sub.tempo_acumulado_segundos)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Não Conformidades */}
        {showNCs && naoConformidades.length > 0 && (
          <div className="mb-6 print:break-before-page">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Não Conformidades ({naoConformidades.length})</h2>
            <div className="space-y-3">
              {naoConformidades.map((nc: any) => (
                <div key={nc.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-red-700">NC {nc.numero}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        nc.gravidade === 'ALTA' ? 'bg-red-600 text-white' :
                        nc.gravidade === 'MEDIA' ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'
                      }`}>
                        {nc.gravidade}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      nc.status === 'ABERTA' ? 'bg-red-100 text-red-700' :
                      nc.status === 'EM_TRATAMENTO' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {nc.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{nc.descricao}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    Tipo: {nc.tipo} | Disposição: {nc.disposicao} | Data: {formatDate(nc.data_ocorrencia)}
                  </div>
                  {nc.acao_imediata && (
                    <div className="mt-2 text-xs bg-white p-2 rounded">
                      <strong>Ação Imediata:</strong> {nc.acao_imediata}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulários Preenchidos */}
        {showFormularios && formularios.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Formulários Preenchidos ({formularios.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formularios.map((form: any) => (
                <div key={form.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-semibold">{form.tipo_formulario}</div>
                  <div className="text-sm text-gray-600">
                    Preenchido por: {form.preenchido_por} em {formatDateTime(form.data_preenchimento || form.created)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post-its */}
        {showPostits && postits.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Post-its ({postits.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {postits.map((postit: any) => (
                <div
                  key={postit.id}
                  className={`border rounded-lg p-3 ${
                    postit.status === 'concluido' ? 'bg-green-50 border-green-200' :
                    postit.status === 'em_andamento' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-yellow-100 border-yellow-300'
                  }`}
                >
                  <p className="font-medium text-sm">{postit.descricao}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    {postit.responsavel && <span>Responsável: {postit.responsavel}</span>}
                    {postit.prazo && <span> | Prazo: {formatDate(postit.prazo)}</span>}
                  </div>
                  <div className="mt-1 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${
                      postit.status === 'concluido' ? 'bg-green-200 text-green-800' :
                      postit.status === 'em_andamento' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {postit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat/Comentários */}
        {showChat && comentarios.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Mensagens do Chat ({comentarios.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
              {comentarios.map((msg: any) => (
                <div key={msg.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{msg.usuario_nome}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(msg.created)}</span>
                  </div>
                  <p className="text-sm mt-1">{msg.mensagem}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {showTimeline && timeline.length > 0 && (
          <div className="mb-6 print:break-before-page">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-red-600 pb-2">Timeline de Eventos ({timeline.length})</h2>
            <div className="space-y-1">
              {timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-3 py-2 border-b border-gray-100">
                  <div className="w-32 flex-shrink-0 text-xs text-gray-500">
                    {formatDateTime(event.data)}
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    event.tipo.includes('FINALIZ') ? 'bg-green-500' :
                    event.tipo.includes('INICI') ? 'bg-blue-500' :
                    event.tipo.includes('NC') ? 'bg-red-500' :
                    event.tipo.includes('PAUSO') ? 'bg-orange-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <span className="text-sm">{event.descricao}</span>
                    <span className="text-xs text-gray-400 ml-2">por {event.usuario}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé para impressão */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-400">
          Portal Pili - Relatório OPD {numero} - Gerado em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </>
  );
}
