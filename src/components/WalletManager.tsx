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
    const { data } = await supabase.from('wallets').select('*').order('created_at', { ascending: true });
    if (data) setWallets(data);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, []);

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.balance) return;
    await supabase.from('wallets').insert([{ name: newWallet.name, type: newWallet.type, balance: Number(newWallet.balance) }]);
    setIsAdding(false); setNewWallet({ name: '', type: 'Cash', balance: '' });
    fetchWallets();
  };

  const handleReconcile = async (id: string) => {
    if (!reconcileBalance) return;
    await supabase.from('wallets').update({ balance: Number(reconcileBalance) }).eq('id', id);
    setReconcileId(null); setReconcileBalance(''); fetchWallets();
  };

  // --- FUNGSI TRANSFER UANG ---
  const handleTransfer = async () => {
    const { fromId, toId, amount } = transferData;
    const nominal = Number(amount);
    
    if (!fromId || !toId || nominal <= 0) return;
    if (fromId === toId) { setAlertMsg("Sumber dan tujuan tidak boleh sama!"); return; }

    const source = wallets.find(w => w.id === fromId);
    const target = wallets.find(w => w.id === toId);

    if (!source || !target) return;
    if (source.balance < nominal) { setAlertMsg(`Saldo ${source.name} tidak cukup!`); return; }

    // Eksekusi Transfer
    await supabase.from('wallets').update({ balance: source.balance - nominal }).eq('id', fromId);
    await supabase.from('wallets').update({ balance: Number(target.balance) + nominal }).eq('id', toId);
    await supabase.from('transactions').insert([{
      description: `Transfer: ${source.name} ➔ ${target.name}`,
      amount: nominal, category: 'Operasional', wallet: source.name
    }]);

    setAlertMsg(`Sukses mentransfer ${formatRupiah(nominal)} ke ${target.name}.`);
    setIsTransferring(false); setTransferData({ fromId: '', toId: '', amount: '' });
    fetchWallets();
  };

  const cashWallets = wallets.filter(w => w.type === 'Cash');
  const banks = wallets.filter(w => w.type === 'Bank');
  const eWallets = wallets.filter(w => w.type === 'E-Wallet');
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  if (loading) return <div className="h-32 flex items-center justify-center animate-pulse text-gray-500">Memuat data dompet...</div>;

  return (
    <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 lg:p-8 mt-6 transition-colors duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Virtual Wallets & Cash</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Likuiditas: <span className="font-bold text-blue-600 dark:text-blue-400">{formatRupiah(totalBalance)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsTransferring(!isTransferring)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2A2A] dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg">
            <ArrowRightLeft size={16} /> Transfer
          </button>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            {isAdding ? <X size={16} /> : <Plus size={16} />} Tambah Akun
          </button>
        </div>
      </div>

      {/* TAMPILAN TRANSFER MODUL */}
      {isTransferring && (
        <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
          <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2"><ArrowRightLeft size={18}/> Pindah Saldo Antar Dompet</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Sumber Dana</label>
              <select className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})}>
                <option value="">Dari mana...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tujuan Dana</label>
              <select className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})}>
                <option value="">Ke mana...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Nominal Transfer (Rp)</label>
              <input type="number" className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} />
            </div>
            <button onClick={handleTransfer} className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm">Kirim Dana</button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3"><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nama (ex: BCA)</label><input type="text" className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white" value={newWallet.name} onChange={e => setNewWallet({...newWallet, name: e.target.value})} /></div>
          <div className="w-full md:w-1/4"><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipe</label><select className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white" value={newWallet.type} onChange={e => setNewWallet({...newWallet, type: e.target.value})}><option value="Cash">Cash (Tunai)</option><option value="Bank">Bank</option><option value="E-Wallet">E-Wallet</option></select></div>
          <div className="w-full md:w-1/3"><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Saat Ini</label><input type="number" className="w-full p-2.5 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white" value={newWallet.balance} onChange={e => setNewWallet({...newWallet, balance: e.target.value})} /></div>
          <button onClick={handleAddWallet} className="w-full md:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm">Simpan</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div><h4 className="text-sm font-semibold text-gray-400 uppercase mb-4 flex items-center gap-2"><WalletIcon size={16} /> Uang Tunai</h4><div className="space-y-3">{cashWallets.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{cashWallets.length === 0 && <p className="text-sm text-gray-500">Belum ada catatan.</p>}</div></div>
        <div><h4 className="text-sm font-semibold text-gray-400 uppercase mb-4 flex items-center gap-2"><Landmark size={16} /> Rekening Bank</h4><div className="space-y-3">{banks.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{banks.length === 0 && <p className="text-sm text-gray-500">Belum ada akun.</p>}</div></div>
        <div><h4 className="text-sm font-semibold text-gray-400 uppercase mb-4 flex items-center gap-2"><Smartphone size={16} /> E-Wallet</h4><div className="space-y-3">{eWallets.map(w => <WalletCard key={w.id} wallet={w} formatRupiah={formatRupiah} reconcileId={reconcileId} setReconcileId={setReconcileId} reconcileBalance={reconcileBalance} setReconcileBalance={setReconcileBalance} handleReconcile={handleReconcile} />)}{eWallets.length === 0 && <p className="text-sm text-gray-500">Belum ada e-wallet.</p>}</div></div>
      </div>

      {/* --- CUSTOM ALERT MODAL --- */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-800 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mx-auto mb-4"><AlertCircle size={24} /></div>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-6">{alertMsg}</p>
            <button onClick={() => setAlertMsg('')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletCard({ wallet, formatRupiah, reconcileId, setReconcileId, reconcileBalance, setReconcileBalance, handleReconcile }: any) {
  const isReconciling = reconcileId === wallet.id;
  return (
    <div className="p-4 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between group transition-colors">
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{wallet.name}</p>
        {isReconciling ? (
          <div className="flex items-center gap-2 mt-2"><input type="number" autoFocus className="p-1.5 text-xs bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white w-24" value={reconcileBalance} onChange={e => setReconcileBalance(e.target.value)} /><button onClick={() => handleReconcile(wallet.id)} className="p-1.5 bg-green-600 text-white rounded"><Check size={14}/></button><button onClick={() => setReconcileId(null)} className="p-1.5 bg-red-600 text-white rounded"><X size={14}/></button></div>
        ) : (
          <p className="font-mono text-gray-600 dark:text-gray-300 mt-0.5">{formatRupiah(wallet.balance)}</p>
        )}
      </div>
      {!isReconciling && (<button onClick={() => { setReconcileId(wallet.id); setReconcileBalance(wallet.balance); }} className="p-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100"><RefreshCw size={18} /></button>)}
    </div>
  );
}