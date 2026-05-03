"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, PiggyBank, Flame, AlertTriangle, 
  Target, Utensils, Car, Heart, TrendingUp, Briefcase, Zap,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';

export default function MoneyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<any[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Ambil Kategori Dinamis dari budget_limits milik user ini
    const { data: limitData } = await supabase
      .from('budget_limits')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    // 2. Ambil Transaksi Bulan Ini
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, category')
      .eq('user_id', user.id)
      .gte('created_at', firstDay);

    if (limitData) setLimits(limitData);

    // 3. Kalkulasi Pengeluaran
    const spendingMap: Record<string, number> = {};
    txData?.forEach(tx => {
      // Normalisasi nama kategori agar tidak case-sensitive
      const cat = (tx.category || '').toLowerCase().trim();
      spendingMap[cat] = (spendingMap[cat] || 0) + Number(tx.amount);
    });
    setSpending(spendingMap);

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Mesin Pemberi Warna & Ikon Cerdas berdasarkan Nama
  const getCategoryStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('makan') || n.includes('food') || n.includes('konsumsi')) return { icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-900/50', bar: 'bg-orange-500' };
    if (n.includes('operasional') || n.includes('transport') || n.includes('bensin')) return { icon: Car, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-900/50', bar: 'bg-blue-500' };
    if (n.includes('lifestyle') || n.includes('main') || n.includes('hobi')) return { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-900/50', bar: 'bg-pink-500' };
    if (n.includes('investasi') || n.includes('tabungan') || n.includes('aset')) return { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-900/50', bar: 'bg-emerald-500' };
    if (n.includes('kerja') || n.includes('bisnis') || n.includes('projek')) return { icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-900/50', bar: 'bg-purple-500' };
    if (n.includes('listrik') || n.includes('air') || n.includes('tagihan')) return { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-900/50', bar: 'bg-yellow-500' };
    
    return { icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-900/50', bar: 'bg-indigo-500' };
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(angka));

  if (loading) return <div className="h-64 flex items-center justify-center font-mono text-xs text-gray-500 tracking-widest animate-pulse">ANALYZING CASHFLOW...</div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" /> Money Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Sinkronisasi Dinamis dengan Target Anggaran</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
          <PiggyBank size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">ESTIMATED SAFETY MARGIN ACTIVE</span>
        </div>
      </div>

      {/* ── BUDGET CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {limits.length === 0 ? (
          <div className="col-span-full bg-gray-50 dark:bg-[#1A1A1A] border border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white dark:bg-[#222] rounded-full flex items-center justify-center text-gray-400 mb-4 shadow-sm">
              <Target size={28} />
            </div>
            <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Belum Ada Target Anggaran</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">Anda belum menetapkan batas pengeluaran bulan ini. Silakan atur kategori dan limit Anda terlebih dahulu di menu Recurring Goals.</p>
            {/* Ganti Href di bawah ini sesuai dengan route Recurring Goals Anda */}
            <Link href="/recurring-goals" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
              <PlusCircle size={18} /> Atur Anggaran Sekarang
            </Link>
          </div>
        ) : (
          limits.map((cat) => {
            const limit = cat.limit_amount || 0;
            const spent = spending[cat.name.toLowerCase()] || 0;
            const remaining = limit - spent;
            const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
            const isOver = spent > limit && limit > 0;
            
            const style = getCategoryStyle(cat.name);
            const Icon = style.icon;

            return (
              <div key={cat.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${style.bg} ${style.color} ${style.border} border`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{cat.name}</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Monthly Limit</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold font-mono text-gray-900 dark:text-white text-lg">Rp {limit.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black tabular-nums ${isOver ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {percent}%
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Terpakai</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Sisa Kuota</p>
                      <p className={`text-sm font-bold font-mono ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {remaining < 0 ? '-' : ''}Rp {Math.abs(remaining).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : style.bar}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {isOver && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl animate-in zoom-in-95">
                      <AlertTriangle size={14} className="text-red-500 shrink-0" />
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">System Alert: Limit {cat.name} Terlampaui. Segera evaluasi cashflow.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── ANALYTICS FOOTER ── */}
      <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-500/20 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
              <Flame size={32} className="text-orange-300" />
            </div>
            <div>
              <h4 className="text-lg font-black italic">Architect Discipline Loop</h4>
              <p className="text-xs text-white/70 leading-relaxed max-w-md">Kunci kekayaan bukan pada berapa banyak yang masuk, tapi berapa banyak yang menetap. Disiplin limit adalah pertahanan terbaikmu.</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Status Keuangan</span>
            <span className="px-4 py-1.5 bg-white text-blue-600 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-black/10">STABLE CORE</span>
          </div>
        </div>
      </div>

    </div>
  );
}