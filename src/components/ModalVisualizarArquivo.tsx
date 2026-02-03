'use client';

import Modal from './Modal';

interface ModalVisualizarArquivoProps {
  isOpen: boolean;
  onClose: () => void;
  arquivo: {
    filename: string;
    url: string;
    size: number;
  } | null;
  titulo?: string;
}

export default function ModalVisualizarArquivo({
  isOpen,
  onClose,
  arquivo,
  titulo = 'Visualizar Arquivo'
}: ModalVisualizarArquivoProps) {
  if (!arquivo) return null;

  const isPDF = arquivo.filename.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(arquivo.filename);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
    >
      <div className="space-y-4">
        {/* Informações do arquivo */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">{arquivo.filename}</p>
                <p className="text-sm text-gray-600">{formatFileSize(arquivo.size)}</p>
              </div>
            </div>
            <a
              href={arquivo.url}
              download={arquivo.filename}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Visualização do arquivo */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100" style={{ minHeight: '500px', maxHeight: '70vh' }}>
          {isPDF && (
            <iframe
              src={arquivo.url}
              className="w-full h-full"
              style={{ minHeight: '500px' }}
              title={arquivo.filename}
            />
          )}

          {isImage && (
            <div className="flex items-center justify-center p-4" style={{ minHeight: '500px' }}>
              <img
                src={arquivo.url}
                alt={arquivo.filename}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {!isPDF && !isImage && (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <svg className="w-24 h-24 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 text-center mb-4">
                Pré-visualização não disponível para este tipo de arquivo
              </p>
              <a
                href={arquivo.url}
                download={arquivo.filename}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Fazer Download</span>
              </a>
            </div>
          )}
        </div>

        {/* Botão fechar */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
