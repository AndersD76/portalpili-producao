'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface StatusCheckItem {
  id: number;
  oportunidade_id: number;
  estagio_anterior: string;
  estagio_novo?: string;
  observacao?: string;
  respondido_at?: string;
  titulo: string;
  cliente_nome: string;
  valor_estimado: number;
  produto?: string;
  numero_proposta?: string;
  dias_no_estagio?: number;
}

interface StatusCheckData {
  vendedor_nome: string;
  status: string;
  total_oportunidades: number;
  total_respondidas: number;
  expires_at: string;
  items: StatusCheckItem[];
}

interface Resposta {
  estagio: string;
  data_contato: string;
  canal_contato: string;
  o_que_discutiu: string;
  proximo_passo: string;
  previsao_fechamento: string;
  nivel_interesse: string;
}

const ESTAGIO_OPTIONS = [
  { value: 'EM_NEGOCIACAO', label: 'Em Negociação', color: '#f97316' },
  { value: 'POS_NEGOCIACAO', label: 'Pós Negociação', color: '#a855f7' },
  { value: 'FECHADA', label: 'Fechada — Ganha', color: '#22c55e' },
  { value: 'PERDIDA', label: 'Perdida', color: '#ef4444' },
  { value: 'SUSPENSO', label: 'Suspensa', color: '#ca8a04' },
];

