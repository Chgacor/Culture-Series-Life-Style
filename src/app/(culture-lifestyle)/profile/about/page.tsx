"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Mail, LogOut, Activity, ShieldCheck,
  Zap, Save, Edit2, Battery, Droplets,
  Moon, Wallet, Brain, Flame, CloudRain, Check,
  CalendarDays, Sun, Monitor, X, Plus, Trash2,
  CheckCircle2, Circle, Clock, Repeat, Fingerprint, Camera, Loader2
} from 'lucide-react';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
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

const CATEGORY_COLORS: Record<string, string> = {
  work:     'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
  health:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
  learning: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
  personal: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50',
  finance:  'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50',
};

// ─── THEME TOGGLE ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const options = [
    { value: 'light',  icon: <Sun size={13} />,     label: 'Light' },
    { value: 'system', icon: <Monitor size={13} />, label: 'System' },
    { value: 'dark',   icon: <Moon size={13} />,    label: 'Dark' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10">
      {options.map(o => (
        <button key={o.value} onClick={() => setTheme(o.value)} title={o.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            theme === o.value ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80'
          }`}
        >
          {o.icon} <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── STAT CHIP ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 min-w-[90px]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── EDITABLE FIELD ────────────────────────────────────────────────────────────
function EditableField({ label, value, accent = false, onSave }: { label: string; value: string; accent?: boolean; onSave: (v: string) => Promise<void>; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = async () => { setSaving(true); await onSave(draft); setSaving(false); setEditing(false); };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>{label}</span>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"><Edit2 size={13} /></button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="text-gray-400 hover:text-red-500 transition-colors"><X size={13} /></button>
            <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1 text-xs font-bold transition-colors ${accent ? 'text-emerald-500' : 'text-blue-500'}`}>
              {saving ? '...' : <><Save size={12} /> Save</>}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus rows={3}
          className={`w-full text-sm rounded-xl p-3.5 resize-none outline-none border transition-all duration-150 bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white ${accent ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 italic' : 'border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
        />
      ) : (
        <div onClick={() => setEditing(true)}
          className={`min-h-[5rem] p-4 rounded-xl cursor-text text-sm leading-relaxed border transition-all duration-150 ${accent ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 italic border-l-2 border-l-emerald-500 pl-4 hover:border-emerald-300 dark:hover:border-emerald-700/50' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}
        >
          {accent ? `"${value}"` : value}
        </div>
      )}
    </div>
  );
}

// ─── ADD TASK MODAL ────────────────────────────────────────────────────────────
function AddTaskModal({ date, onClose, onAdded }: { date: string; onClose: () => void; onAdded: () => void; }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [category, setCategory] = useState('work');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const CATEGORIES = ['work', 'health', 'learning', 'personal', 'finance'];

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser(); // AMBIL IDENTITAS USER
    
    // PASTIKAN INSERT MEMILIKI user_id
    await supabase.from('life_tasks').insert([{ 
      user_id: user?.id, 
      title: title.trim(), 
      start_time: startTime, 
      target_date: date, 
      category, 
      is_completed: false, 
      is_recurring: isRecurring 
    }]);
    
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Inisiasi Task Baru</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Target Eksekusi</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="e.g. Deep Dive: Kriptografi CTF..." className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Waktu Mulai</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Kategori Modul</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors capitalize font-semibold">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setIsRecurring(!isRecurring)} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isRecurring ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Ulangi setiap hari (Rutinitas)</span>
          </div>

          <button onClick={handleAdd} disabled={saving || !title.trim()} className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20">
            {saving ? 'Sinkronisasi...' : 'Tambahkan ke Kalender'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function SystemIdentityDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Profile States
  const [profile, setProfile]   = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [bio, setBio]           = useState('');
  const [quote, setQuote]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [architectId, setArchitectId] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [telemetry, setTelemetry] = useState({ energy_level: 80, mood: 'calm', protocols_met: [] as string[] });

  // CALENDAR STATES
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateTasks, setSelectedDateTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [weekDates, setWeekDates] = useState<{date: string, dayName: string, dateNum: string, fullDate: Date}[]>([]);

  useEffect(() => {
    const dates = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }), dateNum: d.getDate().toString(), fullDate: d };
    });
    setWeekDates(dates);
    setSelectedDate(dates[0].date);
  }, []);

  const todayStr = weekDates.length > 0 ? weekDates[0].date : '';

  const fetchTasks = useCallback(async () => {
    if (!selectedDate) return;
    const { data: { user } } = await supabase.auth.getUser(); // AMBIL IDENTITAS
    if (!user) return;

    // PASTIKAN FILTER eq('user_id', user.id) ADA DI SINI
    const { data: rawTasks } = await supabase
      .from('life_tasks')
      .select('*')
      .eq('user_id', user.id) 
      .order('start_time', { ascending: true });

    const { data: compData } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('completed_date', selectedDate); // Opsional .eq('user_id') jika ada di tabelnya

    const completedIds = compData?.map(c => c.task_id) || [];

    if (rawTasks) {
      const processed = rawTasks.filter(task => {
        if (!task.is_recurring) return task.target_date === selectedDate;
        return task.target_date <= selectedDate && (!task.recurrence_end_date || task.recurrence_end_date >= selectedDate);
      }).map(task => ({ ...task, is_completed: task.is_recurring ? completedIds.includes(task.id) : task.is_completed }));
      setSelectedDateTasks(processed);
    }
  }, [selectedDate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const init = async () => {
      if (!todayStr) return;
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth');
      setUserEmail(user.email || '');

      let { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      let generatedId = p?.architect_id;
      if (!p || !generatedId) {
        generatedId = `ARC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        if (!p) {
          const newProfile = { id: user.id, full_name: 'Unknown Entity', role: 'USER LEVEL', architect_id: generatedId };
          await supabase.from('profiles').insert([newProfile]);
          p = newProfile;
        } else {
          await supabase.from('profiles').update({ architect_id: generatedId }).eq('id', user.id);
          p.architect_id = generatedId;
        }
      }

      setProfile(p);
      setArchitectId(generatedId);
      setBio(p.bio || 'Architect of Culture Series. Membangun fondasi intelektual dan finansial.');
      setQuote(p.stoic_quote || 'Kematian tidak datang sekali saja; ia datang sedikit demi sedikit setiap hari. Bagian dari hidup yang telah kita lalui sudah mati. Fokuslah pada hari ini.');
      setAvatarUrl(p.avatar_url || '');

      // PASTIKAN FILTER eq('user_id', user.id) ADA DI SINI
      const { data: t } = await supabase
        .from('daily_telemetry')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (t) {
        setTelemetry({ energy_level: t.energy_level, mood: t.mood, protocols_met: t.protocols_met || [] });
      } else {
        await supabase.from('daily_telemetry').insert([{ user_id: user.id, date: todayStr, energy_level: 80, mood: 'calm' }]);
      }

      setLoading(false);
    };
    init();
  }, [router, todayStr]);

  // ── Handlers ──
  const saveFullName = async (v: string) => { 
    const cleanName = v.trim();
    if (!cleanName) { alert("Nama tidak boleh kosong."); return; }
    if (profile?.id) {
      const { error } = await supabase.from('profiles').update({ full_name: cleanName }).eq('id', profile.id);
      if (!error) setProfile((prev: any) => ({ ...prev, full_name: cleanName }));
    } 
  };

  const saveBio = async (v: string) => { setBio(v); if (profile?.id) await supabase.from('profiles').update({ bio: v }).eq('id', profile.id); };
  const saveQuote = async (v: string) => { setQuote(v); if (profile?.id) await supabase.from('profiles').update({ stoic_quote: v }).eq('id', profile.id); };
  
  const updateTelemetry = async (updates: Partial<typeof telemetry>) => { 
    const nextState = { ...telemetry, ...updates };
    setTelemetry(nextState); 
    if (profile?.id) {
      await supabase.from('daily_telemetry').upsert({
        user_id: profile.id,
        date: todayStr,
        energy_level: nextState.energy_level,
        mood: nextState.mood,
        protocols_met: nextState.protocols_met
      }, { onConflict: 'user_id, date' });
    }
  };

  const toggleProtocol = (id: string) => { const next = telemetry.protocols_met.includes(id) ? telemetry.protocols_met.filter(x => x !== id) : [...telemetry.protocols_met, id]; updateTelemetry({ protocols_met: next }); };
  
  const toggleTask = async (task: any) => {
    const newVal = !task.is_completed;
    setSelectedDateTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newVal } : t));
    
    if (task.is_recurring) {
      if (newVal) await supabase.from('task_completions').insert([{ task_id: task.id, completed_date: selectedDate }]);
      else await supabase.from('task_completions').delete().match({ task_id: task.id, completed_date: selectedDate });
    } else {
      await supabase.from('life_tasks').update({ is_completed: newVal }).eq('id', task.id);
    }
  };
  const deleteTask = async (id: string) => { setSelectedDateTasks(prev => prev.filter(t => t.id !== id)); await supabase.from('life_tasks').delete().eq('id', id); };
  const handleLogout = async () => { if (confirm('Keluar dari CultureOS?')) { await supabase.auth.signOut(); router.push('/auth'); } };

  // ── Avatar Upload Handler ──
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert("Gagal mengupload avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Derived ──
  const protocolScore = Math.round((telemetry.protocols_met.length / CORE_PROTOCOLS.length) * 100) || 0;
  const completedTasks = selectedDateTasks.filter(t => t.is_completed).length;
  const taskProgress = selectedDateTasks.length > 0 ? Math.round((completedTasks / selectedDateTasks.length) * 100) : 0;
  const focusLabel = telemetry.mood === 'flow' && telemetry.energy_level >= 50 ? 'High' : (telemetry.mood === 'anxious' || telemetry.mood === 'burnout') ? 'Low' : telemetry.energy_level < 30 ? 'Critical' : 'Medium';
  const focusColor = focusLabel === 'High' ? 'text-orange-500' : focusLabel === 'Low' || focusLabel === 'Critical' ? 'text-red-500' : 'text-blue-500';
  const burnoutLabel = telemetry.energy_level < 30 ? 'High' : telemetry.energy_level <= 60 ? 'Moderate' : 'Low';
  const burnoutColor = burnoutLabel === 'High' ? 'text-red-500' : burnoutLabel === 'Moderate' ? 'text-yellow-500' : 'text-emerald-500';
  const energyColor = telemetry.energy_level < 30 ? '#EF4444' : telemetry.energy_level <= 60 ? '#EAB308' : '#10B981';

  if (loading || weekDates.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Menyinkronkan sistem...</p>
      </div>
    </div>
  );

  return (
    <>
      {showAddTask && <AddTaskModal date={selectedDate} onClose={() => setShowAddTask(false)} onAdded={fetchTasks} />}

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 md:space-y-8 pb-16">
        
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">CultureOS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Identity</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-xs font-bold transition-all w-fit">
              <LogOut size={14} /> Disconnect
            </button>
          </div>
        </header>

        <div className="relative overflow-hidden bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-40 h-full opacity-10 pointer-events-none" style={{ background: `linear-gradient(135deg, ${protocolScore === 100 ? '#10B981' : '#3B82F6'}, transparent)` }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${protocolScore === 100 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500'}`}>
                <Activity size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Health Integrity — {todayStr}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{telemetry.protocols_met.length} dari {CORE_PROTOCOLS.length} protokol aktif</p>
              </div>
            </div>
            <div className={`text-4xl font-black tabular-nums ${protocolScore === 100 ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
              {protocolScore}<span className="text-xl font-bold text-gray-400">%</span>
            </div>
          </div>
          <div className="mt-5 h-1.5 bg-gray-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${protocolScore}%`, background: protocolScore === 100 ? '#10B981' : '#3B82F6' }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* ──── LEFT: IDENTITY ──── */}
          <div className="lg:col-span-5 space-y-6 md:space-y-8">
            <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-row items-center gap-5 pb-8 mb-8 border-b border-gray-100 dark:border-gray-800">
                <div onClick={() => fileInputRef.current?.click()} className="relative w-16 h-16 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl font-black cursor-pointer overflow-hidden group border border-blue-100 dark:border-blue-900/50">
                  {uploadingAvatar ? <Loader2 className="animate-spin text-blue-500" size={24} /> : avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="text-white" size={20} /></div>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Architect</p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate mb-1.5">{profile?.full_name || 'Unknown Entity'}</h2>
                  <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">{profile?.role || 'User Level'}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Architect ID (Networking)</p>
                  <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/10 px-4 py-3 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <Fingerprint size={16} className="text-purple-500" />
                    <span className="text-sm font-black tracking-widest text-purple-700 dark:text-purple-400">{architectId || 'Generating...'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Comm Link</p>
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1A1A1A] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userEmail}</span>
                  </div>
                </div>
                <EditableField label="Nama Lengkap" value={profile?.full_name || 'Unknown Entity'} onSave={saveFullName} />
                <EditableField label="System Description" value={bio} onSave={saveBio} />
                <EditableField label="Daily Directive" value={quote} accent onSave={saveQuote} />
              </div>
            </div>
          </div>

          {/* ──── RIGHT: TELEMETRY + TASKS ──── */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
            <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base"><Battery size={20} className="text-blue-500" /> Energy & Mood</h3>
                <div className="flex gap-2">
                  <StatChip label="Focus" value={focusLabel} color={focusColor} />
                  <StatChip label="Burnout" value={burnoutLabel} color={burnoutColor} />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Kapasitas Energi</span>
                  <span className="text-2xl font-black font-mono tabular-nums" style={{ color: energyColor }}>{telemetry.energy_level}%</span>
                </div>
                <div className="relative">
                  <input type="range" min={0} max={100} step={5} value={telemetry.energy_level} onChange={e => updateTelemetry({ energy_level: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
                    style={{ background: `linear-gradient(to right, ${energyColor} ${telemetry.energy_level}%, ${document.documentElement.classList.contains('dark') ? '#2A2A2A' : '#E5E7EB'} ${telemetry.energy_level}%)`, accentColor: energyColor }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MOODS.map(mood => {
                  const Icon = mood.icon;
                  const active = telemetry.mood === mood.id;
                  return (
                    <button key={mood.id} onClick={() => updateTelemetry({ mood: mood.id })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all duration-200 ${active ? 'border-transparent shadow-sm' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                      style={active ? { background: `${mood.accent}15`, borderColor: `${mood.accent}40` } : {}}
                    >
                      <Icon size={24} style={{ color: active ? mood.accent : undefined }} className={active ? '' : 'text-gray-400 dark:text-gray-500'} />
                      <div>
                        <p className={`text-xs font-bold leading-none mb-1 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{mood.name}</p>
                        <p className={`text-[10px] ${active ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>{mood.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base mb-6"><Zap size={20} className="text-yellow-500" /> Core Protocols</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CORE_PROTOCOLS.map(protocol => {
                  const Icon = protocol.icon;
                  const active = telemetry.protocols_met.includes(protocol.id);
                  return (
                    <button key={protocol.id} onClick={() => toggleProtocol(protocol.id)}
                      className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${active ? 'border-transparent' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                      style={active ? { background: `${protocol.accent}12`, borderColor: `${protocol.accent}30` } : {}}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all" style={active ? { background: protocol.accent, color: '#fff' } : { background: 'var(--icon-bg, #F3F4F6)', color: '#9CA3AF' }}>
                          <Icon size={18} className={!active ? "dark:text-gray-600" : ""} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold leading-none mb-1 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{protocol.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-500">{protocol.sub}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${active ? 'border-transparent' : 'border-gray-300 dark:border-gray-700'}`} style={active ? { background: protocol.accent, borderColor: protocol.accent } : {}}>
                        {active && <Check size={14} strokeWidth={3} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base"><CalendarDays size={20} className="text-purple-500" /> Availability Calendar</h3>
                  <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1">Cek kekosongan waktu untuk jadwal meeting & sinkronisasi.</p>
                </div>
                <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20">
                  <Plus size={14} /> Assign Time
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                {weekDates.map((day) => {
                  const isSelected = selectedDate === day.date;
                  return (
                    <button key={day.date} onClick={() => setSelectedDate(day.date)}
                      className={`flex flex-col items-center justify-center min-w-[55px] p-2.5 rounded-2xl border transition-all ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-700/50'}`}
                    >
                      <span className="text-[10px] font-bold uppercase mb-1">{day.dayName}</span>
                      <span className="text-xl font-black">{day.dateNum}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDateTasks.length > 0 && (
                <div className="h-1.5 bg-gray-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden mb-6">
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${taskProgress}%` }} />
                </div>
              )}

              {selectedDateTasks.length > 0 ? (
                <div className="relative pl-4">
                  <div className="absolute top-2 bottom-6 left-[23px] w-[2px] bg-gray-100 dark:bg-gray-800" />
                  <div className="space-y-6 relative">
                    {selectedDateTasks.map((task) => (
                      <div key={task.id} className="group relative flex items-start gap-5">
                        <button onClick={() => toggleTask(task)} className={`relative z-10 shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-4 border-white dark:border-[#151515] transition-all duration-300 ${task.is_completed ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-500'}`}>
                          {task.is_completed ? <Check size={18} strokeWidth={3} /> : <Circle size={16} />}
                        </button>
                        <div className={`flex-1 p-5 rounded-2xl border transition-all duration-200 ${task.is_completed ? 'bg-gray-50 dark:bg-[#1A1A1A]/50 border-transparent opacity-60' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {task.start_time && <span className={`text-[11px] font-black tabular-nums tracking-wider ${task.is_completed ? 'text-gray-500' : 'text-purple-600 dark:text-purple-400'}`}>{task.start_time} WIB</span>}
                                {task.category && <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${CATEGORY_COLORS[task.category] || 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-500'}`}>{task.category}</span>}
                                {task.is_recurring && <Repeat size={12} className="text-red-400 ml-1" />}
                              </div>
                              <p className={`text-sm font-semibold leading-snug truncate ${task.is_completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</p>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                  <CalendarDays size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">Slot Waktu Tersedia</p>
                  <button onClick={() => setShowAddTask(true)} className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 font-bold uppercase tracking-wider underline underline-offset-4 transition-colors mt-2">
                    Assign Time Block
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}