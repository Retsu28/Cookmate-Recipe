import { ReactNode, Fragment, memo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  expandedRowId?: string | number | null;
  renderExpandedRow?: (item: T) => ReactNode;
  pageSize?: number;
}

function AdminTableBase<T>({ data, columns, getRowKey, emptyMessage = 'No admin records to show.', expandedRowId, renderExpandedRow, pageSize = 25 }: AdminTableProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = data.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div>
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
            {pageData.map((item) => {
              const isExpanded = getRowKey(item) === expandedRowId;
              return (
                <Fragment key={getRowKey(item)}>
                  <tr className={cn('transition-colors hover:bg-orange-50/30', isExpanded && 'bg-orange-50/30')}>
                    {columns.map((column) => (
                      <td key={column.header} className={cn('px-4 py-4 align-middle text-stone-700', column.className)}>
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpandedRow && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 pb-6 pt-2 bg-white">
                        <div className="rounded-2xl border border-orange-100 bg-orange-50/20 p-6 shadow-inner animate-fade-up">
                          {renderExpandedRow(item)}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <p className="text-xs font-medium text-stone-400">
            {safePage * pageSize + 1}–{Math.min(safePage * pageSize + pageSize, data.length)} of {data.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  i === safePage
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-stone-200 bg-white text-stone-500 hover:border-orange-300 hover:text-orange-600'
                )}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, safePage - 2), safePage + 3)}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add type assertion to preserve the generic typing with memo
export const AdminTable = memo(AdminTableBase) as typeof AdminTableBase;
