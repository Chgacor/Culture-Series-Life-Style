"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, Landmark, Smartphone, Plus, 
  ArrowRightLeft, Target, Rocket, CheckCircle2, X, Lock,
  TrendingUp, TrendingDown, Coins, HandCoins, AlertCircle, CalendarDays,
  AlertTriangle, ShieldAlert, ArrowDownToLine, FileText
} from 'lucide-react';

const formatRp = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const formatTanggal = (tanggal: string) => {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(tanggal));
};

export default function AssetsAndWalletsPage() {
  const [loading, setLoading] = useState(true);

  // ==========================================
  // CUSTOM GLOBAL MODAL
  // ==========================================
  const [modal, setModal] = useState({
    isOpen: false, type: 'alert' as 'alert' | 'confirm', title: '', message: '',
    confirmText: 'Konfirmasi', cancelText: 'Batal',
    onConfirm: () => {}, onCancel: () => setModal(prev => ({ ...prev, isOpen: false }))
  });

  // ==========================================
  // STATE DOMPET, PROYEK & EMAS
  // ==========================================
  const [wallets, setWallets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [goldAssets, setGoldAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState({ buy: 0, sell: 0 });

  // STATE MODALS KHUSUS
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocation, setAllocation] = useState({ sourceWalletId: '', targetProjectId: '', amount: '' });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ fromWalletId: '', toWalletId: '', amount: '' });

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeData, setIncomeData] = useState({ walletId: '', amount: '', description: '', category: 'Gaji' });

  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: '', type: 'bank', balance: '' });

  const [isAddingGold, setIsAddingGold] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [newGold, setNewGold] = useState({ grams: '', purchase_date: new Date().toISOString().split('T')[0], buy_price_per_gram: '' });

  // ==========================================
  // FETCH ALL DATA (MASTER SYNC)
  // ==========================================
  const fetchAllData = async () => {
    setLoading(true);
    
      // Pastikan Anda sudah mendeklarasikan 'user' di baris atas fungsi ini:
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: walletData } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id) // <--- Kunci akses dompet
    .order('type', { ascending: true });
  if (walletData) setWallets(walletData);

  const { data: projectData } = await supabase
    .from('wishes')
    .select('*')
    .eq('user_id', user.id) // <--- Kunci akses proyek/wishlist
    .order('created_at', { ascending: false });
  if (projectData) setProjects(projectData.filter(p => p.saved_amount < p.target_fund));

  const { data: goldData } = await supabase
    .from('gold_assets')
    .select('*')
    .eq('user_id', user.id) // <--- Kunci akses aset emas
    .order('created_at', { ascending: false });
  if (goldData) setGoldAssets(goldData);

    try {
      const priceRes = await fetch('/api/gold-price');
      const priceData = await priceRes.json();
      setPrices({ buy: priceData.buy_price || 0, sell: priceData.sell_price || 0 });
    } catch (err) {
      setPrices({ buy: 0, sell: 0 });
    }

    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- ENGINE: HISTORICAL GOLD PRICE FETCH ---
  useEffect(() => {
    const fetchHistoricalPrice = async (date: string) => {
      setIsFetchingPrice(true);
      try {
        const res = await fetch(`/api/gold-history?date=${date}`);
        const data = await res.json();
        setNewGold(prev => ({ ...prev, buy_price_per_gram: data.price_per_gram ? data.price_per_gram.toString() : '' }));
      } catch (err) {
        console.error("Gagal mendapatkan harga historis");
      } finally {
        setIsFetchingPrice(false);
      }
    };
    if (newGold.purchase_date && isAddingGold) fetchHistoricalPrice(newGold.purchase_date);
  }, [newGold.purchase_date, isAddingGold]);

  // ==========================================
  // ENGINE: ACTIONS
  // ==========================================
  
  // 1. TAMBAH PEMASUKKAN (SYNC TO LEDGER)
  const handleAddIncome = async () => {
    const incomeAmount = Number(incomeData.amount);
    if (!incomeData.walletId || incomeAmount <= 0 || !incomeData.description) {
      return alert("Mohon lengkapi dompet tujuan, nominal, dan deskripsi pemasukkan!");
    }

    const targetWallet = wallets.find(w => w.id === incomeData.walletId);

    // Update Saldo Wallets
    await supabase.from('wallets').update({ balance: Number(targetWallet.balance) + incomeAmount }).eq('id', incomeData.walletId);
    
    // Insert Log to Transactions (Untuk Ledger Harian)
    await supabase.from('transactions').insert([{
      description: incomeData.description,
      amount: incomeAmount,
      category: incomeData.category,
      wallet: targetWallet.name
      // Note: Jika di DB mu butuh kolom 'type' = 'income', tambahkan di sini. 
      // Asumsi berdasarkan log emas sebelumnya, kamu menggunakan amount positif sebagai penanda masuk.
    }]);

    setShowIncomeModal(false);
    setIncomeData({ walletId: '', amount: '', description: '', category: 'Gaji' });
    fetchAllData();
  };

  // 2. TAMBAH AKUN DOMPET BARU
  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.type) return alert("Mohon isi nama dan jenis dompet!");
    
    await supabase.from('wallets').insert([{
      name: newWallet.name,
      type: newWallet.type,
      balance: Number(newWallet.balance) || 0
    }]);

    setShowAddWalletModal(false);
    setNewWallet({ name: '', type: 'bank', balance: '' });
    fetchAllData();
  };

  // 3. ALOKASI UANG KE PROYEK
  const handleAllocateFunds = async () => {
    const transferAmount = Number(allocation.amount);
    if (!allocation.sourceWalletId || !allocation.targetProjectId || transferAmount <= 0) return;

    const sourceWallet = wallets.find(w => w.id === allocation.sourceWalletId);
    if (sourceWallet.balance < transferAmount) return alert("Saldo tidak mencukupi!");

    const targetProject = projects.find(p => p.id === allocation.targetProjectId);

    await supabase.from('wallets').update({ balance: sourceWallet.balance - transferAmount }).eq('id', allocation.sourceWalletId);
    await supabase.from('wishes').update({ saved_amount: targetProject.saved_amount + transferAmount }).eq('id', allocation.targetProjectId);

    setShowAllocateModal(false);
    setAllocation({ sourceWalletId: '', targetProjectId: '', amount: '' });
    fetchAllData();
  };

  // 3.5 TRANSFER ANTAR DOMPET
  const handleTransferWallets = async () => {
    const amount = Number(transferData.amount);
    if (!transferData.fromWalletId || !transferData.toWalletId || amount <= 0) {
      return alert('Mohon isi dompet sumber, dompet tujuan, dan nominal yang valid.');
    }
    if (transferData.fromWalletId === transferData.toWalletId) {
      return alert('Sumber dan tujuan tidak boleh sama.');
    }

    const sourceWallet = wallets.find(w => w.id === transferData.fromWalletId);
    const targetWallet = wallets.find(w => w.id === transferData.toWalletId);
    if (!sourceWallet || !targetWallet) {
      return alert('Dompet tidak ditemukan.');
    }
    if (Number(sourceWallet.balance) < amount) {
      return alert(`Saldo ${sourceWallet.name} tidak cukup.`);
    }

    await supabase.from('wallets').update({ balance: Number(sourceWallet.balance) - amount }).eq('id', sourceWallet.id);
    await supabase.from('wallets').update({ balance: Number(targetWallet.balance) + amount }).eq('id', targetWallet.id);
    await supabase.from('transactions').insert([{
      description: `Transfer antar dompet: ${sourceWallet.name} → ${targetWallet.name}`,
      amount,
      category: 'Transfer',
      wallet: sourceWallet.name
    }]);

    setShowTransferModal(false);
    setTransferData({ fromWalletId: '', toWalletId: '', amount: '' });
    fetchAllData();
  };

  // 4. TAMBAH EMAS & JUAL EMAS
  const handleAddGold = async () => {
    if (!newGold.grams || !newGold.buy_price_per_gram) return;
    await supabase.from('gold_assets').insert([{
      grams: Number(newGold.grams), buy_price_per_gram: Number(newGold.buy_price_per_gram),
      purchase_date: newGold.purchase_date, description: 'Pembelian Emas Historis'
    }]);
    setIsAddingGold(false);
    setNewGold({ grams: '', purchase_date: new Date().toISOString().split('T')[0], buy_price_per_gram: '' });
    fetchAllData();
  };

  const executeSellGold = async (id: string, estimasiCair: number, grams: number) => {
    let targetWallet = wallets.find(w => w.type.toLowerCase() === 'cash');
    if (!targetWallet) {
      const { data: newWal } = await supabase.from('wallets').insert([{ name: 'Dompet Fisik (Auto)', type: 'cash', balance: 0 }]).select().single();
      targetWallet = newWal;
    }

    await supabase.from('wallets').update({ balance: Number(targetWallet.balance) + estimasiCair }).eq('id', targetWallet.id);
    
    // Log pencairan emas ke Ledger
    await supabase.from('transactions').insert([{
      description: `Pencairan Emas (${grams}g)`,
      amount: estimasiCair,
      category: 'Investasi',
      wallet: targetWallet.name
    }]);

    await supabase.from('gold_assets').delete().eq('id', id);
    setModal(p => ({...p, isOpen: false}));
    fetchAllData();
  };

  // ==========================================
  // KALKULASI PORTOFOLIO
  // ==========================================
  const totalLiquidity = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
  const totalLocked = projects.reduce((acc, p) => acc + Number(p.saved_amount), 0);
  const totalGrams = goldAssets.reduce((sum, item) => sum + Number(item.grams), 0);
  const totalCapital = goldAssets.reduce((sum, item) => sum + (Number(item.grams) * Number(item.buy_price_per_gram)), 0);
  const currentGoldValue = totalGrams * prices.sell;
  const gainLoss = currentGoldValue - totalCapital;
  const isProfit = gainLoss >= 0;

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 font-mono text-sm">Menyinkronkan Jaringan Finansial...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      
      {/* ========================================= */}
      {/* SECTION 1: VIRTUAL WALLETS & CASH         */}
      {/* ========================================= */}
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl transition-colors duration-300">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Virtual Wallets & Cash</h2>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              Total Likuiditas Bebas: <span className="font-mono font-bold text-blue-600 dark:text-blue-500 text-lg">{formatRp(totalLiquidity)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button onClick={() => setShowAllocateModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1A1A] dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl transition-all text-sm font-bold">
              <ArrowRightLeft size={16} /> Alokasikan
            </button>
            <button onClick={() => setShowTransferModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/15 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-xl transition-all text-sm font-bold">
              <ArrowRightLeft size={16} /> Transfer
            </button>
            <button onClick={() => setShowIncomeModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-500 border border-green-200 dark:border-green-900/50 px-4 py-2.5 rounded-xl transition-all text-sm font-bold">
              <ArrowDownToLine size={16} /> Pemasukkan
            </button>
            <button onClick={() => setShowAddWalletModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20">
              <Plus size={16} /> Tambah Akun
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* UANG TUNAI */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Wallet size={14}/> Uang Tunai</h3>
            {wallets.filter(w => w.type.toLowerCase() === 'cash').map(wallet => (
              <div key={wallet.id} className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition-colors">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">{wallet.name}</h4>
                <p className="font-mono text-gray-700 dark:text-gray-300">{formatRp(wallet.balance)}</p>
              </div>
            ))}
          </div>

          {/* REKENING BANK */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Landmark size={14}/> Rekening Bank</h3>
            {wallets.filter(w => w.type.toLowerCase() === 'bank').map(wallet => (
              <div key={wallet.id} className="bg-blue-50/50 dark:bg-[#1A1A1A] border border-blue-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-900/50 transition-colors rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] text-blue-900 dark:text-white transition-opacity"><Landmark size={100}/></div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">{wallet.name}</h4>
                <p className="font-mono text-blue-600 dark:text-blue-400 font-bold">{formatRp(wallet.balance)}</p>
              </div>
            ))}
          </div>

          {/* E-WALLET */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Smartphone size={14}/> E-Wallet</h3>
            {wallets.filter(w => w.type.toLowerCase() === 'ewallet').length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 italic">Belum ada e-wallet terdaftar.</p>
            ) : (
              wallets.filter(w => w.type.toLowerCase() === 'ewallet').map(wallet => (
                <div key={wallet.id} className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition-colors">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">{wallet.name}</h4>
                  <p className="font-mono text-gray-700 dark:text-gray-300">{formatRp(wallet.balance)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* SECTION 2: GOLD ASSETS (SAFE DEPOSIT)     */}
      {/* ========================================= */}
      <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 lg:p-8 transition-colors duration-300">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
              <Coins size={28} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Simpanan Emas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Berat: <span className="font-semibold text-yellow-600 dark:text-yellow-500">{totalGrams.toFixed(2)} Gram</span></p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex gap-6 text-left md:text-right">
              <div>
                <p className="text-xs text-gray-500 mb-1">Harga Beli Baru</p>
                <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{formatRp(prices.buy)}</p>
              </div>
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-1 font-bold">Harga Jual (Buyback)</p>
                <p className="font-mono text-lg font-bold text-yellow-600 dark:text-yellow-500">{formatRp(prices.sell)}</p>
              </div>
            </div>
            <button onClick={() => setIsAddingGold(!isAddingGold)} className="px-5 py-2.5 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-600/20 dark:hover:bg-yellow-600/40 text-yellow-700 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-600/50 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              {isAddingGold ? <X size={16} /> : <Plus size={16} />} {isAddingGold ? 'Batal' : 'Tambah Aset'}
            </button>
          </div>
        </div>

        {isAddingGold && (
          <div className="mb-8 p-5 bg-yellow-50/50 dark:bg-[#1A1A1A] border border-yellow-200 dark:border-yellow-900/50 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Jumlah (Gram)</label>
              <input type="number" step="0.01" placeholder="Contoh: 5" className="w-full p-3 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-500" value={newGold.grams} onChange={e => setNewGold({...newGold, grams: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><CalendarDays size={12}/> Tanggal Beli</label>
              <input type="date" className="w-full p-3 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-500" value={newGold.purchase_date} onChange={e => setNewGold({...newGold, purchase_date: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Harga /Gr (Auto)</label>
              <div className="w-full p-3 bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-500 dark:text-gray-300 cursor-not-allowed flex items-center h-[46px]">
                {isFetchingPrice ? <span className="animate-pulse text-yellow-600 dark:text-yellow-500">Mencari...</span> : <span className="font-mono">{newGold.buy_price_per_gram ? formatRp(Number(newGold.buy_price_per_gram)) : 'Pilih Tanggal'}</span>}
              </div>
            </div>
            <div className="col-span-1">
              <button onClick={handleAddGold} disabled={isFetchingPrice || !newGold.buy_price_per_gram || !newGold.grams} className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl text-sm transition-colors h-[46px]">
                Simpan ke Brankas
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Modal Pembelian</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{formatRp(totalCapital)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nilai Cair (Buyback)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{formatRp(currentGoldValue)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Gain / Loss Riil</p>
            <div className={`flex items-center gap-2 text-2xl font-bold font-mono ${isProfit ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
              {isProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {isProfit ? '+' : ''}{formatRp(gainLoss)}
            </div>
          </div>
        </div>

        {goldAssets.length > 0 && (
          <div className="mt-8">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Riwayat Brankas Emas</h4>
            <div className="space-y-3">
              {goldAssets.map((gold) => (
                <div key={gold.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-yellow-300 dark:hover:border-yellow-900/50 transition-colors">
                  <div className="w-full md:w-auto flex justify-between md:justify-start md:gap-8 items-center mb-4 md:mb-0">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">{gold.grams} Gram</p>
                      <p className="text-[10px] font-mono text-gray-500 flex items-center gap-1 mt-1 uppercase"><CalendarDays size={12}/> {formatTanggal(gold.purchase_date || gold.created_at)}</p>
                    </div>
                    <div className="text-right md:text-left">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Harga Beli / Gr</p>
                      <p className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{formatRp(gold.buy_price_per_gram)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setModal({
                      isOpen: true, type: 'confirm', title: 'Konfirmasi Pencairan', 
                      message: `Cairkan ${gold.grams} gram emas? Dana segar sebesar ${formatRp(gold.grams * prices.sell)} akan otomatis ditambahkan ke Dompet Cash kamu dan tercatat di Ledger.`,
                      confirmText: 'Ya, Cairkan', cancelText: 'Batal',
                      onConfirm: () => executeSellGold(gold.id, gold.grams * prices.sell, gold.grams),
                      onCancel: () => setModal(p => ({...p, isOpen: false}))
                    })} 
                    className="w-full md:w-auto px-4 py-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <HandCoins size={16} /> Jual & Cairkan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* SECTION 3: SINKING FUNDS (DREAM PROJECTS) */}
      {/* ========================================= */}
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 relative z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="text-purple-600 dark:text-purple-500" size={24} /> Sinking Funds (Alokasi Proyek)
            </h2>
            <p className="text-gray-500 text-sm mt-1">Uang yang terkunci untuk masa depan. Total Terkunci: <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{formatRp(totalLocked)}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {projects.map(project => {
            const pct = Math.min((project.saved_amount / project.target_fund) * 100, 100);
            return (
              <div key={project.id} className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-purple-300 dark:hover:border-purple-900/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{project.title}</h3>
                  <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-900/50">{pct.toFixed(0)}%</span>
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saldo Terkunci</p>
                  <p className="font-mono font-bold text-purple-600 dark:text-purple-400 text-lg">{formatRp(project.saved_amount)}</p>
                  <p className="text-[10px] text-gray-500 font-mono">Target: {formatRp(project.target_fund)}</p>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-[#121212] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 dark:from-purple-600 dark:to-fuchsia-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="col-span-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-2xl text-center text-gray-500 text-sm">
              Belum ada proyek yang berjalan. Buat mimpimu di modul Project Architect.
            </div>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL 1: PEMASUKKAN (INCOME / GAJI)       */}
      {/* ========================================= */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transition-colors">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1A]">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><ArrowDownToLine size={18} className="text-green-600 dark:text-green-500"/> Catat Pemasukkan</h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Simpan Ke</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-4 top-4 text-gray-500" />
                  <select className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer" value={incomeData.walletId} onChange={e => setIncomeData({...incomeData, walletId: e.target.value})}>
                    <option value="" disabled>Pilih Dompet Tujuan</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nominal Pemasukkan</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-bold">Rp</span>
                  <input autoFocus type="number" placeholder="Contoh: 5000000" className="w-full p-3.5 pl-12 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-green-500 outline-none font-mono" value={incomeData.amount} onChange={e => setIncomeData({...incomeData, amount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Sumber / Deskripsi</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-4 text-gray-500" />
                  <input type="text" placeholder="Contoh: Gaji Bulanan / Freelance" className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-green-500 outline-none" value={incomeData.description} onChange={e => setIncomeData({...incomeData, description: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleAddIncome} disabled={!incomeData.walletId || !incomeData.amount || !incomeData.description} className="w-full py-3.5 font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg">
                  <ArrowDownToLine size={18} /> Simpan ke Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: TAMBAH AKUN DOMPET               */}
      {/* ========================================= */}
      {showAddWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transition-colors">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1A]">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Plus size={18} className="text-blue-600 dark:text-blue-500"/> Tambah Akun Baru</h3>
              <button onClick={() => setShowAddWalletModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nama Akun</label>
                <input autoFocus type="text" placeholder="Contoh: Bank Jago / Gopay" className="w-full p-3.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-blue-500 outline-none" value={newWallet.name} onChange={e => setNewWallet({...newWallet, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Jenis Akun</label>
                <select className="w-full p-3.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-blue-500 outline-none appearance-none cursor-pointer" value={newWallet.type} onChange={e => setNewWallet({...newWallet, type: e.target.value})}>
                  <option value="bank">Rekening Bank</option>
                  <option value="cash">Uang Tunai / Fisik</option>
                  <option value="ewallet">E-Wallet (Gopay/OVO)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Saldo Awal (Opsional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-bold">Rp</span>
                  <input type="number" placeholder="0" className="w-full p-3.5 pl-12 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-blue-500 outline-none font-mono" value={newWallet.balance} onChange={e => setNewWallet({...newWallet, balance: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleAddWallet} disabled={!newWallet.name} className="w-full py-3.5 font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg">
                  Simpan Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transition-colors">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1A]">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><ArrowRightLeft size={18} className="text-indigo-600 dark:text-indigo-400"/> Transfer Antar Dompet</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Dari Dompet</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-4 top-4 text-gray-500" />
                  <select className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-indigo-500 outline-none appearance-none cursor-pointer" value={transferData.fromWalletId} onChange={e => setTransferData({...transferData, fromWalletId: e.target.value})}>
                    <option value="" disabled>Pilih Dompet Sumber</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} - {formatRp(w.balance)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ke Dompet</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-4 top-4 text-gray-500" />
                  <select className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-indigo-500 outline-none appearance-none cursor-pointer" value={transferData.toWalletId} onChange={e => setTransferData({...transferData, toWalletId: e.target.value})}>
                    <option value="" disabled>Pilih Dompet Tujuan</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} - {formatRp(w.balance)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nominal Transfer</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-bold">Rp</span>
                  <input type="number" placeholder="Contoh: 150000" className="w-full p-3.5 pl-12 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-indigo-500 outline-none font-mono" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleTransferWallets} disabled={!transferData.fromWalletId || !transferData.toWalletId || !transferData.amount} className="w-full py-3.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg">
                  <ArrowRightLeft size={18} /> Kirim Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3: KUNCI DANA / ALOKASI PROYEK      */}
      {/* ========================================= */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transition-colors">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1A]">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Lock size={18} className="text-gray-700 dark:text-gray-300"/> Kunci Dana ke Proyek</h3>
              <button onClick={() => setShowAllocateModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Sumber Dana (Potong Dari)</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-4 top-4 text-gray-500" />
                  <select className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-gray-500 outline-none appearance-none cursor-pointer" value={allocation.sourceWalletId} onChange={e => setAllocation({...allocation, sourceWalletId: e.target.value})}>
                    <option value="" disabled>Pilih Dompet / Bank</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} - {formatRp(w.balance)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tujuan (Sinking Fund)</label>
                <div className="relative">
                  <Rocket size={16} className="absolute left-4 top-4 text-purple-500" />
                  <select className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none appearance-none cursor-pointer" value={allocation.targetProjectId} onChange={e => setAllocation({...allocation, targetProjectId: e.target.value})}>
                    <option value="" disabled>Pilih Proyek Impian</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title} (Kurang: {formatRp(p.target_fund - p.saved_amount)})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nominal yang Dikunci</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-bold">Rp</span>
                  <input type="number" placeholder="Contoh: 1500000" className="w-full p-3.5 pl-12 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-gray-500 outline-none font-mono" value={allocation.amount} onChange={e => setAllocation({...allocation, amount: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleAllocateFunds} disabled={!allocation.sourceWalletId || !allocation.targetProjectId || !allocation.amount} className="w-full py-3.5 font-bold bg-gray-900 dark:bg-white text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg">
                  <ArrowRightLeft size={18} /> Pindahkan Alokasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* CUSTOM GLOBAL MODAL (ALERT & CONFIRM)     */}
      {/* ========================================= */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-5">
              {modal.type === 'alert' && <ShieldAlert size={28} className="text-yellow-600 dark:text-yellow-500" />}
              {modal.type === 'confirm' && <AlertTriangle size={28} className="text-yellow-600 dark:text-yellow-500" />}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{modal.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">{modal.message}</p>
            <div className="flex justify-end gap-3">
              {modal.type !== 'alert' && (
                <button onClick={modal.onCancel} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525] rounded-xl transition-colors">
                  {modal.cancelText}
                </button>
              )}
              <button onClick={modal.onConfirm} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg bg-yellow-600 hover:bg-yellow-700 text-white">
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}