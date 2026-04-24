import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminTableColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  data: T[];
  columns: AdminTableColumn<T>[];
  getRowKey: (item: T) => string | number;
  emptyMessage?: string;
}

export function AdminTable<T>({ data, columns, getRowKey, emptyMessage = 'No admin records to show.' }: AdminTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-stone-100">
      <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
        <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={cn('px-4 py-3', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((item) => (
            <tr key={getRowKey(item)} className="transition-colors hover:bg-orange-50/30">
              {columns.map((column) => (
                <td key={column.header} className={cn('px-4 py-4 align-middle text-stone-700', column.className)}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td className="px-4 py-12 text-center text-sm font-medium text-stone-400" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
