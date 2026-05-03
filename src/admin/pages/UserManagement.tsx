import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
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

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

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
      header: 'Actions',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-orange-500 hover:bg-orange-50 hover:text-red-600"
            aria-label={`Delete ${user.name}`}
            onClick={() => window.dispatchEvent(new CustomEvent('delete-user', { detail: { id: user.id, name: user.name } }))}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(data.users);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    const handleDelete = async (e: any) => {
      const { id, name } = e.detail;
      if (!confirm(`Are you sure you want to delete ${name}?`)) return;

      try {
        await api.delete(`/api/admin/users/${id}`);
        toast.success(`User ${name} deleted.`);
        fetchUsers();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete user.');
      }
    };

    window.addEventListener('delete-user', handleDelete);
    return () => window.removeEventListener('delete-user', handleDelete);
  }, [fetchUsers]);

  return (
    <div>
      <AdminPageHeader
        title="User Management"
        description="View user activity and cooking skill levels."
      />

      <AdminSectionCard title="Registered Users" description={`Managing ${users.length} user records from the live database.`}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <AdminTable
            data={users}
            columns={columns}
            getRowKey={(user) => user.id}
            emptyMessage="No users found."
          />
        )}
      </AdminSectionCard>
    </div>
  );
}
