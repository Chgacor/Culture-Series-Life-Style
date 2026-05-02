"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Mail, LogOut, Activity, ShieldCheck,
  Zap, Save, Edit2, Battery, Droplets,
  Moon, Wallet, Brain, Flame, CloudRain, Check,
  CalendarDays, X, Plus, Trash2,
  Circle, Clock, CheckCircle2, Repeat
} from 'lucide-react';

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const CORE_PROTOCOLS = [
  { id: 'hydration', name: 'Hidrasi Optimal', sub: '2L+ per hari', icon: Droplets, accent: '#3B82F6' },
  { id: 'recovery',  name: 'Recovery',        sub: 'Tidur 7+ jam',  icon: Moon,     accent: '#6366F1' },
  { id: 'finance',   name: 'Finance Firewall', sub: 'No-Spend day',  icon: Wallet,   accent: '#10B981' },
  { id: 'learning',  name: 'Neural Expand',    sub: 'Baca buku',     icon: Brain,    accent: '#A855F7' },
];

const MOODS = [
  { id: 'flow',    name: 'Flow State',   sub: 'Deep work',   icon: Flame,     accent: '#F97316' },
  { id: 'calm',    name: 'Calm & Clear', sub: 'Balanced',    icon: Droplets,  accent: '#3B82F6' },
  { id: 'anxious', name: 'Chaotic',      sub: 'Unfocused',   icon: CloudRain, accent: '#6B7280' },
  { id: 'burnout', name: 'Burnout',      sub: 'Low battery', icon: Battery,   accent: '#EF4444' },
];

const CATEGORY_COLORS: Record<string, string> = {
  work:     'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
  health:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
  learning: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
  personal: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50',
  finance:  'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50',
};

// ─── STAT CHIP ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 min-w-[90px]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-0.5">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── EDITABLE FIELD ────────────────────────────────────────────────────────────

