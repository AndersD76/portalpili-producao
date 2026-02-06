'use client';

import { useState, useRef, useEffect } from 'react';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssistenteIAQualidadeProps {
  contexto?: {
    nc_numero?: string;
    nc_descricao?: string;
    tipo_origem?: string;
    origem_descricao?: string;
  };
  sugestoes?: string[];
  onClose?: () => void;
}

export default function AssistenteIAQualidade({
  contexto,
  sugestoes = [],
  onClose,
}: AssistenteIAQualidadeProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o assistente de qualidade PILI. Posso ajudá-lo a analisar causas de não conformidades, sugerir ações corretivas e identificar padrões. Como posso ajudar?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
      const response = await fetch('/api/qualidade/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: texto,
          historico: mensagens.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          contexto,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMensagens((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.data.resposta,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMensagens((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.error || 'Desculpe, ocorreu um erro. Tente novamente.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Erro de conexão. Verifique sua internet e tente novamente.',
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

  const handleSugestaoClick = (sugestao: string) => {
    enviarMensagem(sugestao);
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors z-50"
        onClick={() => setIsMinimized(false)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {mensagens.length > 1 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {mensagens.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">Assistente Qualidade</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Contexto */}
      {contexto?.nc_numero && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 border-b">
          <span className="font-medium">NC:</span> {contexto.nc_numero}
          {contexto.nc_descricao && <span className="ml-2">- {contexto.nc_descricao.substring(0, 50)}...</span>}
        </div>
      )}
      {contexto?.origem_descricao && !contexto.nc_numero && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 border-b">
          <span className="font-medium">Origem:</span> {contexto.origem_descricao}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {mensagens.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span
                className={`text-xs mt-1 block ${
                  msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
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
                <span className="text-xs text-gray-500">Analisando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões rápidas */}
      {sugestoes.length > 0 && mensagens.length <= 2 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-1">
            {sugestoes.map((sugestao, idx) => (
              <button
                key={idx}
                onClick={() => handleSugestaoClick(sugestao)}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 transition-colors"
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => enviarMensagem(inputValue)}
            disabled={loading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
