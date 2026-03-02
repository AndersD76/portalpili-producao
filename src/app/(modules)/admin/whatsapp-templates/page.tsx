'use client';

import { useState } from 'react';

interface TemplateResult {
  name: string;
  status: string;
  detail?: any;
  id?: string;
  meta_status?: string;
}

interface ApiResponse {
  success: boolean;
  deleted?: TemplateResult[];
  created?: TemplateResult[];
  templates?: any[];
  error?: string;
}

export default function WhatsAppTemplatesAdmin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  const listarTemplates = async () => {
    setLoading(true);
    setResult('📋 Listando templates...\n');
    try {
      const res = await fetch('/api/admin/whatsapp-templates');
      const data: ApiResponse = await res.json();

      if (data.success && data.templates) {
        setTemplates(data.templates);
        setResult(prev => prev + `\n✅ ${data.templates!.length} templates encontrados:\n\n${formatJson(data.templates!)}`);
      } else {
        setResult(prev => prev + `\n❌ Erro: ${data.error || 'Resposta inválida'}`);
      }
    } catch (e: any) {
      setResult(prev => prev + `\n❌ Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const deletarTemplates = async () => {
    if (!confirm('⚠️ Confirma deletar os templates antigos com encoding quebrado?')) {
      return;
    }

    setLoading(true);
    setResult('🗑️ Deletando templates antigos...\n');
    try {
      const res = await fetch('/api/admin/whatsapp-templates', { method: 'DELETE' });
      const data: ApiResponse = await res.json();

      if (data.success && data.deleted) {
        const deletados = data.deleted.filter(d => d.status === 'DELETED').length;
        setResult(prev => prev + `\n✅ ${deletados} templates deletados:\n\n${formatJson(data.deleted)}`);
      } else {
        setResult(prev => prev + `\n⚠️ Resposta: ${formatJson(data)}`);
      }
    } catch (e: any) {
      setResult(prev => prev + `\n❌ Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const criarTemplates = async () => {
    setLoading(true);
    setResult('✨ Criando templates com encoding UTF-8 correto...\n');
    try {
      const res = await fetch('/api/admin/whatsapp-templates', { method: 'POST' });
      const data: ApiResponse = await res.json();

      if (data.success && data.created) {
        const criados = data.created.filter(c => c.status === 'CREATED').length;
        setResult(prev => prev + `\n✅ ${criados} templates criados:\n\n${formatJson(data.created)}`);

        if (data.created.some(c => c.meta_status === 'PENDING')) {
          setResult(prev => prev + '\n\n⚠️ Templates em PENDING precisam ser aprovados pela Meta (pode levar algumas horas)');
        }
      } else {
        setResult(prev => prev + `\n⚠️ Resposta: ${formatJson(data)}`);
      }
    } catch (e: any) {
      setResult(prev => prev + `\n❌ Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const recriarTudo = async () => {
    if (!confirm('⚠️ Isso vai DELETAR e RECRIAR todos os templates. Confirma?')) {
      return;
    }

    setLoading(true);
    setResult('🚀 Iniciando recriação completa...\n\n');

    // 1. Deletar
    setResult(prev => prev + '🗑️ Passo 1/3: Deletando templates antigos...\n');
    try {
      const delRes = await fetch('/api/admin/whatsapp-templates', { method: 'DELETE' });
      const delData: ApiResponse = await delRes.json();
      const deletados = delData.deleted?.filter(d => d.status === 'DELETED').length || 0;
      setResult(prev => prev + `✅ ${deletados} templates deletados\n\n`);
    } catch (e: any) {
      setResult(prev => prev + `❌ Erro ao deletar: ${e.message}\n\n`);
    }

    // 2. Aguardar 3 segundos
    setResult(prev => prev + '⏳ Passo 2/3: Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    setResult(prev => prev + '✅ Aguardado\n\n');

    // 3. Criar
    setResult(prev => prev + '✨ Passo 3/3: Criando templates com encoding correto...\n');
    try {
      const createRes = await fetch('/api/admin/whatsapp-templates', { method: 'POST' });
      const createData: ApiResponse = await createRes.json();
      const criados = createData.created?.filter(c => c.status === 'CREATED').length || 0;
      setResult(prev => prev + `✅ ${criados} templates criados\n\n`);

      // Mostrar detalhes
      if (createData.created) {
        setResult(prev => prev + '📊 Detalhes:\n' + formatJson(createData.created) + '\n\n');
      }

      if (createData.created?.some(c => c.meta_status === 'PENDING')) {
        setResult(prev => prev + '⚠️ Templates em PENDING: aguarde aprovação da Meta (algumas horas)\n');
      }

      setResult(prev => prev + '\n✅ Processo concluído!\n');
      setResult(prev => prev + '\n💡 Verifique em: https://business.facebook.com/latest/whatsapp_manager');
    } catch (e: any) {
      setResult(prev => prev + `❌ Erro ao criar: ${e.message}\n`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔧 Gerenciador de Templates WhatsApp
          </h1>
          <p className="text-gray-600 mb-6">
            Recrie os templates do WhatsApp com encoding UTF-8 correto (sem "?" nos acentos)
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={listarTemplates}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              📋 Listar Templates
            </button>

            <button
              onClick={deletarTemplates}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              🗑️ Deletar Antigos
            </button>

            <button
              onClick={criarTemplates}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              ✨ Criar Novos
            </button>

            <button
              onClick={recriarTudo}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              🚀 Recriar Tudo
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Processando...</span>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-gray-900 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📄 Resultado</h2>
              <button
                onClick={() => setResult('')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕ Limpar
              </button>
            </div>
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[600px]">
              {result}
            </pre>
          </div>
        )}

        {templates.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Templates Atuais</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Idioma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qualidade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((tmpl, idx) => (
                    <tr key={idx} className={tmpl.status === 'APPROVED' ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tmpl.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tmpl.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : tmpl.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tmpl.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tmpl.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tmpl.quality_score?.score || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
