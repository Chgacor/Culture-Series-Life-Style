"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarClock, Plus, CreditCard, Trash2, AlertCircle } from 'lucide-react';

export default function RecurringPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Form
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', amount: '', billing_date: 1, wallet_id: '', category: 'Lifestyle' });

  const fetchData = async () => {
    setLoading(true);
    // Tarik data dompet untuk pilihan Dropdown
        const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Filter dompet dengan gembok keamanan user.id
    const { data: walletsData } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id); // <--- KUNCI ANTI-BOCOR

    if (walletsData) {
      setWallets(walletsData);
      // Set default dompet ke dompet pertama milik user tersebut (bukan dompet orang lain)
      if (walletsData.length > 0) {
        setNewSub(prev => ({ ...prev, wallet_id: walletsData[0].id }));
      }
    }

    // Tarik data langganan + nama dompetnya
    const { data: subsData } = await supabase.from('subscriptions').select('*, wallets(name)');
    if (subsData) setSubscriptions(subsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =========================================================================
  // MESIN AUTO-DEDUCTION (NINJA MODE)
  // Berjalan otomatis setiap kali halaman ini dibuka
  // =========================================================================
  useEffect(() => {
    if (subscriptions.length === 0 || wallets.length === 0) return;

    const runAutoDeduction = async () => {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const currentDay = today.getDate();

      for (const sub of subscriptions) {
        // Cek: Apakah hari ini (atau kelewat) tanggal tagihan DAN belum dibayar bulan ini?
        if (currentDay >= sub.billing_date && sub.last_processed_month !== currentMonthStr) {
          console.log(`Menjalankan Auto-Deduction untuk: ${sub.name}`);

          const targetWallet = wallets.find(w => w.id === sub.wallet_id);
          if (!targetWallet) continue;

          // 1. Kurangi Saldo Wallet
          const newBalance = Number(targetWallet.balance) - Number(sub.amount);
          await supabase.from('wallets').update({ balance: newBalance }).eq('id', sub.wallet_id);

          // 2. Catat ke Tabel Transaksi Harian
          await supabase.from('transactions').insert([{
            description: `Auto-Bill: ${sub.name}`,
            amount: Number(sub.amount),
            category: sub.category,
            wallet: targetWallet.name
          }]);

          // 3. Update Status Langganan (Sudah Dibayar Bulan Ini)
          await supabase.from('subscriptions')
            .update({ last_processed_month: currentMonthStr })
            .eq('id', sub.id);
        }
      }
    };

    runAutoDeduction().then(() => fetchData()); // Refresh data setelah pemotongan
  }, [subscriptions.length, wallets.length]); // Hanya berjalan saat data pertama kali dimuat


  // --- Fungsi Tambah Langganan ---
  const handleAddSub = async () => {
    if (!newSub.name || !newSub.amount || !newSub.wallet_id) return;
    
    await supabase.from('subscriptions').insert([{
      name: newSub.name,
      amount: Number(newSub.amount),
      billing_date: Number(newSub.billing_date),
      wallet_id: newSub.wallet_id,
      category: newSub.category
    }]);
    
    setIsAdding(false);
    fetchData();
  };

  // --- Fungsi Hapus Langganan ---
  const handleDelete = async (id: string) => {
    if(confirm("Yakin ingin mencabut langganan ini?")) {
      await supabase.from('subscriptions').delete().eq('id', id);
      fetchData();
    }
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  
  const totalAudit = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0);

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Memuat Sistem Langganan...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recurring Expenses 🔄
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manajemen tagihan otomatis dan audit layanan digital.</p>
        </div>
      </header>

      {/* --- SUBSCRIPTION AUDIT DASHBOARD --- */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-purple-900/80 dark:to-indigo-900/80 border border-transparent dark:border-purple-800 p-8 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-purple-200 text-sm font-medium mb-1 flex items-center gap-2">
              <AlertCircle size={16} /> Subscription Audit (Total Beban Bulanan)
            </p>
            <p className="text-4xl font-bold tracking-tight">{formatRupiah(totalAudit)} <span className="text-base font-normal opacity-80">/ bulan</span></p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-gray-100 font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            {isAdding ? 'Batal' : <><Plus size={18} /> Tambah Layanan</>}
          </button>
        </div>
      </div>

      {/* --- FORM TAMBAH LANGGANAN --- */}
      {isAdding && (
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm transition-colors">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daftarkan Layanan Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Nama (ex: Netflix)</label>
              <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Nominal</label>
              <input type="number" className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={newSub.amount} onChange={e => setNewSub({...newSub, amount: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Tanggal Tagihan</label>
              <select className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={newSub.billing_date} onChange={e => setNewSub({...newSub, billing_date: Number(e.target.value)})}>
                {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>Tgl {i+1}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Sumber Dana</label>
              <select className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={newSub.wallet_id} onChange={e => setNewSub({...newSub, wallet_id: e.target.value})}>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <button onClick={handleAddSub} className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIST LAYANAN AKTIF --- */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Active Subscriptions</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {subscriptions.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">Belum ada layanan yang didaftarkan.</p>
          ) : (
            subscriptions.map(sub => {
              // Cek apakah sudah dibayar bulan ini
              const today = new Date();
              const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
              const isPaid = sub.last_processed_month === currentMonthStr;

              return (
                <div key={sub.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/50 transition-colors">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                      <CalendarClock size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{sub.name}</h4>
                      <div className="flex items-center gap-3 text-xs mt-1 font-medium">
                        <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                          🗓️ Tgl {sub.billing_date}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <CreditCard size={12}/> {sub.wallets?.name || 'Unknown Wallet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{formatRupiah(sub.amount)}</p>
                      <p className={`text-xs font-semibold ${isPaid ? 'text-green-500' : 'text-orange-500'}`}>
                        {isPaid ? '✅ Lunas Bulan Ini' : '⏳ Menunggu Tanggal'}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}