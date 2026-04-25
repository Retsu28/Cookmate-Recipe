import { BellRing, CalendarClock, Megaphone, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { notificationItems, type NotificationItem } from '../data/adminMockData';

export default function NotificationManagement() {
  const openNotificationEditor = (notification?: NotificationItem) => {
    toast.info(notification ? `Notification editor preview for ${notification.title}.` : 'Notification creation preview is not connected to a delivery backend yet.');
  };

  const duplicateNotification = (notification: NotificationItem) => {
    toast.info(`Duplicate preview for ${notification.title}.`);
  };

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
      render: (notification) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openNotificationEditor(notification)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-stone-500" onClick={() => duplicateNotification(notification)}>
            Duplicate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="Create reminders, manage announcements, and review schedules. Real push delivery is not implemented from this admin UI."
        actions={
          <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600" onClick={() => openNotificationEditor()}>
            <Plus size={16} />
            Create reminder
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: BellRing, value: '8', label: 'Scheduled reminders' },
          { icon: Megaphone, value: '3', label: 'Announcements drafted' },
          { icon: CalendarClock, value: 'UI only', label: 'No real push backend' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40 transition-shadow hover:shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <card.icon className="text-orange-600" size={24} />
            <p className="mt-3 text-2xl font-extrabold text-stone-900">{card.value}</p>
            <p className="text-sm font-medium text-stone-500">{card.label}</p>
          </motion.div>
        ))}
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
