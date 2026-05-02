export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import TransactionInput from '@/components/TransactionInput';
import { BookOpen, ArrowRightLeft, TrendingUp, TrendingDown, Receipt, Wallet, Sparkles, Database } from 'lucide-react';

export default async function LedgerPage() {
  const { data: transactions } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(angka));
  
  const formatTanggal = (tanggalString: string) => {
    const date = new Date(tanggalString);
    const dayMonthYear = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
    return { dayMonthYear, time };
  };

  // MESIN PENDETEKSI WARNA HARGA
  const getTransactionStyle = (trx: any) => {
    const desc = (trx.description || '').toLowerCase();
    const cat = (trx.category || '').toLowerCase();

    let isIncome = false;
    let isTransfer = desc.includes('transfer') || desc.includes('pindah');

    // Paksa jadi pemasukkan jika mengandung unsur gaji
    if (cat === 'gaji' || cat === 'pemasukkan' || desc.includes('gaji') || desc.includes('masuk') || desc.includes('freelance') || desc.includes('pencairan')) {
      isIncome = true;
    }
    // Tapi jika Beli Emas, itu adalah pengeluaran uang dari dompet
    if (desc.includes('beli emas')) {
      isIncome = false;
    }

    if (isTransfer) return { color: 'text-gray-500 dark:text-gray-400', sign: '', icon: <ArrowRightLeft size={14}/> };
    if (isIncome) return { color: 'text-green-600 dark:text-green-500', sign: '+ ', icon: <TrendingUp size={14}/> };
    
    return { color: 'text-red-600 dark:text-red-500', sign: '- ', icon: <TrendingDown size={14}/> };
  };

  const getCategoryBadge = (category: string) => {
    const cat = category?.toUpperCase() || 'LAINNYA';
    if (['GAJI', 'INVESTASI', 'FREELANCE', 'INCOME'].includes(cat)) {
      return <span className="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] uppercase tracking-widest font-bold rounded-md border border-green-200 dark:border-green-900/50">{cat}</span>;
    }

    const colors = [
      'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50',
      'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
      'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/50',
    ];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    return <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md border ${colors[Math.abs(hash) % colors.length]}`}>{cat}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            Ledger & Analytics <BookOpen className="text-blue-600 dark:text-blue-500" size={28} />
          </h2>
          <p className="text-gray-500 mt-1 text-xs md:text-sm">Pantau arus kas harianmu secara presisi.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: UI PENCATAT YANG DIRAMPINGKAN */}
        <div className="lg:col-span-4 xl:col-span-3 sticky top-6">
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Sparkles size={16} /></div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">AI Logger</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Natural Language</p>
              </div>
            </div>
            
            <div className="relative z-10"><TransactionInput /></div>
          </div>
        </div>

        {/* KANAN: TABEL */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)] min-h-[600px]">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#1A1A1A]">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Database size={18} className="text-blue-500" /> Registry</h3>
            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest">{transactions?.length || 0} Records</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="sticky top-0 z-20 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-4 w-32">Waktu</th>
                  <th className="px-5 py-4">Deskripsi</th>
                  <th className="px-5 py-4 w-32">Kategori</th>
                  <th className="px-5 py-4 text-right w-40">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {transactions && transactions.length > 0 ? (
                  transactions.map((trx) => {
                    const { color, sign, icon } = getTransactionStyle(trx);
                    const { dayMonthYear, time } = formatTanggal(trx.created_at);
                    return (
                      <tr key={trx.id} className="hover:bg-blue-50/30 dark:hover:bg-[#1A1A1A]/80 transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">{dayMonthYear}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{time}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{trx.description}</p>
                          <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1.5"><Wallet size={10} className="text-gray-400" /> {trx.wallet || 'Cash'}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">{getCategoryBadge(trx.category)}</td>
                        <td className={`px-5 py-4 text-right whitespace-nowrap`}><div className={`flex items-center justify-end gap-2 font-mono font-black text-sm ${color}`}>{icon} {sign}{formatRupiah(trx.amount)}</div></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="px-6 py-24 text-center text-gray-400">Kosong.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}