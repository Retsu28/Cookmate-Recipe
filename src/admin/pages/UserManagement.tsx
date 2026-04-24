import { Users } from 'lucide-react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { adminUsers, type AdminUser } from '../data/adminMockData';

const columns: AdminTableColumn<AdminUser>[] = [
  {
    header: 'User',
    render: (user) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-sm font-extrabold text-white">
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="font-extrabold text-stone-900">{user.name}</p>
          <p className="text-xs font-medium text-stone-400">{user.email}</p>
        </div>
      </div>
    ),
  },
  { header: 'Skill level', render: (user) => <StatusBadge tone={statusToneFromLabel(user.skillLevel)}>{user.skillLevel}</StatusBadge> },
  { header: 'Recipes viewed', render: (user) => user.recipesViewed },
  { header: 'AI scans', render: (user) => user.aiScans },
  { header: 'Last active', render: (user) => user.lastActive },
  { header: 'Status', render: (user) => <StatusBadge tone={statusToneFromLabel(user.status)}>{user.status}</StatusBadge> },
];

export default function UserManagement() {
  return (
    <div>
      <AdminPageHeader
        title="User Management"
        description="View user activity and cooking skill levels. The architecture currently marks authentication as placeholder, so this is monitoring UI only."
      />

      <div className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600">
            <Users size={18} />
          </div>
          <div>
            <p className="font-extrabold text-stone-900">Auth status reminder</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Admin roles and production account controls are not implemented yet. Do not treat this table as a real access-control surface.
            </p>
          </div>
        </div>
      </div>

      <AdminSectionCard title="User Activity" description="Demo activity records prepared for future backend integration.">
        <AdminTable data={adminUsers} columns={columns} getRowKey={(user) => user.id} />
      </AdminSectionCard>
    </div>
  );
}
