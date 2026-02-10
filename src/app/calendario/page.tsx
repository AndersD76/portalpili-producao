'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OPD } from '@/types/opd';
import { useAuth } from '@/contexts/AuthContext';

export default function CalendarioPage() {
  const [opds, setOpds] = useState<OPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  const { authenticated, loading: authLoading, logout } = useAuth();

  // Verificar autenticação
  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    setCheckingAuth(false);
  }, [authLoading, authenticated]);

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    if (checkingAuth) return;
    fetchOPDs();
  }, [checkingAuth]);

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

  if (checkingAuth || loading) {
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
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">SIG</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Sistema Integrado de Gestão</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Calendário de Entregas</h2>
          <p className="text-gray-600 text-sm">Visualização de datas de entrega das OPDs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Resumo de Entregas do Mês */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Resumo de Entregas - {monthNames[month]} {year}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">OPD</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Data de Entrega</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Produto</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Conclusão</th>
                </tr>
              </thead>
              <tbody>
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
                    <tr key={opd.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/opd/${opd.numero}`}
                          className="font-semibold text-red-600 hover:text-red-700 hover:underline"
                        >
                          {opd.numero}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {opd.cliente || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(opd.data_entrega!).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {opd.tipo_opd}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  if (!opd.data_entrega) return false;
                  const opdDate = new Date(opd.data_entrega);
                  return opdDate.getMonth() === month && opdDate.getFullYear() === year;
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Nenhuma entrega programada para este mês
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
