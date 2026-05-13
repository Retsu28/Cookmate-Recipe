import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, ChevronLeft, ChevronRight, Download, Filter, Search } from 'lucide-react';
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
  delete_recipe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  delete_user: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  create_ingredient: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  create_recipe: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update_ingredient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  update_recipe: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  update_user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  toggle_featured: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  toggle_published: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  import_csv: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function actionBadge(action: string) {
  const cls = ACTION_COLORS[action] ?? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

const ACTION_OPTIONS = [
  'create_recipe', 'update_recipe', 'delete_recipe',
  'create_ingredient', 'update_ingredient', 'delete_ingredient',
  'toggle_featured', 'toggle_published', 'import_csv',
  'update_user', 'delete_user', 'delete_review'
];

const ENTITY_OPTIONS = ['recipe', 'ingredient', 'user', 'review'];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity_type', entityFilter);
    if (adminFilter) params.set('admin', adminFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    
    api
      .get<{ logs: AuditEntry[]; total: number }>(`/api/admin/audit-log?${params}`)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter, adminFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Action', 'Entity Type', 'Entity ID', 'Admin', 'Admin Email', 'IP Address', 'Created At', 'Metadata'].join(','),
      ...logs.map(log => [
        log.id,
        log.action,
        log.entity_type,
        log.entity_id ?? '',
        log.admin_name ?? '',
        log.admin_email ?? '',
        log.ip_address ?? '',
        log.created_at,
        JSON.stringify(log.metadata).replace(/,/g, ';')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Audit Log</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">{total} total entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-stone-600 dark:bg-stone-700"
              >
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-stone-600 dark:bg-stone-700"
              >
                <option value="">All Entities</option>
                {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Admin Search</label>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-stone-400" />
                <input
                  type="text"
                  value={adminFilter}
                  onChange={(e) => { setAdminFilter(e.target.value); setPage(0); }}
                  placeholder="Name or email..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-stone-500">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-stone-600 dark:bg-stone-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-stone-500">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-stone-600 dark:bg-stone-700"
              />
            </div>
          </div>
        </div>
      )}

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
