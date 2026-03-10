'use client';

import { useState } from 'react';
import { MANAGERS_CONFIG } from '@/lib/servicos/constants';

export default function SolicitarAutorizacaoPage() {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');
  const [valor, setValor] = useState('');
  const [gerente, setGerente] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const managers = Object.keys(MANAGERS_CONFIG);

  const handleSubmit = async () => {
    setError(null);
    if (!nome || !motivo || !valor || !gerente) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/servicos/autorizacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: nome,
          requester_phone: whatsapp || null,
          requester_email: email || null,
          reason: motivo,
          amount: parseFloat(valor),
          manager_name: gerente,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Erro ao criar solicitação');
      }
    } catch {
      setError('Erro ao enviar');
    }
    setLoading(false);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const decisionLink = result ? `${baseUrl}/servicos/autorizacao/decisao/${result.id}` : '';
  const managerPhone = MANAGERS_CONFIG[gerente] || '';

  const whatsappMessage = result
    ? encodeURIComponent(
        `*Solicitação de Autorização - PILI*\n\n` +
        `Solicitante: ${nome}\n` +
        `Motivo: ${motivo}\n` +
        `Valor: R$ ${parseFloat(valor).toFixed(2)}\n\n` +
        `Para aprovar ou reprovar, acesse:\n${decisionLink}`
      )
    : '';

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Solicitação Enviada!</h2>
          <p className="text-sm text-gray-500 mb-4">
            Agora envie o link de aprovação para <strong>{gerente}</strong> via WhatsApp.
          </p>

          <a
            href={`https://wa.me/${managerPhone}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors mb-3"
          >
            Enviar via WhatsApp
          </a>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-left">
            <p className="text-gray-500 mb-1">Link de decisão:</p>
            <p className="font-mono text-blue-600 break-all">{decisionLink}</p>
          </div>

          <button
            onClick={() => { setResult(null); setNome(''); setMotivo(''); setValor(''); setGerente(''); }}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600"
          >
            Nova solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-sm mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Solicitar Autorização</h1>
          <p className="text-sm text-gray-500 mt-1">Para despesas com Peças ou Outros</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Seu Nome *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Nome completo" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">WhatsApp</label>
            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="(DDD) 99999-9999" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="email@exemplo.com" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo *</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none" placeholder="Descreva o que precisa comprar/contratar" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Valor Estimado (R$) *</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="0,00" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Gerente Responsável *</label>
            <select value={gerente} onChange={e => setGerente(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm">
              <option value="">Selecione...</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Enviando...' : 'Solicitar Autorização'}
          </button>
        </div>
      </div>
    </div>
  );
}
