'use client';

import { useState } from 'react';

interface EditarDataEntregaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { novaData: string; justificativa: string }) => void;
  dataAtual: string | null;
  numeroOpd: string;
}

export default function EditarDataEntrega({
  isOpen,
  onClose,
  onConfirm,
  dataAtual,
  numeroOpd
}: EditarDataEntregaProps) {
  const [novaData, setNovaData] = useState(() => {
    if (dataAtual) {
      return dataAtual.split('T')[0];
    }
    return '';
  });
  const [justificativa, setJustificativa] = useState('');

  const handleConfirm = () => {
    if (!novaData) {
      alert('Por favor, informe a nova data de entrega');
      return;
    }
    if (!justificativa.trim()) {
      alert('Por favor, informe a justificativa para a alteração');
      return;
    }

    onConfirm({ novaData, justificativa: justificativa.trim() });
    setJustificativa('');
  };

  const handleCancel = () => {
    setJustificativa('');
    onClose();
  };

  if (!isOpen) return null;

  const formatarData = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Editar Data de Entrega
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            OPD: <span className="font-semibold">{numeroOpd}</span>
          </p>
          <p className="text-sm text-gray-700">
            Data atual: <span className="font-semibold">{formatarData(dataAtual)}</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Data de Entrega: <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificativa: <span className="text-red-600">*</span>
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Informe o motivo da alteração da data de entrega..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta justificativa ficará registrada no histórico da OPD
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Confirmar Alteração
          </button>
        </div>
      </div>
    </div>
  );
}
