import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  User, Package, Settings as SettingsIcon, 
  Plus, Trash2, AlertCircle, CheckCircle2,
  Globe, Bell, Shield, Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-stone-200 border-4 border-white shadow-md overflow-hidden">
                <img src="https://picsum.photos/seed/jane/200/200" alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h1 className="text-3xl font-serif italic">Jane Doe</h1>
                <p className="text-stone-500">Intermediate Cook • Member since April 2024</p>
              </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-8">
              <TabsList className="bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
                <TabsTrigger value="profile" className="rounded-xl px-8 gap-2"><User size={16} /> Profile</TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-xl px-8 gap-2"><Package size={16} /> Kitchen Inventory</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl px-8 gap-2"><SettingsIcon size={16} /> Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Dietary Goals */}
                  <Card className="rounded-3xl border-stone-100 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Dietary Goals</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {['Lose Weight', 'Build Muscle', 'Eat Healthy', 'Balanced Diet', 'Increase Energy'].map((goal) => (
                          <Badge key={goal} variant="outline" className="px-4 py-2 rounded-xl cursor-pointer hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Allergies */}
                  <Card className="rounded-3xl border-stone-100 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Allergies & Intolerances</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {['Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Eggs', 'Soy'].map((allergy) => (
                          <Badge key={allergy} variant="outline" className="px-4 py-2 rounded-xl cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-3xl border-stone-100 shadow-sm">
                  <CardHeader><CardTitle className="text-lg">Favorite Cuisines</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {['Italian', 'Asian', 'Mexican', 'French', 'Mediterranean', 'Indian', 'Thai'].map((cuisine) => (
                        <Badge key={cuisine} className="bg-stone-100 text-stone-600 hover:bg-orange-500 hover:text-white border-none px-5 py-2.5 rounded-xl font-medium transition-all cursor-pointer">
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">In Your Kitchen</h2>
                  <Button className="bg-orange-500 hover:bg-orange-600 rounded-xl gap-2">
                    <Plus size={18} /> Add Ingredient
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'Chicken Breast', qty: '2 lbs', expiry: 'Tomorrow', urgent: true },
                    { name: 'Heavy Cream', qty: '1 cup', expiry: '3 days', urgent: true },
                    { name: 'Spinach', qty: '2 cups', expiry: '5 days', urgent: false },
                    { name: 'Parmesan', qty: '200g', expiry: '2 weeks', urgent: false },
                  ].map((item) => (
                    <Card key={item.name} className="rounded-2xl border-stone-100 shadow-sm group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            item.urgent ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                          )}>
                            {item.urgent ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{item.name}</p>
                            <p className="text-[10px] font-medium text-stone-400">Expires in {item.expiry}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-stone-900">{item.qty}</p>
                          <button className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-orange-900">Use Your Inventory</p>
                    <p className="text-sm text-orange-700">Find recipes you can cook right now with what you have.</p>
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 rounded-xl">Search with Inventory</Button>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="rounded-3xl border-stone-100 shadow-sm">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell size={18} /> Notifications</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'Meal Reminders', desc: 'Get notified 30 mins before meal time' },
                        { label: 'Expiry Alerts', desc: 'Alerts for ingredients expiring soon' },
                        { label: 'New Recommendations', desc: 'Weekly personalized recipe picks' },
                      ].map((pref) => (
                        <div key={pref.label} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-stone-900">{pref.label}</p>
                            <p className="text-xs text-stone-400">{pref.desc}</p>
                          </div>
                          <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer">
                            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-stone-100 shadow-sm">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe size={18} /> Preferences</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Units</p>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="rounded-xl flex-1">Metric</Button>
                          <Button variant="outline" className="rounded-xl flex-1">Imperial</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Language</p>
                        <Button variant="outline" className="w-full rounded-xl justify-between">
                          English (US) <Globe size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
