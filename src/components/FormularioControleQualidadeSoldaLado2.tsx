'use client';

import { useState, useRef } from 'react';

interface FormularioControleQualidadeSoldaLado2Props {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioControleQualidadeSoldaLado2({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioControleQualidadeSoldaLado2Props) {
  const [formData, setFormData] = useState({
    // CQ1-E - REFORÇOS EMENDA DAS VIGAS
    cq1e_status: '',

    // CQ2-E - SOLDA REFORÇOS VIGAS
    cq2e_status: '',
    cq2e_imagem: null as File[] | null,

    // CQ3-E - REFORÇOS TRAVA CINTAS
    cq3e_status: '',
    cq3e_imagem: null as File[] | null,

    // CQ4-E - SOLDA REFORÇOS TRAVA CINTAS
    cq4e_status: '',
    cq4e_imagem: null as File[] | null,

    // CQ5-E - SOLDA CAIXA TRAVA CHASSI
    cq5e_status: '',
    cq5e_imagem: null as File[] | null,

    // CQ6-E - SOLDA TRAVA RODAS
    cq6e_status: '',
    cq6e_imagem: null as File[] | null,

    // CQ7-E - POSICIONAMENTO BATENTE DE DESCIDA
    cq7e_status: '',

    // CQ8-E - SOLDA BATENTE DE DESCIDA
    cq8e_status: '',
    cq8e_imagem: null as File[] | null,

    // CQ9-E - SOLDA GRAMPOS E BARRA REDONDAS
    cq9e_status: '',
    cq9e_imagem: null as File[] | null,

    // CQ10-E - SOLDA FECHAMENTO FRONTAL GRADEADO
    cq10e_status: '',
    cq10e_imagem: null as File[] | null,

    // CQ11-E - SOLDA DA BARRA CHATA NO LAVRADO
    cq11e_status: '',
    cq11e_imagem: null as File[] | null,

    // CQ12-E - SOLDA GRAMPOS E BARRAS REDONDA
    cq12e_status: '',
    cq12e_imagem: null as File[] | null,

    // CQ13-E - SOLDA REFORÇO TRANVERSAL PARA ASSOALHO
    cq13e_status: '',
    cq13e_imagem: null as File[] | null,

    // CQ14-E - SOLDA DO REFORÇO DO PISO
    cq14e_status: '',
    cq14e_imagem: null as File[] | null,

    // CQ15-E - SOLDA CHAPA 1050 X 3000
    cq15e_status: '',
    cq15e_imagem: null as File[] | null,

    // CQ16-E - SOLDA PISO
    cq16e_status: '',
    cq16e_imagem: null as File[] | null,

    // CQ17-E - SOLDA EMENDA VIGAS
    cq17e_status: '',
    cq17e_imagem: null as File[] | null,

    // CQ18-E - CHAPA DE FECHAMENTO DIANTEIRA
    cq18e_status: '',
    cq18e_imagem: null as File[] | null,

    // CQ19-E - CHAPA DE FECHAMENTO TRASEIRA
    cq19e_status: '',
    cq19e_imagem: null as File[] | null,
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const fileInputRefs = {
    cq2e: useRef<HTMLInputElement>(null),
    cq3e: useRef<HTMLInputElement>(null),
    cq4e: useRef<HTMLInputElement>(null),
    cq5e: useRef<HTMLInputElement>(null),
    cq6e: useRef<HTMLInputElement>(null),
    cq8e: useRef<HTMLInputElement>(null),
    cq9e: useRef<HTMLInputElement>(null),
    cq10e: useRef<HTMLInputElement>(null),
    cq11e: useRef<HTMLInputElement>(null),
    cq12e: useRef<HTMLInputElement>(null),
    cq13e: useRef<HTMLInputElement>(null),
    cq14e: useRef<HTMLInputElement>(null),
    cq15e: useRef<HTMLInputElement>(null),
    cq16e: useRef<HTMLInputElement>(null),
    cq17e: useRef<HTMLInputElement>(null),
    cq18e: useRef<HTMLInputElement>(null),
    cq19e: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = (field: string, files: FileList | null) => {
    if (files && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [field]: Array.from(files)
      }));
    }
  };

  const uploadFiles = async (files: File[], tipo: string) => {
    const uploadedFiles = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);
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
        throw new Error(`Erro ao fazer upload de ${file.name}`);
      }
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadingImages(true);

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'cq1e_status', 'cq2e_status', 'cq3e_status', 'cq4e_status',
        'cq5e_status', 'cq6e_status', 'cq7e_status', 'cq8e_status',
        'cq9e_status', 'cq10e_status', 'cq11e_status', 'cq12e_status',
        'cq13e_status', 'cq14e_status', 'cq15e_status', 'cq16e_status',
        'cq17e_status', 'cq18e_status', 'cq19e_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          alert(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          setUploadingImages(false);
          return;
        }
      }

      // Upload de todas as imagens
      const imageFields = [
        'cq2e_imagem', 'cq3e_imagem', 'cq4e_imagem', 'cq5e_imagem',
        'cq6e_imagem', 'cq8e_imagem', 'cq9e_imagem', 'cq10e_imagem',
        'cq11e_imagem', 'cq12e_imagem', 'cq13e_imagem', 'cq14e_imagem',
        'cq15e_imagem', 'cq16e_imagem', 'cq17e_imagem', 'cq18e_imagem',
        'cq19e_imagem'
      ];

      const uploadedData: any = {};

      for (const field of imageFields) {
        const files = formData[field as keyof typeof formData] as File[] | null;
        if (files && files.length > 0) {
          const uploaded = await uploadFiles(files, 'controle_qualidade_solda_lado2');
          uploadedData[field] = uploaded;
        }
      }

      setUploadingImages(false);

      // Preparar dados para envio
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const dados_formulario = {
        ...formData,
        ...uploadedData,
      };

      // Enviar formulário
      const response = await fetch(`/api/formularios-controle-qualidade-solda-lado2/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario,
          preenchido_por: user?.nome || 'Sistema',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Formulário de Controle de Qualidade - Solda Lado 2 salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const renderCheckpoint = (
    id: string,
    title: string,
    description: string,
    hasImage: boolean = false
  ) => {
    const statusField = `${id}_status`;
    const imageField = `${id}_imagem`;

    return (
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-lg mb-3 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status *
            </label>
            <select
              value={formData[statusField as keyof typeof formData] as string}
              onChange={(e) => setFormData(prev => ({ ...prev, [statusField]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="">Selecione...</option>
              <option value="Conforme">Conforme</option>
              <option value="Não conforme">Não conforme</option>
            </select>
          </div>

          {hasImage && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Anexar Imagem *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
                <input
                  ref={fileInputRefs[id as keyof typeof fileInputRefs]}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(imageField, e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs[id as keyof typeof fileInputRefs]?.current?.click()}
                  className="w-full flex flex-col items-center py-3"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {formData[imageField as keyof typeof formData] && (formData[imageField as keyof typeof formData] as File[])?.length > 0
                      ? `${(formData[imageField as keyof typeof formData] as File[]).length} arquivo(s) selecionado(s)`
                      : 'Clique para selecionar imagens'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG (múltiplas imagens permitidas)</span>
                </button>
              </div>
              {formData[imageField as keyof typeof formData] && (formData[imageField as keyof typeof formData] as File[])?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {(formData[imageField as keyof typeof formData] as File[]).map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-green-800">{file.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Solda Lado 2</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1e',
          'CQ1-E. REFORÇOS EMENDA DAS VIGAS',
          `- Avaliação: 100%
- Medida crítica: Esquadro
- Método de verificação: Dimensional
- Instrumento de medição: Trena; Esquadro
- Critérios de aceitação: No esquadro`
        )}

        {renderCheckpoint(
          'cq2e',
          'CQ2-E. SOLDA REFORÇOS VIGAS',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq3e',
          'CQ3-E. REFORÇOS TRAVA CINTAS (CONFORME DESENHO ETAPA 3)',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq4e',
          'CQ4-E. SOLDA REFORÇOS TRAVA CINTAS',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq5e',
          'CQ5-E. SOLDA CAIXA TRAVA CHASSI Cód.24569',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq6e',
          'CQ6-E. SOLDA TRAVA RODAS',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq7e',
          'CQ7-E. POSICIONAMENTO BATENTE DE DESCIDA',
          `- Avaliação: 100%
- Medida crítica: Posicionamento do batente
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq8e',
          'CQ8-E. SOLDA BATENTE DE DESCIDA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq9e',
          'CQ9-E. SOLDA GRAMPOS E BARRA REDONDAS',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq10e',
          'CQ10-E. SOLDA FECHAMENTO FRONTAL GRADEADO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq11e',
          'CQ11-E. SOLDA DA BARRA CHATA NO LAVRADO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq12e',
          'CQ12-E. SOLDA GRAMPOS E BARRAS REDONDA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq13e',
          'CQ13-E. SOLDA REFORÇO TRANVERSAL PARA ASSOALHO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq14e',
          'CQ14-E. SOLDA DO REFORÇO DO PISO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq15e',
          'CQ15-E. SOLDA CHAPA 1050 X 3000',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq16e',
          'CQ16-E. SOLDA PISO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq17e',
          'CQ17-E. SOLDA EMENDA VIGAS',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq18e',
          'CQ18-E. CHAPA DE FECHAMENTO DIANTEIRA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq19e',
          'CQ19-E. CHAPA DE FECHAMENTO TRASEIRA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
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
          {uploadingImages ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando imagens...</span>
            </>
          ) : loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Formulário</span>
          )}
        </button>
      </div>
    </form>
  );
}
