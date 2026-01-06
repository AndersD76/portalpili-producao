'use client';

import { useState, useRef } from 'react';

interface FormularioPinturaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioPintura({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioPinturaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    // T1 - PREPARAÇÃO (6 itens)
    cq1t1_status: '', // RESPINGOS DE SOLDA
    cq2t1_status: '', // PONTOS COM GRAXARIA
    cq3t1_status: '', // SOLDAS REVISADAS
    cq4t1_status: '', // COMPONENTES DA SUB PLATAFORMA CONFORME PROJETO
    cq5t1_status: '', // SOLDAS LIBERADAS
    cq6t1_status: '', // VERIFICAÇÃO DE CHAPAS (CALHAS E CHAPAS PISO) EMPENADAS

    // T2 - PINTURA (12 itens)
    cq1t2_status: '', // ISOLAMENTO DOS COMPONENTES
    cq2t2_marca_tinta: '', // MARCA DA TINTA (texto)
    cq3t2_lote_tinta: '', // LOTE DA TINTA (texto)
    cq4t2_validade_tinta: '', // VALIDADE DA TINTA (texto)
    cq5t2_marca_fosfatizante: '', // MARCA DO FOSFATIZANTE (texto)
    cq6t2_status: '', // APLICAÇÃO DO FOSFATIZANTE
    cq7t2_espessura_umida: '', // ESPESSURA DA TINTA ÚMIDA (texto)
    cq8t2_espessura_seca: '', // ESPESSURA TINTA SECA (texto)
    cq9t2_status: '', // MÉTODO DA APLICAÇÃO DE TINTA
    cq10t2_status: '', // VERIFICAR PINTURA GERAL (SUPERIOR E INFERIOR)
    cq11t2_status: '', // ADERÊNCIA
    cq11t2_imagem: null as { filename: string; url: string; size: number }[] | null,
    cq12t2_status: '', // ADESIVAÇÃO GERAL
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(prev => ({ ...prev, [fieldName]: true }));

    try {
      const uploadedFiles: { filename: string; url: string; size: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'controle_qualidade_pintura');
        formDataUpload.append('numero_opd', opd);

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      setFormData(prev => ({ ...prev, [fieldName]: uploadedFiles }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-pintura/${opd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data')!).nome : 'Sistema'
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

  const renderCQField = (label: string, fieldName: string, criterio: string, hasNaoAplicavel = false) => (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <p className="text-sm text-blue-700 mb-2">Critérios: {criterio}</p>
      <select
        name={`${fieldName}_status`}
        value={(formData as any)[`${fieldName}_status`]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
      >
        <option value="">Selecione</option>
        <option value="Conforme">Conforme</option>
        <option value="Não conforme">Não conforme</option>
        {hasNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
      </select>
    </div>
  );

  const renderTextField = (label: string, fieldName: string) => (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <input
        type="text"
        name={fieldName}
        value={(formData as any)[fieldName]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        placeholder="Digite aqui..."
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">CQ-T: PINTURA E PREPARAÇÃO - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* T1 - PREPARAÇÃO */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-xl mb-4 text-orange-900">T1 - PREPARAÇÃO</h4>

        {renderCQField('CQ1-T1: RESPINGOS DE SOLDA', 'cq1t1', 'Sem respingos', true)}
        {renderCQField('CQ2-T1: PONTOS COM GRAXARIA', 'cq2t1', 'Sem graxa', true)}
        {renderCQField('CQ3-T1: SOLDAS REVISADAS', 'cq3t1', 'Revisadas', true)}
        {renderCQField('CQ4-T1: COMPONENTES DA SUB PLATAFORMA CONFORME PROJETO', 'cq4t1', 'Conforme projeto', true)}
        {renderCQField('CQ5-T1: SOLDAS LIBERADAS', 'cq5t1', 'Liberadas', true)}
        {renderCQField('CQ6-T1: VERIFICAÇÃO DE CHAPAS EMPENADAS', 'cq6t1', 'Sem empenamento', true)}
      </div>

      {/* T2 - PINTURA */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">T2 - PINTURA</h4>

        {renderCQField('CQ1-T2: ISOLAMENTO DOS COMPONENTES', 'cq1t2', 'Isolados')}
        {renderTextField('CQ2-T2: MARCA DA TINTA', 'cq2t2_marca_tinta')}
        {renderTextField('CQ3-T2: LOTE DA TINTA', 'cq3t2_lote_tinta')}
        {renderTextField('CQ4-T2: VALIDADE DA TINTA', 'cq4t2_validade_tinta')}
        {renderTextField('CQ5-T2: MARCA DO FOSFATIZANTE', 'cq5t2_marca_fosfatizante')}
        {renderCQField('CQ6-T2: APLICAÇÃO DO FOSFATIZANTE', 'cq6t2', 'Aplicado corretamente')}
        {renderTextField('CQ7-T2: ESPESSURA DA TINTA ÚMIDA', 'cq7t2_espessura_umida')}
        {renderTextField('CQ8-T2: ESPESSURA TINTA SECA', 'cq8t2_espessura_seca')}
        {renderCQField('CQ9-T2: MÉTODO DA APLICAÇÃO DE TINTA', 'cq9t2', 'Conforme especificação')}
        {renderCQField('CQ10-T2: VERIFICAR PINTURA GERAL (SUPERIOR E INFERIOR)', 'cq10t2', 'Sem falhas', true)}

        {/* CQ11-T2 com imagem */}
        <div className="border rounded-lg p-4 bg-white mb-3">
          <h5 className="font-bold text-gray-900 mb-2">CQ11-T2: ADERÊNCIA</h5>
          <p className="text-sm text-blue-700 mb-2">Critérios: Teste de aderência aprovado</p>
          <select
            name="cq11t2_status"
            value={formData.cq11t2_status}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-3"
          >
            <option value="">Selecione</option>
            <option value="Conforme">Conforme</option>
            <option value="Não conforme">Não conforme</option>
          </select>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              ref={(el) => { fileInputRefs.current['cq11t2_imagem'] = el; }}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e, 'cq11t2_imagem')}
              className="hidden"
            />
            <button type="button" onClick={() => fileInputRefs.current['cq11t2_imagem']?.click()} className="w-full flex flex-col items-center py-2">
              {uploadingImages['cq11t2_imagem'] ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
              ) : (
                <span className="text-sm text-gray-600">
                  {formData.cq11t2_imagem && formData.cq11t2_imagem.length > 0
                    ? `${formData.cq11t2_imagem.length} arquivo(s) selecionado(s)`
                    : 'Clique para anexar imagem do teste de aderência'}
                </span>
              )}
            </button>
          </div>
        </div>

        {renderCQField('CQ12-T2: ADESIVAÇÃO GERAL', 'cq12t2', 'Conforme especificação')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-T</span>)}
        </button>
      </div>
    </form>
  );
}
