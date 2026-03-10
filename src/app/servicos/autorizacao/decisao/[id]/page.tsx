'use client';

import { useEffect, useState, use } from 'react';

interface Authorization {
  id: string;
  code: string;
  requester_name: string;
  requester_phone: string | null;
  requester_email: string | null;
  reason: string;
  amount: number;
  manager_name: string;
  status: string;
  decision_at: string | null;
  created_at: string;
}

export default function DecisaoAutorizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [auth, setAuth] = useState<Authorization | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/servicos/autorizacoes/${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setAuth(res.data);
        else setError(res.error || 'Não encontrada');
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecision = async (status: 'Aprovada' | 'Reprovada') => {
    setDeciding(true);
    setError(null);
    try {
      const res = await fetch(`/api/servicos/autorizacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setAuth(data.data);
      } else {
        setError(data.error || 'Erro ao processar');
        // If already decided, update local state
        if (data.data) setAuth(data.data);
      }
    } catch {
      setError('Erro ao processar');
    }
    setDeciding(false);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#075E54] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !auth) {
    return (
      <div className="min-h-screen bg-[#075E54] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!auth) return null;

  // Already decided
  if (auth.status !== 'Pendente') {
    const isApproved = auth.status === 'Aprovada';
    const requesterPhone = auth.requester_phone?.replace(/\D/g, '') || '';

    const notifyMessage = isApproved
      ? encodeURIComponent(
          `*Autorização APROVADA* ✅\n\n` +
          `${auth.requester_name}, sua solicitação foi aprovada!\n\n` +
          `Motivo: ${auth.reason}\n` +
          `Valor: ${fmt(Number(auth.amount))}\n` +
          `Código: *${auth.code}*\n\n` +
          `Use este código ao registrar a despesa.`
        )
      : encodeURIComponent(
          `*Autorização REPROVADA* ❌\n\n` +
          `${auth.requester_name}, sua solicitação foi reprovada.\n\n` +
          `Motivo: ${auth.reason}\n` +
          `Valor: ${fmt(Number(auth.amount))}`
        );

    return (
      <div className="min-h-screen bg-[#075E54] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isApproved ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isApproved ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>

          <h2 className="text-xl font-bold mb-1">{isApproved ? 'APROVADA' : 'REPROVADA'}</h2>
          <p className="text-gray-500 text-sm mb-4">{auth.requester_name} — {fmt(Number(auth.amount))}</p>

          {isApproved && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-green-600 mb-1">Código de Autorização</p>
              <p className="text-3xl font-mono font-bold text-green-700 tracking-widest">{auth.code}</p>
            </div>
          )}

          {requesterPhone && (
            <a
              href={`https://wa.me/${requesterPhone.length <= 11 ? '55' : ''}${requesterPhone}?text=${notifyMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-colors"
            >
              Notificar via WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  // Pending - show decision buttons
  return (
    <div className="min-h-screen bg-[#075E54] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Solicitação de Autorização</h2>
          <p className="text-xs text-gray-400">PILI TECH — Despesas de Campo</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Solicitante</span>
            <span className="font-medium">{auth.requester_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Motivo</span>
            <span className="font-medium text-right max-w-[60%]">{auth.reason}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Valor</span>
            <span className="font-bold text-lg">{fmt(Number(auth.amount))}</span>
          </div>
          {auth.requester_phone && (
            <div className="flex justify-between">
              <span className="text-gray-500">Contato</span>
              <span>{auth.requester_phone}</span>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDecision('Reprovada')}
            disabled={deciding}
            className="py-3 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            REPROVAR
          </button>
          <button
            onClick={() => handleDecision('Aprovada')}
            disabled={deciding}
            className="py-3 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            APROVAR
          </button>
        </div>
      </div>
    </div>
  );
}
