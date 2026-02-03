'use client';

import { useState, useEffect } from 'react';
import { CQPerguntaConfig, CQOpcaoDropdown, CQ_OPCOES_PADRAO, CQ_OPCOES_COM_NA } from '@/types/qualidade';

interface ModalEditarCQProps {
  pergunta: CQPerguntaConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pergunta: CQPerguntaConfig) => void;
  isNew?: boolean;
}

export default function ModalEditarCQ({ pergunta, isOpen, onClose, onSave, isNew = false }: ModalEditarCQProps) {
  const [formData, setFormData] = useState<CQPerguntaConfig>({
    id: '',
    codigo: '',
    titulo: '',
    criterios: '',
    descricao: '',
    opcoes: CQ_OPCOES_PADRAO,
    requerImagem: false,
    ordem: 0,
    ativo: true
  });

  const [novaOpcao, setNovaOpcao] = useState({ valor: '', label: '' });
  const [usarOpcoesPersonalizadas, setUsarOpcoesPersonalizadas] = useState(false);

  useEffect(() => {
    if (pergunta) {
      setFormData(pergunta);
      // Verificar se usa opções personalizadas
      const isCustom = JSON.stringify(pergunta.opcoes) !== JSON.stringify(CQ_OPCOES_PADRAO) &&
                       JSON.stringify(pergunta.opcoes) !== JSON.stringify(CQ_OPCOES_COM_NA);
      setUsarOpcoesPersonalizadas(isCustom);
    } else if (isNew) {
      setFormData({
        id: `cq_novo_${Date.now()}`,
        codigo: '',
        titulo: '',
        criterios: '',
        descricao: '',
        opcoes: CQ_OPCOES_PADRAO,
        requerImagem: false,
        ordem: 999,
        ativo: true
      });
      setUsarOpcoesPersonalizadas(false);
    }
  }, [pergunta, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpcoesPreset = (preset: 'padrao' | 'com_na') => {
    if (preset === 'padrao') {
      setFormData(prev => ({ ...prev, opcoes: [...CQ_OPCOES_PADRAO] }));
    } else {
      setFormData(prev => ({ ...prev, opcoes: [...CQ_OPCOES_COM_NA] }));
    }
    setUsarOpcoesPersonalizadas(false);
  };

  const handleAdicionarOpcao = () => {
    if (novaOpcao.valor && novaOpcao.label) {
      setFormData(prev => ({
        ...prev,
        opcoes: [...prev.opcoes, { ...novaOpcao }]
      }));
      setNovaOpcao({ valor: '', label: '' });
      setUsarOpcoesPersonalizadas(true);
    }
  };

  const handleRemoverOpcao = (index: number) => {
    // Não remover a primeira opção (Selecione)
    if (index === 0) return;
    setFormData(prev => ({
      ...prev,
      opcoes: prev.opcoes.filter((_, i) => i !== index)
    }));
    setUsarOpcoesPersonalizadas(true);
  };

  const handleEditarOpcao = (index: number, campo: 'valor' | 'label', novoValor: string) => {
    setFormData(prev => ({
      ...prev,
      opcoes: prev.opcoes.map((opt, i) =>
        i === index ? { ...opt, [campo]: novoValor } : opt
      )
    }));
    setUsarOpcoesPersonalizadas(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Gerar ID se for novo
    const dadosParaSalvar = { ...formData };
    if (isNew && !dadosParaSalvar.id.startsWith('cq')) {
      dadosParaSalvar.id = dadosParaSalvar.codigo.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    onSave(dadosParaSalvar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {isNew ? 'Nova pergunta de CQ' : 'Editar pergunta de CQ'}
            </h2>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-5">
            {/* Código e Título */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  placeholder="Ex: CQ1-M"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Ex: Montagem do reservatório"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Critérios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Critérios de aceitação *
              </label>
              <input
                type="text"
                name="criterios"
                value={formData.criterios}
                onChange={handleChange}
                placeholder="Ex: Conforme desenho"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                name="descricao"
                value={formData.descricao || ''}
                onChange={handleChange}
                rows={2}
                placeholder="Descrição detalhada da verificação..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Opções do Dropdown */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Opções do dropdown
              </label>

              {/* Presets */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleOpcoesPreset('padrao')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                    !usarOpcoesPersonalizadas && JSON.stringify(formData.opcoes) === JSON.stringify(CQ_OPCOES_PADRAO)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                >
                  Padrão (Conforme/Não conforme)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpcoesPreset('com_na')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                    !usarOpcoesPersonalizadas && JSON.stringify(formData.opcoes) === JSON.stringify(CQ_OPCOES_COM_NA)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                >
                  Com N/A
                </button>
              </div>

              {/* Lista de opções */}
              <div className="space-y-2 mb-3">
                {formData.opcoes.map((opcao, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opcao.valor}
                      onChange={(e) => handleEditarOpcao(index, 'valor', e.target.value)}
                      placeholder="Valor"
                      disabled={index === 0}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100"
                    />
                    <input
                      type="text"
                      value={opcao.label}
                      onChange={(e) => handleEditarOpcao(index, 'label', e.target.value)}
                      placeholder="Rótulo"
                      disabled={index === 0}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100"
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverOpcao(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Adicionar nova opção */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <input
                  type="text"
                  value={novaOpcao.valor}
                  onChange={(e) => setNovaOpcao(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="Novo valor"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={novaOpcao.label}
                  onChange={(e) => setNovaOpcao(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Novo rótulo"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
                <button
                  type="button"
                  onClick={handleAdicionarOpcao}
                  disabled={!novaOpcao.valor || !novaOpcao.label}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            {/* Configurações adicionais */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="requerImagem"
                  checked={formData.requerImagem}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Requer imagem/anexo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Pergunta ativa</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Ordem:</label>
                <input
                  type="number"
                  name="ordem"
                  value={formData.ordem}
                  onChange={handleChange}
                  min={0}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {isNew ? 'Adicionar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
