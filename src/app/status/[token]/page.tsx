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

const ESTAGIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EM_NEGOCIACAO', label: 'Em Negociacao' },
  { value: 'POS_NEGOCIACAO', label: 'Pos Negociacao' },
  { value: 'FECHADA', label: 'Fechada (Ganha)' },
  { value: 'PERDIDA', label: 'Perdida' },
  { value: 'SUSPENSO', label: 'Suspensa' },
];

const ESTAGIO_CORES: Record<string, string> = {
  EM_NEGOCIACAO: '#f97316',
  POS_NEGOCIACAO: '#a855f7',
  FECHADA: '#22c55e',
  PERDIDA: '#ef4444',
  SUSPENSO: '#ca8a04',
};

function fmtValor(v: unknown): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  if (!n || isNaN(n)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export default function StatusCheckPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatusCheckData | null>(null);
  const [respostas, setRespostas] = useState<Record<number, { estagio: string; obs: string }>>({});
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
        // Inicializar respostas com estágio atual
        const init: Record<number, { estagio: string; obs: string }> = {};
        for (const item of json.data.items) {
          init[item.oportunidade_id] = { estagio: item.estagio_anterior, obs: '' };
        }
        setRespostas(init);
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);

    const payload = data.items
      .filter(item => !item.respondido_at) // só não respondidos
      .map(item => ({
        oportunidade_id: item.oportunidade_id,
        estagio_novo: respostas[item.oportunidade_id]?.estagio || item.estagio_anterior,
        observacao: respostas[item.oportunidade_id]?.obs || '',
      }));

    try {
      const res = await fetch(`/api/public/status-check/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respostas: payload }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        alert(json.error || 'Erro ao enviar');
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges = data?.items.some(
    item => !item.respondido_at && respostas[item.oportunidade_id]?.estagio !== item.estagio_anterior
  );

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

  // ==================== SUCCESS ====================
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Obrigado!</h1>
          <p className="text-gray-500">Status atualizado com sucesso.</p>
        </div>
      </div>
    );
  }

  // ==================== ALREADY COMPLETED ====================
  if (data?.status === 'CONCLUIDO') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ja Respondido</h1>
          <p className="text-gray-500">Este status check ja foi respondido. Obrigado!</p>
        </div>
      </div>
    );
  }

  // ==================== FORM ====================
  const pendingItems = data?.items.filter(i => !i.respondido_at) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Pili Equipamentos</h1>
          <p className="text-red-200 text-sm">Atualizar Status de Propostas</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Ola, {data?.vendedor_nome?.split(' ')[0]}!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Atualize o status de {pendingItems.length} proposta{pendingItems.length > 1 ? 's' : ''} abaixo:
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {pendingItems.map(item => {
            const resp = respostas[item.oportunidade_id];
            const changed = resp?.estagio !== item.estagio_anterior;

            return (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border-2 p-4 transition ${changed ? 'border-red-300' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{item.cliente_nome || item.titulo}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{item.produto || '-'}</span>
                      <span>|</span>
                      <span className="font-medium text-gray-600">{fmtValor(item.valor_estimado)}</span>
                      {item.numero_proposta && (
                        <>
                          <span>|</span>
                          <span>#{item.numero_proposta}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap flex-shrink-0"
                    style={{ background: ESTAGIO_CORES[item.estagio_anterior] || '#6b7280' }}
                  >
                    {ESTAGIO_OPTIONS.find(e => e.value === item.estagio_anterior)?.label || item.estagio_anterior}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Novo status:</label>
                  <select
                    value={resp?.estagio || item.estagio_anterior}
                    onChange={e => setRespostas(prev => ({
                      ...prev,
                      [item.oportunidade_id]: { ...prev[item.oportunidade_id], estagio: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {ESTAGIO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {changed && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Observacao (opcional):</label>
                      <textarea
                        value={resp?.obs || ''}
                        onChange={e => setRespostas(prev => ({
                          ...prev,
                          [item.oportunidade_id]: { ...prev[item.oportunidade_id], obs: e.target.value }
                        }))}
                        rows={2}
                        placeholder="Ex: Cliente pediu prazo maior..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition ${
              submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {submitting ? 'Enviando...' : 'Enviar Atualizacoes'}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Link valido ate {data?.expires_at ? new Date(data.expires_at).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
