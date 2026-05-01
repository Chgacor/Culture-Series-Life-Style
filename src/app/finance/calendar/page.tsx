"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, AlertTriangle, TrendingDown, ArrowRight, Wallet } from 'lucide-react';

// --- KUNCI ANTI-ERROR TYPESCRIPT ---
// Kita buatkan "Cetakan Baku" untuk wujud data Insight-nya
interface InsightData {
  date: string;
  billNames: string;
  predictedBalance: number;
  totalDeduction: number;
}

export default function CalendarFinancePage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [walletsRes, subsRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('subscriptions').select('*')
      ]);
      
      if (walletsRes.data) setWallets(walletsRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  // --- MESIN TIME-TRAVEL (CASH FLOW PREDICTION) ---
  const currentTotalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  
  const today = new Date();
  const upcomingDays = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  let runningBalance = currentTotalBalance;
  const timeline: any[] = [];
  
  // Memasang cetakan InsightData ke variabel agar TypeScript tenang
  let worstDayInsight: InsightData | null = null;

  upcomingDays.forEach(date => {
    const dayDate = date.getDate(); 
    const monthStr = date.toLocaleString('id-ID', { month: 'short' });
    
    const dueBills = subscriptions.filter(sub => sub.billing_date === dayDate);
    
    if (dueBills.length > 0) {
      const totalBillsToday = dueBills.reduce((sum, sub) => sum + Number(sub.amount), 0);
      const billNamesArray = dueBills.map(b => b.name);
      let billNames = billNamesArray.join(', ');
      if (billNamesArray.length > 1) {
        billNames = billNamesArray.slice(0, -1).join(', ') + ' dan ' + billNamesArray[billNamesArray.length - 1];
      }
      
      runningBalance -= totalBillsToday;

      timeline.push({
        date: `${dayDate} ${monthStr}`,
        fullDate: date,
        bills: dueBills,
        totalDeduction: totalBillsToday,
        predictedBalance: runningBalance
      });

      if (!worstDayInsight || totalBillsToday > worstDayInsight.totalDeduction) {
        worstDayInsight = {
          date: `${dayDate} ${monthStr}`,
          billNames: billNames,
          predictedBalance: runningBalance,
          totalDeduction: totalBillsToday
        };
      }
    }
  });

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Menghitung probabilitas masa depan...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Calendar 🗓️</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Prediksi arus kas dan jadwal tagihan otomatis 30 hari ke depan.</p>
      </header>

      {/* --- KARTU PREDIKSI AI (INSIGHT) --- */}
      {worstDayInsight && (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-900/80 dark:to-red-900/80 p-6 lg:p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-center gap-6 transition-transform hover:scale-[1.01] duration-300">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-orange-100 font-medium mb-2 uppercase tracking-wider text-sm">Prediksi Arus Kas (Cash Flow)</h3>
            <p className="text-xl lg:text-2xl font-medium leading-relaxed">
              "Di tanggal <span className="font-bold border-b-2 border-white">{worstDayInsight?.date}</span> nanti, sisa saldomu diprediksi tinggal <span className="font-bold text-yellow-300">{formatRupiah(worstDayInsight?.predictedBalance || 0)}</span> karena ada pemotongan otomatis untuk tagihan <span className="font-bold">{worstDayInsight?.billNames}</span>."
            </p>
          </div>
        </div>
      )}

      {/* --- STATUS SALDO SAAT INI --- */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Wallet size={24}/></div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Likuiditas Hari Ini</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatRupiah(currentTotalBalance)}</p>
          </div>
        </div>
        <ArrowRight className="text-gray-300 dark:text-gray-600 hidden md:block" />
        <div className="text-right hidden md:block">
          <p className="text-sm text-gray-500 dark:text-gray-400">Estimasi Saldo 30 Hari Kedepan</p>
          <p className={`text-2xl font-bold ${runningBalance < currentTotalBalance * 0.5 ? 'text-orange-500' : 'text-green-500'}`}>
            {formatRupiah(runningBalance)}
          </p>
        </div>
      </div>

      {/* --- TIMELINE JADWAL TAGIHAN --- */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <CalendarDays size={20} /> Kalender Tagihan Mendatang
        </h3>
        
        {timeline.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500">
            Aman! Tidak ada tagihan langganan dalam 30 hari ke depan.
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-4 md:ml-6 space-y-8 pb-4">
            {timeline.map((event, index) => (
              <div key={index} className="relative pl-6 md:pl-8">
                {/* Dot Timeline */}
                <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-red-500 border-4 border-white dark:border-[#1E1E1E]"></div>
                
                <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="inline-block px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-lg w-max">
                      🗓️ {event.date}
                    </span>
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <TrendingDown size={16} /> Total Tagihan: <span className="text-red-500 font-bold">{formatRupiah(event.totalDeduction)}</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {event.bills.map((bill: any) => (
                      <div key={bill.id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-[#2A2A2A] p-3 rounded-xl">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{bill.name}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatRupiah(bill.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm flex justify-between items-center text-gray-500">
                    <span>Sisa saldo setelah pemotongan:</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatRupiah(event.predictedBalance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}