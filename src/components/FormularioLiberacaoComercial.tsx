'use client';

import { useState, useRef } from 'react';

interface FormularioLiberacaoComercialProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioLiberacaoComercial({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioLiberacaoComercialProps) {
  const [formData, setFormData] = useState({
    // Critérios de verificação
    dados_cliente_corretos: '' as 'Sim' | 'Não' | '',
    local_entrega_definido: '' as 'Sim' | 'Não' | '',
    prazo_entrega_viavel: '' as 'Sim' | 'Não' | '',
    forma_pagamento_definida: '' as 'Sim' | 'Não' | '',
    observacoes_complementares_atendidas: '' as 'Sim' | 'Não' | '',
    outros_requisitos_atendidos: '' as 'Sim' | 'Não' | '',

    // Todos os critérios atendidos
    todos_criterios_atendidos: '' as 'Sim' | 'Não' | '',

    // Ação necessária caso algum critério não seja atendido
    acao_necessaria: '',

    // Anexo do pedido
    anexo_pedido: null as { filename: string; url: string; size: number }[] | null,

    // Observações gerais
    observacoes: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    const uploadedFiles = [];

    for (const file of files) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('tipo', 'liberacao_comercial');
      formDataUpload.append('numero_opd', opd);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
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

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'dados_cliente_corretos',
        'local_entrega_definido',
        'prazo_entrega_viavel',
        'forma_pagamento_definida',
        'observacoes_complementares_atendidas',
        'outros_requisitos_atendidos',
        'todos_criterios_atendidos'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          alert(`Por favor, preencha todos os critérios de verificação.`);
          setLoading(false);
          return;
        }
      }

      // Se algum critério não foi atendido, a ação é obrigatória
      if (formData.todos_criterios_atendidos === 'Não' && !formData.acao_necessaria.trim()) {
        alert('Por favor, informe a ação necessária para liberar a proposta.');
        setLoading(false);
        return;
      }

      // Upload dos arquivos anexados
      let uploadedFiles: { filename: string; url: string; size: number }[] | null = null;
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        uploadedFiles = await uploadFiles(selectedFiles);
        setUploadingFiles(false);
      }

      // Preparar dados para envio
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const dados_formulario = {
        ...formData,
        anexo_pedido: uploadedFiles,
      };

      // Enviar formulário
      const response = await fetch(`/api/formularios-liberacao-comercial/${opd}`, {
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
        alert('Formulário de Liberação Comercial salvo com sucesso!');
        onSubmit(dados_formulario);
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  const renderCriterio = (
    id: keyof typeof formData,
    label: string
  ) => {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <label className="text-gray-700 font-medium flex-1">{label}</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={id}
              value="Sim"
              checked={formData[id] === 'Sim'}
              onChange={(e) => setFormData(prev => ({ ...prev, [id]: e.target.value }))}
              className="w-4 h-4 text-green-600 focus:ring-green-500"
            />
            <span className="text-green-700 font-medium">Sim</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={id}
              value="Não"
              checked={formData[id] === 'Não'}
              onChange={(e) => setFormData(prev => ({ ...prev, [id]: e.target.value }))}
              className="w-4 h-4 text-red-600 focus:ring-red-500"
            />
            <span className="text-red-700 font-medium">Não</span>
          </label>
        </div>
      </div>
    );
  };

  // Verificar se todos os critérios estão como "Sim"
  const todosSimAutomatico =
    formData.dados_cliente_corretos === 'Sim' &&
    formData.local_entrega_definido === 'Sim' &&
    formData.prazo_entrega_viavel === 'Sim' &&
    formData.forma_pagamento_definida === 'Sim' &&
    formData.observacoes_complementares_atendidas === 'Sim' &&
    formData.outros_requisitos_atendidos === 'Sim';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Liberação Comercial</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {/* Seção de Critérios */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-4 text-gray-900">Critérios de Verificação</h4>

          <div className="space-y-1">
            {renderCriterio('dados_cliente_corretos', 'Os dados do cliente estão corretos?')}
            {renderCriterio('local_entrega_definido', 'O local de entrega está definido?')}
            {renderCriterio('prazo_entrega_viavel', 'Conseguimos entregar no prazo?')}
            {renderCriterio('forma_pagamento_definida', 'A forma de pagamento está definida?')}
            {renderCriterio('observacoes_complementares_atendidas', 'As observações complementares podem ser atendidas?')}
            {renderCriterio('outros_requisitos_atendidos', 'Outros requisitos solicitados podem ser atendidos?')}
          </div>
        </div>

        {/* Seção: Todos os critérios atendidos */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-bold text-lg mb-4 text-gray-900">Resultado da Análise</h4>

          <div className="flex items-center justify-between py-3">
            <label className="text-gray-700 font-bold flex-1">Todos os critérios foram atendidos?</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="todos_criterios_atendidos"
                  value="Sim"
                  checked={formData.todos_criterios_atendidos === 'Sim'}
                  onChange={(e) => setFormData(prev => ({ ...prev, todos_criterios_atendidos: e.target.value as 'Sim' | 'Não' }))}
                  className="w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <span className="text-green-700 font-bold text-lg">Sim</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="todos_criterios_atendidos"
                  value="Não"
                  checked={formData.todos_criterios_atendidos === 'Não'}
                  onChange={(e) => setFormData(prev => ({ ...prev, todos_criterios_atendidos: e.target.value as 'Sim' | 'Não' }))}
                  className="w-5 h-5 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-700 font-bold text-lg">Não</span>
              </label>
            </div>
          </div>

          {!todosSimAutomatico && formData.todos_criterios_atendidos === 'Sim' && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-sm">
              Atenção: Alguns critérios acima estão marcados como "Não", mas você indicou que todos foram atendidos. Verifique se está correto.
            </div>
          )}
        </div>

        {/* Seção: Ação necessária (aparece se "Não" for selecionado) */}
        {formData.todos_criterios_atendidos === 'Não' && (
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
            <h4 className="font-bold text-lg mb-4 text-red-900">Ação Necessária</h4>
            <label className="block text-sm font-semibold text-red-700 mb-2">
              Caso algum critério não tenha sido atendido, qual ação é necessária para liberar a proposta? *
            </label>
            <textarea
              value={formData.acao_necessaria}
              onChange={(e) => setFormData(prev => ({ ...prev, acao_necessaria: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Descreva a ação necessária para resolver as pendências..."
              required
            />
          </div>
        )}

        {/* Seção: Anexo do Pedido */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-4 text-gray-900">Anexo do Pedido</h4>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center py-3"
            >
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                  : 'Clique para anexar o pedido'}
              </span>
              <span className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, JPG, PNG (múltiplos arquivos permitidos)</span>
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-800">{file.name}</span>
                    <span className="text-xs text-green-600">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observações Gerais */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-4 text-gray-900">Observações Gerais</h4>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            placeholder="Observações adicionais (opcional)..."
          />
        </div>
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
          {uploadingFiles ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando arquivos...</span>
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
            <span>Salvar e Liberar</span>
          )}
        </button>
      </div>
    </form>
  );
}
