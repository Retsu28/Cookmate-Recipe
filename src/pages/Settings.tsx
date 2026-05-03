import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { User, Bell, Shield, Paintbrush, ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoutButton } from "../components/LogoutButton";
import { motion } from "motion/react";
import { SettingsPageSkeleton } from "@/components/SkeletonScreen";
import { useInitialContentLoading } from "@/hooks/useInitialContentLoading";

type SettingsCardProps = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  ariaLabel: string;
};

function SettingsCard({ title, description, to, icon: Icon, ariaLabel }: SettingsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
    >
      <Link to={to} aria-label={ariaLabel} className="block h-full">
        <Card className="h-full border-stone-100 shadow-xl shadow-stone-200/30 rounded-[2rem] bg-white overflow-hidden transition-all hover:shadow-stone-200/50 hover:border-orange-200 group cursor-pointer">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-8">
              <motion.div
                className="rounded-2xl bg-orange-50 p-4 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.8 }}
              >
                <Icon size={32} />
              </motion.div>
              <motion.span
                className="text-stone-300 group-hover:text-orange-500 transition-colors"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8 }}
              >
                <ChevronRight size={24} />
              </motion.span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900 mb-1">{title}</h3>
              <p className="text-stone-500">{description}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function Settings() {
  const isInitialLoading = useInitialContentLoading();

  if (isInitialLoading) {
    return (
      <Layout>
        <SettingsPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl px-4 py-12 animate-fade-up sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-2">Settings</h1>
          <p className="text-lg text-stone-500 font-medium">Manage your account and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SettingsCard
            title="Account"
            description="Update your email, password, and profile details"
            to="/profile"
            icon={User}
            ariaLabel="Open account settings"
          />

          <SettingsCard
            title="Notifications"
            description="Configure your email and push alert preferences"
            to="/settings/notifications"
            icon={Bell}
            ariaLabel="Open notification settings"
          />

          <SettingsCard
            title="Appearance"
            description="Switch between light and dark mode without changing your layout."
            to="/settings/appearance"
            icon={Paintbrush}
            ariaLabel="Open appearance settings"
          />

          <SettingsCard
            title="Privacy & Security"
            description="Manage data sharing and security options"
            to="/settings/privacy-security"
            icon={Shield}
            ariaLabel="Open privacy and security settings"
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link to="/">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-12 py-6 rounded-full shadow-lg shadow-orange-500/20 text-lg">
              Save Changes
            </Button>
          </Link>
          <LogoutButton />
        </div>

      </div>
    </Layout>
  );
}
