'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OPD } from '@/types/opd';

export default function CalendarioPage() {
  const [opds, setOpds] = useState<OPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchOPDs();
  }, []);

  const fetchOPDs = async () => {
    try {
      const response = await fetch('/api/opds');
      const data = await response.json();

      if (data.success) {
        // Usar data_entrega ou data_prevista_entrega como fallback
        setOpds(data.data.filter((opd: OPD) => opd.data_entrega || opd.data_prevista_entrega));
      }
    } catch (error) {
      console.error('Erro ao carregar OPDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getDataEntrega = (opd: OPD) => opd.data_entrega || opd.data_prevista_entrega;

  const getOPDsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return opds.filter(opd => {
      const dataEntrega = getDataEntrega(opd);
      if (!dataEntrega) return false;
      const opdDate = new Date(dataEntrega).toISOString().split('T')[0];
      return opdDate === dateStr;
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayNamesShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/producao"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Calendário de Entregas</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/producao"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="OPDs"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Link>
              <Link
                href="/producao/dashboard"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </Link>
              <Link
                href="/"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Módulos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Resumo de Entregas do Mês */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Resumo - {monthNames[month]} {year}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">OPD</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Cliente</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Data Entrega</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {opds
                  .filter(opd => {
                    const dataEntrega = getDataEntrega(opd);
                    if (!dataEntrega) return false;
                    const opdDate = new Date(dataEntrega);
                    return opdDate.getMonth() === month && opdDate.getFullYear() === year;
                  })
                  .sort((a, b) => {
                    const dateA = new Date(getDataEntrega(a)!).getTime();
                    const dateB = new Date(getDataEntrega(b)!).getTime();
                    return dateA - dateB;
                  })
                  .map(opd => (
                    <tr key={opd.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <Link
                          href={`/producao/opd/${opd.numero}`}
                          className="font-semibold text-red-600 hover:text-red-700 hover:underline text-sm"
                        >
                          {opd.numero}
                        </Link>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900 text-sm">
                        {opd.cliente || '-'}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 text-sm">
                        {new Date(getDataEntrega(opd)!).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          (opd.percentual_conclusao || 0) === 100
                            ? 'bg-green-100 text-green-800'
                            : (opd.percentual_conclusao || 0) >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {opd.percentual_conclusao || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                {opds.filter(opd => {
                  const dataEntrega = getDataEntrega(opd);
                  if (!dataEntrega) return false;
                  const opdDate = new Date(dataEntrega);
                  return opdDate.getMonth() === month && opdDate.getFullYear() === year;
                }).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                      Nenhuma entrega programada para este mês
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controles do Calendário */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={previousMonth}
              className="px-2 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center space-x-1 sm:space-x-2 text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={nextMonth}
              className="px-2 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center space-x-1 sm:space-x-2 text-sm"
            >
              <span className="hidden sm:inline">Próximo</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Cabeçalho dos dias da semana */}
            {dayNames.map((day, index) => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2 text-xs sm:text-sm">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{dayNamesShort[index]}</span>
              </div>
            ))}

            {/* Espaços vazios antes do primeiro dia */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="h-16 sm:h-24 bg-gray-100 rounded-lg"></div>
            ))}

            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const date = new Date(year, month, day);
              const opdsForDay = getOPDsForDate(date);
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <div
                  key={day}
                  className={`h-16 sm:h-24 border rounded-lg p-1 sm:p-2 ${
                    isToday ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                  } hover:shadow-md transition overflow-hidden`}
                >
                  <div className={`text-xs sm:text-sm font-semibold ${isToday ? 'text-red-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1 overflow-y-auto max-h-10 sm:max-h-16">
                    {opdsForDay.slice(0, 2).map(opd => (
                      <Link
                        key={opd.id}
                        href={`/producao/opd/${opd.numero}`}
                        className="block text-[10px] sm:text-xs bg-red-100 text-red-800 px-1 sm:px-2 py-0.5 rounded hover:bg-red-200 transition truncate"
                        title={`OPD ${opd.numero}${opd.cliente ? ` - ${opd.cliente}` : ''}`}
                      >
                        {opd.numero}
                      </Link>
                    ))}
                    {opdsForDay.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">+{opdsForDay.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-50 border border-red-300 rounded"></div>
              <span>Hoje</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 rounded"></div>
              <span>OPD com entrega</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
