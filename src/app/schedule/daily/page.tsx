"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, Circle, Clock, Plus, Target, 
  Zap, Lock, X, Play, Pause, Timer, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, History, Coffee, StopCircle, Unlock, Repeat
} from 'lucide-react';

export default function DailyHubPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const getLocalToday = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const today = getLocalToday();

  const [selectedDate, setSelectedDate] = useState(today);
  const isPastDate = selectedDate < today;
  
  // STATE MODAL FORM (Ditambah logika Routine)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    task_type: 'flexible', 
    start_time: '', 
    end_time: '',
    isRoutine: false,
    endDate: '' 
  });

  // ENGINE TIMER 45/5
  const WORK_SESSION = 45 * 60; 
  const BREAK_DURATION = 5 * 60; 

  const [activeTimer, setActiveTimer] = useState({
    taskId: null as string | null,
    remainingWorkSec: 0,
    breakSecRemaining: 0,
    workSecInSession: 0,
    mode: 'work' as 'work' | 'break',
    isRunning: false
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // ENGINE: FETCH DATA & COLOR MAPPING
  // ==========================================
  const fetchTasks = async () => {
    setLoading(true);
    
    // 1. Tarik semua data
    const { data: rawTasks } = await supabase.from('life_tasks').select('*').order('start_time', { ascending: true });
    
    // 2. Tarik data penyelesaian (Ledger) khusus untuk tanggal yang dipilih
    const { data: compData } = await supabase.from('task_completions').select('task_id').eq('completed_date', selectedDate);
    const completedIds = compData?.map(c => c.task_id) || [];
    setCompletions(completedIds);

    // 3. Filter tugas yang masuk ke tanggal kalender saat ini
    if (rawTasks) {
      const processedTasks = rawTasks.filter(task => {
        if (!task.is_recurring) {
          return task.target_date === selectedDate;
        } else {
          // Logika Jarak Waktu (Rutinitas)
          const isAfterStart = task.target_date <= selectedDate;
          const isBeforeEnd = !task.recurrence_end_date || task.recurrence_end_date >= selectedDate;
          return isAfterStart && isBeforeEnd;
        }
      }).map(task => ({
        ...task,
        // Override status selesai jika dia adalah rutinitas (cek dari tabel ledger)
        is_completed: task.is_recurring ? completedIds.includes(task.id) : task.is_completed
      }));

      setTasks(processedTasks);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [selectedDate]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // FUNGSI PEWARNAAN VISUAL TINGKAT DEWA
  const getTaskColors = (task: any, isTimerActive: boolean = false) => {
    // HIJAU: Jika Selesai
    if (task.is_completed) return { border: 'border-green-300 dark:border-green-900/50', bg: 'bg-gray-50 dark:bg-[#121212] opacity-60', text: 'text-green-600 dark:text-green-500', badge: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-500' };
    
    // MERAH: Jika Routine (Multi-hari)
    if (task.is_recurring) return { 
      border: isTimerActive ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-red-300 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-700/50', 
      bg: isTimerActive ? 'bg-red-50 dark:bg-red-950/10' : 'bg-white dark:bg-[#181818]', 
      text: 'text-red-600 dark:text-red-500', badge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
    };
    
    // BIRU: Jika Focus Today (Timed)
    if (task.task_type === 'timed') return { 
      border: isTimerActive ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-blue-300 dark:border-blue-900/50 hover:border-blue-400 dark:hover:border-blue-700/50', 
      bg: isTimerActive ? 'bg-blue-50 dark:bg-blue-950/10' : 'bg-white dark:bg-[#181818]', 
      text: 'text-blue-600 dark:text-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
    };
    
    // KUNING: Jika Daily Anytime (Flexible)
    return { border: 'border-yellow-300 dark:border-yellow-900/50 hover:border-yellow-400 dark:hover:border-yellow-600/50', bg: 'bg-white dark:bg-[#181818]', text: 'text-yellow-600 dark:text-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' };
  };

  // ==========================================
  // ENGINE LOGIC
  // ==========================================
  const handleAddTask = async () => {
    if (!newTask.title || isPastDate) return;
    const payload = {
      title: newTask.title,
      task_type: newTask.task_type,
      target_date: selectedDate,
      is_completed: false,
      start_time: newTask.task_type === 'timed' ? newTask.start_time : null,
      end_time: newTask.task_type === 'timed' ? newTask.end_time : null,
      is_recurring: newTask.isRoutine,
      recurrence_end_date: newTask.isRoutine && newTask.endDate ? newTask.endDate : null
    };

    await supabase.from('life_tasks').insert([payload]);
    setShowAddForm(false);
    setNewTask({ title: '', task_type: 'flexible', start_time: '', end_time: '', isRoutine: false, endDate: '' });
    fetchTasks();
  };

  const handleManualCheck = async (task: any, isUnlocked: boolean) => {
    if (isPastDate) return;
    if (task.task_type === 'timed' && !isUnlocked && !task.is_completed) return; 

    if (task.is_recurring) {
      if (task.is_completed) await supabase.from('task_completions').delete().match({ task_id: task.id, completed_date: selectedDate });
      else await supabase.from('task_completions').insert([{ task_id: task.id, completed_date: selectedDate }]);
    } else {
      await supabase.from('life_tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
    }
    fetchTasks();
  };

  // --- TIMER LOGIC ---
  const getTargetMinutes = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    return diff < 0 ? diff + (24 * 60) : diff;
  };

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const startTaskTimer = (task: any) => {
    if (isPastDate) return;
    if (activeTimer.taskId && activeTimer.isRunning && !window.confirm("Ganti fokus?")) return;
    const targetMins = getTargetMinutes(task.start_time, task.end_time);
    const remainingSeconds = Math.max((targetMins - (task.focused_minutes || 0)) * 60, 0);
    setActiveTimer({ taskId: task.id, remainingWorkSec: remainingSeconds, breakSecRemaining: 0, workSecInSession: 0, mode: 'work', isRunning: true });
  };

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeTimer.taskId && activeTimer.isRunning) {
      timerRef.current = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev.isRunning) return prev;
          if (prev.mode === 'work') {
            const nextWork = prev.remainingWorkSec - 1;
            const nextSession = prev.workSecInSession + 1;
            if (nextWork <= 0) {
              clearInterval(timerRef.current!);
              handleTimerComplete(prev.taskId!);
              return { ...prev, remainingWorkSec: 0, isRunning: false, mode: 'work' };
            }
            if (nextSession >= WORK_SESSION) return { ...prev, mode: 'break', workSecInSession: 0, breakSecRemaining: BREAK_DURATION };
            return { ...prev, remainingWorkSec: nextWork, workSecInSession: nextSession };
          } else {
            const nextBreak = prev.breakSecRemaining - 1;
            if (nextBreak <= 0) return { ...prev, mode: 'work', breakSecRemaining: 0, workSecInSession: 0 };
            return { ...prev, breakSecRemaining: nextBreak };
          }
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimer.taskId, activeTimer.isRunning, activeTimer.mode]);

  const handleTimerComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await supabase.from('life_tasks').update({ focused_minutes: getTargetMinutes(task.start_time, task.end_time) }).eq('id', taskId);
      
      // Auto-Checklist saat waktu habis
      if (task.is_recurring) await supabase.from('task_completions').insert([{ task_id: task.id, completed_date: selectedDate }]);
      else await supabase.from('life_tasks').update({ is_completed: true }).eq('id', taskId);
      
      alert("Waktu Habis! Tugas otomatis dicentang hijau.");
      fetchTasks();
    }
  };

  // ==========================================
  // UI PREP
  // ==========================================
  const timedTasks = tasks.filter(t => t.task_type === 'timed');
  const flexibleTasks = tasks.filter(t => t.task_type === 'flexible');
  
  const completedCount = tasks.filter(t => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const isFormValid = newTask.title.trim() !== '' && (newTask.task_type === 'flexible' || (newTask.start_time !== '' && newTask.end_time !== ''));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      
      {/* HEADER KALENDER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
        {isPastDate && <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)' }}></div>}
        <div className="space-y-3 w-full md:w-auto z-10">
          <h2 className="text-3xl font-bold text-black dark:text-white flex items-center gap-3">Daily Hub <Zap className="text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" size={28} /></h2>
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#181818] p-1.5 rounded-xl border border-gray-300 dark:border-gray-800 w-fit">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-[#252525] rounded-lg text-gray-600 dark:text-gray-500"><ChevronLeft size={18}/></button>
            <div className="flex items-center gap-2 px-2 cursor-pointer relative">
              <CalendarIcon size={16} className="text-blue-600 dark:text-blue-500" />
              <span className="font-bold text-sm text-black dark:text-white w-24 text-center">{selectedDate === today ? "Hari Ini" : selectedDate}</span>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-[#252525] rounded-lg text-gray-600 dark:text-gray-500"><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="w-full md:w-72 space-y-2 z-10">
          <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            <span>{isPastDate ? 'Log Masa Lalu' : 'Progress Harian'}</span>
            <span className="text-black dark:text-white">{progressPercent}%</span>
          </div>
          <div className="h-3.5 w-full bg-gray-200 dark:bg-[#181818] rounded-full overflow-hidden shadow-inner">
            <div className={`h-full transition-all duration-1000 ${isPastDate ? 'bg-gray-400 dark:bg-gray-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </header>

      {/* TUGAS BERBASIS WAKTU (TIME BLOCKS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-black dark:text-white uppercase tracking-wide">
              <Clock className="text-blue-600 dark:text-blue-500" size={20} /> Time Blocks
            </h3>
            <button onClick={() => { setNewTask({ ...newTask, task_type: 'timed' }); setShowAddForm(true); }} disabled={isPastDate} className="px-3 py-1.5 bg-gray-100 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 text-black dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-[#252525] text-sm font-medium flex items-center gap-1 disabled:opacity-30">
              <Plus size={16} /> Block Waktu
            </button>
          </div>

          <div className="space-y-4">
            {timedTasks.map(task => {
              const isActiveTimer = activeTimer.taskId === task.id;
              const targetMins = getTargetMinutes(task.start_time, task.end_time);
              const isUnlocked = (task.focused_minutes || 0) >= targetMins || task.is_completed;
              const colors = getTaskColors(task, isActiveTimer);

              return (
                <div key={task.id} className={`p-5 rounded-2xl border transition-all ${colors.border} ${colors.bg}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={`font-bold text-lg flex items-center gap-2 ${task.is_completed ? 'line-through text-gray-500 dark:text-gray-500' : 'text-black dark:text-white'}`}>
                        {task.title}
                        {task.is_recurring && <span title="Rutinitas Multi-hari"><Repeat size={14} className={colors.text} /></span>}
                      </h4>
                      <p className={`text-xs font-mono mt-1 flex items-center gap-2 ${task.is_completed ? 'text-gray-500 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                        <Clock size={12} className={colors.text}/> {task.start_time?.substring(0, 5)} - {task.end_time?.substring(0, 5)} 
                        <span className={`px-2 py-0.5 rounded font-bold ${colors.badge}`}>Target: {targetMins}m</span>
                      </p>
                    </div>
                    <button onClick={() => handleManualCheck(task, isUnlocked)} disabled={!isUnlocked && !task.is_completed} className={`p-2 rounded-full transition-all ${task.is_completed ? colors.text : isUnlocked ? `${colors.text} bg-gray-100 dark:bg-[#252525] animate-pulse cursor-pointer` : 'text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-[#1A1A1A]'}`}>
                      {task.is_completed ? <CheckCircle2 size={24} /> : isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
                    </button>
                  </div>

                  {!task.is_completed && !isUnlocked && !isPastDate && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800/50">
                      {!isActiveTimer ? (
                        <button onClick={() => startTaskTimer(task)} className={`flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-[#202020] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] ${colors.text} font-bold rounded-xl transition-all border ${colors.border}`}>
                          <Play size={18} /> Mulai Eksekusi
                        </button>
                      ) : (
                        <div className="flex items-center gap-4 bg-white dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800 relative">
                          <div className={`absolute top-2 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${activeTimer.mode === 'work' ? colors.badge : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-500'}`}>
                            {activeTimer.mode === 'work' ? 'Working' : 'Break'}
                          </div>
                          <button onClick={() => setActiveTimer(p => ({...p, isRunning: !p.isRunning}))} className={`h-14 w-14 flex items-center justify-center rounded-full text-white shadow-lg shrink-0 ${activeTimer.mode === 'work' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {activeTimer.isRunning ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                          </button>
                          <div className="flex-1">
                            <span className={`font-mono text-3xl font-bold tracking-wider ${activeTimer.mode === 'work' ? colors.text : 'text-green-600 dark:text-green-500'}`}>
                              {formatTime(activeTimer.mode === 'work' ? activeTimer.remainingWorkSec : activeTimer.breakSecRemaining)}
                            </span>
                          </div>
                          <button onClick={() => setActiveTimer({ taskId: null, remainingWorkSec: 0, breakSecRemaining: 0, workSecInSession: 0, mode: 'work', isRunning: false })} className="text-red-600 dark:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><StopCircle size={20}/></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN: ANYTIME CHECKLIST */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-black dark:text-white uppercase tracking-wide">
              <Target className="text-yellow-600 dark:text-yellow-500" size={20} /> Anytime
            </h3>
            <button onClick={() => { setNewTask({ title: '', task_type: 'flexible', start_time: '', end_time: '', isRoutine: false, endDate: '' }); setShowAddForm(true); }} disabled={isPastDate} className="px-3 py-1.5 bg-gray-100 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 text-black dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-[#252525] text-sm font-medium flex items-center gap-1 disabled:opacity-30">
              <Plus size={16} /> Tambah
            </button>
          </div>

          <div className="space-y-3">
            {flexibleTasks.map((task) => {
              const colors = getTaskColors(task);
              return (
                <div key={task.id} onClick={() => handleManualCheck(task, true)} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${colors.border} ${colors.bg} ${!isPastDate && !task.is_completed ? 'cursor-pointer' : 'cursor-default'}`}>
                  {task.is_completed ? <CheckCircle2 className="text-green-600 dark:text-green-500 shrink-0" size={24} /> : <Circle className={`${colors.text} shrink-0 opacity-50`} size={24} />}
                  <span className={`font-medium text-[15px] flex items-center gap-2 ${task.is_completed ? 'line-through text-gray-500 dark:text-gray-600' : 'text-black dark:text-white'}`}>
                    {task.title}
                    {task.is_recurring && <span title="Rutinitas Multi-hari"><Repeat size={12} className={colors.text} /></span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL CATAT KOMITMEN + LOGIKA MULTI-HARI */}
      {showAddForm && !isPastDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg text-black dark:text-white flex items-center gap-2"><Lock size={16} className="text-gray-600 dark:text-gray-400"/> Catat Komitmen</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <button onClick={() => setNewTask({...newTask, task_type: 'flexible'})} className={`flex-1 py-3 text-sm font-semibold rounded-lg border ${newTask.task_type === 'flexible' ? 'bg-yellow-50 dark:bg-[#202020] text-yellow-700 dark:text-yellow-500 border-yellow-300 dark:border-yellow-900/50' : 'bg-gray-100 dark:bg-[#181818] text-gray-600 dark:text-gray-600 border-transparent'}`}>Anytime</button>
                <button onClick={() => setNewTask({...newTask, task_type: 'timed'})} className={`flex-1 py-3 text-sm font-semibold rounded-lg border ${newTask.task_type === 'timed' ? 'bg-blue-50 dark:bg-[#202020] text-blue-700 dark:text-blue-500 border-blue-300 dark:border-blue-900/50' : 'bg-gray-100 dark:bg-[#181818] text-gray-600 dark:text-gray-600 border-transparent'}`}>Time-Block</button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-widest mb-2">Nama Aktivitas</label>
                <input autoFocus placeholder="Contoh: Belajar Kriptografi" className="w-full p-4 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 text-black dark:text-white text-sm" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              
              {newTask.task_type === 'timed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-widest mb-2">Mulai</label>
                    <input type="time" className="w-full p-4 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-black dark:text-white" value={newTask.start_time} onChange={e => setNewTask({...newTask, start_time: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-widest mb-2">Selesai</label>
                    <input type="time" className="w-full p-4 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-black dark:text-white" value={newTask.end_time} onChange={e => setNewTask({...newTask, end_time: e.target.value})} />
                  </div>
                </div>
              )}

              {/* TOGGLE LOGIKA MULTI-HARI (ROUTINE) DI SINI! */}
              <div className="bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-red-500 rounded cursor-pointer" checked={newTask.isRoutine} onChange={e => setNewTask({...newTask, isRoutine: e.target.checked})} />
                  <span className="text-sm font-bold text-black dark:text-white flex items-center gap-2">Set sebagai Rutinitas <Repeat size={14} className="text-red-600 dark:text-red-500"/></span>
                </label>

                {newTask.isRoutine && (
                  <div className="pl-7 pt-2 border-t border-gray-200 dark:border-gray-800">
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-500 uppercase mb-2">Berlaku Sampai Tanggal</label>
                    <input type="date" className="w-full p-3 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-800 rounded-lg outline-none focus:border-red-500 text-sm text-black dark:text-white font-mono" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} />
                    <p className="text-[10px] text-gray-600 dark:text-gray-500 mt-2">*Tugas ini akan otomatis muncul di Daily Hub setiap hari sampai tanggal di atas.</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button onClick={handleAddTask} disabled={!isFormValid} className="w-full py-4 font-bold bg-gray-800 text-white disabled:opacity-30 hover:bg-black rounded-xl transition-all flex justify-center items-center gap-2">
                  <Lock size={18} /> Kunci Jadwal ke Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}