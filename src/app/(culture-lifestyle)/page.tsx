"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Terminal, Sparkles, Send, Wallet, Target, Activity, 
  Bot, TrendingDown, BookOpen, Snowflake, ArrowRight, Hammer, Zap
} from 'lucide-react';
import NotificationSystem from '@/components/NotificationSystem';

const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(angka));

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
    if (lastIndex < line.length) parts.push({ content: line.slice(lastIndex), bold: false });

    return (
      <p key={lineIndex} className="m-0 mb-1 last:mb-0">
        {parts.map((part, partIndex) => part.bold ? <strong key={partIndex} className="font-bold text-blue-400">{part.content}</strong> : <span key={partIndex}>{part.content}</span>)}
      </p>
    );
  });
};

const getTransactionInfo = (trx: any) => {
  const desc = (trx.description || '').toLowerCase();
  const cat = (trx.category || '').toLowerCase();
  let isIncome = (cat === 'gaji' || cat === 'pemasukkan' || cat === 'investasi' || desc.includes('gaji') || desc.includes('masuk'));
  let isTransfer = desc.includes('transfer') || desc.includes('pindah');

  if (isTransfer) return { isExpense: false, color: 'text-gray-400', sign: '' };
  if (isIncome) return { isExpense: false, color: 'text-green-500', sign: '+ ' };
  return { isExpense: true, color: 'text-red-500', sign: '- ' };
};

