'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface FormularioCorteProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioCorte({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioCorteProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    // CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA (não requer imagem)
    cq1a_status: '',

    // CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA (não requer imagem)
    cq2a_status: '',

    // CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (requer imagem)
    cq3a_status: '',
    cq3a_imagem: null as { filename: string; url: string; size: number }[] | null,
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(prev => ({ ...prev, [fieldName]: true }));

    try {
      const uploadedFiles: { filename: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'controle_qualidade_corte');
        formData.append('numero_opd', opd);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({
            filename: result.filename,
            url: result.url,
            size: file.size
          });
        } else {
          throw new Error(result.error || 'Erro ao fazer upload');
        }
      }

      setFormData(prev => ({ ...prev, [fieldName]: uploadedFiles }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload de arquivos');
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Salvar formulário via API
      const response = await fetch(`/api/formularios-corte/${opd}`, {
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

  const renderCQField = (
    label: string,
    fieldName: string,
    description: string,
    criterio: string,
    hasNaoAplicavel = false,
    hasImage = false
  ) => (
    <div className="border rounded-lg p-4 bg-white mb-4">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p>{description}</p>
        <p className="font-semibold text-blue-700">Critérios de aceitação: {criterio}</p>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-2">Condição *</label>
        <select
          name={`${fieldName}_status`}
          value={(formData as any)[`${fieldName}_status`]}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">Selecione</option>
          <option value="Conforme">Conforme</option>
          <option value="Não conforme">Não conforme</option>
          {hasNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
        </select>
      </div>

      {hasImage && (
        <div>
          <label className="block text-sm font-semibold mb-2">Anexar Imagem</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
            <input
              ref={(el) => { fileInputRefs.current[`${fieldName}_imagem`] = el; }}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => handleFileUpload(e, `${fieldName}_imagem`)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[`${fieldName}_imagem`]?.click()}
              className="w-full flex flex-col items-center py-3"
            >
              {uploadingImages[`${fieldName}_imagem`] ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {(formData as any)[`${fieldName}_imagem`] && (formData as any)[`${fieldName}_imagem`].length > 0
                      ? `${(formData as any)[`${fieldName}_imagem`].length} arquivo(s) selecionado(s)`
                      : 'Clique para selecionar imagens'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (múltiplos arquivos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
        <h3 className="font-bold text-lg mb-2">Controle de Qualidade - Corte - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO A - CORTE */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">ETAPA DO PROCESSO: VIGA - CORTE</h4>

        {renderCQField(
          'CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA',
          'cq1a',
          'Avaliação: 100% | Medida crítica: Comprimento total (após esquadro pronto) | Método de verificação: Dimensional | Instrumento de medição: Trena',
          '+/- 10 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA',
          'cq2a',
          'Avaliação: 100% | Medida crítica: Medida de corte da aba e presença de chanfro | Método de verificação: Dimensional | Instrumento de medição: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (IDENTIFICAÇÃO DA VIGA 72/82/92)',
          'cq3a',
          'Avaliação: 100% | Medida crítica: Comprimento e identificação das vigas | Método de verificação: Dimensional e Visual | Instrumento de medição: Trena',
          '+/- 8 mm. Seguir conforme desenho.',
          false,
          true
        )}
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <span>Salvar Controle de Qualidade - Corte</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
