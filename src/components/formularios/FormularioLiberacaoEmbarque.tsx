'use client';

import { useState } from 'react';
import { DadosLiberacaoEmbarque } from '@/types/atividade';

interface FormularioLiberacaoEmbarqueProps {
  numeroOPD: string;
  atividadeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormularioLiberacaoEmbarque({
  numeroOPD,
  atividadeId,
  onSuccess,
  onCancel
}: FormularioLiberacaoEmbarqueProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosLiberacaoEmbarque>({
    nota_fiscal_presente: null,
    checklist_completo: null,
    manual_certificado: null,
    fixacao_partes_moveis: null,
    aperto_parafusos: null,
    pecas_soltas: null,
    superficies_protegidas: null,
    nivel_oleo_verificado: null,
    imagem_nivel_oleo: null,
    conectores_protegidos: null,
    mangueiras_fixadas: null,
    imagem_superficies: null,
    painel_fechado: null,
    imagem_painel: null,
    cabos_protegidos: null,
    sensores_etiquetados: null,
    equipamento_fixado: null,
    equipamento_protegido: null,
    imagem_carga: null,
    responsavel_liberacao: '',
    data_liberacao: ''
  });

  const handleRadioChange = (field: string, value: boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios/${numeroOPD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          tipo_formulario: 'LIBERACAO_EMBARQUE',
          dados_formulario: formData,
          preenchido_por: 'Usuário do Sistema'
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
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

  const RadioGroup = ({
    label,
    field,
    required = false
  }: {
    label: string;
    field: keyof DadosLiberacaoEmbarque;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={field}
            checked={formData[field] === true}
            onChange={() => handleRadioChange(field, true)}
            className="w-4 h-4 text-red-600"
            required={required}
          />
          <span className="text-sm">Sim</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={field}
            checked={formData[field] === false}
            onChange={() => handleRadioChange(field, false)}
            className="w-4 h-4 text-red-600"
            required={required}
          />
          <span className="text-sm">Não</span>
        </label>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 sticky top-0 z-10">
        <h3 className="font-bold text-blue-900">REGISTRO DE INSTALAÇÃO - LIBERAÇÃO E EMBARQUE</h3>
        <p className="text-sm text-blue-800 mt-1">OPD: {numeroOPD}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* DOCUMENTAÇÃO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">DOCUMENTAÇÃO</h4>

        <RadioGroup
          label="A nota fiscal está presente e confere?"
          field="nota_fiscal_presente"
          required
        />

        <RadioGroup
          label="O checklist de verificação está completo?"
          field="checklist_completo"
          required
        />

        <RadioGroup
          label="O manual e certificado estão anexados?"
          field="manual_certificado"
          required
        />
      </div>

      {/* ESTRUTURA MECÂNICA */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">ESTRUTURA MECÂNICA</h4>

        <RadioGroup
          label="Verificar a fixação das partes móveis. Está fixada corretamente?"
          field="fixacao_partes_moveis"
          required
        />

        <RadioGroup
          label="Verificar o aperto de todos os parafusos. Estão adequadamente apertados?"
          field="aperto_parafusos"
          required
        />

        <RadioGroup
          label="Verificar se há peças soltas no equipamento. Há peças soltas?"
          field="pecas_soltas"
          required
        />

        <RadioGroup
          label="Verificar se todas as superfícies estão protegidas com óleo ou graxa. Estão protegidas?"
          field="superficies_protegidas"
          required
        />
      </div>

      {/* SISTEMA HIDRÁULICO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">SISTEMA HIDRÁULICO</h4>

        <RadioGroup
          label="Verificar nível de óleo no tanque hidráulico. Está adequado?"
          field="nivel_oleo_verificado"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do nível de óleo
          </label>
          <input
            type="text"
            name="imagem_nivel_oleo"
            value={formData.imagem_nivel_oleo || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <RadioGroup
          label="Verificar se os conectores estão protegidos. Estão protegidos?"
          field="conectores_protegidos"
          required
        />

        <RadioGroup
          label="Verificar se as mangueiras estão bem fixadas. Estão fixadas?"
          field="mangueiras_fixadas"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem das superfícies protegidas
          </label>
          <input
            type="text"
            name="imagem_superficies"
            value={formData.imagem_superficies || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>
      </div>

      {/* SISTEMA ELÉTRICO E DE CONTROLE */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">SISTEMA ELÉTRICO E DE CONTROLE</h4>

        <RadioGroup
          label="Verificar se o painel está devidamente fechado. Está fechado?"
          field="painel_fechado"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do painel elétrico
          </label>
          <input
            type="text"
            name="imagem_painel"
            value={formData.imagem_painel || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <RadioGroup
          label="Verificar se os cabos estão protegidos. Estão protegidos?"
          field="cabos_protegidos"
          required
        />

        <RadioGroup
          label="Verificar se os sensores estão etiquetados. Estão etiquetados?"
          field="sensores_etiquetados"
          required
        />
      </div>

      {/* EMBALAGEM E TRANSPORTE */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">EMBALAGEM E TRANSPORTE</h4>

        <RadioGroup
          label="Verificar se o equipamento está devidamente fixado para transporte. Está fixado?"
          field="equipamento_fixado"
          required
        />

        <RadioGroup
          label="Verificar se o equipamento está protegido contra intempéries. Está protegido?"
          field="equipamento_protegido"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem da carga preparada para embarque
          </label>
          <input
            type="text"
            name="imagem_carga"
            value={formData.imagem_carga || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>
      </div>

      {/* LIBERAÇÃO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">LIBERAÇÃO</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pela liberação *
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da liberação *
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

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar e Concluir Etapa</span>
          )}
        </button>
      </div>
    </form>
  );
}
