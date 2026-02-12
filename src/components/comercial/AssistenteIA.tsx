'use client';

import { useState, useRef, useEffect } from 'react';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssistenteIAProps {
  contexto?: {
    cliente?: string;
    oportunidade_id?: number;
    proposta_id?: number;
  };
  sugestoes?: string[];
  onClose?: () => void;
}

export default function AssistenteIA({
  contexto,
  sugestoes = [],
  onClose,
}: AssistenteIAProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: 'assistant',
      content: 'Ola! Sou o assistente de vendas PILI. Como posso ajuda-lo hoje?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const enviarMensagem = async (texto: string) => {
    if (!texto.trim()) return;

    const novaMensagem: Mensagem = {
      role: 'user',
      content: texto,
      timestamp: new Date(),
    };

    setMensagens((prev) => [...prev, novaMensagem]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/comercial/ia/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'chat',
          dados: {
            mensagem: texto,
            historico_chat: mensagens.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            contexto,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMensagens((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.data,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMensagens((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro. Tente novamente.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Erro de conexao. Verifique sua internet e tente novamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="bg-red-600 text-white p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-semibold text-sm">Assistente PILI</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-700 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Contexto */}
      {contexto?.cliente && (
        <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 border-b flex-shrink-0">
          <span className="font-medium">Contexto:</span> {contexto.cliente}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {mensagens.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <span
                className={`text-xs mt-1 block ${
                  msg.role === 'user' ? 'text-red-200' : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
                <span className="text-xs text-gray-500">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestoes rapidas */}
      {sugestoes.length > 0 && mensagens.length <= 2 && (
        <div className="px-3 py-2 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-1.5">Sugestoes:</p>
          <div className="flex flex-wrap gap-1">
            {sugestoes.map((sugestao, idx) => (
              <button
                key={idx}
                onClick={() => enviarMensagem(sugestao)}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2.5 border-t flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua pergunta..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 min-w-0"
          />
          <button
            onClick={() => enviarMensagem(inputValue)}
            disabled={loading || !inputValue.trim()}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
