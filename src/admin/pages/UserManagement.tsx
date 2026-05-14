import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Loader2, ShieldCheck, User } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  skillLevel: string;
  recipesViewed: number;
  aiScans: number;
  lastActive: string;
  status: string;
  role: string;
}

const PAGE_SIZE = 20;

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const columns: AdminTableColumn<AdminUser>[] = useMemo(() => [
    {
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-extrabold text-white dark:bg-stone-700">
            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-extrabold text-stone-900 dark:text-stone-50">
              {user.name} {user.role === 'admin' && <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] uppercase text-orange-600">Admin</span>}
            </p>
            <p className="text-xs font-medium text-stone-400 dark:text-stone-500">#{user.id.substring(0, 5)} &middot; {user.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Skill level', render: (user) => <StatusBadge tone={statusToneFromLabel(user.skillLevel || 'Beginner')}>{user.skillLevel || 'Beginner'}</StatusBadge> },
    { header: 'Recipes viewed', render: (user) => user.recipesViewed },
    { header: 'AI scans', render: (user) => user.aiScans },
    { header: 'Last active', render: (user) => user.lastActive },
    {
      header: 'Status',
      render: (user) => {
        const isOnline = user.status === 'Online';
        const isActive = isOnline || user.status === 'Recently Active';
        const isDeleted = user.status === 'Deleted';
        const label = isDeleted ? 'Deleted' : isActive ? 'Active' : 'Inactive';
        const tone = isDeleted ? 'danger' : isActive ? 'success' : 'neutral';
        return (
          <div className="flex items-center gap-1.5">
            {isOnline && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <StatusBadge tone={tone}>{label}</StatusBadge>
          </div>
        );
      },
    },
    {
      header: 'Role',
      render: (user) => (
        <div className="flex items-center gap-2">
          {user.role === 'admin'
            ? <ShieldCheck size={14} className="text-orange-500 shrink-0" />
            : <User size={14} className="text-stone-400 shrink-0" />}
          <span className="text-xs font-bold capitalize text-stone-700 dark:text-stone-300">{user.role || 'user'}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-orange-500 hover:bg-orange-50 hover:text-red-600"
            aria-label={`Delete ${user.name}`}
            onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], []);

  const fetchUsers = useCallback(async (targetPage = page, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.get<{ users: AdminUser[]; total: number }>(
        `/api/admin/users?page=${targetPage}&limit=${PAGE_SIZE}`
      );
      setUsers(data.users);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      if (!silent) toast.error(err.message || 'Failed to fetch users');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success(`User ${name} deleted.`);
      fetchUsers(page);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user.');
    }
  }, [deleteTarget, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetchUsers(page);
    const interval = setInterval(() => fetchUsers(page, true), 30_000);
    return () => clearInterval(interval);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <AdminPageHeader
        title="User Management"
        description="View user activity and cooking skill levels."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user?"
        description={`This will permanently delete ${deleteTarget?.name ?? 'this user'} and all their data. This cannot be undone.`}
        confirmLabel="Delete user"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdminSectionCard title="Registered Users" description={`${total} user${total !== 1 ? 's' : ''} total · page ${page + 1} of ${Math.max(totalPages, 1)}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <>
            <AdminTable
              data={users}
              columns={columns}
              getRowKey={(user) => user.id}
              emptyMessage="No users found."
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
