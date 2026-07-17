import React from 'react';

export const StatusBadge: React.FC<{ children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' }> = ({ children, tone = 'blue' }) => {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
};
