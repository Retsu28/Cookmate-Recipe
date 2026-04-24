import type { ReportMetric } from '../data/adminMockData';

interface MetricBarListProps {
  items: ReportMetric[];
}

export function MetricBarList({ items }: MetricBarListProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = `${Math.max(8, Math.round((item.value / maxValue) * 100))}%`;

        return (
          <div key={item.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-stone-800">{item.label}</span>
              <span className="text-xs font-semibold text-stone-400">{item.detail}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-orange-500" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
