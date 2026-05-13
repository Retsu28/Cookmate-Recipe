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
import type { StatusTone } from '../data/adminMockData';

type ChurnRisk = 'High' | 'Medium' | 'Low';

function churnTone(risk: ChurnRisk): StatusTone {
  if (risk === 'High') return 'danger';
  if (risk === 'Medium') return 'warning';
  return 'success';
}

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
  const [churnMap, setChurnMap] = useState<Record<string, ChurnRisk>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [roleChanging, setRoleChanging] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<{ users: { user_id: number; risk: ChurnRisk }[] }>('/api/ml-analytics/churn-risk')
      .then((data) => {
        const map: Record<string, ChurnRisk> = {};
        (data.users || []).forEach((u) => { map[String(u.user_id)] = u.risk; });
        setChurnMap(map);
      })
      .catch(() => {});
  }, []);

  const handleRoleChange = useCallback(async (user: AdminUser, newRole: string) => {
    if (newRole === user.role) return;
    setRoleChanging((prev) => ({ ...prev, [user.id]: true }));
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    try {
      await api.put(`/api/admin/users/${user.id}`, { role: newRole });
      toast.success(`${user.name} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}.`);
    } catch (err: any) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: user.role } : u));
      toast.error(err.message || 'Failed to update role.');
    } finally {
      setRoleChanging((prev) => { const next = { ...prev }; delete next[user.id]; return next; });
    }
  }, []);

  const columns: AdminTableColumn<AdminUser>[] = useMemo(() => [
    {
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-extrabold text-white">
            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-extrabold text-stone-900">
              {user.name} {user.role === 'admin' && <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] uppercase text-orange-600">Admin</span>}
            </p>
            <p className="text-xs font-medium text-stone-400">#{user.id.substring(0, 5)} &middot; {user.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Skill level', render: (user) => <StatusBadge tone={statusToneFromLabel(user.skillLevel || 'Beginner')}>{user.skillLevel || 'Beginner'}</StatusBadge> },
    { header: 'Recipes viewed', render: (user) => user.recipesViewed },
    { header: 'AI scans', render: (user) => user.aiScans },
    { header: 'Last active', render: (user) => user.lastActive },
    { header: 'Status', render: (user) => <StatusBadge tone={statusToneFromLabel(user.status)}>{user.status}</StatusBadge> },
    {
      header: 'Churn Risk',
      render: (user) => {
        const risk = churnMap[user.id] as ChurnRisk | undefined;
        if (!risk) return <span className="text-xs text-stone-400">—</span>;
        return <StatusBadge tone={churnTone(risk)}>{risk}</StatusBadge>;
      },
    },
    {
      header: 'Role',
      render: (user) => (
        <div className="flex items-center gap-2">
          <select
            value={user.role || 'user'}
            disabled={roleChanging[user.id]}
            onChange={(e) => handleRoleChange(user, e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 outline-none focus:border-orange-400 disabled:opacity-50"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {user.role === 'admin'
            ? <ShieldCheck size={14} className="text-orange-500 shrink-0" />
            : <User size={14} className="text-stone-400 shrink-0" />}
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
  ], [churnMap, roleChanging, handleRoleChange]);

  const fetchUsers = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const data = await api.get<{ users: AdminUser[]; total: number }>(
        `/api/admin/users?page=${targetPage}&limit=${PAGE_SIZE}`
      );
      setUsers(data.users);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
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
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-sm font-medium text-stone-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
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