export default function CommandCenterDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalLiquidity: 0, totalLocked: 0, activeWishesCount: 0, activeForgeCount: 0 });
  const [todaySpend, setTodaySpend] = useState(0);
  const [aiStatus, setAiStatus] = useState("Synchronizing core...");
  
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [weeklyTrx, setWeeklyTrx] = useState<any[]>([]);
  const [activeWishes, setActiveWishes] = useState<any[]>([]);
  const [activeForge, setActiveForge] = useState<any[]>([]);
  const [coolingItems, setCoolingItems] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, role: 'ai', text: 'System Online. Gemini connected. Bertanyalah tentang cashflow atau update proyek Anda.' }]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Wallets
    const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', user.id);
    let liquidity = wal ? wal.reduce((s, w) => s + Number(w.balance), 0) : 0;

    // 2. Wishes (Locked)
    const { data: wish } = await supabase.from('wishes').select('*').eq('user_id', user.id).neq('status', 'completed');
    let locked = wish ? wish.reduce((s, w) => s + Number(w.saved_amount), 0) : 0;
    if (wish) setActiveWishes(wish);

    // 3. Forge
    const { data: forge } = await supabase.from('projects_forge').select('*').eq('user_id', user.id).neq('status', 'completed');
    if (forge) setActiveForge(forge);

    // 4. Transactions
    const today = new Date().toISOString().split('T')[0];
    const { data: allTrx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (allTrx) {
      const todayT = allTrx.filter(t => t.created_at.startsWith(today));
      setTodaySpend(todayT.filter(t => getTransactionInfo(t).isExpense).reduce((s, t) => s + Number(t.amount), 0));
      setRecentTrx(todayT);
    }

    // 5. Freezer
    const { data: freezer } = await supabase.from('impulse_carts').select('*').eq('user_id', user.id).eq('status', 'cooling');
    if (freezer) setCoolingItems(freezer);

    // 6. Tasks
    const { data: tasks } = await supabase.from('life_tasks').select('*').eq('user_id', user.id);
    const { data: comp } = await supabase.from('task_completions').select('task_id').eq('user_id', user.id).eq('completed_date', today);
    const completedIds = comp?.map((c: any) => c.task_id) || [];

    if (tasks) {
      const filtered = tasks.filter(t => !t.is_recurring ? t.target_date === today : t.target_date <= today)
                             .map(t => ({ ...t, is_completed: completedIds.includes(t.id) }));
      setTodaySchedule(filtered);
      
      const incomplete = filtered.filter(f => !f.is_completed).length;
      setAiStatus(incomplete > 0 ? `Attention: ${incomplete} tasks pending.` : "System Stable. All clear.");
    }

    setMetrics({ totalLiquidity: liquidity, totalLocked: locked, activeWishesCount: wish?.length || 0, activeForgeCount: forge?.length || 0 }); 
    setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const userText = chatInput.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, userId: user.id, metrics, todayTransactions: recentTrx })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: data.reply || "LLM Offline." }]);
      if (data.reply?.includes("Sistem: ")) fetchDashboardData();
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: "Connection error." }]);
    } finally { setIsTyping(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-mono">SYNCHRONIZING...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">Command Center <Terminal className="hidden sm:block" size={32} /><Terminal className="sm:hidden" size={24} /></h2>
          <p className="text-gray-500 text-[10px] md:text-sm uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> {aiStatus}
          </p>
        </div>
        
        {/* COMPONENT TERPISAH DIPANGGIL DISINI */}
        <NotificationSystem 
          todaySpend={todaySpend} 
          scheduleFiltered={todaySchedule} 
          freezerCount={coolingItems.length} 
        />
      </header>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard label="Liquidity" value={formatRp(metrics.totalLiquidity)} icon={<Wallet size={14}/>} />
        <MetricCard label="Spend" value={formatRp(todaySpend)} icon={<TrendingDown size={14}/>} color="text-red-500" />
        <MetricCard label="Sinking" value={formatRp(metrics.totalLocked)} icon={<Target size={14}/>} />
        <MetricCard label="Forge" value={metrics.activeForgeCount} icon={<Hammer size={14}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* CHAT INTERFACE */}
        <div className="lg:col-span-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden h-[500px] md:h-[600px] flex flex-col shadow-xl">
           <div className="p-4 bg-gray-50 dark:bg-[#1A1A1A] border-b border-gray-100 dark:border-gray-800 font-bold text-sm flex items-center gap-2"><Bot size={18}/> AI Co-Pilot v2.5</div>
           <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-[#1F1F1F] text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-800'}`}>
                    {renderChatText(m.text)}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
           </div>
           <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Tulis instruksi..." className="flex-1 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 md:py-3 text-sm outline-none focus:border-blue-500 transition-all" />
              <button className="bg-blue-600 text-white p-2.5 md:p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Send size={18}/></button>
           </form>
        </div>

        {/* SIDEBAR LOGS */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 md:p-6 h-[280px] overflow-hidden flex flex-col shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BookOpen size={16} className="text-blue-500"/> Recent Ledger</h3>
              <div className="space-y-2.5 flex-1 overflow-y-auto no-scrollbar">
                 {recentTrx.map(t => {
                   const { color, sign } = getTransactionInfo(t);
                   return (
                     <div key={t.id} className="flex justify-between items-center text-xs p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all">
                        <span className="font-bold truncate max-w-[100px] sm:max-w-[150px] dark:text-white">{t.description}</span>
                        <span className={`font-mono font-bold ${color}`}>{sign}{formatRp(t.amount)}</span>
                     </div>
                   );
                 })}
              </div>
           </div>
           
           <div className="bg-indigo-600 rounded-3xl p-6 text-white h-[240px] md:h-[280px] flex flex-col justify-between relative overflow-hidden group shadow-lg shadow-indigo-500/20">
              <Zap className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32" />
              <h3 className="text-xl md:text-2xl font-black italic tracking-tighter">Daily Hub Nexus</h3>
              <p className="text-xs md:text-sm opacity-80 max-w-[200px]">Kamu memiliki {todaySchedule.length} task aktif hari ini. Lakukan eksekusi.</p>
              <a href="/schedule/daily" className="bg-white/10 hover:bg-white/20 border border-white/20 py-3 md:p-4 rounded-2xl text-center font-bold text-sm backdrop-blur-md transition-all">Buka Schedule Nexus →</a>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color = "text-gray-900 dark:text-white" }: any) {
  return (
    <div className="bg-white dark:bg-[#151515] p-4 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
      <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">{icon} {label}</p>
      <p className={`text-lg md:text-xl font-black font-mono truncate ${color}`}>{value}</p>
    </div>
  );
}