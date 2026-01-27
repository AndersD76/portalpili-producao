'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface FormularioControleQualidadeSoldaProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioControleQualidadeSolda({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioControleQualidadeSoldaProps) {
  const [formData, setFormData] = useState({
    // CQ1-D - REFORÇOS EMENDA DAS VIGAS
    cq1d_status: '',

    // CQ2-D - SOLDA REFORÇOS VIGAS
    cq2d_status: '',
    cq2d_imagem: null as File[] | null,

    // CQ3-D - REFORÇOS TRAVA CINTAS
    cq3d_status: '',

    // CQ4-D - SOLDA REFORÇOS TRAVA CINTAS
    cq4d_status: '',
    cq4d_imagem: null as File[] | null,

    // CQ5-D - SOLDA CAIXA TRAVA CHASSI 24569
    cq5d_status: '',
    cq5d_imagem: null as File[] | null,

    // CQ6-D - SOLDA TRAVA RODAS E ENCAIXE DOS CILINDROS
    cq6d_status: '',
    cq6d_imagem: null as File[] | null,

    // CQ7-D - POSICIONAMENTO BATENTE DE DESCIDA
    cq7d_status: '',
    cq7d_imagem: null as File[] | null,

    // CQ8-D - SOLDA BATENTE DE DESCIDA
    cq8d_status: '',
    cq8d_imagem: null as File[] | null,

    // CQ9-D - SOLDA GRAMPOS E BARRA REDONDAS
    cq9d_status: '',
    cq9d_imagem: null as File[] | null,

    // CQ10-D - SOLDA FECHAMENTO FRONTAL GRADEADO
    cq10d_status: '',
    cq10d_imagem: null as File[] | null,

    // CQ11-D - SOLDA DA BARRA CHATA NO LAVRADO
    cq11d_status: '',
    cq11d_imagem: null as File[] | null,

    // CQ12-D - SOLDA REFORÇO TRANVERSAL PARA ASSOALHO
    cq12d_status: '',
    cq12d_imagem: null as File[] | null,

    // CQ13-D - SOLDA CHAPA 1050 X 3000
    cq13d_status: '',
    cq13d_imagem: null as File[] | null,

    // CQ14-D - SOLDA PISO
    cq14d_status: '',
    cq14d_imagem: null as File[] | null,

    // CQ15-D - SOLDA EMENDA VIGAS
    cq15d_status: '',
    cq15d_imagem: null as File[] | null,

    // CQ16-D - CHAPA DE FECHAMENTO DIANTEIRA
    cq16d_status: '',
    cq16d_imagem: null as File[] | null,

    // CQ17-D - CHAPA DE FECHAMENTO TRASEIRA
    cq17d_status: '',
    cq17d_imagem: null as File[] | null,
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const fileInputRefs = {
    cq2d: useRef<HTMLInputElement>(null),
    cq4d: useRef<HTMLInputElement>(null),
    cq5d: useRef<HTMLInputElement>(null),
    cq6d: useRef<HTMLInputElement>(null),
    cq7d: useRef<HTMLInputElement>(null),
    cq8d: useRef<HTMLInputElement>(null),
    cq9d: useRef<HTMLInputElement>(null),
    cq10d: useRef<HTMLInputElement>(null),
    cq11d: useRef<HTMLInputElement>(null),
    cq12d: useRef<HTMLInputElement>(null),
    cq13d: useRef<HTMLInputElement>(null),
    cq14d: useRef<HTMLInputElement>(null),
    cq15d: useRef<HTMLInputElement>(null),
    cq16d: useRef<HTMLInputElement>(null),
    cq17d: useRef<HTMLInputElement>(null),
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
        'cq1d_status', 'cq2d_status', 'cq3d_status', 'cq4d_status',
        'cq5d_status', 'cq6d_status', 'cq7d_status', 'cq8d_status',
        'cq9d_status', 'cq10d_status', 'cq11d_status', 'cq12d_status',
        'cq13d_status', 'cq14d_status', 'cq15d_status', 'cq16d_status',
        'cq17d_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.warning(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          setUploadingImages(false);
          return;
        }
      }

      // Upload de todas as imagens
      const imageFields = [
        'cq2d_imagem', 'cq4d_imagem', 'cq5d_imagem', 'cq6d_imagem',
        'cq7d_imagem', 'cq8d_imagem', 'cq9d_imagem', 'cq10d_imagem',
        'cq11d_imagem', 'cq12d_imagem', 'cq13d_imagem', 'cq14d_imagem',
        'cq15d_imagem', 'cq16d_imagem', 'cq17d_imagem'
      ];

      const uploadedData: any = {};

      for (const field of imageFields) {
        const files = formData[field as keyof typeof formData] as File[] | null;
        if (files && files.length > 0) {
          const uploaded = await uploadFiles(files, 'controle_qualidade_solda');
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
      const response = await fetch(`/api/formularios-controle-qualidade-solda/${opd}`, {
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
        toast.success('Formulario de Controle de Qualidade - Solda salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      toast.error('Erro ao salvar formulario. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const renderCheckpoint = (
    id: string,
    title: string,
    description: string,
    hasImage: boolean = false,
    hasThreeOptions: boolean = false
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
              {hasThreeOptions && <option value="Não Aplicável">Não Aplicável</option>}
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
        <p className="font-semibold">Controle de Qualidade - Solda Lado 1</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1d',
          'CQ1-D. REFORÇOS EMENDA DAS VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Reforços no esquadro
- Método de verificação: Dimensional
- Instrumento de medição: Trena; Esquadro
- Critérios de aceitação: Reforços nas emendas das vigas`
        )}

        {renderCheckpoint(
          'cq2d',
          'CQ2-D. SOLDA REFORÇOS VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq3d',
          'CQ3-D. REFORÇOS TRAVA CINTAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Reforços no esquadro
- Método de verificação: Dimensional
- Instrumento de medição: Trena; Esquadro
- Critérios de aceitação: Reforços no esquadro`
        )}

        {renderCheckpoint(
          'cq4d',
          'CQ4-D. SOLDA REFORÇOS TRAVA CINTAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq5d',
          'CQ5-D. SOLDA CAIXA TRAVA CHASSI 24569',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq6d',
          'CQ6-D. SOLDA TRAVA RODAS E ENCAIXE DOS CILINDROS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq7d',
          'CQ7-D. POSICIONAMENTO BATENTE DE DESCIDA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Posição do batente
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme desenho`,
          true
        )}

        {renderCheckpoint(
          'cq8d',
          'CQ8-D. SOLDA BATENTE DE DESCIDA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq9d',
          'CQ9-D. SOLDA GRAMPOS E BARRA REDONDAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq10d',
          'CQ10-D. SOLDA FECHAMENTO FRONTAL GRADEADO (24845)',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true,
          true // Has three options
        )}

        {renderCheckpoint(
          'cq11d',
          'CQ11-D. SOLDA DA BARRA CHATA NO LAVRADO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq12d',
          'CQ12-D. SOLDA REFORÇO TRANVERSAL PARA ASSOALHO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq13d',
          'CQ13-D. SOLDA CHAPA 1050 X 3000',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq14d',
          'CQ14-D. SOLDA PISO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq15d',
          'CQ15-D. SOLDA EMENDA VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq16d',
          'CQ16-D. CHAPA DE FECHAMENTO DIANTEIRA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq17d',
          'CQ17-D. CHAPA DE FECHAMENTO TRASEIRA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
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
