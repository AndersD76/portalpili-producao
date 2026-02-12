'use client';

import { useState } from 'react';
import { AssistenteIA } from '@/components/comercial';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [iaOpen, setIaOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>

      {/* IA side panel - desktop */}
      {iaOpen && (
        <div className="hidden lg:flex w-80 flex-shrink-0 h-full">
          <AssistenteIA
            sugestoes={[
              'Quem sao meus clientes?',
              'Resumo do pipeline',
              'Oportunidades em risco',
            ]}
            onClose={() => setIaOpen(false)}
          />
        </div>
      )}

      {/* IA drawer - mobile */}
      {iaOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIaOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[85vw] max-w-sm z-50 lg:hidden">
            <AssistenteIA
              sugestoes={[
                'Quem sao meus clientes?',
                'Resumo do pipeline',
                'Oportunidades em risco',
              ]}
              onClose={() => setIaOpen(false)}
            />
          </div>
        </>
      )}

      {/* IA toggle button - always visible when closed */}
      {!iaOpen && (
        <button
          onClick={() => setIaOpen(true)}
          className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-30"
          title="Assistente IA"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      )}
    </div>
  );
}
