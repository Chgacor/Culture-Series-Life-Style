"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BookOpenCheck, Edit2, Check, X, Plus, AlertCircle, Trash2, CalendarDays, Filter } from 'lucide-react';

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER WAKTU ---
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // State CRUD Anggaran
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', limit_amount: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    const [txRes, limitRes] = await Promise.all([
      supabase.from('transactions').select('*'),
      supabase.from('budget_limits').select('*').order('name')
    ]);
    if (txRes.data) setTransactions(txRes.data);
    if (limitRes.data) setBudgetLimits(limitRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- ENGINE: PERHITUNGAN RENTANG WAKTU DINAMIS & MULTIPLIER ANGGARAN ---
  const { currentPeriod, prevPeriod, limitMultiplier } = useMemo(() => {
    const now = new Date();
    let start = new Date(now), end = new Date(now);
    let prevStart = new Date(now), prevEnd = new Date(now);
    let multiplier = 1; // Default 1 (Bulanan)

    if (timeFilter === 'today') {
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
      prevStart.setDate(start.getDate() - 1); prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(end.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
      multiplier = 1 / 30; // Jatah 1 Hari
    } 
    else if (timeFilter === 'week') {
      const day = now.getDay() || 7; 
      start.setDate(now.getDate() - day + 1); start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      prevStart.setDate(start.getDate() - 7); prevEnd.setDate(end.getDate() - 7);
      multiplier = 7 / 30; // Jatah 1 Minggu
    } 
    else if (timeFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      multiplier = 1; // Full Bulanan
    } 
    else if (timeFilter === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      multiplier = 12; // Jatah 1 Tahun
    } 
    else if (timeFilter === 'custom') {
      start = new Date(customDates.start); start.setHours(0, 0, 0, 0);
      end = new Date(customDates.end); end.setHours(23, 59, 59, 999);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffTime);
      
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      multiplier = diffDays / 30; // Proporsional berdasarkan rentang hari
    }

    return { 
      currentPeriod: { start, end }, 
      prevPeriod: { start: prevStart, end: prevEnd },
      limitMultiplier: multiplier
    };
  }, [timeFilter, customDates]);

  // --- FILTER TRANSAKSI BERDASARKAN WAKTU ---
  const currentData = transactions.filter(t => {
    const d = new Date(t.created_at);
    const isIncome = t.category?.toLowerCase().includes('gaji') || t.description?.toLowerCase().includes('freelance');
    return d >= currentPeriod.start && d <= currentPeriod.end && !isIncome;
  });

  const prevData = transactions.filter(t => {
    const d = new Date(t.created_at);
    const isIncome = t.category?.toLowerCase().includes('gaji') || t.description?.toLowerCase().includes('freelance');
    return d >= prevPeriod.start && d <= prevPeriod.end && !isIncome;
  });

  const currentTotal = currentData.reduce((sum, t) => sum + Number(t.amount), 0);
  const prevTotal = prevData.reduce((sum, t) => sum + Number(t.amount), 0);
  const diff = currentTotal - prevTotal;
  const diffPercentage = prevTotal === 0 ? 0 : (diff / prevTotal) * 100;
  const isBoros = diff > 0;

  // --- LOGIKA HEATMAP ---
  const categoryTotals = currentData.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(categoryTotals).map(key => ({
    name: key || 'Lainnya',
    value: categoryTotals[key]
  }));

  const DYNAMIC_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#10b981', '#f43f5e', '#eab308', '#06b6d4'];
  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(angka));

  // --- FUNGSI CRUD ANGGARAN ---
  const handleUpdateLimit = async (id: string) => {
    if (!editLimit) return;
    await supabase.from('budget_limits').update({ limit_amount: Number(editLimit) }).eq('id', id);
    setEditingId(null); setEditLimit(''); fetchData();
  };

  const handleAddCategory = async () => {
    if (!newCat.name || !newCat.limit_amount) return;
    await supabase.from('budget_limits').insert([{
      name: newCat.name, limit_amount: Number(newCat.limit_amount), description: newCat.description
    }]);
    setIsAdding(false); setNewCat({ name: '', limit_amount: '', description: '' }); fetchData();
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if(confirm(`Hapus kategori "${name}"? Transaksi lama tetap ada, tapi batas ini akan hilang.`)) {
      await supabase.from('budget_limits').delete().eq('id', id);
      fetchData();
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-mono">Merakit visualisasi data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
      
      {/* HEADER & FILTER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Financial Analytics 📊</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Evaluasi arus kas dan manajemen kategori pengeluaranmu.</p>
        </div>
        
        {/* TIME ENGINE FILTER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 dark:bg-[#1A1A1A] p-2 rounded-xl border border-gray-200 dark:border-gray-800 w-full md:w-auto">
          <div className="flex items-center gap-2 text-gray-500 px-2">
            <Filter size={16} />
          </div>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer pr-4"
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
            <option value="custom">Pilih Tanggal...</option>
          </select>

          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-300 dark:border-gray-700">
              <input type="date" value={customDates.start} onChange={(e) => setCustomDates({...customDates, start: e.target.value})} className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customDates.end} onChange={(e) => setCustomDates({...customDates, end: e.target.value})} className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none" />
            </div>
          )}
        </div>
      </header>

      {/* GRID ATAS: RECAP & KAMUS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 lg:col-span-8 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl transition-colors duration-300 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10"><CalendarDays size={120} /></div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Pengeluaran Periode Ini vs Sebelumnya</h3>
            <div className="flex flex-wrap items-end gap-4">
              <p className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white font-mono">{formatRupiah(currentTotal)}</p>
              <div className={`flex items-center gap-1 text-sm md:text-lg font-black mb-1 px-3 py-1 rounded-lg border ${isBoros ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-500 dark:border-red-900/50' : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-500 dark:border-green-900/50'}`}>
                {isBoros ? '▲' : '▼'} {Math.abs(diffPercentage).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              {isBoros 
                ? <span className="font-medium text-red-500">Awas! Kamu lebih boros {formatRupiah(Math.abs(diff))}</span>
                : <span className="font-medium text-green-500">Bagus! Kamu berhemat {formatRupiah(Math.abs(diff))}</span>
              } dibandingkan periode sebelumnya ({formatRupiah(prevTotal)}).
            </p>
          </div>
        </div>

        <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-64 md:h-full transition-colors duration-300">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1A]">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><BookOpenCheck size={16} className="text-blue-500"/> Kamus Kategori</h3>
          </div>
          <div className="overflow-y-auto p-5 space-y-4 flex-1 no-scrollbar">
            {budgetLimits.length === 0 ? <p className="text-xs text-gray-500 italic">Belum ada kategori terdaftar.</p> : budgetLimits.map((cat, idx) => (
              <div key={cat.id} className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0 shadow-sm" style={{ backgroundColor: DYNAMIC_COLORS[idx % DYNAMIC_COLORS.length] }}></div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{cat.name}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{cat.description || 'Tidak ada deskripsi.'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRID BAWAH: HEATMAP & THRESHOLD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* Spending Heatmap */}
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl transition-colors duration-300 flex flex-col">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wider mb-6">Spending Heatmap</h3>
          {chartData.length > 0 ? (
            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DYNAMIC_COLORS[index % DYNAMIC_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [formatRupiah(Number(value)), name]} contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 min-h-[250px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-500">Tidak ada pengeluaran di periode ini.</p>
            </div>
          )}
        </div>

        {/* Dynamic Threshold Limit */}
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl transition-colors duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wider">Budget Threshold Limit</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Proporsional Berdasarkan Waktu</p>
            </div>
            <button onClick={() => setIsAdding(!isAdding)} className="text-xs font-bold flex items-center gap-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              {isAdding ? <X size={14}/> : <Plus size={14}/>} {isAdding ? 'Batal' : 'Kategori'}
            </button>
          </div>

          {/* Form Tambah Kategori */}
          {isAdding && (
            <div className="mb-6 p-5 bg-gray-50 dark:bg-[#1A1A1A] rounded-2xl space-y-4 border border-gray-200 dark:border-gray-800">
              <input type="text" placeholder="Nama Kategori (ex: Konsumsi)" className="w-full p-3 text-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
              <input type="number" placeholder="Anggaran 1 Bulan Penuh (Rp)" className="w-full p-3 text-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 font-mono" value={newCat.limit_amount} onChange={e => setNewCat({...newCat, limit_amount: e.target.value})} />
              <input type="text" placeholder="Deskripsi Singkat" className="w-full p-3 text-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500" value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} />
              <button onClick={handleAddCategory} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl text-sm font-bold transition-colors">Simpan Kategori Baru</button>
            </div>
          )}

          <div className="space-y-6 overflow-y-auto pr-2 flex-1 no-scrollbar min-h-[250px]">
            {budgetLimits.length === 0 ? (
               <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                 <p className="text-sm text-gray-500">Belum ada pengaturan Threshold Limit.</p>
               </div>
            ) : budgetLimits.map(cat => {
              const spent = categoryTotals[cat.name] || 0;
              
              // ENGINE: PERHITUNGAN PROPORSIONAL
              // Mengubah target (Anggaran 1 Bulan) sesuai filter yang dipilih
              const baseLimit = cat.limit_amount; // Uang sebulan (ex: 3.000.000)
              const dynamicLimit = Math.round(baseLimit * limitMultiplier); // Hari ini = 100.000
              
              const percentage = dynamicLimit === 0 ? 0 : Math.min((spent / dynamicLimit) * 100, 100);
              const barColor = percentage > 80 ? 'from-red-500 to-rose-500' : percentage > 50 ? 'from-yellow-400 to-orange-500' : 'from-green-400 to-emerald-500';
              const isEditing = editingId === cat.id;

              return (
                <div key={cat.id} className="group p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800/80 rounded-2xl transition-colors hover:border-gray-300 dark:hover:border-gray-700">
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {cat.name}
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 size={14}/></button>
                    </span>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        {/* Saat Edit, tetap mengedit nilai Basis 1 Bulan Penuh agar tidak bingung */}
                        <input type="number" autoFocus placeholder="Budget 1 Bulan" className="w-24 p-1.5 text-xs border rounded-lg bg-white dark:bg-[#121212] border-gray-200 dark:border-gray-700 outline-none font-mono" value={editLimit} onChange={e => setEditLimit(e.target.value)} />
                        <button onClick={() => handleUpdateLimit(cat.id)} className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-lg hover:bg-green-200 transition-colors"><Check size={14}/></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-200 transition-colors"><X size={14}/></button>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 text-xs font-mono font-bold flex items-center gap-2">
                        {formatRupiah(spent)} / {formatRupiah(dynamicLimit)}
                        <button onClick={() => { setEditingId(cat.id); setEditLimit(cat.limit_amount.toString()); }} className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity" title="Edit Budget Bulanan Utama"><Edit2 size={14}/></button>
                      </span>
                    )}
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-[#121212] rounded-full h-3 overflow-hidden shadow-inner">
                    <div className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  {percentage > 80 && <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={12}/> Critical Threshold Reached</p>}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}