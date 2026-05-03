"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Landmark, Smartphone, Plus, RefreshCw, Check, X, Wallet as WalletIcon, ArrowRightLeft, AlertCircle } from 'lucide-react';

export default function WalletManager() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: '', type: 'Cash', balance: '' });
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileBalance, setReconcileBalance] = useState('');

  // Transfer State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });
  
  // Custom Alert State
  const [alertMsg, setAlertMsg] = useState('');

  const fetchWallets = async () => {
    setLoading(true);
    // 1. Ambil identitas
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Kunci tarikan data hanya untuk dompet milik user ini
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id) 
      .order('created_at', { ascending: true });
      
    if (data) setWallets(data);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, []);

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.balance) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 3. Masukkan dompet baru dengan KTP (user_id)
    await supabase.from('wallets').insert([{ 
      user_id: user.id, 
      name: newWallet.name, 
      type: newWallet.type, 
      balance: Number(newWallet.balance) 
    }]);
    
    setIsAdding(false); setNewWallet({ name: '', type: 'Cash', balance: '' });
    fetchWallets();
  };

  const handleReconcile = async (id: string) => {
    if (!reconcileBalance) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('wallets').update({ balance: Number(reconcileBalance) }).eq('id', id).eq('user_id', user.id);
    setReconcileId(null); setReconcileBalance(''); fetchWallets();
  };

  // --- FUNGSI TRANSFER UANG ---
  const handleTransfer = async () => {
    const { fromId, toId, amount } = transferData;
    const nominal = Number(amount);
    
    if (!fromId || !toId || nominal <= 0) return;
    if (fromId === toId) { setAlertMsg("Sumber dan tujuan tidak boleh sama!"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const source = wallets.find(w => w.id === fromId);
    const target = wallets.find(w => w.id === toId);

    if (!source || !target) return;
    if (source.balance < nominal) { setAlertMsg(`Saldo ${source.name} tidak cukup!`); return; }

    // Eksekusi Transfer dengan penguncian user_id
    await supabase.from('wallets').update({ balance: source.balance - nominal }).eq('id', fromId).eq('user_id', user.id);
    await supabase.from('wallets').update({ balance: Number(target.balance) + nominal }).eq('id', toId).eq('user_id', user.id);
    
    // Jangan lupa masukkan user_id ke tabel riwayat transaksi!
    await supabase.from('transactions').insert([{
      user_id: user.id,
      description: `Transfer: ${source.name} ➔ ${target.name}`,
      amount: nominal, 
      category: 'Operasional', 
      wallet: source.name
    }]);

    setAlertMsg(`Sukses mentransfer ${formatRupiah(nominal)} ke ${target.name}.`);
    setIsTransferring(false); setTransferData({ fromId: '', toId: '', amount: '' });
    fetchWallets();
  };

  const cashWallets = wallets.filter(w => w.type === 'Cash');
  const banks = wallets.filter(w => w.type === 'Bank');
  const eWallets = wallets.filter(w => w.type === 'E-Wallet');
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  if (loading) return <div className="h-32 flex items-center justify-center animate-pulse text-gray-500 font-mono text-sm">INITIALIZING VAULTS...</div>;

  return (
    <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-6 lg:p-8 mt-6 transition-colors duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Virtual Wallets & Cash</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Likuiditas: <span className="font-black font-mono text-blue-600 dark:text-blue-500">{formatRupiah(totalBalance)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsTransferring(!isTransferring)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-[#1A1A1A] dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors">
            <ArrowRightLeft size={14} /> Transfer
          </button>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-blue-500/20">
            {isAdding ? <X size={14} /> : <Plus size={14} />} Tambah Akun
          </button>
        </div>
      </div>

      {/* TAMPILAN TRANSFER MODUL */}
      {isTransferring && (
        <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl animate-in zoom-in-95 duration-200">
          <h4 className="font-bold text-sm text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2"><ArrowRightLeft size={16}/> Pindah Saldo Antar Dompet</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 text-blue-600/70 dark:text-blue-400/70">Sumber Dana</label>
              <select className="w-full p-3 bg-white dark:bg-[#1A1A1A] border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})}>
                <option value="">Dari mana...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 text-blue-600/70 dark:text-blue-400/70">Tujuan Dana</label>
              <select className="w-full p-3 bg-white dark:bg-[#1A1A1A] border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})}>
                <option value="">Ke mana...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 text-blue-600/70 dark:text-blue-400/70">Nominal Transfer (Rp)</label>
              <input type="number" className="w-full p-3 bg-white dark:bg-[#1A1A1A] border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} />
            </div>
            <button onClick={handleTransfer} className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">Kirim Dana</button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="mb-8 p-5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col md:flex-row gap-4 items-end animate-in zoom-in-95 duration-200">
          <div className="w-full md:w-1/3"><label className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400 mb-2">Nama (ex: BCA)</label><input type="text" className="w-full p-3 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:border-blue-500 transition-colors" value={newWallet.name} onChange={e => setNewWallet({...newWallet, name: e.target.value})} /></div>
          <div className="w-full md:w-1/4"><label className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400 mb-2">Tipe</label><select className="w-full p-3 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:border-blue-500 transition-colors font-semibold" value={newWallet.type} onChange={e => setNewWallet({...newWallet, type: e.target.value})}><option value="Cash">Cash (Tunai)</option><option value="Bank">Bank</option><option value="E-Wallet">E-Wallet</option></select></div>
          <div className="w-full md:w-1/3"><label className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400 mb-2">Saldo Awal</label><input type="number" className="w-full p-3 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:border-blue-500 transition-colors font-mono" value={newWallet.balance} onChange={e => setNewWallet({...newWallet, balance: e.target.value})} /></div>
          <button onClick={handleAddWallet} className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20">Simpan</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div><h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2"><WalletIcon size={14} className="text-emerald-500" /> Uang Tunai</h4><div className="space-y-3">{cashWallets.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{cashWallets.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-600">Belum ada catatan.</p>}</div></div>
        <div><h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2"><Landmark size={14} className="text-blue-500" /> Rekening Bank</h4><div className="space-y-3">{banks.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{banks.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-600">Belum ada akun.</p>}</div></div>
        <div><h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2"><Smartphone size={14} className="text-purple-500" /> E-Wallet</h4><div className="space-y-3">{eWallets.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{eWallets.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-600">Belum ada e-wallet.</p>}</div></div>
      </div>

      {/* --- CUSTOM ALERT MODAL --- */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-500 mx-auto mb-4"><AlertCircle size={24} /></div>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold mb-6">{alertMsg}</p>
            <button onClick={() => setAlertMsg('')} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">Tutup Notifikasi</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletCard({ wallet, formatRupiah, reconcileId, setReconcileId, reconcileBalance, setReconcileBalance, handleReconcile }: any) {
  const isReconciling = reconcileId === wallet.id;
  return (
    <div className="p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between group hover:border-gray-300 dark:hover:border-gray-700 transition-all">
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{wallet.name}</p>
        {isReconciling ? (
          <div className="flex items-center gap-2 mt-2">
            <input type="number" autoFocus className="p-1.5 px-3 text-xs font-mono bg-white dark:bg-[#151515] border border-blue-300 dark:border-blue-800 rounded-lg text-gray-900 dark:text-white w-28 outline-none focus:ring-2 focus:ring-blue-500/20" value={reconcileBalance} onChange={e => setReconcileBalance(e.target.value)} />
            <button onClick={() => handleReconcile(wallet.id)} className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors"><Check size={14} strokeWidth={3}/></button>
            <button onClick={() => setReconcileId(null)} className="p-1.5 bg-gray-300 hover:bg-red-500 dark:bg-gray-700 dark:hover:bg-red-500 text-gray-700 hover:text-white dark:text-white rounded-lg transition-colors"><X size={14} strokeWidth={3}/></button>
          </div>
        ) : (
          <p className="text-sm font-mono font-black text-gray-600 dark:text-gray-300 mt-0.5">{formatRupiah(wallet.balance)}</p>
        )}
      </div>
      {!isReconciling && (<button onClick={() => { setReconcileId(wallet.id); setReconcileBalance(wallet.balance); }} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><RefreshCw size={16} /></button>)}
    </div>
  );
}