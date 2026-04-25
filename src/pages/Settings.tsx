import { Layout } from "../components/Layout";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { User, Bell, Shield, Paintbrush, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoutButton } from "../components/LogoutButton";

export default function Settings() {
  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-2">Settings</h1>
          <p className="text-lg text-stone-500 font-medium">Manage your account and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-stone-100 shadow-xl shadow-stone-200/30 rounded-[2rem] bg-white overflow-hidden transition-all hover:shadow-stone-200/50 hover:border-orange-200 group cursor-pointer">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 bg-stone-50 text-stone-700 rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                  <User size={32} />
                </div>
                <ChevronRight size={24} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Account</h3>
                <p className="text-stone-500">Update your email, password, and profile details</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-100 shadow-xl shadow-stone-200/30 rounded-[2rem] bg-white overflow-hidden transition-all hover:shadow-stone-200/50 hover:border-orange-200 group cursor-pointer">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                  <Bell size={32} />
                </div>
                <ChevronRight size={24} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Notifications</h3>
                <p className="text-stone-500">Configure your email and push alert preferences</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-100 shadow-xl shadow-stone-200/30 rounded-[2rem] bg-white overflow-hidden transition-all hover:shadow-stone-200/50 hover:border-orange-200 group cursor-pointer">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                  <Paintbrush size={32} />
                </div>
                <ThemeToggle className="size-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Appearance</h3>
                <p className="text-stone-500">Use the toggle to switch between light and dark mode without changing your layout.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-100 shadow-xl shadow-stone-200/30 rounded-[2rem] bg-white overflow-hidden transition-all hover:shadow-stone-200/50 hover:border-orange-200 group cursor-pointer">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                  <Shield size={32} />
                </div>
                <ChevronRight size={24} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Privacy & Security</h3>
                <p className="text-stone-500">Manage data sharing and security options</p>
              </div>
            </CardContent>
          </Card>
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
