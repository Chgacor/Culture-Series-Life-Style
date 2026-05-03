"use client";

import { useEffect, useState, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Activity, ShieldCheck, Zap, Battery, Droplets, 
  Moon, Wallet, Brain, Flame, CloudRain, Check, CalendarDays, Plus
} from 'lucide-react';

const CORE_PROTOCOLS = [
  { id: 'hydration', name: 'Hidrasi Optimal', sub: '2L+ per hari', icon: Droplets, accent: '#3B82F6' },
  { id: 'recovery',  name: 'Recovery',        sub: 'Tidur 7+ jam',  icon: Moon,     accent: '#6366F1' },
  { id: 'finance',   name: 'Finance Firewall', sub: 'No-Spend day',  icon: Wallet,   accent: '#10B981' },
  { id: 'learning',  name: 'Neural Expand',    sub: 'Baca buku',     icon: Brain,    accent: '#A855F7' },
];

const MOODS = [
  { id: 'flow',    name: 'Flow State',       sub: 'Deep work',   icon: Flame,     accent: '#F97316' },
  { id: 'calm',    name: 'Calm & Clear',     sub: 'Balanced',    icon: Droplets,  accent: '#3B82F6' },
  { id: 'anxious', name: 'Chaotic',          sub: 'Unfocused',   icon: CloudRain, accent: '#6B7280' },
  { id: 'burnout', name: 'Burnout',          sub: 'Low battery', icon: Battery,   accent: '#EF4444' },
];

