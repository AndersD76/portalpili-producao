'use client';

import { useState, useEffect } from 'react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: string;
  slides: number;
  url: string;
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'acesso',
    title: 'Acesso e Login',
    description: 'Como acessar o Portal Pili e fazer seu primeiro login',
    icon: '🔑',
    slides: 7,
    url: '/tutorials/acesso/index.html',
  },
  {
    id: 'producao',
    title: 'Módulo Produção',
    description: 'Gestão de OPDs, atividades, formulários e relatórios',
    icon: '🏭',
    slides: 16,
    url: '/tutorials/producao/index.html',
  },
  {
    id: 'comercial',
    title: 'Módulo Comercial',
    description: 'Pipeline, orçamentos, clientes, preços e propostas PDF',
    icon: '💼',
    slides: 18,
    url: '/tutorials/comercial/index.html',
  },
];

// ============================================
// Tutorial Modal — opens original HTML slides
// ============================================

export default function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedUrl(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedUrl) setSelectedUrl(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selectedUrl, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => selectedUrl ? setSelectedUrl(null) : onClose()}>
      <div
        className={`bg-white rounded-2xl shadow-2xl mx-4 overflow-hidden flex flex-col transition-all duration-300 ${
          selectedUrl ? 'w-full max-w-6xl h-[90vh]' : 'w-full max-w-lg max-h-[80vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedUrl && (
              <button onClick={() => setSelectedUrl(null)} className="p-1 hover:bg-white/20 rounded transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-bold">
              {selectedUrl ? TUTORIALS.find(t => t.url === selectedUrl)?.title : 'Tutoriais do Portal Pili'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {selectedUrl ? (
          <iframe
            src={selectedUrl}
            className="flex-1 w-full border-0"
            title="Tutorial"
          />
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-gray-500 text-sm">Escolha um tutorial para começar. Use as setas do teclado para navegar nos slides.</p>
            {TUTORIALS.map(tutorial => (
              <button
                key={tutorial.id}
                onClick={() => setSelectedUrl(tutorial.url)}
                className="w-full text-left bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl p-5 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{tutorial.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-red-700 transition">{tutorial.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{tutorial.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{tutorial.slides} slides com narração</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Tutorial Button (pulsing icon for home page)
// ============================================

export function TutorialButton() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('pili-tutorial-dismissed');
    if (d) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pili-tutorial-dismissed', '1');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          !dismissed ? 'animate-bounce' : ''
        }`}
        title="Tutoriais"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {!dismissed && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-ping" />
        )}
      </button>

      {!dismissed && !open && (
        <div className="fixed bottom-[90px] right-6 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
          <button onClick={handleDismiss} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-gray-600">&times;</button>
          Clique para ver os tutoriais!
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}

      <TutorialModal open={open} onClose={() => { setOpen(false); handleDismiss(); }} />
    </>
  );
}
