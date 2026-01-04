'use client';

import { useState } from 'react';
import WebcamCapture from './WebcamCapture';

interface ConfirmacaoAtividadeProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { responsavel: string; dataFinalizacao: string; horaFinalizacao: string; fotoComprovacao: string }) => void;
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
  const [responsavel, setResponsavel] = useState('');
  const [dataFinalizacao, setDataFinalizacao] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [horaFinalizacao, setHoraFinalizacao] = useState(() => {
    const agora = new Date();
    return agora.toTimeString().slice(0, 5);
  });
  const [fotoComprovacao, setFotoComprovacao] = useState('');

  const handleConfirm = () => {
    if (!responsavel.trim()) {
      alert('Por favor, informe o nome do responsável');
      return;
    }
    if (!dataFinalizacao) {
      alert('Por favor, informe a data de finalização');
      return;
    }
    if (!horaFinalizacao) {
      alert('Por favor, informe a hora de finalização');
      return;
    }
    if (!fotoComprovacao) {
      alert('Por favor, tire uma foto do responsável para comprovação');
      return;
    }
    onConfirm({ responsavel, dataFinalizacao, horaFinalizacao, fotoComprovacao });
    setResponsavel('');
    setDataFinalizacao(new Date().toISOString().split('T')[0]);
    setHoraFinalizacao(new Date().toTimeString().slice(0, 5));
    setFotoComprovacao('');
  };

  const handleCancel = () => {
    setResponsavel('');
    onClose();
  };

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
        onClick={handleCancel}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirmar Ação
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            Você está prestes a <span className={`font-semibold ${getStatusColor(novoStatus)}`}>
              {getStatusLabel(novoStatus)}
            </span> a atividade:
          </p>
          <p className="text-sm font-semibold text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
            {atividade}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Responsável: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Digite seu nome completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Finalização: <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={dataFinalizacao}
                onChange={(e) => setDataFinalizacao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Finalização: <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={horaFinalizacao}
                onChange={(e) => setHoraFinalizacao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto do Responsável: <span className="text-red-600">*</span>
            </label>
            <WebcamCapture
              onPhotoCapture={setFotoComprovacao}
              currentPhoto={fotoComprovacao}
            />
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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
