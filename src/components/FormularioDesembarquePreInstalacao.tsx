'use client';

import { useState, useEffect } from 'react';
import { DadosDesembarquePreInstalacao } from '@/types/atividade';

interface FormularioDesembarquePreInstalacaoProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: (data: DadosDesembarquePreInstalacao) => void;
  onCancel: () => void;
}

export default function FormularioDesembarquePreInstalacao({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioDesembarquePreInstalacaoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState<DadosDesembarquePreInstalacao>({
    nota_fiscal_conferida: null,
    serie_confere: null,
    comprovante_assinado: null,
    deformacao_riscos: null,
    vazamento_oleo: null,
    nivel_oleo_adequado: null,
    cabos_conectores_danificados: null,
    responsavel_conferencia: '',
    data_conferencia: new Date().toISOString().split('T')[0],
    obra_civil_acordo: null,
    desacordo_projeto: null,
    imagens_obra_civil: null,
    redler_elevador_dedicado: null,
    imagem_redler: null,
    distancia_viga_central: '',
    distancia_viga_saida: '',
    painel_aterrado: null,
    imagem_aterramento: null,
    responsavel_verificacao: '',
    data_verificacao: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setFormData(prev => ({
          ...prev,
          responsavel_conferencia: parsed.nome || '',
          responsavel_verificacao: parsed.nome || ''
        }));
      } catch (e) {
        console.error('Erro ao parsear dados do usuário');
      }
    }
  }, []);

  const handleBooleanChange = (field: keyof DadosDesembarquePreInstalacao, value: boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('opd', opd);
        formDataUpload.append('tipo', 'desembarque');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        const result = await response.json();

        if (result.success) {
          uploadedUrls.push(result.url);
        } else {
          throw new Error(result.error || 'Erro ao fazer upload');
        }
      }

      if (fieldName === 'imagens_obra_civil') {
        setFormData(prev => ({
          ...prev,
          imagens_obra_civil: [...(prev.imagens_obra_civil || []), ...uploadedUrls]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [fieldName]: uploadedUrls[0]
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload dos arquivos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validar campos obrigatórios
    if (!formData.responsavel_conferencia || !formData.data_conferencia) {
      setError('Por favor, preencha os campos de responsável e data da conferência');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/formularios-desembarque/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: user?.nome || 'Sistema'
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

  const renderBooleanField = (
    label: string,
    field: keyof DadosDesembarquePreInstalacao,
    required: boolean = false
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex space-x-4">
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            checked={formData[field] === true}
            onChange={() => handleBooleanChange(field, true)}
            className="mr-2"
          />
          <span className="text-green-700 font-medium">Sim</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            checked={formData[field] === false}
            onChange={() => handleBooleanChange(field, false)}
            className="mr-2"
          />
          <span className="text-red-700 font-medium">Não</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            checked={formData[field] === null}
            onChange={() => handleBooleanChange(field, null)}
            className="mr-2"
          />
          <span className="text-gray-500">N/A</span>
        </label>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">DESEMBARQUE E PRÉ-INSTALAÇÃO</h3>
        <p className="text-gray-700">OPD: {opd}</p>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO 1: CONFERÊNCIA DO EQUIPAMENTO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">1. CONFERÊNCIA DO EQUIPAMENTO</h4>

        {renderBooleanField('Nota fiscal foi conferida?', 'nota_fiscal_conferida', true)}
        {renderBooleanField('Número de série confere com a nota fiscal?', 'serie_confere', true)}
        {renderBooleanField('Comprovante de entrega foi assinado pelo cliente?', 'comprovante_assinado', true)}
        {renderBooleanField('Há deformação ou riscos visíveis na estrutura?', 'deformacao_riscos', true)}
        {renderBooleanField('Há vazamento de óleo?', 'vazamento_oleo', true)}
        {renderBooleanField('Nível de óleo está adequado?', 'nivel_oleo_adequado', true)}
        {renderBooleanField('Cabos e conectores estão danificados?', 'cabos_conectores_danificados', true)}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsável pela conferência: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="responsavel_conferencia"
              value={formData.responsavel_conferencia}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Data da conferência: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_conferencia"
              value={formData.data_conferencia}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: VERIFICAÇÃO DA OBRA CIVIL */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">2. VERIFICAÇÃO DA OBRA CIVIL</h4>

        {renderBooleanField('Obra civil está de acordo com o projeto?', 'obra_civil_acordo', true)}

        {formData.obra_civil_acordo === false && (
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Descreva o que está em desacordo:
            </label>
            <textarea
              name="desacordo_projeto"
              value={formData.desacordo_projeto || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Imagens da obra civil (opcional):
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e, 'imagens_obra_civil')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.imagens_obra_civil && formData.imagens_obra_civil.length > 0 && (
            <div className="mt-2 text-sm text-green-700">
              {formData.imagens_obra_civil.length} imagem(ns) anexada(s)
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">
            Redler/elevador dedicado à plataforma:
          </label>
          <input
            type="text"
            name="redler_elevador_dedicado"
            value={formData.redler_elevador_dedicado || ''}
            onChange={handleInputChange}
            placeholder="Descreva se há redler/elevador dedicado"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Distância da viga central (mm):
            </label>
            <input
              type="text"
              name="distancia_viga_central"
              value={formData.distancia_viga_central || ''}
              onChange={handleInputChange}
              placeholder="Ex: 1200mm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Distância da viga de saída (mm):
            </label>
            <input
              type="text"
              name="distancia_viga_saida"
              value={formData.distancia_viga_saida || ''}
              onChange={handleInputChange}
              placeholder="Ex: 800mm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: VERIFICAÇÃO ELÉTRICA */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">3. VERIFICAÇÃO ELÉTRICA</h4>

        {renderBooleanField('Painel elétrico está aterrado corretamente?', 'painel_aterrado', true)}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Imagem do aterramento (opcional):
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'imagem_aterramento')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.imagem_aterramento && (
            <div className="mt-2 text-sm text-green-700">Imagem anexada</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsável pela verificação: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="responsavel_verificacao"
              value={formData.responsavel_verificacao}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Data da verificação: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_verificacao"
              value={formData.data_verificacao}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
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
