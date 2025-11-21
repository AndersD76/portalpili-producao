'use client';

import { useState, useEffect, useRef } from 'react';

interface Comentario {
  id: number;
  numero_opd: string;
  usuario_id: number | null;
  usuario_nome: string;
  usuario_id_funcionario: string | null;
  mensagem: string;
  tipo: string;
  arquivos: any;
  created: string;
  updated: string;
}

interface ChatOPDProps {
  numeroOPD: string;
}

export default function ChatOPD({ numeroOPD }: ChatOPDProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carregar comentários iniciais
  useEffect(() => {
    fetchComentarios();
  }, [numeroOPD]);

  // Polling automático - atualizar comentários a cada 5 segundos
  // Isso permite que mensagens de outros usuários apareçam automaticamente
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComentarios(true); // true = silent update (não mostra loading)
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval);
  }, [numeroOPD]);

  const fetchComentarios = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/comentarios/${numeroOPD}`);
      const data = await response.json();

      if (data.success) {
        setComentarios(data.data.reverse()); // Reverter para mostrar do mais antigo ao mais novo
      }
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaMensagem.trim()) return;

    // Verificar se há dados de usuário salvos (de autenticação anterior)
    const userDataString = localStorage.getItem('user_data');
    let usuario = null;

    if (userDataString) {
      try {
        usuario = JSON.parse(userDataString);
      } catch (e) {
        console.error('Erro ao parsear dados do usuário');
      }
    }

    setEnviando(true);
    try {
      const response = await fetch(`/api/comentarios/${numeroOPD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario_id: usuario?.id || null,
          usuario_nome: usuario?.nome || 'Anônimo',
          usuario_id_funcionario: usuario?.id_funcionario || null,
          mensagem: novaMensagem,
          tipo: 'COMENTARIO'
        })
      });

      const result = await response.json();

      if (result.success) {
        setNovaMensagem('');
        fetchComentarios(); // Recarregar comentários
      } else {
        alert('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias < 7) return `${diffDias}d atrás`;

    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIniciais = (nome: string) => {
    const partes = nome.split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  const getCoresAvatar = (nome: string) => {
    const cores = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];

    const index = nome.charCodeAt(0) % cores.length;
    return cores[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="font-semibold">Chat da OPD</h3>
          </div>
          <span className="text-xs bg-red-500 px-2 py-1 rounded-full">
            {comentarios.length}
          </span>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {comentarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comentarios.map((comentario) => (
            <div key={comentario.id} className="flex space-x-2">
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getCoresAvatar(comentario.usuario_nome)} flex items-center justify-center text-white font-semibold text-xs`}>
                {getIniciais(comentario.usuario_nome)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-semibold text-gray-900 text-xs truncate">
                        {comentario.usuario_nome}
                      </span>
                      {comentario.usuario_id_funcionario && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {comentario.usuario_id_funcionario}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatarData(comentario.created)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comentario.mensagem}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Formulário de Nova Mensagem */}
      <form onSubmit={handleEnviarMensagem} className="border-t border-gray-200 p-3 bg-white rounded-b-lg flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={enviando}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={enviando || !novaMensagem.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-sm">Enviar</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          As mensagens ficam salvas permanentemente nesta OPD
        </p>
      </form>
    </div>
  );
}
