'use client';

import { useState, useEffect } from 'react';

interface ModalDetalheOportunidadeProps {
  oportunidadeId: number;
  onClose: () => void;
  onSave?: () => void;
}

const ESTAGIOS_OPTIONS = [
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'EM_NEGOCIACAO', label: 'Em Negociação' },
  { value: 'POS_NEGOCIACAO', label: 'Pós Negociação' },
  { value: 'FECHADA', label: 'Fechada' },
  { value: 'PERDIDA', label: 'Perdida' },
  { value: 'TESTE', label: 'Teste' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'SUBSTITUIDO', label: 'Substituído' },
];

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNum(value));

const formatDate = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
};

const ESTAGIO_COLORS: Record<string, string> = {
  EM_ANALISE: '#06b6d4',
  EM_NEGOCIACAO: '#f97316',
  POS_NEGOCIACAO: '#a855f7',
  FECHADA: '#22c55e',
  PERDIDA: '#ef4444',
  TESTE: '#ec4899',
  SUSPENSO: '#ca8a04',
  SUBSTITUIDO: '#6366f1',
  PROSPECCAO: '#3b82f6',
  QUALIFICACAO: '#14b8a6',
  PROPOSTA: '#a855f7',
};

const STATUS_COLORS: Record<string, string> = {
  ABERTA: 'bg-blue-100 text-blue-800',
  GANHA: 'bg-green-100 text-green-800',
  PERDIDA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-gray-100 text-gray-600',
};

const ATIVIDADE_ICONS: Record<string, string> = {
  LIGACAO: '📞',
  EMAIL: '📧',
  REUNIAO: '🤝',
  VISITA: '🏢',
  TAREFA: '📋',
  NOTA: '📝',
  WHATSAPP: '💬',
  PROPOSTA: '📄',
};

