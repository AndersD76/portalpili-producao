'use client';

import { useState, useEffect } from 'react';
import { DadosEntrega } from '@/types/atividade';

interface FormularioEntregaProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: (data: DadosEntrega) => void;
  onCancel: () => void;
}

export default function FormularioEntrega({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioEntregaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState<DadosEntrega>({
    nome_fantasia_cliente: cliente,
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
    data_verificacoes: new Date().toISOString().split('T')[0],
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
    data_testes: new Date().toISOString().split('T')[0],
    lista_treinamento: null,
    imagem_equipe_treinada: null,
    termo_conclusao_aceito: null,
    data_aceite: new Date().toISOString().split('T')[0],
    responsavel_aceite: '',
    termo_aceite_final: null,
    data_aceite_final: new Date().toISOString().split('T')[0],
    responsavel_aceite_final: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setFormData(prev => ({
          ...prev,
          responsavel_verificacoes: parsed.nome || '',
          responsavel_testes: parsed.nome || '',
          responsavel_aceite: parsed.nome || '',
          responsavel_aceite_final: parsed.nome || ''
        }));
      } catch (e) {
        console.error('Erro ao parsear dados do usuário');
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBooleanChange = (field: keyof DadosEntrega, value: boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (field: keyof DadosEntrega, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof DadosEntrega) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const file = files[0];
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('opd', opd);
      formDataUpload.append('tipo', 'entrega');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          [fieldName]: result.url
        }));
      } else {
        throw new Error(result.error || 'Erro ao fazer upload');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.equipamento || !formData.numero_serie) {
      setError('Por favor, preencha o equipamento e número de série');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/formularios-entrega/${opd}`, {
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

  const renderSelectField = (
    label: string,
    field: string,
    options: { value: string; label: string }[],
    required: boolean = false
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        name={field}
        value={(formData[field] as string) || ''}
        onChange={(e) => handleSelectChange(field as keyof DadosEntrega, e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Selecione...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const renderBooleanField = (
    label: string,
    field: string,
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
            onChange={() => handleBooleanChange(field as keyof DadosEntrega, true)}
            className="mr-2"
          />
          <span className="text-green-700 font-medium">Sim</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            checked={formData[field] === false}
            onChange={() => handleBooleanChange(field as keyof DadosEntrega, false)}
            className="mr-2"
          />
          <span className="text-red-700 font-medium">Não</span>
        </label>
      </div>
    </div>
  );

  const statusOptions = [
    { value: 'Realizado', label: 'Realizado' },
    { value: 'Não realizado', label: 'Não realizado' },
    { value: 'Não aplicável', label: 'Não aplicável' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">FORMULÁRIO DE ENTREGA</h3>
        <p className="text-gray-700">OPD: {opd}</p>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO 1: IDENTIFICAÇÃO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">1. IDENTIFICAÇÃO DO EQUIPAMENTO</h4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nome Fantasia do Cliente: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="nome_fantasia_cliente"
              value={formData.nome_fantasia_cliente}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Equipamento: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="equipamento"
              value={formData.equipamento}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Número de Série: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="numero_serie"
              value={formData.numero_serie}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: VERIFICAÇÕES MECÂNICAS */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">2. VERIFICAÇÕES MECÂNICAS E HIDRÁULICAS</h4>

        {renderSelectField('Articulações da viga travadas', 'articulacoes_viga_travada', statusOptions)}
        {renderSelectField('Cilindros da plataforma', 'cilindros_plataforma', statusOptions)}
        {renderSelectField('Quadro de comando', 'quadro_comando', statusOptions)}
        {renderSelectField('Chaves de fins de curso', 'chaves_fins_curso', statusOptions)}
        {renderSelectField('Cilindros hidráulicos e válvulas', 'cilindros_hidraulicos_valvulas', statusOptions)}
        {renderSelectField('Pressão do sistema hidráulico', 'pressao_sistema_hidraulico', statusOptions)}
        {renderSelectField('Ar no sistema hidráulico removido', 'ar_sistema_hidraulico', statusOptions)}
        {renderSelectField('Funcionamento dos fins de curso', 'funcionamento_fins_curso', statusOptions)}
        {renderSelectField('Mangueiras e cabos', 'mangueiras_cabos', statusOptions)}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsável pelas verificações: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="responsavel_verificacoes"
              value={formData.responsavel_verificacoes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Data das verificações: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_verificacoes"
              value={formData.data_verificacoes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: TESTES FUNCIONAIS */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">3. TESTES FUNCIONAIS</h4>

        {renderBooleanField('Plataforma subiu corretamente?', 'plataforma_subiu')}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Vídeo da plataforma subindo:</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileUpload(e, 'video_plataforma_subindo')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.video_plataforma_subindo && <div className="mt-1 text-sm text-green-700">Vídeo anexado</div>}
        </div>

        {renderBooleanField('Plataforma desceu corretamente?', 'plataforma_desceu')}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Vídeo da plataforma descendo:</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileUpload(e, 'video_plataforma_descendo')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.video_plataforma_descendo && <div className="mt-1 text-sm text-green-700">Vídeo anexado</div>}
        </div>

        {renderBooleanField('Testes com carga realizados?', 'testes_com_carga')}
        {renderBooleanField('Teste de líquido penetrante realizado?', 'teste_liquido_penetrante')}
        {renderBooleanField('Houve vazamento no teste de líquido?', 'vazamento_liquido')}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Imagem do teste de líquido:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'imagem_teste_liquido')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.imagem_teste_liquido && <div className="mt-1 text-sm text-green-700">Imagem anexada</div>}
        </div>

        {renderBooleanField('Inclinostato funcionou corretamente?', 'inclinostato_funcionou')}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Vídeo do inclinostato:</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileUpload(e, 'video_inclinostato')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.video_inclinostato && <div className="mt-1 text-sm text-green-700">Vídeo anexado</div>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Observações:</label>
          <textarea
            name="observacoes"
            value={formData.observacoes || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsável pelos testes: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="responsavel_testes"
              value={formData.responsavel_testes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Data dos testes: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="data_testes"
              value={formData.data_testes}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: TREINAMENTO E ACEITE */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">4. TREINAMENTO E ACEITE FINAL</h4>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Lista de participantes do treinamento:</label>
          <textarea
            name="lista_treinamento"
            value={formData.lista_treinamento || ''}
            onChange={handleInputChange}
            placeholder="Nomes dos participantes (um por linha)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Foto da equipe treinada:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'imagem_equipe_treinada')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.imagem_equipe_treinada && <div className="mt-1 text-sm text-green-700">Imagem anexada</div>}
        </div>

        {renderBooleanField('Termo de conclusão aceito pelo cliente?', 'termo_conclusao_aceito', true)}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Data do aceite:</label>
            <input
              type="date"
              name="data_aceite"
              value={formData.data_aceite}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Responsável pelo aceite:</label>
            <input
              type="text"
              name="responsavel_aceite"
              value={formData.responsavel_aceite}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-purple-200">
          {renderBooleanField('Aceite final do equipamento?', 'termo_aceite_final', true)}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Data do aceite final:</label>
              <input
                type="date"
                name="data_aceite_final"
                value={formData.data_aceite_final}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Responsável pelo aceite final:</label>
              <input
                type="text"
                name="responsavel_aceite_final"
                value={formData.responsavel_aceite_final}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
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
