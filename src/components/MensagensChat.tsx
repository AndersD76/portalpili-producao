'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mensagem } from '@/types/opd';

interface MensagensChatProps {
  mensagens: Mensagem[];
  numeroOpd: string;
  onNovaMensagem: (mensagem: string, autor: string) => Promise<void>;
}

export default function MensagensChat({
  mensagens,
  numeroOpd,
  onNovaMensagem,
}: MensagensChatProps) {
  const [novaMensagem, setNovaMensagem] = useState('');
  const [autor, setAutor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaMensagem.trim() || !autor.trim()) {
      toast.warning('Por favor, preencha o nome e a mensagem');
      return;
    }

    setEnviando(true);
    try {
      await onNovaMensagem(novaMensagem, autor);
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Ordenar mensagens por timestamp (mais recentes primeiro)
  const mensagensOrdenadas = [...mensagens].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <h3 className="text-xl font-bold text-gray-900">
          Comunicações e Recados
        </h3>
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          {mensagens.length}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Registro de mudanças, comunicações e informações importantes sobre a OPD {numeroOpd}
      </p>

      {/* Formulário para nova mensagem */}
      <form onSubmit={handleEnviar} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seu Nome: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Digite seu nome"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={enviando}
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensagem: <span className="text-red-600">*</span>
          </label>
          <textarea
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            placeholder="Digite a mensagem, comunicação ou mudança..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            disabled={enviando}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {enviando ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Enviar Mensagem</span>
            </>
          )}
        </button>
      </form>

      {/* Lista de mensagens */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {mensagensOrdenadas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a adicionar uma comunicação</p>
          </div>
        ) : (
          mensagensOrdenadas.map((msg) => (
            <div
              key={msg.id}
              className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg hover:bg-blue-100 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {msg.autor.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{msg.autor}</p>
                    <p className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{msg.mensagem}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
