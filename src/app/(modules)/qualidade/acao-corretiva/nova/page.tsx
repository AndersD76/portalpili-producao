'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Anexo, ProcessoOrigem, PROCESSOS_ORIGEM, StatusAcoesAC, AcoesFinalizadasAC, SituacaoFinalAC, STATUS_ACOES_AC, ACOES_FINALIZADAS_AC, SITUACAO_FINAL_AC } from '@/types/qualidade';

function NovaAcaoCorretivaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingNC, setUploadingNC] = useState(false);
  const [uploadingEvidencias, setUploadingEvidencias] = useState(false);
  const [registroNcAnexos, setRegistroNcAnexos] = useState<Anexo[]>([]);
  const [evidenciasAnexos, setEvidenciasAnexos] = useState<Anexo[]>([]);
  const fileInputNCRef = useRef<HTMLInputElement>(null);
  const fileInputEvidenciasRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Identificação
    data_emissao: new Date().toISOString().split('T')[0],
    emitente: '',
    numero_nc_relacionada: '',
    // Análise das Causas
    processos_envolvidos: [] as ProcessoOrigem[],
    falha: '',
    causas: '',
    subcausas: '',
    // Ações para Eliminar as Causas
    acoes: '',
    responsaveis: '',
    prazo: '',
    // Condições das Ações
    status_acoes: '' as StatusAcoesAC | '',
    // Análise da Eficácia
    acoes_finalizadas: '' as AcoesFinalizadasAC | '',
    situacao_final: '' as SituacaoFinalAC | '',
    responsavel_analise: '',
    data_analise: ''
  });

  // Preencher NC relacionada se vier de uma NC
  useEffect(() => {
    const ncNumero = searchParams.get('nc_numero');
    if (ncNumero) {
      setFormData(prev => ({
        ...prev,
        numero_nc_relacionada: ncNumero
      }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProcessoChange = (processo: ProcessoOrigem) => {
    setFormData(prev => {
      const processos = prev.processos_envolvidos.includes(processo)
        ? prev.processos_envolvidos.filter(p => p !== processo)
        : [...prev.processos_envolvidos, processo];
      return { ...prev, processos_envolvidos: processos };
    });
  };

  const handleFileUploadNC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingNC(true);
    try {
      const uploadedFiles: Anexo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'acao_corretiva_nc');

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      setRegistroNcAnexos(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingNC(false);
      if (fileInputNCRef.current) fileInputNCRef.current.value = '';
    }
  };

  const handleFileUploadEvidencias = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingEvidencias(true);
    try {
      const uploadedFiles: Anexo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'acao_corretiva_evidencias');

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      setEvidenciasAnexos(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingEvidencias(false);
      if (fileInputEvidenciasRef.current) fileInputEvidenciasRef.current.value = '';
    }
  };

  const removeAnexoNC = (index: number) => {
    setRegistroNcAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const removeAnexoEvidencias = (index: number) => {
    setEvidenciasAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const response = await fetch('/api/qualidade/acao-corretiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          registro_nc_anexos: registroNcAnexos.length > 0 ? registroNcAnexos : null,
          evidencias_anexos: evidenciasAnexos.length > 0 ? evidenciasAnexos : null,
          processos_envolvidos: formData.processos_envolvidos.length > 0 ? formData.processos_envolvidos : null,
          status_acoes: formData.status_acoes || null,
          acoes_finalizadas: formData.acoes_finalizadas || null,
          situacao_final: formData.situacao_final || null,
          responsavel_analise: formData.responsavel_analise || null,
          data_analise: formData.data_analise || null,
          subcausas: formData.subcausas || null,
          created_by: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/qualidade/acao-corretiva');
      } else {
        setError(result.error || 'Erro ao criar ação corretiva');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Emitente *</label>
            <input
              type="text"
              name="emitente"
              value={formData.emitente}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número da NC relacionada</label>
            <input
              type="text"
              name="numero_nc_relacionada"
              value={formData.numero_nc_relacionada}
              onChange={handleChange}
              placeholder="Ex: NC-2024-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registro da NC (Anexos)</label>
            <input
              ref={fileInputNCRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              multiple
              onChange={handleFileUploadNC}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {uploadingNC && <p className="text-sm text-gray-500 mt-1">Enviando arquivos...</p>}
            {registroNcAnexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {registroNcAnexos.map((anexo, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate">{anexo.filename}</span>
                    <button type="button" onClick={() => removeAnexoNC(index)} className="text-red-600 hover:text-red-800 ml-2">
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

      {/* ANÁLISE DAS CAUSAS */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANÁLISE DAS CAUSAS</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Processos envolvidos *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(PROCESSOS_ORIGEM).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.processos_envolvidos.includes(key as ProcessoOrigem)}
                    onChange={() => handleProcessoChange(key as ProcessoOrigem)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Falha *</label>
            <textarea
              name="falha"
              value={formData.falha}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Descreva a falha identificada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causas *</label>
            <textarea
              name="causas"
              value={formData.causas}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Descreva as causas identificadas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcausas</label>
            <textarea
              name="subcausas"
              value={formData.subcausas}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva as subcausas, se houver..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* AÇÕES PARA ELIMINAR AS CAUSAS */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">AÇÕES PARA ELIMINAR AS CAUSAS</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ações *</label>
            <textarea
              name="acoes"
              value={formData.acoes}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Descreva as ações para eliminar as causas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis *</label>
              <input
                type="text"
                name="responsaveis"
                value={formData.responsaveis}
                onChange={handleChange}
                required
                placeholder="Nomes dos responsáveis"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo *</label>
              <input
                type="date"
                name="prazo"
                value={formData.prazo}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONDIÇÕES DAS AÇÕES */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CONDIÇÕES DAS AÇÕES</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status das ações *</label>
          <select
            name="status_acoes"
            value={formData.status_acoes}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {Object.entries(STATUS_ACOES_AC).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ANÁLISE DA EFICÁCIA */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANÁLISE DA EFICÁCIA</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">As ações foram finalizadas?</label>
              <select
                name="acoes_finalizadas"
                value={formData.acoes_finalizadas}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {Object.entries(ACOES_FINALIZADAS_AC).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Situação final</label>
              <select
                name="situacao_final"
                value={formData.situacao_final}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {Object.entries(SITUACAO_FINAL_AC).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidências (Anexos)</label>
            <input
              ref={fileInputEvidenciasRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              multiple
              onChange={handleFileUploadEvidencias}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {uploadingEvidencias && <p className="text-sm text-gray-500 mt-1">Enviando arquivos...</p>}
            {evidenciasAnexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {evidenciasAnexos.map((anexo, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate">{anexo.filename}</span>
                    <button type="button" onClick={() => removeAnexoEvidencias(index)} className="text-red-600 hover:text-red-800 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela análise</label>
              <input
                type="text"
                name="responsavel_analise"
                value={formData.responsavel_analise}
                onChange={handleChange}
                placeholder="Nome do responsável"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da análise</label>
              <input
                type="date"
                name="data_analise"
                value={formData.data_analise}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Salvando...' : 'Registrar Ação Corretiva'}
        </button>
        <Link
          href="/qualidade/acao-corretiva"
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-center font-medium"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export default function NovaAcaoCorretivaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/qualidade/acao-corretiva"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">REGISTRO DE AÇÃO CORRETIVA</h1>
              <p className="text-sm text-gray-600">Nº 57-3 - REV. 01</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        }>
          <NovaAcaoCorretivaForm />
        </Suspense>
      </main>
    </div>
  );
}
