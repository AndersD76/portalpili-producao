'use client';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
  sparkline?: number[];
}

const colorClasses = {
  green: 'border-green-500/30 bg-green-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  gray: 'border-gray-600/30 bg-gray-500/5',
};

const valueColorClasses = {
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  gray: 'text-gray-300',
};

export default function KpiCard({
  label,
  value,
  unit,
  trend,
  trendDirection = 'neutral',
  color = 'blue',
  sparkline,
}: KpiCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${valueColorClasses[color]}`}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-gray-400 ml-1">{unit}</span>
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${
            trendDirection === 'up' ? 'text-green-400'
            : trendDirection === 'down' ? 'text-red-400'
            : 'text-gray-500'
          }`}>
            {trendDirection === 'up' && (
              <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trendDirection === 'down' && (
              <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>

      {/* Mini sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2 flex items-end gap-0.5 h-6">
          {sparkline.map((val, i) => {
            const max = Math.max(...sparkline, 1);
            const height = (val / max) * 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${
                  i === sparkline.length - 1 ? 'bg-white/40' : 'bg-white/15'
                }`}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
