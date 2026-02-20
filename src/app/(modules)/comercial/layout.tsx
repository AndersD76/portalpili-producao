'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AssistenteIA } from '@/components/comercial';

const mobileNavItems = [
  {
    href: '/comercial',
    label: 'Pipeline',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: '/comercial/pipeline',
    label: 'Kanban',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
      </svg>
    ),
  },
  {
    href: '/comercial/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    href: '/comercial/clientes',
    label: 'Clientes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/comercial/propostas',
    label: 'Propostas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [iaOpen, setIaOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content - scrollable, with bottom padding on mobile for nav bar */}
      <main className="flex-1 overflow-y-auto min-w-0 pb-14 sm:pb-0">
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

      {/* IA toggle button - adjusted position on mobile to avoid bottom nav */}
      {!iaOpen && (
        <button
          onClick={() => setIaOpen(true)}
          className="fixed bottom-[4.5rem] sm:bottom-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-30"
          title="Assistente IA"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      )}

      {/* Mobile bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-20 sm:hidden">
        <div className="flex items-center justify-around h-14">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/comercial' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-0 flex-1 transition-colors ${
                  isActive
                    ? 'text-red-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.icon}
                <span className={`text-[10px] truncate ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