// PERBAIKAN NEXT.JS TERBARU: params dibungkus Promise
export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // UNWRAP PARAMS MENGGUNAKAN React.use()
  const resolvedParams = use(params);
  const friendId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [telemetry, setTelemetry] = useState({ energy_level: 0, mood: 'calm', protocols_met: [] as string[] });
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateTasks, setSelectedDateTasks] = useState<any[]>([]);
  const [weekDates, setWeekDates] = useState<any[]>([]);

  useEffect(() => {
    const dates = Array.from({length: 7}).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }), dateNum: d.getDate().toString() };
    });
    setWeekDates(dates);
    setSelectedDate(dates[0].date);
  }, []);

  const fetchFriendData = useCallback(async () => {
    if (!selectedDate || !friendId) return;
    
    // 1. Cek Otorisasi (Apakah benar berteman?)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth');

    const { data: conn } = await supabase.from('network_connections')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!conn) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }
    setIsAuthorized(true);

    // 2. Fetch Profil Teman
    const { data: p } = await supabase.from('profiles').select('*').eq('id', friendId).single();
    if (p) setProfile(p);

    // 3. Fetch Telemetry Teman (Read Only)
    const { data: t } = await supabase.from('daily_telemetry').select('*').eq('user_id', friendId).eq('date', weekDates[0]?.date).maybeSingle();
    if (t) setTelemetry({ energy_level: t.energy_level, mood: t.mood, protocols_met: t.protocols_met || [] });

    // 4. Fetch Kalender Teman (Read Only & Tersensor)
    const { data: rawTasks } = await supabase.from('life_tasks').select('*').eq('user_id', friendId).order('start_time', { ascending: true });
    const { data: compData } = await supabase.from('task_completions').select('task_id').eq('completed_date', selectedDate);
    const completedIds = compData?.map(c => c.task_id) || [];

    if (rawTasks) {
      const processed = rawTasks.filter(task => {
        if (!task.is_recurring) return task.target_date === selectedDate;
        return task.target_date <= selectedDate && (!task.recurrence_end_date || task.recurrence_end_date >= selectedDate);
      }).map(task => ({ ...task, is_completed: task.is_recurring ? completedIds.includes(task.id) : task.is_completed }));
      setSelectedDateTasks(processed);
    }

    setLoading(false);
  }, [friendId, router, selectedDate, weekDates]);

  useEffect(() => { fetchFriendData(); }, [fetchFriendData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-white/50 font-mono text-sm">ACCESSING REMOTE NODE...</div>;

  if (!isAuthorized) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
      <ShieldCheck size={48} className="text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Ditolak</h2>
      <p className="text-gray-500 dark:text-white/40 text-sm mb-6">Anda tidak memiliki otorisasi untuk melihat sistem ini.</p>
      <button onClick={() => router.back()} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Kembali ke Radar</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 md:space-y-8 pb-16">
      
      {/* ── TOPBAR ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white font-bold text-xs bg-gray-100 dark:bg-[#1A1A1A] px-4 py-2.5 rounded-xl transition-colors w-fit border border-gray-200 dark:border-gray-800">
          <ArrowLeft size={14} /> Back to Network
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 w-fit">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Live Connection</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

        {/* ──── LEFT: PROFILE INFO ──── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-5 pb-6 mb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-3xl font-black overflow-hidden border border-purple-100 dark:border-purple-900/50">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-500 mb-1">{profile?.architect_id}</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate mb-1.5">{profile?.full_name}</h2>
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">{profile?.role}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">System Description</p>
                <div className="min-h-[5rem] p-4 rounded-xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {profile?.bio || 'Tidak ada deskripsi sistem.'}
                </div>
              </div>
              {profile?.stoic_quote && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Current Directive</p>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 text-sm leading-relaxed text-emerald-800 dark:text-emerald-400 italic border-l-2 border-l-emerald-500">
                    "{profile.stoic_quote}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ──── RIGHT: TELEMETRY & CALENDAR (READ ONLY) ──── */}
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          
          {/* Energy & Mood (Read Only) */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base mb-6"><Activity size={18} className="text-blue-500" /> Real-Time Telemetry</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-[#1A1A1A] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1">Kapasitas Energi</p>
                <p className="text-3xl font-black font-mono text-gray-900 dark:text-white tabular-nums">{telemetry.energy_level}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#1A1A1A] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1">State of Mind</p>
                <p className="text-xl font-bold capitalize text-blue-600 dark:text-blue-500">{telemetry.mood.replace('-', ' ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {CORE_PROTOCOLS.map(protocol => {
                  const Icon = protocol.icon;
                  const active = telemetry.protocols_met.includes(protocol.id);
                  return (
                    <div key={protocol.id} className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${active ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 opacity-60'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-[#2A2A2A] text-gray-400 dark:text-gray-600'}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold leading-none mb-1 ${active ? 'text-emerald-900 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{protocol.name}</p>
                        </div>
                      </div>
                      {active && <Check size={16} className="text-emerald-600 dark:text-emerald-500" strokeWidth={3} />}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* CALENDAR (Read Only + Request Schedule Placeholder) */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base"><CalendarDays size={18} className="text-purple-500" /> Availability Calendar</h3>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-xs font-bold transition-all border border-purple-200 dark:border-purple-900/30 shadow-sm">
                <Plus size={14} /> Request Schedule
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              {weekDates.map((day) => (
                <button key={day.date} onClick={() => setSelectedDate(day.date)} className={`flex flex-col items-center min-w-[55px] p-2.5 rounded-2xl border transition-all ${selectedDate === day.date ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-white/40 hover:border-purple-300 dark:hover:border-purple-700/50'}`}>
                  <span className="text-[10px] font-bold uppercase mb-1">{day.dayName}</span>
                  <span className="text-xl font-black">{day.dateNum}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 relative pl-3 mt-6">
              <div className="absolute top-2 bottom-6 left-[21px] w-[2px] bg-gray-100 dark:bg-white/5" />
              {selectedDateTasks.length > 0 ? selectedDateTasks.map(task => (
                <div key={task.id} className="relative flex items-start gap-4">
                  <div className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-[#151515] bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-600">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="flex-1 p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl flex justify-between items-center opacity-90 pointer-events-none">
                    <div>
                      <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 block mb-1 tracking-wider">{task.start_time} WIB</span>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-300">Time Blocked / Busy</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-transparent">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-1">Slot Waktu Tersedia</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">Architect ini tidak memiliki jadwal padat di hari ini.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}