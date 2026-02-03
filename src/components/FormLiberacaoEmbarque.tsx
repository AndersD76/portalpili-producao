'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface FormLiberacaoEmbarqueProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormLiberacaoEmbarque({ numeroOpd, onSubmit, onCancel }: FormLiberacaoEmbarqueProps) {
  const [formData, setFormData] = useState({
    numero_opd: numeroOpd,
    // Documentação
    nota_fiscal_romaneio: '',
    checklist_final: '',
    manual_certificado: '',
    // Estrutura Mecânica
    fixacao_partes_moveis: '',
    aperto_parafusos: '',
    pecas_soltas: '',
    superficies_protegidas: '',
    imagem_superficies: null as File | null,
    // Sistema Hidráulico
    nivel_oleo: '',
    imagem_nivel_oleo: null as File | null,
    conectores_hidraulicos: '',
    mangueiras_valvulas: '',
    // Sistema Elétrico
    painel_eletrico: '',
    imagem_painel: null as File | null,
    cabos_chicotes: '',
    sensores_etiquetados: '',
    // Embalagem e Transporte
    fixacao_cintas: '',
    protecao_intemperies: '',
    imagem_carga: null as File | null,
    // Liberação
    responsavel_liberacao: '',
    data_liberacao: '',
  });

  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.responsavel_liberacao || !formData.data_liberacao) {
      toast.warning('Por favor, preencha todos os campos obrigatorios');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 sticky top-0 z-10">
        <h3 className="font-semibold text-red-900">REGISTRO DE INSTALAÇÃO - LIBERAÇÃO E EMBARQUE</h3>
        <p className="text-sm text-red-700 mt-1">* Indica uma pergunta obrigatória</p>
      </div>

      {/* DOCUMENTAÇÃO */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">DOCUMENTAÇÃO</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            A nota fiscal e o romaneio estão presentes, foram conferidos e estão corretos? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.nota_fiscal_romaneio === 'Sim'} onChange={(e) => setFormData({ ...formData, nota_fiscal_romaneio: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.nota_fiscal_romaneio === 'Não'} onChange={(e) => setFormData({ ...formData, nota_fiscal_romaneio: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O check-list final está completamente preenchido e está assinado? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.checklist_final === 'Sim'} onChange={(e) => setFormData({ ...formData, checklist_final: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.checklist_final === 'Não'} onChange={(e) => setFormData({ ...formData, checklist_final: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O manual técnico e o certificado de garantia foram anexados? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.manual_certificado === 'Sim'} onChange={(e) => setFormData({ ...formData, manual_certificado: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.manual_certificado === 'Não'} onChange={(e) => setFormData({ ...formData, manual_certificado: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>
      </div>

      {/* ESTRUTURA MECÂNICA */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">ESTRUTURA MECÂNICA</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foi conferido a fixação de partes móveis (trava de segurança, cilindros recolhidos, plataforma travada)? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.fixacao_partes_moveis === 'Sim'} onChange={(e) => setFormData({ ...formData, fixacao_partes_moveis: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.fixacao_partes_moveis === 'Não'} onChange={(e) => setFormData({ ...formData, fixacao_partes_moveis: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foi conferido o aperto dos parafusos estruturais principais? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.aperto_parafusos === 'Sim'} onChange={(e) => setFormData({ ...formData, aperto_parafusos: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.aperto_parafusos === 'Não'} onChange={(e) => setFormData({ ...formData, aperto_parafusos: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foi verificado se não há peças soltas, batentes, dobradiças ou pinos desalinhados? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.pecas_soltas === 'Sim'} onChange={(e) => setFormData({ ...formData, pecas_soltas: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.pecas_soltas === 'Não'} onChange={(e) => setFormData({ ...formData, pecas_soltas: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Todas as superfícies pintadas foram protegidas com lonas ou espuma? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.superficies_protegidas === 'Sim'} onChange={(e) => setFormData({ ...formData, superficies_protegidas: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.superficies_protegidas === 'Não'} onChange={(e) => setFormData({ ...formData, superficies_protegidas: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem das superfícies protegidas: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('imagem_superficies', e.target.files?.[0] || null)}
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* SISTEMA HIDRÁULICO */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">SISTEMA HIDRÁULICO</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O nível do óleo foi verificado? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.nivel_oleo === 'Sim'} onChange={(e) => setFormData({ ...formData, nivel_oleo: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.nivel_oleo === 'Não'} onChange={(e) => setFormData({ ...formData, nivel_oleo: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do nível do óleo: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('imagem_nivel_oleo', e.target.files?.[0] || null)}
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Os conectores hidráulicos estão com tampas de proteção? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.conectores_hidraulicos === 'Sim'} onChange={(e) => setFormData({ ...formData, conectores_hidraulicos: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.conectores_hidraulicos === 'Não'} onChange={(e) => setFormData({ ...formData, conectores_hidraulicos: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            As mangueiras e válvulas foram fixadas e estão protegidas contra vibração? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.mangueiras_valvulas === 'Sim'} onChange={(e) => setFormData({ ...formData, mangueiras_valvulas: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.mangueiras_valvulas === 'Não'} onChange={(e) => setFormData({ ...formData, mangueiras_valvulas: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>
      </div>

      {/* SISTEMA ELÉTRICO E DE CONTROLE */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">SISTEMA ELÉTRICO E DE CONTROLE</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O painel elétrico está devidamente fechado e está identificado? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.painel_eletrico === 'Sim'} onChange={(e) => setFormData({ ...formData, painel_eletrico: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.painel_eletrico === 'Não'} onChange={(e) => setFormData({ ...formData, painel_eletrico: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem do painel elétrico: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('imagem_painel', e.target.files?.[0] || null)}
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Os cabos e chicotes estão protegidos (sem dobras bruscas)? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.cabos_chicotes === 'Sim'} onChange={(e) => setFormData({ ...formData, cabos_chicotes: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.cabos_chicotes === 'Não'} onChange={(e) => setFormData({ ...formData, cabos_chicotes: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Os sensores, botões e chicotes estão etiquetados? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.sensores_etiquetados === 'Sim'} onChange={(e) => setFormData({ ...formData, sensores_etiquetados: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.sensores_etiquetados === 'Não'} onChange={(e) => setFormData({ ...formData, sensores_etiquetados: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>
      </div>

      {/* EMBALAGEM E TRANSPORTE */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">EMBALAGEM E TRANSPORTE</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O equipamento, seus componentes e conjuntos estão fixados com cintas e calços de segurança? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.fixacao_cintas === 'Sim'} onChange={(e) => setFormData({ ...formData, fixacao_cintas: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.fixacao_cintas === 'Não'} onChange={(e) => setFormData({ ...formData, fixacao_cintas: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O equipamento, seus componentes e conjuntos estão protegidos contra intempéries (lonas, plástico, etc.)? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="Sim" checked={formData.protecao_intemperies === 'Sim'} onChange={(e) => setFormData({ ...formData, protecao_intemperies: e.target.value })} className="mr-2" />
              Sim
            </label>
            <label className="flex items-center">
              <input type="radio" value="Não" checked={formData.protecao_intemperies === 'Não'} onChange={(e) => setFormData({ ...formData, protecao_intemperies: e.target.value })} className="mr-2" />
              Não
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar imagem da carga em cima do caminhão: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('imagem_carga', e.target.files?.[0] || null)}
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* LIBERAÇÃO */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">LIBERAÇÃO</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do responsável pela liberação: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.responsavel_liberacao}
            onChange={(e) => setFormData({ ...formData, responsavel_liberacao: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data da liberação: <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.data_liberacao}
            onChange={(e) => setFormData({ ...formData, data_liberacao: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Enviar Formulário
        </button>
      </div>
    </form>
  );
}
