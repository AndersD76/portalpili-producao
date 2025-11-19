'use client';

import { useState } from 'react';
import { DadosPreparacao } from '@/types/atividade';

interface FormularioPreparacaoProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: (data: DadosPreparacao) => void;
  onCancel: () => void;
}

export default function FormularioPreparacao({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioPreparacaoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosPreparacao>({
    numero_opd: opd,
    nome_cliente: cliente,
    modelo_equipamento: '',
    cidade_uf: '',
    data_prevista_inicio: '',
    tecnicos_designados: '',
    doc_liberacao_montagem: null,
    esquema_eletrico: null,
    esquema_hidraulico: null,
    projeto_executivo: null,
    projeto_civil: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof DadosPreparacao) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const uploadedFiles: Array<{ filename: string; url: string; size: number }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('opd', opd);
        formDataUpload.append('tipo', 'preparacao');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        const result = await response.json();

        if (result.success) {
          uploadedFiles.push({
            filename: result.filename,
            url: result.url,
            size: result.size
          });
        } else {
          throw new Error(result.error || 'Erro ao fazer upload');
        }
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: uploadedFiles
      }));
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload dos arquivos');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (fieldName: keyof DadosPreparacao, index: number) => {
    setFormData(prev => {
      const currentFiles = prev[fieldName] as any[];
      if (!currentFiles) return prev;

      const newFiles = currentFiles.filter((_, i) => i !== index);
      return {
        ...prev,
        [fieldName]: newFiles.length > 0 ? newFiles : null
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validar campos obrigatórios
    if (!formData.modelo_equipamento || !formData.cidade_uf || !formData.data_prevista_inicio || !formData.tecnicos_designados) {
      setError('Por favor, preencha todos os campos obrigatórios');
      setLoading(false);
      return;
    }

    // Validar anexos obrigatórios
    if (!formData.doc_liberacao_montagem || formData.doc_liberacao_montagem.length === 0) {
      setError('Por favor, anexe os documentos de liberação de montagem');
      setLoading(false);
      return;
    }

    if (!formData.esquema_eletrico || formData.esquema_eletrico.length === 0) {
      setError('Por favor, anexe o esquema elétrico');
      setLoading(false);
      return;
    }

    if (!formData.esquema_hidraulico || formData.esquema_hidraulico.length === 0) {
      setError('Por favor, anexe o esquema hidráulico');
      setLoading(false);
      return;
    }

    if (!formData.projeto_executivo || formData.projeto_executivo.length === 0) {
      setError('Por favor, anexe o projeto executivo');
      setLoading(false);
      return;
    }

    if (!formData.projeto_civil || formData.projeto_civil.length === 0) {
      setError('Por favor, anexe o projeto civil');
      setLoading(false);
      return;
    }

    try {
      // Salvar formulário via API
      const response = await fetch(`/api/formularios-preparacao/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: 'Sistema' // TODO: pegar do localStorage user_data
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit(formData);
      } else {
        setError(result.error || 'Erro ao salvar formulário');
      }
    } catch (err) {
      setError('Erro ao salvar formulário');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderFileUploadSection = (
    title: string,
    fieldName: keyof DadosPreparacao,
    isRequired: boolean = true
  ) => {
    const files = formData[fieldName] as any[];

    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          {title} {isRequired && <span className="text-red-600">*</span>}
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          multiple
          onChange={(e) => handleFileChange(e, fieldName)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        {files && files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-700">{file.filename}</span>
                <button
                  type="button"
                  onClick={() => removeFile(fieldName, index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">REGISTRO DE INSTALAÇÃO - PREPARAÇÃO</h3>
        <p className="text-gray-700">OPD: {opd}</p>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* DADOS INICIAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">DADOS INICIAIS</h4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Número da OPD: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="numero_opd"
              value={formData.numero_opd}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nome do cliente: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="nome_cliente"
              value={formData.nome_cliente}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Modelo do equipamento: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="modelo_equipamento"
              value={formData.modelo_equipamento}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Onde será instalado o equipamento (Cidade - UF): <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="cidade_uf"
              value={formData.cidade_uf}
              onChange={handleInputChange}
              placeholder="Ex: São Paulo - SP"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Data prevista para início da instalação: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_prevista_inicio"
              value={formData.data_prevista_inicio}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nome completo dos técnicos designados: <span className="text-red-600">*</span>
            </label>
            <textarea
              name="tecnicos_designados"
              value={formData.tecnicos_designados}
              onChange={handleInputChange}
              placeholder="Informe os nomes dos técnicos separados por vírgula"
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* DOCUMENTOS OBRIGATÓRIOS */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">DOCUMENTOS OBRIGATÓRIOS</h4>

        {renderFileUploadSection(
          '7. Anexar documentos de liberação de montagem do cliente:',
          'doc_liberacao_montagem',
          true
        )}

        {renderFileUploadSection(
          '8. Anexar o Esquema Elétrico:',
          'esquema_eletrico',
          true
        )}

        {renderFileUploadSection(
          '9. Anexar o Esquema Hidráulico:',
          'esquema_hidraulico',
          true
        )}

        {renderFileUploadSection(
          '10. Anexar o Projeto Executivo:',
          'projeto_executivo',
          true
        )}

        {renderFileUploadSection(
          '11. Anexar o Projeto Civil:',
          'projeto_civil',
          true
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{loading ? 'Salvando...' : 'Salvar Formulário'}</span>
        </button>
      </div>
    </form>
  );
}
