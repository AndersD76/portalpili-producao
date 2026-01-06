'use client';

import { useState, useEffect } from 'react';

interface DadosInstalacao {
  numero_opd: string;
  nome_cliente: string;
  local_instalacao: string;
  data_inicio_instalacao: string;
  data_termino_previsto: string;
  equipe_instalacao: string;
  // Verificações pré-instalação
  ferramentas_completas: boolean | null;
  epis_completos: boolean | null;
  materiais_conferidos: boolean | null;
  // Instalação mecânica
  ancoragem_base: string | null;
  nivelamento_estrutura: string | null;
  montagem_vigas: string | null;
  instalacao_cilindros: string | null;
  instalacao_plataforma: string | null;
  // Instalação hidráulica
  central_hidraulica: string | null;
  mangueiras_conectadas: string | null;
  nivel_oleo_verificado: boolean | null;
  teste_vazamento: boolean | null;
  // Instalação elétrica
  painel_instalado: string | null;
  cabeamento_completo: string | null;
  aterramento_verificado: boolean | null;
  sensores_instalados: string | null;
  // Testes iniciais
  teste_subida_vazio: boolean | null;
  teste_descida_vazio: boolean | null;
  ajuste_fins_curso: boolean | null;
  teste_emergencia: boolean | null;
  // Responsáveis
  responsavel_mecanica: string;
  responsavel_hidraulica: string;
  responsavel_eletrica: string;
  observacoes: string | null;
  imagens_instalacao: string[] | null;
}

interface FormularioInstalacaoProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: (data: DadosInstalacao) => void;
  onCancel: () => void;
}

