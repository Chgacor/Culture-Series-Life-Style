"use client";

import { useEffect, useState, useRef, type PointerEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Terminal, Sparkles, Send, Layers, Wallet, Target, Activity, 
  ChevronRight, Bot, User, TrendingDown, BookOpen, Snowflake, ArrowRight, ArrowRightLeft, TrendingUp, Hammer
} from 'lucide-react';

const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(angka));

const renderChatText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const parts: Array<{ content: string; bold: boolean }> = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ content: line.slice(lastIndex, match.index), bold: false });
      }
      parts.push({ content: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push({ content: line.slice(lastIndex), bold: false });
    }

    return (
      <p key={lineIndex} className="m-0 mb-1 last:mb-0">
        {parts.map((part, partIndex) =>
          part.bold ? (
            <strong key={partIndex} className="font-bold text-blue-100">{part.content}</strong>
          ) : (
            <span key={partIndex}>{part.content}</span>
          )
        )}
      </p>
    );
  });
};

const getTransactionInfo = (trx: any) => {
  const desc = (trx.description || '').toLowerCase();
  const cat = (trx.category || '').toLowerCase();

  let isIncome = false;
  let isTransfer = desc.includes('transfer') || desc.includes('pindah') || desc.includes('alokasi');

  if (cat === 'gaji' || cat === 'pemasukkan' || cat === 'investasi' || desc.includes('gaji') || desc.includes('masuk') || desc.includes('freelance') || desc.includes('pencairan')) {
    isIncome = true;
  }
  if (desc.includes('beli emas')) {
    isIncome = false;
  }

  if (isTransfer) return { isExpense: false, color: 'text-gray-500 dark:text-gray-400', sign: '' };
  if (isIncome) return { isExpense: false, color: 'text-green-600 dark:text-green-500', sign: '+ ' };
  
  return { isExpense: true, color: 'text-red-600 dark:text-red-500', sign: '- ' };
};

