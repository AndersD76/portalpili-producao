'use client';

import { useState, useEffect } from 'react';

interface ModalPoliticaQualidadeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalPoliticaQualidade({ isOpen, onClose }: ModalPoliticaQualidadeProps) {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Animar entrada do conteúdo após 300ms
      const contentTimer = setTimeout(() => setShowContent(true), 300);
      // Mostrar botão após 2 segundos
      const buttonTimer = setTimeout(() => setShowButton(true), 2000);

      return () => {
        clearTimeout(contentTimer);
        clearTimeout(buttonTimer);
      };
    } else {
      setShowContent(false);
      setShowButton(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Decorative Header Background */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

        {/* Content Container */}
        <div className="p-8 md:p-12">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Política da Qualidade
          </h2>

          <div className="h-1 w-24 bg-gradient-to-r from-red-600 to-red-400 mx-auto mb-8 rounded-full"></div>

          {/* Content with Animation */}
          <div
            className={`transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-inner border-2 border-gray-100">
              <p className="text-gray-800 text-base md:text-lg leading-relaxed text-justify font-medium">
                A PILI ESTÁ COMPROMETIDA EM ATENDER AS EXPECTATIVAS DOS CLIENTES EM PRODUTOS E SERVIÇOS.
                COM TECNOLOGIAS HIDRÁULICAS E PNEUMÁTICAS, OS PROCESSOS DEFINIDOS E CONSTANTEMENTE
                APRIMORADOS, ALÉM DE MANTER O CRESCIMENTO DO NEGÓCIO.
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="flex items-center justify-center mt-8 space-x-3">
              <div className="flex items-center space-x-2 text-red-600">
                <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">Qualidade</span>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center space-x-2 text-red-600">
                <svg className="w-5 h-5 animate-bounce" style={{ animationDelay: '0.2s' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">Excelência</span>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center space-x-2 text-red-600">
                <svg className="w-5 h-5 animate-bounce" style={{ animationDelay: '0.4s' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">Inovação</span>
              </div>
            </div>
          </div>

          {/* Button */}
          <div
            className={`mt-8 flex justify-center transition-all duration-500 ${
              showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <button
              onClick={onClose}
              className="group relative px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <span>Continuar para o Sistema</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>
          </div>

          {/* Subtle note */}
          <p className="text-center text-xs text-gray-500 mt-6 italic">
            Esta política reflete nosso compromisso com a qualidade e excelência
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
