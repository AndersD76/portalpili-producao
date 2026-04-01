'use client';

import { useState, useEffect, useRef } from 'react';

interface ChangelogEntry {
  id: string;
  date: string;
  type: 'feature' | 'fix' | 'improvement';
  title: string;
  description: string;
}

// ============================================
// Changelog entries — adicione novas no topo
// ============================================
const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-04-01-tutorials',
    date: '01/04/2026',
    type: 'feature',
    title: 'Tutoriais interativos com narração',
    description: 'Novos tutoriais com voz em português no botão de play da página inicial. Aprenda a usar o portal ouvindo as instruções.',
  },
  {
    id: '2026-04-01-quality-cards',
    date: '01/04/2026',
    type: 'feature',
    title: 'Cards de resumo no Dashboard de Qualidade',
    description: 'Total de NCs, peças afetadas, em aberto e fechadas agora aparecem como cards no topo do dashboard, respeitando os filtros.',
  },
  {
    id: '2026-03-31-image-optionals',
    date: '31/03/2026',
    type: 'feature',
    title: 'Imagens nos opcionais de preço',
    description: 'Agora é possível anexar imagens nos opcionais e preços base. A miniatura aparece no configurador ao lado de cada item.',
  },
  {
    id: '2026-03-31-expense-limit',
    date: '31/03/2026',
    type: 'fix',
    title: 'Limite de despesa não trava mais o envio',
    description: 'Valores acima do limite (ex: pernoite R$140) agora exibem apenas um aviso amarelo, sem bloquear o envio da despesa.',
  },
  {
    id: '2026-03-31-receipt-compression',
    date: '31/03/2026',
    type: 'fix',
    title: 'Fotos de comprovantes grandes agora funcionam',
    description: 'Imagens da câmera do celular são comprimidas automaticamente antes de enviar para a IA, evitando erros de tamanho.',
  },
  {
    id: '2026-03-24-sinprod-sync',
    date: '24/03/2026',
    type: 'feature',
    title: 'Sincronização direta SinProd → NeonDB',
    description: 'OPDs e dados de produção do SinProd são sincronizados automaticamente a cada 5 minutos, sem necessidade de ngrok ou tunnel.',
  },
  {
    id: '2026-03-24-chao-fabrica',
    date: '24/03/2026',
    type: 'feature',
    title: 'Chão de Fábrica com dados do SinProd',
    description: 'Aba SINPROD no Chão de Fábrica mostra operadores trabalhando agora, apontamentos, recursos e OPDs em produção em tempo real.',
  },
  {
    id: '2026-03-20-pili-maq',
    date: '20/03/2026',
    type: 'feature',
    title: 'PILI_MAQ — Monitoramento de Máquinas',
    description: 'Novo módulo de monitoramento de máquinas com câmeras ESP32-CAM, detecção de movimento por IA, KPIs de produção e feed de câmera ao vivo.',
  },
  {
    id: '2026-03-20-esp32-camera',
    date: '20/03/2026',
    type: 'feature',
    title: 'Câmera ESP32-CAM integrada',
    description: 'Firmware para ESP32-CAM com detecção de movimento, upload de snapshots via HTTPS e monitoramento de operador por visão computacional.',
  },
];

// ============================================
// Type badge config
// ============================================
const TYPE_CONFIG = {
  feature: { label: 'Novo', color: 'bg-green-100 text-green-700', icon: '✨' },
  fix: { label: 'Correção', color: 'bg-amber-100 text-amber-700', icon: '🔧' },
  improvement: { label: 'Melhoria', color: 'bg-blue-100 text-blue-700', icon: '⬆️' },
};

// ============================================
// Component
// ============================================
export default function ChangelogBell() {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pili-changelog-last-seen') || '';
    setLastSeen(saved);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = CHANGELOG.filter(e => e.id > lastSeen).length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open && CHANGELOG.length > 0) {
      const latestId = CHANGELOG[0].id;
      localStorage.setItem('pili-changelog-last-seen', latestId);
      setLastSeen(latestId);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition relative"
        title="Novidades"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Novidades e Correções</h3>
            <span className="text-xs text-gray-400">{CHANGELOG.length} atualizações</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {CHANGELOG.map((entry) => {
              const config = TYPE_CONFIG[entry.type];
              const isNew = entry.id > lastSeen;
              return (
                <div key={entry.id} className={`px-4 py-3 ${isNew ? 'bg-red-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{entry.date}</span>
                        {isNew && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">NOVO</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight">{entry.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
