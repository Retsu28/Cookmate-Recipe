import { BellRing, CalendarClock, Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { notificationItems, type NotificationItem } from '../data/adminMockData';

const columns: AdminTableColumn<NotificationItem>[] = [
  {
    header: 'Notification',
    render: (notification) => (
      <div>
        <p className="font-extrabold text-stone-900">{notification.title}</p>
        <p className="text-xs font-medium text-stone-400">{notification.audience}</p>
      </div>
    ),
  },
  { header: 'Type', render: (notification) => <StatusBadge tone={statusToneFromLabel(notification.type)}>{notification.type}</StatusBadge> },
  { header: 'Scheduled for', render: (notification) => notification.scheduledFor },
  { header: 'Status', render: (notification) => <StatusBadge tone={statusToneFromLabel(notification.status)}>{notification.status}</StatusBadge> },
  {
    header: 'Actions',
    render: () => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="rounded-full">
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full text-stone-500">
          Duplicate
        </Button>
      </div>
    ),
  },
];

export default function NotificationManagement() {
  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="Create reminders, manage announcements, and review schedules. Real push delivery is not implemented from this admin UI."
        actions={
          <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600">
            <Plus size={16} />
            Create reminder
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40">
          <BellRing className="text-orange-600" size={24} />
          <p className="mt-3 text-2xl font-extrabold text-stone-900">8</p>
          <p className="text-sm font-medium text-stone-500">Scheduled reminders</p>
        </div>
        <div className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40">
          <Megaphone className="text-orange-600" size={24} />
          <p className="mt-3 text-2xl font-extrabold text-stone-900">3</p>
          <p className="text-sm font-medium text-stone-500">Announcements drafted</p>
        </div>
        <div className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40">
          <CalendarClock className="text-orange-600" size={24} />
          <p className="mt-3 text-2xl font-extrabold text-stone-900">UI only</p>
          <p className="text-sm font-medium text-stone-500">No real push backend</p>
        </div>
      </div>

      <AdminSectionCard title="Notification Schedule" description="Demo schedule for future reminder and announcement APIs.">
        <AdminTable data={notificationItems} columns={columns} getRowKey={(notification) => notification.id} />
      </AdminSectionCard>

      <div className="mt-6">
        <EmptyState
          icon={BellRing}
          title="Push delivery is intentionally not wired"
          description="This admin page models the management experience without sending real notifications or changing mobile push behavior."
        />
      </div>
    </div>
  );
}
