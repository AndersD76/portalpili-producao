'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ProductionChartProps {
  data: Array<{ time: string; produced: number; target: number }>;
  target: number;
}

export default function ProductionChart({ data, target }: ProductionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        Sem dados de produção para exibir
      </div>
    );
  }

  const targetPerInterval = data.length > 0 ? Math.round(target / data.length) : 0;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Intervalo: ${label}`}
            formatter={(value: number, name: string) => [
              value,
              name === 'produced' ? 'Produzido' : 'Meta',
            ]}
          />
          <ReferenceLine
            y={targetPerInterval}
            stroke="#EF4444"
            strokeDasharray="5 5"
            label={{ value: 'Meta', fill: '#EF4444', fontSize: 10, position: 'right' }}
          />
          <Bar
            dataKey="produced"
            fill="#3B82F6"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
