import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { User, Bell, Shield, Paintbrush } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex h-screen bg-[#FDFBF7]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Settings" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 mb-1">Settings & Preferences</h2>
              <p className="text-stone-500 text-sm">Manage your account settings and app preferences.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-stone-100 text-stone-700 rounded-xl">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">Account</h3>
                      <p className="text-xs text-stone-500">Update your email & profile</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start text-stone-600 font-medium">Manage Account</Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">Notifications</h3>
                      <p className="text-xs text-stone-500">Configure alert preferences</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start text-stone-600 font-medium">Notification Settings</Button>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                      <Paintbrush size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">Appearance</h3>
                      <p className="text-xs text-stone-500">Customize UI theme</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start text-stone-600 font-medium">Change Theme</Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">Privacy & Security</h3>
                      <p className="text-xs text-stone-500">Passwords and data</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start text-stone-600 font-medium">Security Options</Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="pt-6 flex justify-end">
               <Button className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-2 rounded-xl border-0">Save Changes</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
