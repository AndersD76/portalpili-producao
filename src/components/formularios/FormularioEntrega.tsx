'use client';

import { useState } from 'react';
import { DadosEntrega } from '@/types/atividade';

interface FormularioEntregaProps {
  numeroOPD: string;
  atividadeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormularioEntrega({
  numeroOPD,
  atividadeId,
  onSuccess,
  onCancel
}: FormularioEntregaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosEntrega>({
    nome_fantasia_cliente: '',
    equipamento: '',
    numero_serie: '',
    articulacoes_viga_travada: null,
    cilindros_plataforma: null,
    quadro_comando: null,
    chaves_fins_curso: null,
    cilindros_hidraulicos_valvulas: null,
    pressao_sistema_hidraulico: null,
    ar_sistema_hidraulico: null,
    funcionamento_fins_curso: null,
    mangueiras_cabos: null,
    responsavel_verificacoes: '',
    data_verificacoes: '',
    plataforma_subiu: null,
    video_plataforma_subindo: null,
    plataforma_desceu: null,
    video_plataforma_descendo: null,
    testes_com_carga: null,
    teste_liquido_penetrante: null,
    vazamento_liquido: null,
    imagem_teste_liquido: null,
    inclinostato_funcionou: null,
    video_inclinostato: null,
    observacoes: null,
    responsavel_testes: '',
    data_testes: '',
    lista_treinamento: null,
    imagem_equipe_treinada: null,
    termo_conclusao_aceito: null,
    data_aceite: '',
    responsavel_aceite: '',
    termo_aceite_final: null,
    data_aceite_final: '',
    responsavel_aceite_final: ''
  });

  const handleRadioChange = (field: string, value: boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
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
          tipo_formulario: 'ENTREGA',
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
    field: keyof DadosEntrega;
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

  const SelectGroup = ({
    label,
    field,
    required = false
  }: {
    label: string;
    field: keyof DadosEntrega;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        name={field}
        value={formData[field] || ''}
        onChange={(e) => handleSelectChange(field, e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">Selecione...</option>
        <option value="Realizado">Realizado</option>
        <option value="Não realizado">Não realizado</option>
        <option value="Não aplicável">Não aplicável</option>
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 sticky top-0 z-10">
        <h3 className="font-bold text-blue-900">REGISTRO DE INSTALAÇÃO - INSTALAÇÃO E ENTREGA</h3>
        <p className="text-sm text-blue-800 mt-1">OPD: {numeroOPD}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* DADOS DO EQUIPAMENTO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">DADOS DO EQUIPAMENTO</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Fantasia do Cliente *
          </label>
          <input
            type="text"
            name="nome_fantasia_cliente"
            value={formData.nome_fantasia_cliente}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Nome fantasia do cliente"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipamento *
            </label>
            <input
              type="text"
              name="equipamento"
              value={formData.equipamento}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Ex: Tombador 18m"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Série *
            </label>
            <input
              type="text"
              name="numero_serie"
              value={formData.numero_serie}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Número de série do equipamento"
            />
          </div>
        </div>
      </div>

      {/* VERIFICAÇÕES GERAIS */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">VERIFICAÇÕES GERAIS</h4>

        <SelectGroup
          label="Lubrificação das articulações da viga com a travessa"
          field="articulacoes_viga_travada"
          required
        />

        <SelectGroup
          label="Inspeção visual e lubrificação dos cilindros de elevação da plataforma"
          field="cilindros_plataforma"
          required
        />

        <SelectGroup
          label="Inspecionar visualmente o quadro de comando"
          field="quadro_comando"
          required
        />

        <SelectGroup
          label="Inspecionar as chaves de fins de curso"
          field="chaves_fins_curso"
          required
        />

        <SelectGroup
          label="Inspecionar os cilindros hidráulicos e válvulas"
          field="cilindros_hidraulicos_valvulas"
          required
        />

        <SelectGroup
          label="Verificar a pressão do sistema hidráulico"
          field="pressao_sistema_hidraulico"
          required
        />

        <SelectGroup
          label="Sangrar o ar do sistema hidráulico"
          field="ar_sistema_hidraulico"
          required
        />

        <SelectGroup
          label="Testar o funcionamento dos fins de curso"
          field="funcionamento_fins_curso"
          required
        />

        <SelectGroup
          label="Inspecionar mangueiras e cabos elétricos"
          field="mangueiras_cabos"
          required
        />

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pelas verificações *
            </label>
            <input
              type="text"
              name="responsavel_verificacoes"
              value={formData.responsavel_verificacoes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data das verificações *
            </label>
            <input
              type="date"
              name="data_verificacoes"
              value={formData.data_verificacoes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* TESTES DE FUNCIONAMENTO */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">TESTES DE FUNCIONAMENTO</h4>

        <RadioGroup
          label="A plataforma subiu corretamente?"
          field="plataforma_subiu"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vídeo da plataforma subindo
          </label>
          <input
            type="text"
            name="video_plataforma_subindo"
            value={formData.video_plataforma_subindo || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL do vídeo"
          />
        </div>

        <RadioGroup
          label="A plataforma desceu corretamente?"
          field="plataforma_desceu"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vídeo da plataforma descendo
          </label>
          <input
            type="text"
            name="video_plataforma_descendo"
            value={formData.video_plataforma_descendo || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL do vídeo"
          />
        </div>

        <RadioGroup
          label="Foram realizados os testes com carga?"
          field="testes_com_carga"
          required
        />

        <RadioGroup
          label="Foi realizado o teste de líquido penetrante nas soldas?"
          field="teste_liquido_penetrante"
          required
        />

        <RadioGroup
          label="Houve vazamento após o teste de líquido penetrante?"
          field="vazamento_liquido"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do teste de líquido penetrante
          </label>
          <input
            type="text"
            name="imagem_teste_liquido"
            value={formData.imagem_teste_liquido || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <RadioGroup
          label="O inclinostato funcionou corretamente?"
          field="inclinostato_funcionou"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vídeo do funcionamento do inclinostato
          </label>
          <input
            type="text"
            name="video_inclinostato"
            value={formData.video_inclinostato || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL do vídeo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações Gerais
          </label>
          <textarea
            name="observacoes"
            value={formData.observacoes || ''}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Descreva quaisquer observações relevantes sobre os testes..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pelos testes *
            </label>
            <input
              type="text"
              name="responsavel_testes"
              value={formData.responsavel_testes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data dos testes *
            </label>
            <input
              type="date"
              name="data_testes"
              value={formData.data_testes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* TREINAMENTO E ACEITE */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-gray-900">TREINAMENTO E ACEITE</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lista de colaboradores treinados
          </label>
          <textarea
            name="lista_treinamento"
            value={formData.lista_treinamento || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Nome dos colaboradores que receberam treinamento (um por linha)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem da equipe treinada
          </label>
          <input
            type="text"
            name="imagem_equipe_treinada"
            value={formData.imagem_equipe_treinada || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="URL da imagem"
          />
        </div>

        <RadioGroup
          label="O termo de conclusão foi aceito pelo cliente?"
          field="termo_conclusao_aceito"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do responsável pelo aceite *
            </label>
            <input
              type="text"
              name="responsavel_aceite"
              value={formData.responsavel_aceite}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data do aceite *
            </label>
            <input
              type="date"
              name="data_aceite"
              value={formData.data_aceite}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h5 className="font-semibold text-gray-800 mb-3">Aceite Final</h5>

          <RadioGroup
            label="O termo de aceite final foi assinado?"
            field="termo_aceite_final"
            required
          />

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do responsável pelo aceite final *
              </label>
              <input
                type="text"
                name="responsavel_aceite_final"
                value={formData.responsavel_aceite_final}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do aceite final *
              </label>
              <input
                type="date"
                name="data_aceite_final"
                value={formData.data_aceite_final}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
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
