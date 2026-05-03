"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, Brain, Hammer, CheckCircle2, 
  Snowflake, BookOpen, AlertCircle, X 
} from 'lucide-react';

const stoicQuotes = [
  "Kita lebih sering menderita dalam imajinasi daripada kenyataan. – Seneca",
  "Fokuslah pada apa yang bisa kamu kendalikan. Biarkan sisanya. – Epictetus",
  "Bukan kejadian yang meresahkan kita, tapi pandangan kita tentangnya. – Marcus Aurelius",
  "Amor Fati: Cintai takdirmu. Jadikan rintangan sebagai bahan bakar. – Marcus Aurelius",
  "Harta tidak merubah manusia, hanya membuka topeng aslinya. – Seneca"
];

export default function NotificationSystem({ 
  todaySpend, 
  scheduleFiltered, 
  freezerCount 
}: { 
  todaySpend: number, 
  scheduleFiltered: any[], 
  freezerCount: number 
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    generateNotifications();
  }, [todaySpend, scheduleFiltered, freezerCount]);

  const generateNotifications = () => {
    const newNotifs = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const currentDate = now.getDate();

    // 1. STOIC MENTAL HEALTH
    newNotifs.push({
      id: 'n-mental', type: 'mental', title: 'Stoic Mindset',
      message: stoicQuotes[currentDate % stoicQuotes.length],
      time: currentHour < 12 ? 'Pagi ini' : 'Hari ini', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20', read: false
    });

    // 2. DAILY HUB BRIEFING
    const incompleteTasks = scheduleFiltered.filter(t => !t.is_completed).length;
    if (incompleteTasks > 0) {
      newNotifs.push({
        id: 'n-forge', type: 'forge', title: 'Daily Hub Briefing',
        message: `Boss, ada ${incompleteTasks} aktivitas yang menunggu eksekusi hari ini.`,
        time: 'Pending', icon: Hammer, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20', read: false
      });
    }

    // 3. FREEZER CHECK
    if (freezerCount > 0 && currentHour >= 18) {
      newNotifs.push({
        id: 'n-freezer', type: 'impulse', title: 'Anti-Impulse Monitor',
        message: `Ada ${freezerCount} barang di Freezer. Masih mau beli?`,
        time: 'Malam ini', icon: Snowflake, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/20', read: false
      });
    }

    // 4. OVERSPEND ALERT
    if (todaySpend > 500000) {
      newNotifs.push({
        id: 'n-alert', type: 'alert', title: 'Overspend Warning!',
        message: `Pengeluaran hari ini Rp ${todaySpend.toLocaleString('id-ID')}. Rem dulu, Boss!`,
        time: 'Urgent', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20', read: false
      });
    }

    setNotifications(newNotifs);
  };

  const markAsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
    setIsNotifOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="relative p-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-all shadow-sm"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#121212]">
            {unreadCount}
          </span>
        )}
      </button>

      {isNotifOpen && (
        <div className="absolute right-0 mt-3 w-[calc(100vw-2.5rem)] sm:w-80 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#151515]">
            <h4 className="font-bold text-sm dark:text-white">Sinyal Kesadaran</h4>
            <button onClick={markAsRead} className="text-xs font-bold text-blue-600">Tandai Baca</button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.id} className={`p-4 flex gap-4 transition-colors ${n.read ? 'opacity-60' : 'bg-blue-50/20 dark:bg-blue-900/5'}`}>
                  <div className={`p-2 h-fit rounded-lg ${n.bg} ${n.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold dark:text-white">{n.title}</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">{n.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}