import { useEffect, useState } from 'react';
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/services/api';

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
}

const PAGE_SIZE = 50;

const ACTION_COLORS: Record<string, string> = {
  delete_review: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  delete_ingredient: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  create_ingredient: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update_ingredient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function actionBadge(action: string) {
  const cls = ACTION_COLORS[action] ?? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ logs: AuditEntry[]; total: number }>(
        `/api/admin/audit-log?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      )
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Audit Log</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">{total} total entries</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/60">
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Action</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Entity</th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-stone-500 sm:table-cell">Admin</th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-stone-500 md:table-cell">IP</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-stone-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-stone-400 dark:text-stone-600">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                  <td className="px-4 py-3">{actionBadge(log.action)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400">
                    {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="font-semibold text-stone-800 dark:text-stone-200">{log.admin_name ?? '—'}</p>
                    <p className="text-[11px] text-stone-400">{log.admin_email ?? ''}</p>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-stone-500 md:table-cell">{log.ip_address ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
