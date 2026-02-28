'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { gerarOrcamentoPDFBlob, DadosOrcamento, getNomeArquivoPDF } from '@/lib/comercial/orcamento-pdf';

interface AnaliseData {
  status: string;
  expires_at: string;
  aprovado_em?: string;
  observacoes_analista?: string;
  pdf_gerado_em?: string;
  vendedor_nome: string;
  vendedor_email: string;
  cliente_nome: string;
  cliente_cnpj: string;
  proposta: {
    numero_proposta: number;
    produto: string;
    dados_configurador: DadosOrcamento;
    valor_total: number;
    desconto_percentual: number;
    prazo_entrega_dias: number;
    garantia_meses: number;
  };
  ajustes?: {
    desconto_percentual: number | null;
    prazo_entrega: string | null;
    garantia_meses: number | null;
    forma_pagamento: string | null;
    observacoes: string | null;
  } | null;
}

function fmtValor(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCNPJ(cnpj: string): string {
  if (!cnpj) return '-';
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function AnalisePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnaliseData | null>(null);

  // Campos editaveis
  const [desconto, setDesconto] = useState(0);
  const [prazoEntrega, setPrazoEntrega] = useState('120 dias');
  const [garantiaMeses, setGarantiaMeses] = useState(12);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [obsAnalista, setObsAnalista] = useState('');

  // Estados de acao
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [pdfLink, setPdfLink] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/analise/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Link invalido');
          return;
        }
        setData(json.data);
        // Inicializar campos com valores da proposta
        const p = json.data.proposta;
        const dc = p.dados_configurador;
        setDesconto(p.desconto_percentual || dc?.descontoPercentual || 0);
        setPrazoEntrega(dc?.prazoEntrega || `${p.prazo_entrega_dias} dias`);
        setGarantiaMeses(p.garantia_meses || dc?.garantiaMeses || 12);
        setFormaPagamento(dc?.formaPagamento || '');
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [token]);

  const dadosConfig = data?.proposta?.dados_configurador;

  // Recalcular valores com desconto ajustado
  const valores = useMemo(() => {
    if (!dadosConfig) return null;
    const subtotal = dadosConfig.subtotal || data?.proposta?.valor_total || 0;
    const descontoValor = subtotal * (desconto / 100);
    const valorFinal = subtotal - descontoValor;
    return { subtotal, descontoValor, valorFinal };
  }, [dadosConfig, desconto, data]);

  const handleAprovar = async () => {
    if (!data || !dadosConfig || !valores) return;
    setSubmitting(true);

    try {
      // 1. Aprovar via API
      const resAprovar = await fetch(`/api/public/analise/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'APROVAR',
          desconto_percentual: desconto,
          prazo_entrega: prazoEntrega,
          garantia_meses: garantiaMeses,
          forma_pagamento: formaPagamento,
          observacoes_analista: obsAnalista || null,
        }),
      });
      const jsonAprovar = await resAprovar.json();
      if (!jsonAprovar.success) {
        alert(jsonAprovar.error || 'Erro ao aprovar');
        setSubmitting(false);
        return;
      }

      // 2. Gerar PDF com dados ajustados
      const dadosPDF: DadosOrcamento = {
        ...dadosConfig,
        numeroProposta: data.proposta.numero_proposta,
        descontoPercentual: desconto || undefined,
        descontoValor: valores.descontoValor || undefined,
        valorFinal: valores.valorFinal,
        prazoEntrega: prazoEntrega,
        garantiaMeses: garantiaMeses,
        formaPagamento: formaPagamento || dadosConfig.formaPagamento || 'A combinar',
        observacoes: obsAnalista || dadosConfig.observacoes,
      };

      const pdfBlob = await gerarOrcamentoPDFBlob(dadosPDF);

      // 3. Enviar PDF ao servidor
      const resPdf = await fetch(`/api/public/analise/${token}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBlob,
      });
      const jsonPdf = await resPdf.json();

      // Tambem fazer download local para o analista
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getNomeArquivoPDF(dadosPDF);
      a.click();
      URL.revokeObjectURL(url);

      setPdfLink(jsonPdf.pdf_link || null);
      setApproved(true);
    } catch (e) {
      alert('Erro ao processar aprovacao');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejeitar = async () => {
    if (!obsAnalista.trim()) {
      alert('Informe o motivo da rejeicao');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/analise/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'REJEITAR',
          observacoes_analista: obsAnalista,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRejected(true);
      } else {
        alert(json.error || 'Erro ao rejeitar');
      }
    } catch {
      alert('Erro de conexao');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== LOADING ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  // ==================== ERROR ====================
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Indisponivel</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ==================== APPROVED ====================
  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta Aprovada!</h1>
          <p className="text-gray-500 mb-4">
            O PDF foi gerado e o vendedor recebera o link via WhatsApp.
          </p>
          {pdfLink && (
            <a
              href={pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Baixar PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  // ==================== REJECTED ====================
  if (rejected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta Rejeitada</h1>
          <p className="text-gray-500">O vendedor foi notificado via WhatsApp.</p>
        </div>
      </div>
    );
  }

  // ==================== ALREADY PROCESSED ====================
  if (data?.status === 'APROVADA') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ja Aprovada</h1>
          <p className="text-gray-500 mb-1">
            Proposta #{data.proposta.numero_proposta} aprovada
            {data.aprovado_em ? ` em ${new Date(data.aprovado_em).toLocaleDateString('pt-BR')}` : ''}.
          </p>
          {data.pdf_gerado_em && (
            <a
              href={`/api/public/analise/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Baixar PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  if (data?.status === 'REJEITADA') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta Rejeitada</h1>
          <p className="text-gray-500">Proposta #{data.proposta.numero_proposta} foi rejeitada.</p>
          {data.observacoes_analista && (
            <p className="text-gray-600 mt-2 text-sm">Motivo: {data.observacoes_analista}</p>
          )}
        </div>
      </div>
    );
  }

  // ==================== REVIEW FORM ====================
  const numFmt = data?.proposta?.numero_proposta ? String(data.proposta.numero_proposta).padStart(4, '0') : '';
  const itens = dadosConfig?.itens || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold">Pili Equipamentos Industriais</h1>
          <p className="text-red-200 text-sm">Analise de Orcamento</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Greeting */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Proposta N. {numFmt}
          </h2>
          <p className="text-sm text-gray-500">
            Enviada por {data?.vendedor_nome} ({data?.vendedor_email})
          </p>
        </div>

        {/* Card: Cliente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</h3>
          <p className="font-semibold text-gray-900">{data?.cliente_nome || '-'}</p>
          <p className="text-sm text-gray-500">CNPJ: {fmtCNPJ(data?.cliente_cnpj || '')}</p>
          {dadosConfig?.clienteNome && (
            <p className="text-sm text-gray-500">Contato: {dadosConfig.clienteNome}</p>
          )}
          {dadosConfig?.decisorNome && (
            <p className="text-sm text-gray-500">
              Decisor: {dadosConfig.decisorNome}
              {dadosConfig.decisorTelefone ? ` | ${dadosConfig.decisorTelefone}` : ''}
              {dadosConfig.decisorEmail ? ` | ${dadosConfig.decisorEmail}` : ''}
            </p>
          )}
        </div>

        {/* Card: Equipamento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Equipamento</h3>
          <p className="font-semibold text-gray-900">{dadosConfig?.descricaoProduto || data?.proposta?.produto}</p>
          {dadosConfig?.dadosTecnicos && (
            <div className="flex flex-wrap gap-2 mt-1">
              {dadosConfig.dadosTecnicos.qtCilindros && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dadosConfig.dadosTecnicos.qtCilindros} cilindro(s)</span>
              )}
              {dadosConfig.dadosTecnicos.qtMotores && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dadosConfig.dadosTecnicos.qtMotores} motor(es)</span>
              )}
              {dadosConfig.dadosTecnicos.qtOleo && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dadosConfig.dadosTecnicos.qtOleo}L oleo</span>
              )}
              {dadosConfig.dadosTecnicos.anguloInclinacao && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Incl: {dadosConfig.dadosTecnicos.anguloInclinacao}</span>
              )}
            </div>
          )}

          {/* Tabela de itens */}
          {itens.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Qtd</th>
                    <th className="text-right py-1">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-800">
                        {item.descricao}
                        {item.tipo === 'BASE' && <span className="ml-1 text-xs text-red-500 font-medium">Base</span>}
                      </td>
                      <td className="py-1.5 text-right text-gray-600">{item.tipo === 'BASE' ? '-' : item.quantidade}</td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {item.valorTotal === 0 ? 'Incluso' : fmtValor(item.valorTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Card: Condicoes Comerciais (EDITAVEL) */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-4">
          <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Condicoes Comerciais (editavel)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desconto (%)</label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={desconto}
                onChange={e => setDesconto(Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prazo de Entrega</label>
              <select
                value={prazoEntrega}
                onChange={e => setPrazoEntrega(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="90 dias">90 dias</option>
                <option value="120 dias">120 dias</option>
                <option value="150 dias">150 dias</option>
                <option value="180 dias">180 dias</option>
                <option value="A combinar">A combinar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Garantia</label>
              <select
                value={garantiaMeses}
                onChange={e => setGarantiaMeses(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={18}>18 meses</option>
                <option value={24}>24 meses</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
              <input
                type="text"
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                placeholder="Ex: 30/60/90 dias"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes do Analista</label>
              <textarea
                value={obsAnalista}
                onChange={e => setObsAnalista(e.target.value)}
                rows={2}
                placeholder="Observacoes ou motivo de rejeicao..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Card: Resumo de Valores */}
        {valores && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resumo</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{fmtValor(valores.subtotal)}</span>
              </div>
              {valores.descontoValor > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Desconto ({desconto}%)</span>
                  <span className="font-medium">- {fmtValor(valores.descontoValor)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-red-200">
                <span className="text-lg font-bold text-gray-900">TOTAL</span>
                <span className="text-lg font-bold text-red-600">{fmtValor(valores.valorFinal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botoes */}
        <div className="space-y-3 pt-2">
          {!showRejectForm ? (
            <>
              <button
                onClick={handleAprovar}
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition ${
                  submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                }`}
              >
                {submitting ? 'Processando...' : 'Aprovar e Gerar Orcamento PDF'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-red-600 text-sm border-2 border-red-300 hover:bg-red-50 transition"
              >
                Rejeitar Proposta
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">Informe o motivo da rejeicao no campo de observacoes acima.</p>
              <button
                onClick={handleRejeitar}
                disabled={submitting || !obsAnalista.trim()}
                className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition ${
                  submitting || !obsAnalista.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Processando...' : 'Confirmar Rejeicao'}
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </>
          )}

          <p className="text-center text-[11px] text-gray-400">
            Link valido ate {data?.expires_at ? new Date(data.expires_at).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
