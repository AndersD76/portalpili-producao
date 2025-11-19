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
        setOpds(data.data.filter((opd: OPD) => opd.data_entrega));
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

  const getOPDsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return opds.filter(opd => {
      if (!opd.data_entrega) return false;
      const opdDate = new Date(opd.data_entrega).toISOString().split('T')[0];
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendário de Entregas</h1>
              <p className="text-gray-600 mt-1">Visualização de datas de entrega das OPDs</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Voltar
            </Link>
          </div>
        </div>

        {/* Controles do Calendário */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Anterior</span>
            </button>

            <h2 className="text-2xl font-bold text-gray-900">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={nextMonth}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center space-x-2"
            >
              <span>Próximo</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-2">
            {/* Cabeçalho dos dias da semana */}
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}

            {/* Espaços vazios antes do primeiro dia */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="h-24 bg-gray-100 rounded-lg"></div>
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
                  className={`h-24 border rounded-lg p-2 ${
                    isToday ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                  } hover:shadow-md transition`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-red-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="mt-1 space-y-1">
                    {opdsForDay.map(opd => (
                      <Link
                        key={opd.id}
                        href={`/opd/${opd.numero}`}
                        className="block text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition truncate"
                        title={`OPD ${opd.numero}${opd.cliente ? ` - ${opd.cliente}` : ''}`}
                      >
                        <div className="font-semibold">{opd.numero}</div>
                        {opd.cliente && (
                          <div className="text-[10px] text-red-700 truncate">{opd.cliente}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-6 flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
              <span>Hoje</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span>OPD com entrega programada</span>
            </div>
          </div>
        </div>

        {/* Lista de Entregas do Mês */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Entregas em {monthNames[month]} {year}
          </h3>
          <div className="space-y-3">
            {opds
              .filter(opd => {
                if (!opd.data_entrega) return false;
                const opdDate = new Date(opd.data_entrega);
                return opdDate.getMonth() === month && opdDate.getFullYear() === year;
              })
              .sort((a, b) => {
                const dateA = new Date(a.data_entrega!).getTime();
                const dateB = new Date(b.data_entrega!).getTime();
                return dateA - dateB;
              })
              .map(opd => (
                <Link
                  key={opd.id}
                  href={`/opd/${opd.numero}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">OPD {opd.numero}</h4>
                      {opd.cliente && (
                        <p className="text-sm font-medium text-blue-700">{opd.cliente}</p>
                      )}
                      <p className="text-sm text-gray-600">{opd.tipo_opd} - {opd.responsavel_opd}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(opd.data_entrega!).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {opd.percentual_conclusao}% concluído
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
