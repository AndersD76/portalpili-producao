'use client';

interface ConfirmacaoAtividadeProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  atividade: string;
  novoStatus: string;
}

export default function ConfirmacaoAtividade({
  isOpen,
  onClose,
  onConfirm,
  atividade,
  novoStatus
}: ConfirmacaoAtividadeProps) {
  if (!isOpen) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EM ANDAMENTO':
        return 'iniciar';
      case 'CONCLUÍDA':
        return 'concluir';
      case 'A REALIZAR':
        return 'desmarcar';
      default:
        return 'atualizar';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM ANDAMENTO':
        return 'text-yellow-700';
      case 'CONCLUÍDA':
        return 'text-green-700';
      case 'A REALIZAR':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirmar Ação
        </h3>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">
            Deseja <span className={`font-semibold ${getStatusColor(novoStatus)}`}>
              {getStatusLabel(novoStatus)}
            </span> a atividade?
          </p>
          <p className="text-sm font-semibold text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
            {atividade}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
