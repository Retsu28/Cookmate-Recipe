import { AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { aiActivityLogs, type AIActivityLog } from '../data/adminMockData';

const columns: AdminTableColumn<AIActivityLog>[] = [
  { header: 'Time', render: (log) => <span className="font-bold text-stone-900">{log.time}</span> },
  { header: 'Source', render: (log) => log.source },
  {
    header: 'Detected ingredients',
    render: (log) => (
      <div className="flex flex-wrap gap-1.5">
        {log.detectedIngredients.map((ingredient) => (
          <StatusBadge key={ingredient} tone="neutral">{ingredient}</StatusBadge>
        ))}
      </div>
    ),
  },
  { header: 'Suggested recipe', render: (log) => <span className="font-bold text-stone-700">{log.suggestedRecipe}</span> },
  { header: 'Status', render: (log) => <StatusBadge tone={statusToneFromLabel(log.status)}>{log.status}</StatusBadge> },
  { header: 'Response state', render: (log) => <StatusBadge tone={statusToneFromLabel(log.responseState)}>{log.responseState}</StatusBadge> },
];

export default function AIActivityMonitoring() {
  return (
    <div>
      <AdminPageHeader
        title="AI Activity Monitoring"
        description="Track AI camera scans, detected ingredients, suggestions, failed requests, and Gemini response state without exposing secrets."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <motion.div
          className="rounded-[2rem] border border-green-200 bg-green-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShieldCheck className="text-green-700" size={24} />
          <p className="mt-3 font-extrabold text-stone-900">Server-side key policy</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Gemini API keys must stay server-side and never use a VITE_ prefix.</p>
        </motion.div>
        <motion.div
          className="rounded-[2rem] border border-blue-200 bg-blue-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          <Sparkles className="text-blue-700" size={24} />
          <p className="mt-3 font-extrabold text-stone-900">Network-only AI responses</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Gemini responses are never cached in the service worker.</p>
        </motion.div>
        <motion.div
          className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          <AlertTriangle className="text-amber-700" size={24} />
          <p className="mt-3 font-extrabold text-stone-900">Monitoring preview</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Logs below are mock admin records until a real audit trail exists.</p>
        </motion.div>
      </div>

      <AdminSectionCard title="AI Request Log" description="No request payloads or API secrets are shown in admin UI.">
        <AdminTable data={aiActivityLogs} columns={columns} getRowKey={(log) => log.id} />
      </AdminSectionCard>
    </div>
  );
}
