'use client';

import { useState } from 'react';
import { DadosLiberacaoEmbarque } from '@/types/atividade';

interface FormularioLiberacaoEmbarqueProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: (data: DadosLiberacaoEmbarque) => void;
  onCancel: () => void;
}

export default function FormularioLiberacaoEmbarque({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioLiberacaoEmbarqueProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosLiberacaoEmbarque>({
    // DOCUMENTAÇÃO
    nota_fiscal_romaneio: '',
    nota_fiscal_romaneio_outro: '',
    checklist_completo: '',
    checklist_completo_outro: '',
    manual_certificado: '',
    manual_certificado_outro: '',

    // ESTRUTURA MECÂNICA
    fixacao_partes_moveis: '',
    fixacao_partes_moveis_outro: '',
    aperto_parafusos: '',
    aperto_parafusos_outro: '',
    pecas_soltas: '',
    pecas_soltas_outro: '',
    superficies_protegidas: '',
    superficies_protegidas_outro: '',
    imagem_superficies: null,

    // SISTEMA HIDRÁULICO
    nivel_oleo: '',
    nivel_oleo_outro: '',
    imagem_nivel_oleo: null,
    conectores_protegidos: '',
    conectores_protegidos_outro: '',
    mangueiras_fixadas: '',
    mangueiras_fixadas_outro: '',

    // SISTEMA ELÉTRICO E DE CONTROLE
    painel_fechado: '',
    painel_fechado_outro: '',
    imagem_painel: null,
    cabos_protegidos: '',
    cabos_protegidos_outro: '',
    sensores_etiquetados: '',
    sensores_etiquetados_outro: '',

    // EMBALAGEM E TRANSPORTE
    equipamento_fixado: '',
    equipamento_fixado_outro: '',
    equipamento_protegido: '',
    equipamento_protegido_outro: '',
    imagem_carga: null,

    // LIBERAÇÃO
    responsavel_liberacao: '',
    data_liberacao: '',
  });

  const handleRadioChange = (fieldName: keyof DadosLiberacaoEmbarque, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof DadosLiberacaoEmbarque) => {
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
        formDataUpload.append('tipo', 'liberacao-embarque');

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

  const removeFile = (fieldName: keyof DadosLiberacaoEmbarque, index: number) => {
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
    const camposObrigatorios = [
      'nota_fiscal_romaneio',
      'checklist_completo',
      'manual_certificado',
      'fixacao_partes_moveis',
      'aperto_parafusos',
      'pecas_soltas',
      'superficies_protegidas',
      'nivel_oleo',
      'conectores_protegidos',
      'mangueiras_fixadas',
      'painel_fechado',
      'cabos_protegidos',
      'sensores_etiquetados',
      'equipamento_fixado',
      'equipamento_protegido',
      'responsavel_liberacao',
      'data_liberacao',
    ];

    for (const campo of camposObrigatorios) {
      const valor = formData[campo as keyof DadosLiberacaoEmbarque];
      if (!valor || valor === '') {
        setError(`Por favor, preencha todos os campos obrigatórios`);
        setLoading(false);
        return;
      }
    }

    // Validar imagens obrigatórias
    if (!formData.imagem_superficies || formData.imagem_superficies.length === 0) {
      setError('Por favor, anexe a imagem das superfícies protegidas');
      setLoading(false);
      return;
    }

    if (!formData.imagem_nivel_oleo || formData.imagem_nivel_oleo.length === 0) {
      setError('Por favor, anexe a imagem do nível do óleo');
      setLoading(false);
      return;
    }

    if (!formData.imagem_painel || formData.imagem_painel.length === 0) {
      setError('Por favor, anexe a imagem do painel elétrico');
      setLoading(false);
      return;
    }

    if (!formData.imagem_carga || formData.imagem_carga.length === 0) {
      setError('Por favor, anexe a imagem da carga no caminhão');
      setLoading(false);
      return;
    }

    try {
      // Salvar formulário via API
      const response = await fetch(`/api/formularios-liberacao-embarque/${opd}`, {
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

  const renderRadioGroup = (
    label: string,
    fieldName: keyof DadosLiberacaoEmbarque,
    outroFieldName?: keyof DadosLiberacaoEmbarque
  ) => {
    const value = formData[fieldName] as string;
    const outroValue = outroFieldName ? (formData[outroFieldName] as string) : '';

    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          {label} <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-gray-500 italic mb-2">Marcar apenas uma oval.</p>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name={fieldName as string}
              value="Sim"
              checked={value === 'Sim'}
              onChange={() => handleRadioChange(fieldName, 'Sim')}
              className="mr-2"
            />
            <span>Sim</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={fieldName as string}
              value="Não"
              checked={value === 'Não'}
              onChange={() => handleRadioChange(fieldName, 'Não')}
              className="mr-2"
            />
            <span>Não</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              name={fieldName as string}
              value="Outro"
              checked={value === 'Outro'}
              onChange={() => handleRadioChange(fieldName, 'Outro')}
              className="mr-2"
            />
            <span>Outro:</span>
            <input
              type="text"
              name={outroFieldName as string}
              value={outroValue}
              onChange={handleInputChange}
              disabled={value !== 'Outro'}
              className="flex-1 px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderFileUploadSection = (
    title: string,
    fieldName: keyof DadosLiberacaoEmbarque
  ) => {
    const files = formData[fieldName] as any[];

    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          {title} <span className="text-red-600">*</span>
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
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
        <h3 className="font-bold text-lg mb-2">REGISTRO DE INSTALAÇÃO - LIBERAÇÃO E EMBARQUE</h3>
        <p className="text-gray-700">OPD: {opd}</p>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* DOCUMENTAÇÃO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">DOCUMENTAÇÃO</h4>

        {renderRadioGroup(
          '1. A nota fiscal e o romaneio estão presentes, foram conferidos e estão corretos?',
          'nota_fiscal_romaneio',
          'nota_fiscal_romaneio_outro'
        )}

        {renderRadioGroup(
          '2. O check-list final está completamente preenchido e está assinado?',
          'checklist_completo',
          'checklist_completo_outro'
        )}

        {renderRadioGroup(
          '3. O manual técnico e o certificado de garantia foram anexados?',
          'manual_certificado',
          'manual_certificado_outro'
        )}
      </div>

      {/* ESTRUTURA MECÂNICA */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">ESTRUTURA MECÂNICA</h4>

        {renderRadioGroup(
          '4. Foi conferido a fixação de partes móveis (trava de segurança, cilindros recolhidos, plataforma travada)?',
          'fixacao_partes_moveis',
          'fixacao_partes_moveis_outro'
        )}

        {renderRadioGroup(
          '5. Foi conferido o aperto dos parafusos estruturais principais?',
          'aperto_parafusos',
          'aperto_parafusos_outro'
        )}

        {renderRadioGroup(
          '6. Foi verificado se não há peças soltas, batentes, dobradiças ou pinos desalinhados?',
          'pecas_soltas',
          'pecas_soltas_outro'
        )}

        {renderRadioGroup(
          '7. Todas as superfícies pintadas foram protegidas com lonas ou espuma?',
          'superficies_protegidas',
          'superficies_protegidas_outro'
        )}

        {renderFileUploadSection(
          '8. Anexar imagem das superfícies protegidas:',
          'imagem_superficies'
        )}
      </div>

      {/* SISTEMA HIDRÁULICO */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">SISTEMA HIDRÁULICO</h4>

        {renderRadioGroup(
          '9. O nível do óleo foi verificado?',
          'nivel_oleo',
          'nivel_oleo_outro'
        )}

        {renderFileUploadSection(
          '10. Anexar imagem do nível do óleo:',
          'imagem_nivel_oleo'
        )}

        {renderRadioGroup(
          '11. Os conectores hidráulicos estão com tampas de proteção?',
          'conectores_protegidos',
          'conectores_protegidos_outro'
        )}

        {renderRadioGroup(
          '12. As mangueiras e válvulas foram fixadas e estão protegidas contra vibração?',
          'mangueiras_fixadas',
          'mangueiras_fixadas_outro'
        )}
      </div>

      {/* SISTEMA ELÉTRICO E DE CONTROLE */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">SISTEMA ELÉTRICO E DE CONTROLE</h4>

        {renderRadioGroup(
          '13. O painel elétrico está devidamente fechado e está identificados?',
          'painel_fechado',
          'painel_fechado_outro'
        )}

        {renderFileUploadSection(
          '14. Anexar imagem do painel elétrico:',
          'imagem_painel'
        )}

        {renderRadioGroup(
          '15. Os cabos e chicotes estão protegidos (sem dobras bruscas)?',
          'cabos_protegidos',
          'cabos_protegidos_outro'
        )}

        {renderRadioGroup(
          '16. Os sensores, botões e chicotes estão etiquetados?',
          'sensores_etiquetados',
          'sensores_etiquetados_outro'
        )}
      </div>

      {/* EMBALAGEM E TRANSPORTE */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-lg mb-4 text-orange-900">EMBALAGEM E TRANSPORTE</h4>

        {renderRadioGroup(
          '17. O equipamento, seus componentes e conjuntos estão fixados com cintas e calços de segurança?',
          'equipamento_fixado',
          'equipamento_fixado_outro'
        )}

        {renderRadioGroup(
          '18. O equipamento, seus componentes e conjuntos estão protegidos contra intempéries (lonas, plástico, etc.)?',
          'equipamento_protegido',
          'equipamento_protegido_outro'
        )}

        {renderFileUploadSection(
          '19. Anexar imagem da carga em cima do caminhão:',
          'imagem_carga'
        )}
      </div>

      {/* LIBERAÇÃO */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">LIBERAÇÃO</h4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              20. Nome do responsável pela liberação: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="responsavel_liberacao"
              value={formData.responsavel_liberacao}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              21. Data da liberação: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_liberacao"
              value={formData.data_liberacao}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
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