function EditableField({
  label, value, accent = false, onSave
}: {
  label: string; value: string; accent?: boolean; onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-500 dark:text-white/40'}`}>
          {label}
        </span>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all">
            <Edit2 size={13} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X size={13} /></button>
            <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1 text-xs font-bold transition-colors ${accent ? 'text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300' : 'text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'}`}>
              {saving ? '...' : <><Save size={12} /> Save</>}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)} autoFocus rows={3}
          className={`w-full text-sm rounded-xl p-3.5 resize-none outline-none border transition-all duration-150 dark:[color-scheme:dark] ${
            accent
              ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 italic focus:ring-2 focus:ring-emerald-500/20'
              : 'bg-white dark:bg-[#1A1A1A] border-blue-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20'
          }`}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={`min-h-[5rem] p-4 rounded-xl cursor-text text-sm leading-relaxed border transition-all duration-150 ${
            accent
              ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 italic border-l-2 border-l-emerald-500 pl-4 hover:border-emerald-300 dark:hover:border-emerald-700/50'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
          }`}
        >
          {accent ? `"${value}"` : value}
        </div>
      )}
    </div>
  );
}

// ─── ADD TASK MODAL ────────────────────────────────────────────────────────────

function AddTaskModal({ date, onClose, onAdded }: { date: string; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [category, setCategory] = useState('work');
  const [saving, setSaving] = useState(false);
  const CATEGORIES = ['work', 'health', 'learning', 'personal', 'finance'];

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('life_tasks').insert([{ title: title.trim(), start_time: startTime, target_date: date, category, is_completed: false }]);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Inisiasi Task Baru</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 block mb-2">Target Eksekusi</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="e.g. Deep Dive: Kriptografi CTF..."
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:[color-scheme:dark] transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 block mb-2">Waktu Mulai</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:[color-scheme:dark] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 block mb-2">Kategori Modul</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:[color-scheme:dark] transition-colors capitalize font-semibold"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !title.trim()}
            className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            {saving ? 'Sinkronisasi Database...' : 'Tambahkan ke Timeline'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PUBLIC SCHEDULE CARD ──────────────────────────────────────────────────────

function PublicScheduleCard({ tasks, date }: { tasks: any[]; date: string }) {
  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
          <CalendarDays size={18} className="text-purple-500" /> Daily Schedule
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">{date}</span>
          {tasks.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              progress === 100
                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
            }`}>
              {completedCount}/{tasks.length} done
            </span>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10B981' : '#A855F7' }}
          />
        </div>
      )}

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              task.is_completed
                ? 'bg-gray-50 dark:bg-white/[0.03] border-transparent opacity-60'
                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
            }`}>
              <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${task.is_completed ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-gray-200 dark:bg-white/10'}`}>
                {task.is_completed
                  ? <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  : <Circle size={13} className="text-gray-400 dark:text-white/20" />
                }
              </div>
              <span className={`text-sm font-medium flex-1 truncate ${task.is_completed ? 'line-through text-gray-500 dark:text-white/30' : 'text-gray-800 dark:text-white/90'}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.is_recurring && <Repeat size={11} className="text-red-500 dark:text-red-400" />}
                {task.start_time && (
                  <span className="text-[10px] font-mono text-gray-500 dark:text-white/40 flex items-center gap-0.5">
                    <Clock size={10} /> {task.start_time.substring(0, 5)}
                  </span>
                )}
                {task.category && (
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${CATEGORY_COLORS[task.category] || 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}>
                    {task.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
          <CalendarDays size={28} className="text-gray-300 dark:text-white/20 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-white/40 font-medium">Tidak ada jadwal hari ini</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────

export default function SystemIdentityDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [bio, setBio] = useState('');
  const [quote, setQuote] = useState('');

  const [telemetry, setTelemetry] = useState({
    energy_level: 80,
    mood: 'calm',
    protocols_met: [] as string[],
  });

  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);

  const getLocalToday = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const today = getLocalToday();

  const fetchTasks = useCallback(async () => {
    const { data: rawTasks } = await supabase.from('life_tasks').select('*').order('start_time', { ascending: true });
    const { data: compData } = await supabase.from('task_completions').select('task_id').eq('completed_date', today);
    const completedIds = compData?.map(c => c.task_id) || [];

    if (rawTasks) {
      const processed = rawTasks.filter(task => {
        if (!task.is_recurring) return task.target_date === today;
        return task.target_date <= today && (!task.recurrence_end_date || task.recurrence_end_date >= today);
      }).map(task => ({
        ...task,
        is_completed: task.is_recurring ? completedIds.includes(task.id) : task.is_completed
      }));
      setTodayTasks(processed);
    }
  }, [today]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth');
      setUserEmail(user.email || '');

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        setProfile(p);
        setBio(p.bio || 'Architect of Culture Series. Membangun fondasi intelektual dan finansial.');
        setQuote(p.stoic_quote || 'Kematian tidak datang sekali saja; ia datang sedikit demi sedikit setiap hari. Bagian dari hidup yang telah kita lalui sudah mati. Fokuslah pada hari ini.');
      }

      const { data: t } = await supabase.from('daily_telemetry').select('*').eq('date', today).single();
      if (t) setTelemetry({ energy_level: t.energy_level, mood: t.mood, protocols_met: t.protocols_met || [] });
      else await supabase.from('daily_telemetry').insert([{ date: today }]);

      await fetchTasks();
      setLoading(false);
    };
    init();
  }, [router, today, fetchTasks]);

  const saveBio = async (v: string) => {
    setBio(v);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ bio: v }).eq('id', user.id);
  };

  const saveQuote = async (v: string) => {
    setQuote(v);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ stoic_quote: v }).eq('id', user.id);
  };

  const updateTelemetry = async (updates: Partial<typeof telemetry>) => {
    setTelemetry(prev => ({ ...prev, ...updates }));
    await supabase.from('daily_telemetry').update(updates).eq('date', today);
  };

  const toggleProtocol = (id: string) => {
    const has = telemetry.protocols_met.includes(id);
    const next = has ? telemetry.protocols_met.filter(x => x !== id) : [...telemetry.protocols_met, id];
    updateTelemetry({ protocols_met: next });
  };

  const toggleTask = async (task: any) => {
    const newVal = !task.is_completed;
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newVal } : t));
    if (task.is_recurring) {
      if (task.is_completed) await supabase.from('task_completions').delete().match({ task_id: task.id, completed_date: today });
      else await supabase.from('task_completions').insert([{ task_id: task.id, completed_date: today }]);
    } else {
      await supabase.from('life_tasks').update({ is_completed: newVal }).eq('id', task.id);
    }
  };

  const deleteTask = async (id: string) => {
    setTodayTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('life_tasks').delete().eq('id', id);
  };

  const handleLogout = async () => {
    if (confirm('Keluar dari CultureOS?')) { await supabase.auth.signOut(); router.push('/auth'); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const protocolScore = Math.round((telemetry.protocols_met.length / CORE_PROTOCOLS.length) * 100) || 0;
  const completedTasks = todayTasks.filter(t => t.is_completed).length;
  const taskProgress = todayTasks.length > 0 ? Math.round((completedTasks / todayTasks.length) * 100) : 0;

  const focusLabel = telemetry.mood === 'flow' && telemetry.energy_level >= 50 ? 'High' : (telemetry.mood === 'anxious' || telemetry.mood === 'burnout') ? 'Low' : telemetry.energy_level < 30 ? 'Critical' : 'Medium';
  const focusColor = focusLabel === 'High' ? 'text-orange-500' : focusLabel === 'Low' || focusLabel === 'Critical' ? 'text-red-500' : 'text-blue-500';
  const burnoutLabel = telemetry.energy_level < 30 ? 'High' : telemetry.energy_level <= 60 ? 'Moderate' : 'Low';
  const burnoutColor = burnoutLabel === 'High' ? 'text-red-500' : burnoutLabel === 'Moderate' ? 'text-yellow-500' : 'text-emerald-500';
  const energyColor = telemetry.energy_level < 30 ? '#EF4444' : telemetry.energy_level <= 60 ? '#EAB308' : '#10B981';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-white/40 font-medium">Menyinkronkan sistem...</p>
      </div>
    </div>
  );

  return (
    <>
      {showAddTask && <AddTaskModal date={today} onClose={() => setShowAddTask(false)} onAdded={fetchTasks} />}

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-16">

        {/* ── TOPBAR ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40">CultureOS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">System Identity</h1>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/30 text-xs font-bold transition-all w-fit"
          >
            <LogOut size={13} /> Disconnect
          </button>
        </header>

        {/* ── INTEGRITY BANNER ── */}
        <div className="relative overflow-hidden bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${protocolScore === 100 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500'}`}>
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-0.5">
                  System Health Integrity — {today}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {telemetry.protocols_met.length} dari {CORE_PROTOCOLS.length} protokol aktif hari ini
                </p>
              </div>
            </div>
            <div className={`text-4xl font-black tabular-nums ${protocolScore === 100 ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
              {protocolScore}<span className="text-xl font-bold text-gray-400 dark:text-white/30">%</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${protocolScore}%`, background: protocolScore === 100 ? '#10B981' : '#3B82F6' }}
            />
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ──── LEFT: IDENTITY + PUBLIC SCHEDULE ──── */}
          <div className="lg:col-span-5 space-y-5">

            {/* Identity Card */}
            <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-row items-center gap-4 pb-6 mb-6 border-b border-gray-100 dark:border-white/10">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-black select-none">
                  {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1">Architect</p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate leading-tight">
                    {profile?.full_name || 'Unknown Entity'}
                  </h2>
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10">
                    {profile?.role || 'User Level'}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Comm Link</p>
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                    <Mail size={14} className="text-gray-400 dark:text-white/30 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{userEmail}</span>
                  </div>
                </div>
                <EditableField label="System Description" value={bio} onSave={saveBio} />
                <EditableField label="Daily Directive" value={quote} accent onSave={saveQuote} />
              </div>
            </div>

            {/* PUBLIC SCHEDULE */}
            <PublicScheduleCard tasks={todayTasks} date={today} />

          </div>

          {/* ──── RIGHT: TELEMETRY + PROTOCOLS + PRIVATE TASK MANAGER ──── */}
          <div className="lg:col-span-7 space-y-5">

            {/* Energy & Mood */}
            <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                  <Battery size={18} className="text-blue-500" /> Energy & Mood
                </h3>
                <div className="flex gap-2">
                  <StatChip label="Focus" value={focusLabel} color={focusColor} />
                  <StatChip label="Burnout" value={burnoutLabel} color={burnoutColor} />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Kapasitas Energi</span>
                  <span className="text-xl font-black font-mono tabular-nums" style={{ color: energyColor }}>{telemetry.energy_level}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={telemetry.energy_level}
                  onChange={e => updateTelemetry({ energy_level: parseInt(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
                  style={{
                    background: `linear-gradient(to right, ${energyColor} ${telemetry.energy_level}%, rgba(156,163,175,0.3) ${telemetry.energy_level}%)`,
                    accentColor: energyColor,
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-gray-500 dark:text-white/40">Exhausted</span>
                  <span className="text-[10px] text-gray-500 dark:text-white/40">Full Power</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MOODS.map(mood => {
                  const Icon = mood.icon;
                  const active = telemetry.mood === mood.id;
                  return (
                    <button key={mood.id} onClick={() => updateTelemetry({ mood: mood.id })}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-200 ${
                        active ? 'border-transparent shadow-sm' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                      style={active ? { background: `${mood.accent}18`, borderColor: `${mood.accent}40` } : {}}
                    >
                      <Icon size={20} style={{ color: active ? mood.accent : undefined }} className={active ? '' : 'text-gray-400 dark:text-white/30'} />
                      <div>
                        <p className={`text-xs font-bold leading-none mb-0.5 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white/50'}`}>{mood.name}</p>
                        <p className={`text-[9px] ${active ? 'text-gray-600 dark:text-white/60' : 'text-gray-400 dark:text-white/30'}`}>{mood.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Protocols */}
            <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base mb-4">
                <Zap size={18} className="text-yellow-500" /> Core Protocols
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CORE_PROTOCOLS.map(protocol => {
                  const Icon = protocol.icon;
                  const active = telemetry.protocols_met.includes(protocol.id);
                  return (
                    <button key={protocol.id} onClick={() => toggleProtocol(protocol.id)}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                        active ? 'border-transparent' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                      style={active ? { background: `${protocol.accent}12`, borderColor: `${protocol.accent}30` } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                          style={active ? { background: protocol.accent, color: '#fff' } : { background: '#F3F4F6', color: '#9CA3AF' }}
                        >
                          <Icon size={15} className={!active ? "dark:text-gray-600" : ""} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none mb-0.5 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-white/70'}`}>{protocol.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-white/40">{protocol.sub}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${active ? 'border-transparent' : 'border-gray-300 dark:border-white/20'}`}
                        style={active ? { background: protocol.accent, borderColor: protocol.accent } : {}}
                      >
                        {active && <Check size={11} strokeWidth={3} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}