export default function ModalDetalheOportunidade({
  oportunidadeId,
  onClose,
  onSave,
}: ModalDetalheOportunidadeProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tab, setTab] = useState<'info' | 'atividades' | 'interacoes' | 'propostas'>('info');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    estagio: '',
    valor_estimado: '',
    probabilidade: '',
    observacoes: '',
    nota_contato: '',
  });

  useEffect(() => {
    fetchData();
  }, [oportunidadeId]);

  const fetchData = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/comercial/oportunidades/${oportunidadeId}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setEditForm({
          estagio: result.data.estagio || '',
          valor_estimado: String(toNum(result.data.valor_estimado)),
          probabilidade: String(toNum(result.data.probabilidade)),
          observacoes: result.data.observacoes || '',
          nota_contato: '',
        });
      } else {
        setErro(result.error || 'Erro ao buscar oportunidade');
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidade:', error);
      setErro('Erro de conexão ao buscar oportunidade');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/comercial/oportunidades/${oportunidadeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estagio: editForm.estagio,
          valor_estimado: parseFloat(editForm.valor_estimado) || 0,
          probabilidade: parseInt(editForm.probabilidade) || 0,
          observacoes: editForm.observacoes,
          nota_contato: editForm.nota_contato,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditMode(false);
        await fetchData();
        onSave?.();
      } else {
        alert(result.error || 'Erro ao salvar');
      }
    } catch {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-8" onClick={e => e.stopPropagation()}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-red-600 font-semibold">Oportunidade não encontrada</p>
          {erro && <p className="text-sm text-gray-500 mt-1">{erro}</p>}
          <button onClick={onClose} className="mt-3 px-4 py-2 bg-gray-200 rounded-lg text-sm">Fechar</button>
        </div>
      </div>
    );
  }

  const atividades = data.atividades || [];
  const interacoes = data.interacoes || [];
  const propostas = data.propostas || [];
  const atividadesConcluidas = atividades.filter((a: any) => a.concluida || a.status === 'CONCLUIDA').length;
  const atividadesAtrasadas = atividades.filter((a: any) => a.status === 'ATRASADA' || (!a.concluida && a.data_agendada && new Date(a.data_agendada) < new Date())).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="border-b px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: ESTAGIO_COLORS[data.estagio] || '#6b7280' }}>
                {ESTAGIOS_OPTIONS.find(e => e.value === data.estagio)?.label || data.estagio}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_COLORS[data.status] || 'bg-gray-100 text-gray-600'}`}>
                {data.status}
              </span>
              <span className="text-xs text-gray-400">#{data.id}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 truncate">{data.titulo}</h3>
            <p className="text-sm text-gray-500">{data.produto || '-'} &bull; {data.vendedor_nome || '-'}</p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button onClick={() => setEditMode(!editMode)}
              className={`p-1.5 rounded-lg transition ${editMode ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Editar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b px-6 flex gap-1 flex-shrink-0">
          {[
            { key: 'info' as const, label: 'Detalhes' },
            { key: 'atividades' as const, label: `Atividades (${atividades.length})` },
            { key: 'interacoes' as const, label: `Interações (${interacoes.length})` },
            { key: 'propostas' as const, label: `Propostas (${propostas.length})` },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                tab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* TAB INFO */}
          {tab === 'info' && (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</h4>
                <div className="font-semibold text-gray-900">{data.cliente_fantasia || data.cliente_nome}</div>
                {data.cliente_fantasia && data.cliente_nome && data.cliente_fantasia !== data.cliente_nome && (
                  <div className="text-xs text-gray-500">{data.cliente_nome}</div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                  {data.cliente_cnpj && <div><span className="text-gray-400">CNPJ:</span> {data.cliente_cnpj}</div>}
                  {data.cliente_telefone && <div><span className="text-gray-400">Tel:</span> {data.cliente_telefone}</div>}
                  {data.cliente_email && <div><span className="text-gray-400">Email:</span> {data.cliente_email}</div>}
                  {data.cliente_segmento && <div><span className="text-gray-400">Segmento:</span> {data.cliente_segmento}</div>}
                </div>
              </div>

              {/* Financeiro */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-600">Valor Estimado</div>
                  <div className="font-bold text-green-800">{formatCurrency(data.valor_estimado)}</div>
                </div>
                {toNum(data.valor_final) > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-emerald-600">Valor Final</div>
                    <div className="font-bold text-emerald-800">{formatCurrency(data.valor_final)}</div>
                  </div>
                )}
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600">Probabilidade</div>
                  <div className="font-bold text-blue-800">{toNum(data.probabilidade)}%</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-600">Previsão</div>
                  <div className="font-bold text-orange-800 text-sm">{formatDate(data.data_previsao_fechamento)}</div>
                </div>
              </div>

              {/* Atividades resumo */}
              {atividades.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">{atividades.length} atividade(s)</span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">{atividadesConcluidas} concluída(s)</span>
                  {atividadesAtrasadas > 0 && (
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded">{atividadesAtrasadas} atrasada(s)</span>
                  )}
                </div>
              )}

              {/* Detalhes técnicos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Detalhes</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {data.tamanho_interesse && <div><span className="text-gray-400">Tamanho:</span> {data.tamanho_interesse}m</div>}
                  {data.tipo_interesse && <div><span className="text-gray-400">Tipo:</span> {data.tipo_interesse}</div>}
                  {data.fonte && <div><span className="text-gray-400">Fonte:</span> {data.fonte}</div>}
                  {data.temperatura && <div><span className="text-gray-400">Temperatura:</span> {data.temperatura}</div>}
                  {data.concorrente && <div><span className="text-gray-400">Concorrente:</span> {data.concorrente}</div>}
                  {data.motivo_perda && <div><span className="text-gray-400">Motivo perda:</span> {data.motivo_perda}</div>}
                  {data.justificativa_perda && <div className="col-span-2"><span className="text-gray-400">Justificativa:</span> {data.justificativa_perda}</div>}
                  <div><span className="text-gray-400">Dias no estágio:</span> {toNum(data.dias_no_estagio)}</div>
                  <div><span className="text-gray-400">Criado em:</span> {formatDate(data.created_at)}</div>
                  {data.data_abertura && <div><span className="text-gray-400">Data abertura:</span> {formatDate(data.data_abertura)}</div>}
                  {data.data_fechamento && <div><span className="text-gray-400">Data fechamento:</span> {formatDate(data.data_fechamento)}</div>}
                </div>
              </div>

              {/* Observações */}
              {data.observacoes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-yellow-600 uppercase mb-1">Observações</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observacoes}</p>
                </div>
              )}

              {/* Descrição */}
              {data.descricao && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Descrição</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.descricao}</p>
                </div>
              )}

              {/* Próxima ação */}
              {data.proxima_acao && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-purple-600 uppercase mb-1">Próxima Ação</h4>
                  <p className="text-sm text-gray-700">{data.proxima_acao}</p>
                  {data.data_proxima_acao && (
                    <p className="text-xs text-purple-500 mt-1">Data: {formatDate(data.data_proxima_acao)}</p>
                  )}
                </div>
              )}

              {/* Edição rápida */}
              {editMode && (
                <div className="border-2 border-red-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-red-600 uppercase">Edição Rápida</h4>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estágio</label>
                    <select value={editForm.estagio} onChange={e => setEditForm({ ...editForm, estagio: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500">
                      {ESTAGIOS_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                      <input type="number" value={editForm.valor_estimado}
                        onChange={e => setEditForm({ ...editForm, valor_estimado: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Probabilidade (%)</label>
                      <input type="number" min="0" max="100" value={editForm.probabilidade}
                        onChange={e => setEditForm({ ...editForm, probabilidade: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <textarea rows={2} value={editForm.observacoes}
                      onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
                      placeholder="Anotações..." />
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <label className="block text-xs font-medium text-blue-700 mb-1">Registrar Contato</label>
                    <textarea rows={2} value={editForm.nota_contato}
                      onChange={e => setEditForm({ ...editForm, nota_contato: e.target.value })}
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="O que foi tratado neste contato?" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                      Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB ATIVIDADES */}
          {tab === 'atividades' && (
            <div className="space-y-2">
              {atividades.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade registrada</p>
              ) : (
                atividades.map((a: any, i: number) => {
                  const concluida = a.concluida || a.status === 'CONCLUIDA';
                  const atrasada = !concluida && a.data_agendada && new Date(a.data_agendada) < new Date();
                  return (
                    <div key={a.id || i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      concluida ? 'bg-green-50 border-green-200' : atrasada ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}>
                      <span className="text-lg flex-shrink-0">{ATIVIDADE_ICONS[a.tipo] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{a.titulo || a.tipo}</div>
                        <div className="text-xs text-gray-500">
                          {a.tipo} &bull; {formatDate(a.data_agendada)}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        concluida ? 'bg-green-100 text-green-700' : atrasada ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {concluida ? 'Concluída' : atrasada ? 'Atrasada' : 'Pendente'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB INTERAÇÕES */}
          {tab === 'interacoes' && (
            <div className="space-y-3">
              {interacoes.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Nenhuma interação registrada</p>
              ) : (
                interacoes
                  .sort((a: any, b: any) => new Date(b.data || b.created_at).getTime() - new Date(a.data || a.created_at).getTime())
                  .map((int: any, i: number) => (
                    <div key={int.id || i} className="flex gap-3 pl-3 border-l-2 border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{int.tipo}</span>
                          <span className="text-xs text-gray-400">{formatDate(int.data)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{int.descricao || '-'}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB PROPOSTAS */}
          {tab === 'propostas' && (
            <div className="space-y-2">
              {propostas.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Nenhuma proposta vinculada</p>
              ) : (
                propostas.map((p: any, i: number) => (
                  <div key={p.id || i} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Proposta #{p.numero || p.id}</div>
                      <div className="text-xs text-gray-500">{formatDate(p.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700 text-sm">{formatCurrency(p.valor_total)}</div>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{p.situacao}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
