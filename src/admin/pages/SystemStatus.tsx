import { AlertTriangle, KeyRound, Server, ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { StatusBadge } from '../components/StatusBadge';
import { systemStatuses } from '../data/adminMockData';

export default function SystemStatus() {
  return (
    <div>
      <AdminPageHeader
        title="System Status"
        description="Operational view of PWA readiness, API policy, service worker behavior, deployment status, and roadmap placeholders."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-green-200 bg-green-50 p-5">
          <ShieldCheck size={24} className="text-green-700" />
          <p className="mt-3 font-extrabold text-stone-900">PWA configured</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Manifest, icons, and Workbox generation are part of the web build.</p>
        </div>
        <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-5">
          <Server size={24} className="text-blue-700" />
          <p className="mt-3 font-extrabold text-stone-900">Gemini network-only</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">AI responses should go through the server-side proxy and avoid service worker caching.</p>
        </div>
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle size={24} className="text-amber-700" />
          <p className="mt-3 font-extrabold text-stone-900">Roadmap gaps visible</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Offline recipe access, production auth, and favorites remain planned or placeholder features.</p>
        </div>
      </div>

      <AdminSectionCard title="Status Matrix" description="The labels below follow ARCHITECTURE.md rather than pretending planned features are complete.">
        <div className="grid gap-3 md:grid-cols-2">
          {systemStatuses.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-extrabold text-stone-900">{item.name}</p>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <div className="mt-6 rounded-[2rem] border border-red-200 bg-red-50 p-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="font-extrabold text-stone-900">Environment variable safety reminder</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Keep GEMINI_API_KEY server-side only. Do not add VITE_GEMINI_API_KEY or expose provider secrets in browser bundles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
