'use client';

import { useState } from 'react';
import { DadosDesembarquePreInstalacao } from '@/types/atividade';

interface FormularioDesembarqueProps {
  numeroOPD: string;
  atividadeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormularioDesembarque({
  numeroOPD,
  atividadeId,
  onSuccess,
  onCancel
}: FormularioDesembarqueProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosDesembarquePreInstalacao>({
    nota_fiscal_conferida: null,
    serie_confere: null,
    comprovante_assinado: null,
    deformacao_riscos: null,
    vazamento_oleo: null,
    nivel_oleo_adequado: null,
    cabos_conectores_danificados: null,
    responsavel_conferencia: '',
    data_conferencia: '',
    obra_civil_acordo: null,
    desacordo_projeto: null,
    imagens_obra_civil: null,
    redler_elevador_dedicado: null,
    imagem_redler: null,
    distancia_viga_central: null,
    distancia_viga_saida: null,
    painel_aterrado: null,
    imagem_aterramento: null,
    responsavel_verificacao: '',
    data_verificacao: ''
  });

  const handleRadioChange = (field: string, value: boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          tipo_formulario: 'DESEMBARQUE_PRE_INSTALACAO',
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
    field: keyof DadosDesembarquePreInstalacao;
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
        <h3 className="font-bold text-blue-900">REGISTRO DE INSTALAÇÃO - DESEMBARQUE E PRÉ INSTALAÇÃO</h3>
        <p className="text-sm text-blue-800 mt-1">OPD: {numeroOPD}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* VERIFICAÇÃO DE DESEMBARQUE */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">VERIFICAÇÃO DE DESEMBARQUE</h4>

        <RadioGroup
          label="A nota fiscal e o número de série confere com o equipamento?"
          field="nota_fiscal_conferida"
          required
        />

        <RadioGroup
          label="Foi assinado o comprovantes de recebimento?"
          field="comprovante_assinado"
          required
        />

        <RadioGroup
          label="Houve deformação, riscos profundos ou amassamentos?"
          field="deformacao_riscos"
          required
        />

        <RadioGroup
          label="Existem vazamentos de óleo?"
          field="vazamento_oleo"
          required
        />

        <RadioGroup
          label="O nível de óleo está adequado?"
          field="nivel_oleo_adequado"
          required
        />

        <RadioGroup
          label="Os cabos e conectores sofreram alguma dano?"
          field="cabos_conectores_danificados"
          required
        />

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pela conferência *
            </label>
            <input
              type="text"
              name="responsavel_conferencia"
              value={formData.responsavel_conferencia}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da conferência *
            </label>
            <input
              type="date"
              name="data_conferencia"
              value={formData.data_conferencia}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* VERIFICAÇÃO DE PRÉ INSTALAÇÃO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">VERIFICAÇÃO DE PRÉ INSTALAÇÃO</h4>

        <RadioGroup
          label="Verificar se a obra civil do local está de acordo como projeto. Está de acordo com o projeto?"
          field="obra_civil_acordo"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            O que está em desacordo com o projeto?
          </label>
          <textarea
            name="desacordo_projeto"
            value={formData.desacordo_projeto || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Descreva os itens em desacordo..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar 3 imagens da obra civil
          </label>
          <p className="text-xs text-gray-500 mb-2">Arquivos enviados (URLs separadas por vírgula)</p>
          <input
            type="text"
            name="imagens_obra_civil"
            onChange={(e) => setFormData(prev => ({
              ...prev,
              imagens_obra_civil: e.target.value.split(',').map(s => s.trim())
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL1, URL2, URL3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verificar o redler/elevador está dedicado a um ou mais tombador *
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="redler_elevador_dedicado"
                checked={formData.redler_elevador_dedicado === 'Apenas um tombador'}
                onChange={() => setFormData(prev => ({ ...prev, redler_elevador_dedicado: 'Apenas um tombador' }))}
                className="w-4 h-4 text-red-600"
                required
              />
              <span className="text-sm">Apenas um tombador</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="redler_elevador_dedicado"
                checked={formData.redler_elevador_dedicado === 'Mais de um tombador'}
                onChange={() => setFormData(prev => ({ ...prev, redler_elevador_dedicado: 'Mais de um tombador' }))}
                className="w-4 h-4 text-red-600"
                required
              />
              <span className="text-sm">Mais de um tombador</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do redler/elevador
          </label>
          <input
            type="text"
            name="imagem_redler"
            value={formData.imagem_redler || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qual é a medida da distância da viga central que dá no funil da moega? *
            </label>
            <input
              type="text"
              name="distancia_viga_central"
              value={formData.distancia_viga_central || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Ex: 5.5m"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qual é a medida da distância da viga de saída? *
            </label>
            <input
              type="text"
              name="distancia_viga_saida"
              value={formData.distancia_viga_saida || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Ex: 3.2m"
            />
          </div>
        </div>

        <RadioGroup
          label="O painel elétrico está aterrado?"
          field="painel_aterrado"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do aterramento do painel elétrico
          </label>
          <input
            type="text"
            name="imagem_aterramento"
            value={formData.imagem_aterramento || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pela verificação *
            </label>
            <input
              type="text"
              name="responsavel_verificacao"
              value={formData.responsavel_verificacao}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da verificação *
            </label>
            <input
              type="date"
              name="data_verificacao"
              value={formData.data_verificacao}
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
