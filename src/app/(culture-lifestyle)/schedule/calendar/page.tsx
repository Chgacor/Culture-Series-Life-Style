"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Clock, X, Lock, Repeat, Layers, CheckCircle2, Circle
} from 'lucide-react';

export default function MonthlyCalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isRoutine: false
  });

  const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  // ==========================================
  // ENGINE: FETCH DATA (Tasks & Completions)
  // ==========================================
  const fetchData = async () => {
    setLoading(true);
    
    // 0. WAJIB: Ambil KTP User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Tarik semua tugas (HANYA MILIK USER INI)
    const { data: tasksData } = await supabase
      .from('life_tasks')
      .select('*')
      .eq('user_id', user.id); // <--- KUNCI JADWAL
    
    // 2. Tarik semua history penyelesaian (HANYA MILIK USER INI)
    const { data: completionsData } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', user.id); // <--- KUNCI HISTORI SELESAI

    if (tasksData) setTasks(tasksData);
    if (completionsData) setCompletions(completionsData);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // LOGIKA PEWARNAAN (SINKRON DENGAN DAILY HUB)
  // ==========================================
  const getTaskStyle = (task: any, dateStr: string) => {
    // 1. Cek apakah selesai pada tanggal tersebut (Hijau)
    const isDoneOnThisDate = task.is_recurring 
      ? completions.some(c => c.task_id === task.id && c.completed_date === dateStr)
      : task.is_completed && task.target_date === dateStr;

    if (isDoneOnThisDate) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800/50";

    // 2. Rutinitas / Routine (Merah)
    if (task.is_recurring) return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/50";

    // 3. Fokus Hari Ini / Timed (Biru)
    if (task.task_type === 'timed') return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/50";

    // 4. Daily / Anytime (Kuning)
    return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800/50";
  };

  // ==========================================
  // LOGIKA RENDER GRID
  // ==========================================
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(task => {
      if (!task.is_recurring) return task.target_date === dateStr;
      const isAfterStart = task.target_date <= dateStr;
      const isBeforeEnd = !task.recurrence_end_date || task.recurrence_end_date >= dateStr;
      return isAfterStart && isBeforeEnd;
    });
  };

  const handleAddSchedule = async () => {
    if (!newTask.title || !newTask.startDate) return;
    
    // 3. AMBIL KTP UNTUK DISUNTIKKAN KE JADWAL BARU
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isMulti = newTask.isRoutine && newTask.endDate !== '';

    const payload = {
      user_id: user.id, // <--- SUNTIKAN KEPEMILIKAN JADWAL
      title: newTask.title,
      task_type: newTask.startTime ? 'timed' : 'flexible',
      target_date: newTask.startDate,
      is_completed: false,
      start_time: newTask.startTime || null,
      end_time: newTask.endTime || null,
      is_recurring: isMulti,
      recurrence_end_date: isMulti ? newTask.endDate : null
    };

    await supabase.from('life_tasks').insert([payload]);
    setShowAddForm(false);
    setNewTask({ title: '', startDate: '', endDate: '', startTime: '', endTime: '', isRoutine: false });
    fetchData();
  };

  const todayTasks = getTasksForDate(todayStr);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white flex items-center gap-3">
            Master Calendar <CalendarIcon className="text-indigo-600 dark:text-indigo-500" size={28} />
          </h2>
          <p className="text-gray-600 dark:text-gray-500 mt-1 text-sm">Visualisasi Arsitektur Waktu Bulanan.</p>
        </div>
        <button onClick={() => { setNewTask({...newTask, startDate: todayStr}); setShowAddForm(true); }} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
          <Plus size={18} /> Buat Jadwal
        </button>
      </header>

      {/* AGENDA HARI INI */}
      {todayTasks.length > 0 && (
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg text-black dark:text-white mb-4">Agenda Hari Ini ({new Date(todayStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })})</h3>
          <div className="space-y-3">
            {todayTasks.map(task => {
              const style = getTaskStyle(task, todayStr);
              const isDone = task.is_recurring 
                ? completions.some(c => c.task_id === task.id && c.completed_date === todayStr)
                : task.is_completed;

              return (
                <div key={task.id} className={`p-3 rounded-lg border flex items-center justify-between ${style}`}>
                  <div className="flex items-center gap-3">
                    {isDone ? <CheckCircle2 size={16} /> : task.is_recurring ? <Repeat size={16}/> : <Circle size={12} className="fill-current opacity-50"/>}
                    <span className="font-bold text-sm">{task.title}</span>
                  </div>
                  {task.start_time && <span className="text-xs font-mono bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md">{task.start_time}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KALENDER GRID */}
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#181818]">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-[#252525] rounded-lg text-gray-600 dark:text-gray-500"><ChevronLeft/></button>
          <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-widest">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-[#252525] rounded-lg text-gray-600 dark:text-gray-500"><ChevronRight/></button>
        </div>

        {/* DESKTOP: GRID VIEW */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px] md:min-w-full">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#121212]">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[130px] bg-gray-200 dark:bg-gray-800 gap-[1px]">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 dark:bg-[#121212] opacity-30"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const dayTasks = getTasksForDate(dateStr);

                return (
                  <div key={dayNum} className={`bg-white dark:bg-[#121212] p-2 transition-colors relative group border border-transparent ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/5 border-indigo-300 dark:border-indigo-500/30' : 'hover:bg-gray-50 dark:hover:bg-[#181818]'}`}>
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-md mb-2 ${isToday ? 'bg-indigo-500 text-white' : 'text-gray-700 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-gray-400'}`}>
                      {dayNum}
                    </span>

                    <div className="space-y-1.5 overflow-y-auto max-h-[85px] no-scrollbar">
                      {dayTasks.map(task => {
                        const style = getTaskStyle(task, dateStr);
                        const isDone = task.is_recurring 
                          ? completions.some(c => c.task_id === task.id && c.completed_date === dateStr)
                          : task.is_completed;

                        return (
                          <div key={`${task.id}-${dateStr}`} className={`text-[9px] font-bold px-2 py-1 rounded-md border truncate flex items-center gap-1.5 ${style}`}>
                            {isDone ? <CheckCircle2 size={10} className="shrink-0" /> : task.is_recurring ? <Repeat size={10} className="shrink-0"/> : <Circle size={8} className="shrink-0 fill-current opacity-50"/>}
                            {task.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FORM MODAL SINKRON DENGAN DAILY HUB */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg text-black dark:text-white flex items-center gap-2"><Layers size={18} className="text-indigo-600 dark:text-indigo-500"/> Master Plan</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-widest mb-2">Nama Aktivitas</label>
                <input placeholder="Contoh: Belajar Math Diskrit" className="w-full p-3.5 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl outline-none focus:border-indigo-500 text-black dark:text-white text-sm" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              
              <div className="bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-500 uppercase mb-1">Mulai Tgl</label>
                    <input type="date" className="w-full p-2.5 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-800 rounded-lg text-black dark:text-white text-xs font-mono" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} />
                  </div>
                  <div className={!newTask.isRoutine ? "opacity-30 pointer-events-none" : ""}>
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-500 uppercase mb-1">Sampai Tgl</label>
                    <input type="date" className="w-full p-2.5 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-800 rounded-lg text-black dark:text-white text-xs font-mono" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input type="checkbox" className="w-4 h-4 accent-red-500" checked={newTask.isRoutine} onChange={e => setNewTask({...newTask, isRoutine: e.target.checked})} />
                  <span className="text-xs font-bold text-black dark:text-white uppercase tracking-tighter">Aktifkan Rentang Rutinitas (Merah)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-500 mb-1 uppercase">Jam Mulai</label>
                  <input type="time" className="w-full p-3 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl text-black dark:text-white text-xs font-mono" value={newTask.startTime} onChange={e => setNewTask({...newTask, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-500 mb-1 uppercase">Jam Selesai</label>
                  <input type="time" className="w-full p-3 bg-gray-50 dark:bg-[#181818] border border-gray-300 dark:border-gray-800 rounded-xl text-black dark:text-white text-xs font-mono" value={newTask.endTime} onChange={e => setNewTask({...newTask, endTime: e.target.value})} />
                </div>
              </div>

              <button onClick={handleAddSchedule} disabled={!newTask.title} className="w-full py-4 font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-lg">
                Tanamkan ke Master Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}