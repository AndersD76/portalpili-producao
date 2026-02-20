'use client';

import { useEffect, useState, useRef } from 'react';

interface Material {
  id: number;
  titulo: string;
  descricao: string | null;
  categoria: string;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number;
  arquivo_tipo: string;
  ativo: boolean;
  created_at: string;
}

const CATEGORIAS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CATALOGO', label: 'Catalogo' },
  { value: 'APRESENTACAO', label: 'Apresentacao' },
  { value: 'TABELA', label: 'Tabela' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function AdminMateriaisPage() {
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', descricao: '', categoria: 'MANUAL' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMateriais(); }, []);

  const fetchMateriais = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/materiais');
      const data = await res.json();
      if (data.success) setMateriais(data.data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.titulo) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um arquivo e preencha o titulo' });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('titulo', formData.titulo);
      fd.append('descricao', formData.descricao);
      fd.append('categoria', formData.categoria);

      const res = await fetch('/api/admin/materiais', { method: 'POST', body: fd });
      const result = await res.json();

      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: 'Material enviado com sucesso' });
        setShowModal(false);
        setFormData({ titulo: '', descricao: '', categoria: 'MANUAL' });
        setSelectedFile(null);
        fetchMateriais();
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao enviar' });
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar material' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, titulo: string) => {
    if (!window.confirm(`Excluir "${titulo}"?`)) return;
    try {
      const res = await fetch(`/api/admin/materiais/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: 'Material excluido' });
        fetchMateriais();
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir' });
    }
  };

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    try {
      const res = await fetch(`/api/admin/materiais/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !ativo }),
      });
      const result = await res.json();
      if (result.success) {
        setMensagem({ tipo: 'sucesso', texto: `Material ${!ativo ? 'ativado' : 'desativado'}` });
        fetchMateriais();
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoriaColor = (cat: string) => {
    switch (cat) {
      case 'MANUAL': return 'bg-blue-100 text-blue-800';
      case 'FLYER': return 'bg-green-100 text-green-800';
      case 'CATALOGO': return 'bg-purple-100 text-purple-800';
      case 'APRESENTACAO': return 'bg-orange-100 text-orange-800';
      case 'TABELA': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (tipo: string) => {
    if (tipo?.includes('pdf')) return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    if (tipo?.includes('image')) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materiais</h2>
          <p className="text-gray-600">Manuais, flyers e catalogos para vendedores</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Enviar Material
        </button>
      </div>

      {mensagem && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{mensagem.texto}</span>
          <button onClick={() => setMensagem(null)} className="ml-4 text-lg font-bold">&times;</button>
        </div>
      )}

      {/* Grid de materiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materiais.map((mat) => (
          <div key={mat.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${mat.ativo ? 'border-red-500' : 'border-gray-300 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(mat.arquivo_tipo)} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{mat.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${getCategoriaColor(mat.categoria)}`}>
                    {CATEGORIAS.find(c => c.value === mat.categoria)?.label || mat.categoria}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleAtivo(mat.id, mat.ativo)}
                  className={`p-1 rounded ${mat.ativo ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                  title={mat.ativo ? 'Desativar' : 'Ativar'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mat.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(mat.id, mat.titulo)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {mat.descricao && <p className="text-xs text-gray-500 mb-3">{mat.descricao}</p>}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{mat.arquivo_nome}</span>
              <span>{formatFileSize(mat.arquivo_tamanho)}</span>
            </div>
            <a
              href={mat.arquivo_url}
              download={mat.arquivo_nome}
              className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        ))}

        {materiais.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>Nenhum material cadastrado</p>
            <p className="text-sm mt-1">Clique em "Enviar Material" para adicionar</p>
          </div>
        )}
      </div>

      {/* Modal Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Enviar Material</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Manual Tombador 18m"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descricao do material"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-400 transition"
                >
                  {selectedFile ? (
                    <div>
                      <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-sm text-gray-600">Clique para selecionar arquivo</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, imagens, documentos (max 20MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm">
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !formData.titulo}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