export default function CommandCenterDashboard() {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({ totalLiquidity: 0, totalLocked: 0, activeWishesCount: 0, activeForgeCount: 0 });
  const [todaySpend, setTodaySpend] = useState(0);
  const [aiStatus, setAiStatus] = useState("Menyinkronkan metrik...");
  
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [weeklyTrx, setWeeklyTrx] = useState<any[]>([]);
  const [activeWishes, setActiveWishes] = useState<any[]>([]);
  const [activeForge, setActiveForge] = useState<any[]>([]);
  const [coolingItems, setCoolingItems] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, role: 'ai', text: 'System Online. AI Model "Gemini" tersambung. Anda bisa bertanya tentang pengeluaran minggu ini, status proyek, atau suruh saya mencatat pengeluaran Anda langsung dari sini.' }]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, scrollTop: 0, dragging: false });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const { data: wal } = await supabase.from('wallets').select('balance');
    let liquidity = wal ? wal.reduce((s, w) => s + Number(w.balance), 0) : 0;

    const { data: wish } = await supabase.from('wishes').select('*').neq('status', 'completed').order('created_at', { ascending: false });
    let locked = 0, wCount = 0;
    if (wish) {
      wCount = wish.length;
      locked = wish.reduce((s, w) => s + Number(w.saved_amount), 0);
      setActiveWishes(wish); 
    }

    const { data: forge } = await supabase.from('projects_forge').select('*').neq('status', 'completed').order('created_at', { ascending: false });
    let fCount = forge ? forge.length : 0;
    if (forge) setActiveForge(forge);

    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isoSevenDays = sevenDaysAgo.toISOString().split('T')[0];

    let spendToday = 0;
    const { data: allTrx } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (allTrx) {
      const todayT = allTrx.filter(t => t.created_at.startsWith(isoToday));
      spendToday = todayT.filter(t => getTransactionInfo(t).isExpense).reduce((s, t) => s + Number(t.amount), 0);
      
      setTodaySpend(spendToday);
      setRecentTrx(todayT); 
      setWeeklyTrx(allTrx.filter(t => t.created_at >= isoSevenDays && getTransactionInfo(t).isExpense));
    }

    const { data: freezer } = await supabase.from('impulse_carts').select('*').eq('status', 'cooling');
    if (freezer) setCoolingItems(freezer);

    const { data: allTasks } = await supabase.from('life_tasks').select('*').order('start_time', { ascending: true });
    const { data: compData } = await supabase.from('task_completions').select('task_id').eq('completed_date', isoToday);
    const completedIds = compData?.map((c: any) => c.task_id) || [];
    let scheduleFiltered: any[] = [];

    if (allTasks) {
      scheduleFiltered = allTasks.filter((task: any) => {
        if (!task.is_recurring) return task.target_date === isoToday;
        const startsOnOrBefore = task.target_date <= isoToday;
        const notEnded = !task.recurrence_end_date || task.recurrence_end_date >= isoToday;
        return startsOnOrBefore && notEnded;
      }).map((task: any) => ({
        ...task,
        is_completed: task.is_recurring ? completedIds.includes(task.id) : task.is_completed
      }));
      setTodaySchedule(scheduleFiltered);
    }

    // AI PROACTIVE STATUS LOGIC
    if (spendToday > 500000) {
      setAiStatus("Peringatan: Pengeluaran hari ini menembus batas kewajaran. Hindari impulse buying.");
    } else if (scheduleFiltered.length > 0 && completedIds.length === 0) {
      setAiStatus("Intellectual Alert: Belum ada jadwal yang diselesaikan. Inisiasi Forge sekarang.");
    } else if (scheduleFiltered.length > 0 && completedIds.length === scheduleFiltered.length) {
      setAiStatus("Optimal: Seluruh jadwal hari ini telah dituntaskan. Excellent work, Boss.");
    } else {
      setAiStatus("Sistem stabil. Arus kas dan rutinitas dalam kendali.");
    }

    setMetrics({ totalLiquidity: liquidity, totalLocked: locked, activeWishesCount: wCount, activeForgeCount: fCount }); 
    setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          metrics, 
          todayTransactions: recentTrx,
          weeklyTransactions: weeklyTrx,
          activeProjects: activeWishes,
          forgeProjects: activeForge,
          todaySchedule
        })
      });
      const data = await response.json();
      const aiResponse = data.reply || "Mohon maaf, sirkuit LLM tidak merespons.";
      
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: aiResponse }]);
      
      if (aiResponse.includes("Sistem: ")) fetchDashboardData();
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: "Koneksi LLM terputus. Periksa jaringan." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePromptClick = (prompt: string) => { setChatInput(prompt); };

  const handleChatPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current) return;
    dragStartRef.current = { y: event.clientY, scrollTop: chatContainerRef.current.scrollTop, dragging: true };
    chatContainerRef.current.setPointerCapture(event.pointerId);
  };

  const handleChatPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current || !dragStartRef.current.dragging) return;
    const deltaY = event.clientY - dragStartRef.current.y;
    chatContainerRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY;
  };

  const handleChatPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current) return;
    dragStartRef.current.dragging = false;
    chatContainerRef.current.releasePointerCapture(event.pointerId);
  };

  const handleChatPointerLeave = () => { dragStartRef.current.dragging = false; };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 font-mono">SYNCHRONIZING CORE...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 relative">
      
      <header>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          Command Center <Terminal className="text-blue-600 dark:text-blue-500" size={32} />
        </h2>
        <p className="text-gray-500 mt-2 text-sm">Total Life Command. Menyeimbangkan disiplin finansial & intelektual.</p>
      </header>

      {/* ROW 1: TOP METRICS (UPDATED DENGAN FORGE COUNT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#151515] p-5 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wallet size={12}/> Liquid Cash</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white font-mono">{formatRp(metrics.totalLiquidity)}</p>
        </div>
        <div className="bg-white dark:bg-[#151515] p-5 md:p-6 rounded-3xl border border-red-100 dark:border-gray-800 shadow-sm border-b-4 border-b-red-500 transition-colors">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingDown size={12}/> Today Spend</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white font-mono">{formatRp(todaySpend)}</p>
        </div>
        <div className="bg-white dark:bg-[#151515] p-5 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Target size={12}/> Sinking Funds</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white font-mono">{formatRp(metrics.totalLocked)}</p>
        </div>
        <div className="bg-white dark:bg-[#151515] p-5 md:p-6 rounded-3xl border border-orange-100 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Hammer size={12}/> Intellect Quota</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white font-mono">{metrics.activeForgeCount} <span className="text-xs md:text-sm font-sans font-normal text-gray-500">Blueprints</span></p>
        </div>
      </div>

      {/* ROW 2: BENTO BOX GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:h-[650px]">
        
        {/* COL 1: AI CO-PILOT WITH PROACTIVE STATUS */}
        <div className="flex flex-col bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden relative h-[600px] lg:h-full">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#181818] flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm"><Sparkles size={16}/></div>
               <h3 className="font-bold text-sm text-gray-900 dark:text-white">AI Co-Pilot</h3>
             </div>
          </div>
          
          {/* AI STOIC HEADER */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 p-3 px-5 shrink-0 flex items-start gap-3">
             <Activity size={14} className={`mt-0.5 ${todaySpend > 500000 ? 'text-red-500' : 'text-blue-500'}`} />
             <p className={`text-[11px] font-medium leading-relaxed ${todaySpend > 500000 ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}>
               {aiStatus}
             </p>
          </div>

          <div
            ref={chatContainerRef}
            onPointerDown={handleChatPointerDown}
            onPointerMove={handleChatPointerMove}
            onPointerUp={handleChatPointerUp}
            onPointerLeave={handleChatPointerLeave}
            className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 no-scrollbar cursor-grab active:cursor-grabbing"
          >
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-md' : 'bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'}`}>
                  {renderChatText(m.text || '')}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-xs text-gray-500 animate-pulse font-mono flex items-center gap-2"><Bot size={14}/> Menghitung arsitektur logika...</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="px-4 pb-3 flex flex-wrap gap-2 overflow-x-hidden no-scrollbar z-10 bg-white dark:bg-[#151515] shrink-0">
            <button onClick={() => handlePromptClick("Berapa total pengeluaran saya minggu ini?")} className="px-3 py-1.5 bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-300 transition-colors">📊 Cek Pengeluaran</button>
            <button onClick={() => handlePromptClick("Catat saya baru beli makan siang 35.000")} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full text-[11px] font-medium text-green-700 dark:text-green-400 transition-colors">💸 Input Transaksi</button>
            {todaySchedule.length > 0 && (
              <button onClick={() => handlePromptClick("Tolong bacakan jadwal harian saya hari ini dan evaluasi target The Forge saya.")} className="px-3 py-1.5 bg-sky-50 dark:bg-sky-900/15 hover:bg-sky-100 dark:hover:bg-sky-800 border border-sky-200 dark:border-sky-800 rounded-full text-[11px] font-medium text-sky-700 dark:text-sky-200 transition-colors">📅 Evaluasi Jadwal</button>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#121212] shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                className="flex-1 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white transition-colors shadow-inner"
                placeholder="Ketik instruksi atau curhat blocker..."
                value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isTyping}
              />
              <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shrink-0 shadow-md"><Send size={16}/></button>
            </form>
          </div>
        </div>

        {/* COL 2: LEDGER & FREEZER */}
        <div className="flex flex-col gap-6 lg:h-full">
          <div className="flex-1 min-h-[250px] bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col transition-colors overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2"><BookOpen size={16} className="text-blue-500"/> Recent Ledger</h3>
              <a href="/finance/ledger" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">View All</a>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
              {recentTrx.slice(0, 5).map(trx => {
                const { color, sign } = getTransactionInfo(trx);
                return (
                  <div key={trx.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800/80 rounded-xl transition-colors">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{trx.description}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{trx.wallet}</p>
                    </div>
                    <p className={`text-xs font-mono font-bold shrink-0 ${color}`}>
                      {sign}{formatRp(trx.amount)}
                    </p>
                  </div>
                );
              })}
              {recentTrx.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Belum ada transaksi</p>}
            </div>
          </div>

          <div className="flex-1 min-h-[250px] bg-cyan-50 dark:bg-[#12181F] border border-cyan-100 dark:border-cyan-900/30 rounded-3xl p-6 shadow-sm flex flex-col transition-colors overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-cyan-900 dark:text-cyan-400 text-sm flex items-center gap-2"><Snowflake size={16}/> The Freezer</h3>
              <span className="text-[10px] font-bold bg-cyan-200 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded">{coolingItems.length}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
              {coolingItems.slice(0,3).map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-[#1A1E24] border border-cyan-100 dark:border-cyan-900/50 rounded-xl shadow-sm transition-colors">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.item_name}</p>
                    <p className="text-[9px] font-bold text-red-500 mt-0.5 uppercase tracking-wider">{item.priority}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-500 shrink-0">{formatRp(item.price)}</p>
                </div>
              ))}
              {coolingItems.length === 0 && <p className="text-xs text-cyan-700 dark:text-cyan-600 text-center py-4">Freezer kosong, bagus!</p>}
            </div>
          </div>
        </div>

        {/* COL 3: UNIFIED BLUEPRINTS & SCHEDULE */}
        <div className="flex flex-col gap-6 lg:h-full">
          
          {/* UNIFIED BLUEPRINTS (WISH + FORGE) */}
          <div className="flex-1 min-h-[250px] bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col transition-colors overflow-hidden">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2"><Target size={16} className="text-gray-500"/> Strategic Blueprints</h3>
            </div>
            
            <div className="space-y-5 flex-1 overflow-y-auto no-scrollbar">
              {/* RENDER TOP WISH (FINANCIAL) */}
              {activeWishes.slice(0,1).map(wish => {
                const wishSubtotal = wish.items.reduce((acc: number, item: any) => acc + (item.price * item.qty), 0);
                const currentTargetFund = wish.is_credit ? (wishSubtotal * 1.10) * ((wish.dp_percentage || 100) / 100) : (wishSubtotal * 1.10);
                const pct = Math.min((wish.saved_amount / currentTargetFund) * 100, 100) || 0;

                return (
                  <div key={`w-${wish.id}`}>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-0.5">FINANCIAL</span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2">{wish.title}</p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* RENDER TOP FORGE (INTELLECTUAL) */}
              {activeForge.slice(0,2).map(proj => {
                const pct = Math.min(((proj.current_hours / proj.target_hours) * 100), 100) || 0;
                return (
                  <div key={`f-${proj.id}`}>
                    <div className="flex justify-between items-end mb-2">
                       <div className="flex flex-col">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5">INTELLECTUAL</span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2">{proj.title}</p>
                      </div>
                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {activeWishes.length === 0 && activeForge.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Belum ada target strategis aktif.</p>}
            </div>
          </div>

          {/* SCHEDULE SYSTEM CORE */}
          <div className="flex-1 min-h-[250px] bg-gradient-to-br from-indigo-600 to-blue-700 border border-blue-600 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={12}/> Schedule Engine</p>
                <h3 className="text-2xl font-black mb-2 leading-tight">Daily Hub<br/>Nexus</h3>
                <p className="text-sm text-blue-100/90 mb-6 line-clamp-3">
                  Kamu memiliki <strong className="text-white bg-blue-900/30 px-1 rounded">{todaySchedule.length}</strong> task hari ini. Buka untuk eksekusi Flow State.
                </p>
              </div>
              <a href="/schedule/daily" className="w-full py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm font-bold rounded-xl text-sm flex justify-center items-center gap-2 transition-all">
                Buka Schedule <ArrowRight size={16}/>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}