export default function FormularioInstalacao({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioInstalacaoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState<DadosInstalacao>({
    numero_opd: opd,
    nome_cliente: cliente,
    local_instalacao: '',
    data_inicio_instalacao: new Date().toISOString().split('T')[0],
    data_termino_previsto: '',
    equipe_instalacao: '',
    ferramentas_completas: null,
    epis_completos: null,
    materiais_conferidos: null,
    ancoragem_base: null,
    nivelamento_estrutura: null,
    montagem_vigas: null,
    instalacao_cilindros: null,
    instalacao_plataforma: null,
    central_hidraulica: null,
    mangueiras_conectadas: null,
    nivel_oleo_verificado: null,
    teste_vazamento: null,
    painel_instalado: null,
    cabeamento_completo: null,
    aterramento_verificado: null,
    sensores_instalados: null,
    teste_subida_vazio: null,
    teste_descida_vazio: null,
    ajuste_fins_curso: null,
    teste_emergencia: null,
    responsavel_mecanica: '',
    responsavel_hidraulica: '',
    responsavel_eletrica: '',
    observacoes: null,
    imagens_instalacao: null
  });

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setFormData(prev => ({
          ...prev,
          responsavel_mecanica: parsed.nome || '',
          responsavel_hidraulica: parsed.nome || '',
          responsavel_eletrica: parsed.nome || ''
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

  const handleBooleanChange = (field: keyof DadosInstalacao, value: boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (field: keyof DadosInstalacao, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        formDataUpload.append('tipo', 'instalacao');

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

      setFormData(prev => ({
        ...prev,
        imagens_instalacao: [...(prev.imagens_instalacao || []), ...uploadedUrls]
      }));
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

    if (!formData.local_instalacao || !formData.equipe_instalacao) {
      setError('Por favor, preencha o local e equipe de instalação');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/formularios-instalacao/${opd}`, {
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

  const renderBooleanField = (label: string, field: keyof DadosInstalacao, required: boolean = false) => (
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
      </div>
    </div>
  );

  const renderSelectField = (label: string, field: keyof DadosInstalacao, options: { value: string; label: string }[]) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <select
        name={field}
        value={(formData[field] as string) || ''}
        onChange={(e) => handleSelectChange(field, e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Selecione...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const statusOptions = [
    { value: 'Concluído', label: 'Concluído' },
    { value: 'Em andamento', label: 'Em andamento' },
    { value: 'Pendente', label: 'Pendente' },
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
        <h3 className="font-bold text-lg mb-2">REGISTRO DE INSTALAÇÃO</h3>
        <p className="text-gray-700">OPD: {opd}</p>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO 1: INFORMAÇÕES GERAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">1. INFORMAÇÕES GERAIS</h4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Local da Instalação: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="local_instalacao"
              value={formData.local_instalacao}
              onChange={handleInputChange}
              placeholder="Cidade - UF"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Data de Início: <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                name="data_inicio_instalacao"
                value={formData.data_inicio_instalacao}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Data de Término Prevista:</label>
              <input
                type="date"
                name="data_termino_previsto"
                value={formData.data_termino_previsto}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Equipe de Instalação: <span className="text-red-600">*</span>
            </label>
            <textarea
              name="equipe_instalacao"
              value={formData.equipe_instalacao}
              onChange={handleInputChange}
              placeholder="Nomes dos técnicos (um por linha)"
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: VERIFICAÇÕES PRÉ-INSTALAÇÃO */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">2. VERIFICAÇÕES PRÉ-INSTALAÇÃO</h4>

        {renderBooleanField('Ferramentas completas?', 'ferramentas_completas', true)}
        {renderBooleanField('EPIs completos?', 'epis_completos', true)}
        {renderBooleanField('Materiais conferidos?', 'materiais_conferidos', true)}
      </div>

      {/* SEÇÃO 3: INSTALAÇÃO MECÂNICA */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">3. INSTALAÇÃO MECÂNICA</h4>

        {renderSelectField('Ancoragem da base', 'ancoragem_base', statusOptions)}
        {renderSelectField('Nivelamento da estrutura', 'nivelamento_estrutura', statusOptions)}
        {renderSelectField('Montagem das vigas', 'montagem_vigas', statusOptions)}
        {renderSelectField('Instalação dos cilindros', 'instalacao_cilindros', statusOptions)}
        {renderSelectField('Instalação da plataforma', 'instalacao_plataforma', statusOptions)}

        <div>
          <label className="block text-sm font-semibold mb-1">Responsável pela mecânica:</label>
          <input
            type="text"
            name="responsavel_mecanica"
            value={formData.responsavel_mecanica}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* SEÇÃO 4: INSTALAÇÃO HIDRÁULICA */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-lg mb-4 text-orange-900">4. INSTALAÇÃO HIDRÁULICA</h4>

        {renderSelectField('Central hidráulica', 'central_hidraulica', statusOptions)}
        {renderSelectField('Mangueiras conectadas', 'mangueiras_conectadas', statusOptions)}
        {renderBooleanField('Nível de óleo verificado?', 'nivel_oleo_verificado')}
        {renderBooleanField('Teste de vazamento realizado?', 'teste_vazamento')}

        <div>
          <label className="block text-sm font-semibold mb-1">Responsável pela hidráulica:</label>
          <input
            type="text"
            name="responsavel_hidraulica"
            value={formData.responsavel_hidraulica}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* SEÇÃO 5: INSTALAÇÃO ELÉTRICA */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">5. INSTALAÇÃO ELÉTRICA</h4>

        {renderSelectField('Painel instalado', 'painel_instalado', statusOptions)}
        {renderSelectField('Cabeamento completo', 'cabeamento_completo', statusOptions)}
        {renderBooleanField('Aterramento verificado?', 'aterramento_verificado')}
        {renderSelectField('Sensores instalados', 'sensores_instalados', statusOptions)}

        <div>
          <label className="block text-sm font-semibold mb-1">Responsável pela elétrica:</label>
          <input
            type="text"
            name="responsavel_eletrica"
            value={formData.responsavel_eletrica}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* SEÇÃO 6: TESTES INICIAIS */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">6. TESTES INICIAIS</h4>

        {renderBooleanField('Teste de subida (vazio)?', 'teste_subida_vazio')}
        {renderBooleanField('Teste de descida (vazio)?', 'teste_descida_vazio')}
        {renderBooleanField('Ajuste dos fins de curso?', 'ajuste_fins_curso')}
        {renderBooleanField('Teste de emergência?', 'teste_emergencia')}
      </div>

      {/* SEÇÃO 7: REGISTROS FOTOGRÁFICOS */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-lg mb-4 text-gray-900">7. REGISTROS E OBSERVAÇÕES</h4>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Imagens da instalação:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formData.imagens_instalacao && formData.imagens_instalacao.length > 0 && (
            <div className="mt-2 text-sm text-green-700">
              {formData.imagens_instalacao.length} imagem(ns) anexada(s)
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Observações:</label>
          <textarea
            name="observacoes"
            value={formData.observacoes || ''}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
          />
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
