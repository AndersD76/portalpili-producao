'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TURNOS_TRABALHO,
  UNIDADES_FABRICACAO,
  PROCESSOS_ORIGEM,
  TAREFAS_ORIGEM,
  GRAVIDADES_NAO_CONFORMIDADE,
  TIPOS_NAO_CONFORMIDADE,
  DISPOSICOES_NAO_CONFORMIDADE,
  TurnoTrabalho,
  UnidadeFabricacao,
  ProcessoOrigem,
  TarefaOrigem,
  GravidadeNaoConformidade,
  TipoNaoConformidade,
  DisposicaoNaoConformidade,
  Anexo
} from '@/types/qualidade';

export default function NovaNaoConformidadePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Identificação
    data_emissao: new Date().toISOString().split('T')[0],
    responsavel_emissao: '',
    turno_trabalho: '' as TurnoTrabalho | '',
    unidade_fabricacao: '' as UnidadeFabricacao | '',
    processo_origem: '' as ProcessoOrigem | '',
    // Origem
    tarefa_origem: '' as TarefaOrigem | '',
    numero_opd: '',
    codigo_peca: '',
    // Descrição
    descricao: '',
    quantidade_itens: '',
    evidencia_objetiva: '',
    acao_imediata: '',
    responsaveis_acoes: '',
    prazo_acoes: '',
    // Classificação
    gravidade: '' as GravidadeNaoConformidade | '',
    tipo: '' as TipoNaoConformidade | '',
    // Disposição
    disposicao: '' as DisposicaoNaoConformidade | '',
    responsavel_liberacao: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles: Anexo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'nao_conformidade');

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      setAnexos(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const response = await fetch('/api/qualidade/nao-conformidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Mapear campos do formulário para campos da API
          data_ocorrencia: formData.data_emissao,
          local_ocorrencia: formData.unidade_fabricacao,
          setor_responsavel: formData.processo_origem,
          tipo: formData.tipo,
          origem: formData.tarefa_origem,
          gravidade: formData.gravidade,
          descricao: formData.descricao,
          evidencias: formData.evidencia_objetiva,
          produtos_afetados: formData.codigo_peca,
          detectado_por: formData.responsavel_emissao,
          acao_contencao: formData.acao_imediata,
          responsavel_contencao: formData.responsaveis_acoes,
          data_contencao: formData.prazo_acoes,
          disposicao: formData.disposicao,
          numero_opd: formData.numero_opd,
          turno_trabalho: formData.turno_trabalho,
          quantidade_itens: formData.quantidade_itens ? parseInt(formData.quantidade_itens) : 0,
          anexos: anexos.length > 0 ? anexos : null,
          created_by: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/qualidade/nao-conformidade');
      } else {
        setError(result.error || 'Erro ao criar não conformidade');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/qualidade/nao-conformidade"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">REGISTRO DE NÃO CONFORMIDADES</h1>
              <p className="text-sm text-gray-600">Nº 57-1 - REV 01</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* IDENTIFICAÇÃO */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">IDENTIFICAÇÃO</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da emissão *</label>
                <input
                  type="date"
                  name="data_emissao"
                  value={formData.data_emissao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela emissão *</label>
                <input
                  type="text"
                  name="responsavel_emissao"
                  value={formData.responsavel_emissao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno de trabalho *</label>
                <select
                  name="turno_trabalho"
                  value={formData.turno_trabalho}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(TURNOS_TRABALHO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de fabricação *</label>
                <select
                  name="unidade_fabricacao"
                  value={formData.unidade_fabricacao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(UNIDADES_FABRICACAO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Processo de origem *</label>
                <select
                  name="processo_origem"
                  value={formData.processo_origem}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(PROCESSOS_ORIGEM).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ORIGEM */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ORIGEM</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarefa de origem *</label>
                <select
                  name="tarefa_origem"
                  value={formData.tarefa_origem}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(TAREFAS_ORIGEM).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OPD (Ordem de Produção) *</label>
                <input
                  type="text"
                  name="numero_opd"
                  value={formData.numero_opd}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código da peça, sub conjunto ou conjunto *</label>
                <input
                  type="text"
                  name="codigo_peca"
                  value={formData.codigo_peca}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Anexe alguma imagem ou documento</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Enviando arquivos...</p>}
                {anexos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {anexos.map((anexo, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{anexo.filename}</span>
                        <button type="button" onClick={() => removeAnexo(index)} className="text-red-600 hover:text-red-800">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">DESCRIÇÃO</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da não conformidade *</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de itens não conformes *</label>
                  <input
                    type="number"
                    name="quantidade_itens"
                    value={formData.quantidade_itens}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidência objetiva *</label>
                <textarea
                  name="evidencia_objetiva"
                  value={formData.evidencia_objetiva}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ação imediata *</label>
                <textarea
                  name="acao_imediata"
                  value={formData.acao_imediata}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis pelas ações imediatas *</label>
                  <input
                    type="text"
                    name="responsaveis_acoes"
                    value={formData.responsaveis_acoes}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo para concluir as ações imediatas *</label>
                  <input
                    type="date"
                    name="prazo_acoes"
                    value={formData.prazo_acoes}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CLASSIFICAÇÃO */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CLASSIFICAÇÃO</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade da não conformidade *</label>
                <select
                  name="gravidade"
                  value={formData.gravidade}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(GRAVIDADES_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p><strong>Alta:</strong> Falhas críticas estruturais; Defeitos repetidos em lote; Desvios que afetam funcionalidade; Problemas de acabamento significativos</p>
                  <p><strong>Média:</strong> Variações que não comprometem segurança, mas precisam de ajuste</p>
                  <p><strong>Baixa:</strong> Ajustes simples e pontuais; Erros administrativos sem impacto no produto</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de não conformidade *</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(TIPOS_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DISPOSIÇÃO */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">DISPOSIÇÃO</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disposição da não conformidade *</label>
                <select
                  name="disposicao"
                  value={formData.disposicao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(DISPOSICOES_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {formData.disposicao === 'ACEITE_CONDICIONAL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela liberação</label>
                  <input
                    type="text"
                    name="responsavel_liberacao"
                    value={formData.responsavel_liberacao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Salvando...' : 'Registrar Não Conformidade'}
            </button>
            <Link
              href="/qualidade/nao-conformidade"
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
