'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CQPergunta {
  id: number;
  codigo: string;
  descricao: string;
  etapa: string | null;
  avaliacao: string;
  medidaCritica: string | null;
  metodoVerificacao: string | null;
  instrumento: string | null;
  criteriosAceitacao: string | null;
  opcoes: string[];
  requerImagem: boolean;
  imagemDescricao: string | null;
  tipoResposta: string;
  ordem: number;
  ativo: boolean;
}

interface CQSetor {
  id: number;
  codigo: string;
  nome: string;
  processo: string | null;
  produto: string;
  ordem: number;
  ativo: boolean;
  perguntas: CQPergunta[];
}

export default function ConfiguracaoCQPage() {
  const router = useRouter();
  const [setores, setSetores] = useState<CQSetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandedSetor, setExpandedSetor] = useState<number | null>(null);

  // Modais
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [showPerguntaModal, setShowPerguntaModal] = useState(false);
  const [editingSetor, setEditingSetor] = useState<CQSetor | null>(null);
  const [editingPergunta, setEditingPergunta] = useState<CQPergunta | null>(null);
  const [selectedSetorId, setSelectedSetorId] = useState<number | null>(null);

  // Formulários
  const [setorForm, setSetorForm] = useState({
    codigo: '',
    nome: '',
    processo: '',
    produto: 'TOMBADOR',
    ordem: 0
  });

  const [perguntaForm, setPerguntaForm] = useState({
    codigo: '',
    descricao: '',
    etapa: '',
    avaliacao: '100%',
    medida_critica: '',
    metodo_verificacao: '',
    instrumento: '',
    criterios_aceitacao: '',
    opcoes: ['Conforme', 'Não conforme'],
    requer_imagem: false,
    imagem_descricao: '',
    tipo_resposta: 'selecao',
    ordem: 0
  });
  const [opcoesTexto, setOpcoesTexto] = useState('Conforme, Não conforme');

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchSetores();
  }, []);

  const fetchSetores = async () => {
    try {
      const response = await fetch('/api/qualidade/cq-config?includeInactive=true');
      const data = await response.json();
      if (data.success) {
        setSetores(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromFile = async () => {
    if (!confirm('Isso irá importar todos os setores e perguntas do arquivo padrão. Deseja continuar?')) {
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/qualidade/cq-config/import', {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        fetchSetores();
      } else {
        alert(result.error || 'Erro ao importar');
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao importar configurações');
    } finally {
      setImporting(false);
    }
  };

  // Setor handlers
  const handleOpenSetorModal = (setor?: CQSetor) => {
    if (setor) {
      setEditingSetor(setor);
      setSetorForm({
        codigo: setor.codigo,
        nome: setor.nome,
        processo: setor.processo || '',
        produto: setor.produto,
        ordem: setor.ordem
      });
    } else {
      setEditingSetor(null);
      setSetorForm({
        codigo: '',
        nome: '',
        processo: '',
        produto: 'TOMBADOR',
        ordem: setores.length
      });
    }
    setShowSetorModal(true);
  };

  const handleSaveSetor = async () => {
    if (!setorForm.codigo || !setorForm.nome) {
      alert('Código e nome são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const url = editingSetor
        ? `/api/qualidade/cq-config/setor/${editingSetor.id}`
        : '/api/qualidade/cq-config';
      const method = editingSetor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setorForm)
      });

      const result = await response.json();
      if (result.success) {
        setShowSetorModal(false);
        fetchSetores();
      } else {
        alert(result.error || 'Erro ao salvar setor');
      }
    } catch (error) {
      console.error('Erro ao salvar setor:', error);
      alert('Erro ao salvar setor');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetor = async (setor: CQSetor) => {
    if (!confirm(`Tem certeza que deseja excluir o setor "${setor.nome}" e todas as suas perguntas?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/qualidade/cq-config/setor/${setor.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchSetores();
      } else {
        alert(result.error || 'Erro ao excluir setor');
      }
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
    }
  };

  // Pergunta handlers
  const handleOpenPerguntaModal = (setorId: number, pergunta?: CQPergunta) => {
    setSelectedSetorId(setorId);
    if (pergunta) {
      setEditingPergunta(pergunta);
      const opcoes = pergunta.opcoes || ['Conforme', 'Não conforme'];
      setPerguntaForm({
        codigo: pergunta.codigo,
        descricao: pergunta.descricao,
        etapa: pergunta.etapa || '',
        avaliacao: pergunta.avaliacao || '100%',
        medida_critica: pergunta.medidaCritica || '',
        metodo_verificacao: pergunta.metodoVerificacao || '',
        instrumento: pergunta.instrumento || '',
        criterios_aceitacao: pergunta.criteriosAceitacao || '',
        opcoes,
        requer_imagem: pergunta.requerImagem || false,
        imagem_descricao: pergunta.imagemDescricao || '',
        tipo_resposta: pergunta.tipoResposta || 'selecao',
        ordem: pergunta.ordem || 0
      });
      setOpcoesTexto(opcoes.join('; '));
    } else {
      setEditingPergunta(null);
      const setor = setores.find(s => s.id === setorId);
      const nextOrdem = setor ? setor.perguntas.length : 0;
      const nextNum = setor ? setor.perguntas.length + 1 : 1;
      setPerguntaForm({
        codigo: `CQ${nextNum}-${setor?.codigo || ''}`,
        descricao: '',
        etapa: '',
        avaliacao: '100%',
        medida_critica: '',
        metodo_verificacao: '',
        instrumento: '',
        criterios_aceitacao: '',
        opcoes: ['Conforme', 'Não conforme'],
        requer_imagem: false,
        imagem_descricao: '',
        tipo_resposta: 'selecao',
        ordem: nextOrdem
      });
      setOpcoesTexto('Conforme; Não conforme');
    }
    setShowPerguntaModal(true);
  };

  const handleSavePergunta = async () => {
    if (!perguntaForm.codigo || !perguntaForm.descricao) {
      alert('Código e descrição são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const url = editingPergunta
        ? `/api/qualidade/cq-config/pergunta/${editingPergunta.id}`
        : '/api/qualidade/cq-config/pergunta';
      const method = editingPergunta ? 'PUT' : 'POST';

      const body = editingPergunta
        ? perguntaForm
        : { ...perguntaForm, setor_id: selectedSetorId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        setShowPerguntaModal(false);
        fetchSetores();
      } else {
        alert(result.error || 'Erro ao salvar pergunta');
      }
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      alert('Erro ao salvar pergunta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePergunta = async (pergunta: CQPergunta) => {
    if (!confirm(`Tem certeza que deseja excluir a pergunta "${pergunta.codigo}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/qualidade/cq-config/pergunta/${pergunta.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchSetores();
      } else {
        alert(result.error || 'Erro ao excluir pergunta');
      }
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
    }
  };

  const handleTogglePerguntaAtivo = async (pergunta: CQPergunta) => {
    try {
      const response = await fetch(`/api/qualidade/cq-config/pergunta/${pergunta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !pergunta.ativo })
      });

      const result = await response.json();
      if (result.success) {
        fetchSetores();
      }
    } catch (error) {
      console.error('Erro ao atualizar pergunta:', error);
    }
  };

  const handleOpcoesChange = (value: string) => {
    setOpcoesTexto(value);
    // Parsear opcoes do texto (aceita virgula ou ponto-e-virgula)
    const opcoes = value.split(/[,;]/).map(o => o.trim()).filter(o => o);
    if (opcoes.length > 0) {
      setPerguntaForm(prev => ({ ...prev, opcoes }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/qualidade"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuração de CQ</h1>
                <p className="text-sm text-gray-600">Gerencie os setores e perguntas de Controle de Qualidade</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportFromFile}
                disabled={importing}
                className={`px-4 py-2 ${setores.length === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg flex items-center gap-2 disabled:opacity-50`}
                title={setores.length > 0 ? 'Importa apenas itens que não existem' : 'Importar configuração padrão'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {importing ? 'Importando...' : 'Importar Padrão'}
              </button>
              <button
                onClick={() => handleOpenSetorModal()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Setor
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {setores.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Nenhum setor de CQ configurado</p>
            <button
              onClick={() => handleOpenSetorModal()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Criar Primeiro Setor
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {setores.map((setor) => (
              <div key={setor.id} className={`bg-white rounded-lg shadow ${!setor.ativo ? 'opacity-60' : ''}`}>
                {/* Header do Setor */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedSetor(expandedSetor === setor.id ? null : setor.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${setor.ativo ? 'bg-red-600' : 'bg-gray-400'}`}>
                      {setor.codigo}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{setor.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {setor.processo} | {setor.perguntas.length} perguntas
                        {!setor.ativo && <span className="ml-2 text-red-500">(Inativo)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenSetorModal(setor); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Editar Setor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSetor(setor); }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Excluir Setor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedSetor === setor.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Perguntas do Setor */}
                {expandedSetor === setor.id && (
                  <div className="border-t">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700">Perguntas</h4>
                        <button
                          onClick={() => handleOpenPerguntaModal(setor.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Adicionar Pergunta
                        </button>
                      </div>

                      {setor.perguntas.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhuma pergunta neste setor</p>
                      ) : (
                        <div className="space-y-2">
                          {setor.perguntas.map((pergunta) => (
                            <div
                              key={pergunta.id}
                              className={`border rounded-lg p-3 ${!pergunta.ativo ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-red-600">{pergunta.codigo}</span>
                                    {pergunta.requerImagem && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                        Requer Imagem
                                      </span>
                                    )}
                                    {!pergunta.ativo && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-800 mt-1">{pergunta.descricao}</p>
                                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                                    {pergunta.etapa && <p>Etapa: {pergunta.etapa}</p>}
                                    {pergunta.criteriosAceitacao && <p>Critérios: {pergunta.criteriosAceitacao}</p>}
                                    <p>Opções: {pergunta.opcoes?.join(', ')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                  <button
                                    onClick={() => handleTogglePerguntaAtivo(pergunta)}
                                    className={`p-1.5 rounded ${pergunta.ativo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title={pergunta.ativo ? 'Desativar' : 'Ativar'}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={pergunta.ativo ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleOpenPerguntaModal(setor.id, pergunta)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Editar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePergunta(pergunta)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    title="Excluir"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Setor */}
      {showSetorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-red-600 px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">
                {editingSetor ? 'Editar Setor' : 'Novo Setor'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={setorForm.codigo}
                    onChange={(e) => setSetorForm({ ...setorForm, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ex: A, B, C"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    value={setorForm.ordem}
                    onChange={(e) => setSetorForm({ ...setorForm, ordem: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={setorForm.nome}
                  onChange={(e) => setSetorForm({ ...setorForm, nome: e.target.value })}
                  placeholder="Ex: CORTE, MONTAGEM"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Processo</label>
                <input
                  type="text"
                  value={setorForm.processo}
                  onChange={(e) => setSetorForm({ ...setorForm, processo: e.target.value })}
                  placeholder="Ex: A - CORTE"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <select
                  value={setorForm.produto}
                  onChange={(e) => setSetorForm({ ...setorForm, produto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="TOMBADOR">Tombador</option>
                  <option value="COLETOR">Coletor</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowSetorModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSetor}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pergunta */}
      {showPerguntaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
            <div className="bg-green-600 px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">
                {editingPergunta ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={perguntaForm.codigo}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ex: CQ1-A"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
                  <input
                    type="text"
                    value={perguntaForm.etapa}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, etapa: e.target.value })}
                    placeholder="Ex: VIGA, MONTAGEM"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <textarea
                  value={perguntaForm.descricao}
                  onChange={(e) => setPerguntaForm({ ...perguntaForm, descricao: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avaliação</label>
                  <input
                    type="text"
                    value={perguntaForm.avaliacao}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, avaliacao: e.target.value })}
                    placeholder="Ex: 100%"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medida Crítica</label>
                  <input
                    type="text"
                    value={perguntaForm.medida_critica}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, medida_critica: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Verificação</label>
                  <input
                    type="text"
                    value={perguntaForm.metodo_verificacao}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, metodo_verificacao: e.target.value })}
                    placeholder="Ex: Dimensional, Visual"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instrumento</label>
                  <input
                    type="text"
                    value={perguntaForm.instrumento}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, instrumento: e.target.value })}
                    placeholder="Ex: Trena, Paquímetro"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critérios de Aceitação</label>
                <input
                  type="text"
                  value={perguntaForm.criterios_aceitacao}
                  onChange={(e) => setPerguntaForm({ ...perguntaForm, criterios_aceitacao: e.target.value })}
                  placeholder="Ex: +/- 5 mm"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opções (separadas por ; ou ,)</label>
                <input
                  type="text"
                  value={opcoesTexto}
                  onChange={(e) => handleOpcoesChange(e.target.value)}
                  placeholder="Conforme; Não conforme; Não Aplicável"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perguntaForm.requer_imagem}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_imagem: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Requer anexo de imagem</span>
                </label>
              </div>
              {perguntaForm.requer_imagem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Imagem</label>
                  <input
                    type="text"
                    value={perguntaForm.imagem_descricao}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, imagem_descricao: e.target.value })}
                    placeholder="Ex: ANEXAR IMAGEM DA MONTAGEM"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Resposta</label>
                  <select
                    value={perguntaForm.tipo_resposta}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, tipo_resposta: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="selecao">Seleção (Dropdown)</option>
                    <option value="texto">Texto livre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    value={perguntaForm.ordem}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, ordem: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowPerguntaModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePergunta}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