const CANAIS = [
  { value: 'telefone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'visita', label: 'Visita presencial' },
  { value: 'video', label: 'Videoconferência' },
  { value: 'sem_contato', label: 'Sem contato ainda' },
];

const INTERESSE = [
  { value: 'quente', label: 'Quente', bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  { value: 'morno', label: 'Morno', bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  { value: 'frio', label: 'Frio', bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
];

function fmtValor(v: unknown): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  if (!n || isNaN(n)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export default function StatusCheckPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatusCheckData | null>(null);
  const [respostas, setRespostas] = useState<Record<number, Resposta>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/status-check/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Link inválido');
          return;
        }
        setData(json.data);
        const init: Record<number, Resposta> = {};
        for (const item of json.data.items) {
          init[item.oportunidade_id] = {
            estagio: item.estagio_anterior,
            data_contato: hoje(),
            canal_contato: '',
            o_que_discutiu: '',
            proximo_passo: '',
            previsao_fechamento: '',
            nivel_interesse: '',
          };
        }
        setRespostas(init);
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (oppId: number, field: keyof Resposta, value: string) => {
    setRespostas(prev => ({
      ...prev,
      [oppId]: { ...prev[oppId], [field]: value },
    }));
    // Limpar erros deste card quando o usuário edita
    if (erros[oppId]) {
      setErros(prev => {
        const copy = { ...prev };
        delete copy[oppId];
        return copy;
      });
    }
  };

  const [erros, setErros] = useState<Record<number, string[]>>({});

  // Verifica se uma proposta foi parcialmente preenchida (pelo menos um campo editado)
  const foiPreenchida = (r: Resposta, estagioAnterior: string): boolean => {
    return !!(
      r.canal_contato ||
      r.nivel_interesse ||
      r.o_que_discutiu?.trim() ||
      r.proximo_passo?.trim() ||
      r.previsao_fechamento ||
      (r.estagio && r.estagio !== estagioAnterior)
    );
  };

  // Valida apenas as propostas que foram preenchidas (parcial OK)
  const validarRespostas = (): boolean => {
    const novosErros: Record<number, string[]> = {};
    let temPreenchida = false;

    for (const item of (data?.items || []).filter(i => !i.respondido_at)) {
      const r = respostas[item.oportunidade_id];
      if (!r) continue;

      // Pular propostas que não foram tocadas
      if (!foiPreenchida(r, item.estagio_anterior)) continue;

      temPreenchida = true;
      const campos: string[] = [];
      if (!r.canal_contato) campos.push('Canal de contato');
      if (!r.nivel_interesse) campos.push('Nível de interesse');
      if (!r.o_que_discutiu?.trim()) campos.push('O que foi discutido');
      if (!r.proximo_passo?.trim()) campos.push('Próximo passo');
      if (!r.previsao_fechamento) campos.push('Previsão de fechamento');
      if (r.estagio === item.estagio_anterior) campos.push('Deve alterar o status da proposta');
      if (campos.length > 0) {
        novosErros[item.oportunidade_id] = campos;
      }
    }

    setErros(novosErros);

    if (!temPreenchida) {
      alert('Preencha pelo menos uma proposta antes de enviar.');
      return false;
    }

    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async () => {
    if (!data) return;
    if (!validarRespostas()) return;
    setSubmitting(true);

    const payload = data.items
      .filter(item => !item.respondido_at && foiPreenchida(respostas[item.oportunidade_id], item.estagio_anterior))
      .map(item => {
        const r = respostas[item.oportunidade_id];
        // Monta observação estruturada
        const partes: string[] = [];
        if (r.canal_contato) {
          const canal = CANAIS.find(c => c.value === r.canal_contato);
          partes.push(`Contato: ${r.data_contato ? new Date(r.data_contato + 'T12:00:00').toLocaleDateString('pt-BR') : 'hoje'} via ${canal?.label?.replace(/^\S+\s/, '') || r.canal_contato}`);
        }
        if (r.nivel_interesse) {
          const int = INTERESSE.find(i => i.value === r.nivel_interesse);
          partes.push(`Interesse: ${int?.label?.replace(/^\S+\s/, '') || r.nivel_interesse}`);
        }
        if (r.o_que_discutiu?.trim()) {
          partes.push(`Discutido: ${r.o_que_discutiu.trim()}`);
        }
        if (r.proximo_passo?.trim()) {
          partes.push(`Próximo passo: ${r.proximo_passo.trim()}`);
        }
        if (r.previsao_fechamento) {
          partes.push(`Previsão de fechamento: ${new Date(r.previsao_fechamento + 'T12:00:00').toLocaleDateString('pt-BR')}`);
        }
        return {
          oportunidade_id: item.oportunidade_id,
          estagio_novo: r.estagio || item.estagio_anterior,
          observacao: partes.join(' | '),
          previsao_fechamento: r.previsao_fechamento || null,
        };
      });

    try {
      const res = await fetch(`/api/public/status-check/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respostas: payload }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.status === 'CONCLUIDO') {
          // Todas respondidas
          setSubmitted(true);
        } else {
          // Envio parcial - recarregar para mostrar apenas as pendentes
          const reloadRes = await fetch(`/api/public/status-check/${token}`);
          const reloadJson = await reloadRes.json();
          if (reloadJson.success) {
            setData(reloadJson.data);
            // Reinicializar respostas apenas para items pendentes
            const init: Record<number, Resposta> = {};
            for (const item of reloadJson.data.items) {
              if (!item.respondido_at) {
                init[item.oportunidade_id] = {
                  estagio: item.estagio_anterior,
                  data_contato: hoje(),
                  canal_contato: '',
                  o_que_discutiu: '',
                  proximo_passo: '',
                  previsao_fechamento: '',
                  nivel_interesse: '',
                };
              }
            }
            setRespostas(init);
            setErros({});
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            alert(`${json.updated_count} proposta(s) atualizada(s)! Restam ${reloadJson.data.items.filter((i: any) => !i.respondido_at).length} pendente(s).`);
          } else {
            setSubmitted(true);
          }
        }
      } else {
        alert(json.error || 'Erro ao enviar');
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Indisponível</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Atualizado!</h1>
          <p className="text-gray-500">Informações enviadas com sucesso. Obrigado!</p>
        </div>
      </div>
    );
  }

  if (data?.status === 'CONCLUIDO') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Já Respondido</h1>
          <p className="text-gray-500">Este formulário já foi preenchido. Obrigado!</p>
        </div>
      </div>
    );
  }

  const pendingItems = data?.items.filter(i => !i.respondido_at) || [];
  const expiresStr = data?.expires_at
    ? new Date(data.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold leading-tight">Pili Equipamentos</h1>
            <p className="text-red-200 text-xs">Atualização de Propostas</p>
          </div>
          <div className="text-right">
            <p className="text-red-200 text-[10px]">válido até</p>
            <p className="text-white text-xs font-semibold">{expiresStr}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Saudação */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Olá, {data?.vendedor_nome?.split(' ')[0]}!
          </h2>
          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 space-y-1.5">
            <p>Precisamos de uma atualização sobre <strong>{pendingItems.length} proposta{pendingItems.length !== 1 ? 's' : ''}</strong> em negociação.</p>
            <p className="text-gray-500">Para cada uma, nos informe: houve contato com o cliente? O que foi discutido? Qual o próximo passo? Isso nos ajuda a apoiar você no fechamento.</p>
            <p className="text-gray-400 text-xs mt-1">Preencha as que puder agora — você pode voltar ao link depois para completar as demais.</p>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-5">
          {pendingItems.map((item, idx) => {
            const r = respostas[item.oportunidade_id] || {};
            const estagioConfig = ESTAGIO_OPTIONS.find(e => e.value === r.estagio);

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        {item.numero_proposta && (
                          <span className="text-xs text-gray-400">· Proposta #{item.numero_proposta}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.cliente_nome || item.titulo}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                        {item.produto && <span>{item.produto}</span>}
                        <span className="font-semibold text-gray-700">{fmtValor(item.valor_estimado)}</span>
                        {item.dias_no_estagio != null && (
                          <span className="text-orange-500 font-medium">{item.dias_no_estagio}d neste estágio</span>
                        )}
                      </div>
                    </div>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap flex-shrink-0"
                      style={{ background: ESTAGIO_OPTIONS.find(e => e.value === item.estagio_anterior)?.color || '#6b7280' }}
                    >
                      {ESTAGIO_OPTIONS.find(e => e.value === item.estagio_anterior)?.label || item.estagio_anterior}
                    </span>
                  </div>
                </div>

                {/* Form fields */}
                <div className="px-4 py-4 space-y-4">

                  {/* Último contato + Canal */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Último contato com o cliente <span className="text-red-400">*</span></p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] text-gray-400 mb-1">Data</label>
                        <input
                          type="date"
                          value={r.data_contato || hoje()}
                          max={hoje()}
                          onChange={e => setField(item.oportunidade_id, 'data_contato', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] text-gray-400 mb-1">Canal</label>
                        <select
                          value={r.canal_contato || ''}
                          onChange={e => setField(item.oportunidade_id, 'canal_contato', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
                        >
                          <option value="">Selecione...</option>
                          {CANAIS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Nível de interesse */}
                  <div>
                    <p className="text-[11px] text-gray-400 mb-2">Nível de interesse do cliente <span className="text-red-400">*</span></p>
                    <div className="flex gap-2">
                      {INTERESSE.map(i => (
                        <button
                          key={i.value}
                          type="button"
                          onClick={() => setField(item.oportunidade_id, 'nivel_interesse', r.nivel_interesse === i.value ? '' : i.value)}
                          className="flex-1 py-2 px-1 rounded-lg text-xs font-semibold border-2 transition-all"
                          style={r.nivel_interesse === i.value
                            ? { background: i.bg, borderColor: i.border, color: i.text }
                            : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' }
                          }
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* O que foi discutido */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">O que foi discutido? <span className="text-red-400">*</span></label>
                    <textarea
                      value={r.o_que_discutiu || ''}
                      onChange={e => setField(item.oportunidade_id, 'o_que_discutiu', e.target.value)}
                      rows={2}
                      placeholder="Ex: Cliente pediu prazo de pagamento em 60 dias, comparando com concorrente X..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-gray-50 placeholder-gray-300"
                    />
                  </div>

                  {/* Próximo passo */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Próximo passo / ação <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={r.proximo_passo || ''}
                      onChange={e => setField(item.oportunidade_id, 'proximo_passo', e.target.value)}
                      placeholder="Ex: Ligar na quinta para fechar condições, enviar proposta revisada..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 placeholder-gray-300"
                    />
                  </div>

                  {/* Previsão de fechamento */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Previsão de fechamento <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={r.previsao_fechamento || ''}
                      min={hoje()}
                      onChange={e => setField(item.oportunidade_id, 'previsao_fechamento', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                      Apenas uma estimativa. O sistema usará essa data para agendar o próximo pedido de feedback automaticamente.
                    </p>
                  </div>

                  {/* Novo status */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Atualizar status da proposta <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ESTAGIO_OPTIONS.filter(opt => opt.value !== item.estagio_anterior).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField(item.oportunidade_id, 'estagio', opt.value)}
                          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-left border-2 transition-all flex items-center gap-2"
                          style={r.estagio === opt.value
                            ? { borderColor: opt.color, background: opt.color + '15', color: opt.color }
                            : { borderColor: '#e5e7eb', background: '#f9fafb', color: '#6b7280' }
                          }
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: r.estagio === opt.value ? opt.color : '#d1d5db' }}
                          />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Status badge */}
                {estagioConfig && r.estagio !== item.estagio_anterior && (
                  <div
                    className="px-4 py-2 text-[11px] font-medium text-center"
                    style={{ background: estagioConfig.color + '15', color: estagioConfig.color }}
                  >
                    Novo status: <strong>{estagioConfig.label}</strong>
                  </div>
                )}

                {/* Erros de validação */}
                {erros[item.oportunidade_id]?.length > 0 && (
                  <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                    <p className="text-xs font-semibold text-red-600 mb-1">Preencha os campos obrigatórios:</p>
                    <ul className="text-xs text-red-500 space-y-0.5">
                      {erros[item.oportunidade_id].map((e, i) => (
                        <li key={i}>- {e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="mt-6 pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition shadow-lg ${
              submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {submitting ? 'Enviando...' : `Enviar Atualizações`}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-3">
            Preencha as propostas que quiser e envie. Você pode voltar depois para completar as demais.
          </p>
        </div>
      </div>
    </div>
  );
}
