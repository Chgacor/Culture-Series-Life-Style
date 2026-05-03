"use client";

import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { 
  Gamepad2, Plus, Trash2, Calculator, 
  Target, ShieldAlert, Rocket, Layers, 
  CheckCircle2, Wallet, Image as ImageIcon, 
  Quote, SlidersHorizontal, Percent, AlertTriangle, Info, ArrowRightLeft, X, Flag
} from 'lucide-react';

const formatRp = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// ==========================================
// KOMPONEN INTI SANDBOX (DIBUNGKUS SUSPENSE)
// ==========================================
function DreamSandboxContent() {
  const searchParams = useSearchParams();
  const [wishes, setWishes] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // GLOBAL MODAL
  const [modal, setModal] = useState({
    isOpen: false, type: 'alert' as 'alert' | 'confirm', title: '', message: '',
    confirmText: 'Konfirmasi', cancelText: 'Batal',
    onConfirm: () => {}, onCancel: () => setModal(prev => ({ ...prev, isOpen: false }))
  });

  // MODAL SETOR DANA
  const [setorModal, setSetorModal] = useState({
    isOpen: false, wishId: '', wishTitle: '', targetFund: 0, currentSaved: 0, sourceWalletId: '', amount: ''
  });

  // MODAL SUREN (SURRENDER & REFUND)
  const [surenModal, setSurenModal] = useState({
    isOpen: false, wishId: '', wishTitle: '', savedAmount: 0, targetWalletId: ''
  });

  const [title, setTitle] = useState('');
  const [targetBank, setTargetBank] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [motivationNote, setMotivationNote] = useState('');
  const [items, setItems] = useState<{name: string, price: number, qty: number}[]>([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', qty: '1' });
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [savingPercent, setSavingPercent] = useState<number>(20);
  const [isCredit, setIsCredit] = useState(false);
  const [dpPercent, setDpPercent] = useState<number>(30);

  useEffect(() => {
    const qTitle = searchParams.get('title');
    const qPrice = searchParams.get('price');
    if (qTitle && !title) setTitle(qTitle);
    if (qTitle && qPrice && items.length === 0) setItems([{ name: qTitle, price: Number(qPrice), qty: 1 }]);
  }, [searchParams]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const inflationBuffer = subtotal * 0.10; 
  const grandTotal = subtotal + inflationBuffer;
  const income = Number(monthlyIncome);
  const capacity = income * (savingPercent / 100);
  const targetFund = isCredit ? grandTotal * (dpPercent / 100) : grandTotal;
  const etaMonths = capacity > 0 ? Math.ceil(targetFund / capacity) : 0;
  
  let difficulty = { level: 'Belum Ada Data', color: 'text-gray-500' };
  if (etaMonths > 0 && etaMonths <= 6) difficulty = { level: 'EASY (Cepat & Ringan)', color: 'text-green-600 dark:text-green-500' };
  else if (etaMonths > 6 && etaMonths <= 12) difficulty = { level: 'MEDIUM (Butuh Fokus)', color: 'text-yellow-600 dark:text-yellow-500' };
  else if (etaMonths > 12) difficulty = { level: 'HARD (Maraton Disiplin)', color: 'text-red-600 dark:text-red-500' };

  const fetchAllData = async () => {
    setLoading(true);
    // 1. Dapatkan Identitas User (KTP)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Tarik Wishes dengan Gembok
    const { data: wishData } = await supabase
      .from('wishes')
      .select('*')
      .eq('user_id', user.id) // <--- KUNCI WISHES
      .order('created_at', { ascending: false });

    if (wishData) {
      setWishes(wishData.filter(w => w.status !== 'completed'));
    }

    // 3. Tarik Dompet dengan Gembok
    const { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id) // <--- KUNCI WALLETS (Sangat Penting!)
      .order('type', { ascending: true });
      
    if (walletData) setWallets(walletData);
    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    setItems([...items, { name: newItem.name, price: Number(newItem.price), qty: Number(newItem.qty) }]);
    setNewItem({ name: '', price: '', qty: '1' });
  };
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSaveWish = async () => {
    if (!title || items.length === 0 || capacity <= 0 || !targetBank) {
      alert("Harap lengkapi judul, minimal 1 barang, kapasitas nabung, dan bank tujuan!");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // INSERT DENGAN SUNTIKAN KTP
    await supabase.from('wishes').insert([{
      user_id: user.id, // <--- SUNTIKAN KEPEMILIKAN
      title, target_bank: targetBank, items, savings_capacity: capacity, saved_amount: 0,
      image_url: imageUrl, motivation_note: motivationNote, monthly_income: income, 
      saving_percentage: savingPercent, is_credit: isCredit, dp_percentage: dpPercent, target_fund: targetFund, status: 'active'
    }]);

    setTitle(''); setTargetBank(''); setImageUrl(''); setMotivationNote('');
    setItems([]); setMonthlyIncome(''); setSavingPercent(20); setIsCredit(false); setDpPercent(30);
    window.history.replaceState(null, '', '/projects/wish');
    fetchAllData();
  };

  // ==========================================
  // ACTION: SETOR DANA
  // ==========================================
  const handleExecuteSetor = async () => {
    const transferAmount = Number(setorModal.amount);
    if (!setorModal.sourceWalletId || transferAmount <= 0) return alert("Pilih sumber dana dan masukkan nominal yang valid.");

    const sourceWallet = wallets.find(w => w.id === setorModal.sourceWalletId);
    if (sourceWallet.balance < transferAmount) return alert(`Saldo ${sourceWallet.name} tidak mencukupi untuk transfer ini.`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSaved = Math.min(setorModal.currentSaved + transferAmount, setorModal.targetFund);

    // UPDATE DENGAN KUNCI GANDA
    await supabase.from('wallets').update({ balance: sourceWallet.balance - transferAmount }).eq('id', setorModal.sourceWalletId).eq('user_id', user.id);
    await supabase.from('wishes').update({ saved_amount: newSaved }).eq('id', setorModal.wishId).eq('user_id', user.id);

    setSetorModal(p => ({...p, isOpen: false, sourceWalletId: '', amount: ''}));
    fetchAllData();
  };

  // ==========================================
  // ACTION: SUREN (BATAL PROYEK & REFUND)
  // ==========================================
  const handleExecuteSuren = async () => {
    if (!surenModal.targetWalletId) return alert("Pilih dompet tujuan untuk pengembalian dana.");
    const targetWallet = wallets.find(w => w.id === surenModal.targetWalletId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Kembalikan Uang ke Dompet
    await supabase.from('wallets').update({ balance: Number(targetWallet.balance) + surenModal.savedAmount }).eq('id', targetWallet.id).eq('user_id', user.id);

    // 2. Catat di Ledger sebagai "Refund Sinking Fund" (SUNTIK KTP)
    await supabase.from('transactions').insert([{
      user_id: user.id, // <--- SUNTIKAN KTP KE TRANSAKSI REFUND
      description: `Refund Proyek Batal: ${surenModal.wishTitle}`,
      amount: surenModal.savedAmount,
      category: 'Investasi',
      wallet: targetWallet.name
    }]);

    // 3. Hapus Proyek dari Database
    await supabase.from('wishes').delete().eq('id', surenModal.wishId).eq('user_id', user.id);

    setSurenModal(p => ({...p, isOpen: false, targetWalletId: ''}));
    fetchAllData();
  };

  const triggerTrashOrSuren = (id: string, savedAmount: number, title: string) => {
    if (savedAmount > 0) {
      // Jika ada uangnya, buka Modal Suren (Refund)
      setSurenModal({ isOpen: true, wishId: id, wishTitle: title, savedAmount: savedAmount, targetWalletId: '' });
    } else {
      // Jika kosong, langsung hapus saja
      setModal({
        isOpen: true, type: 'confirm', title: 'Hapus Proyek',
        message: 'Yakin ingin menghapus cetak biru proyek ini dari radarmu?',
        confirmText: 'Hapus', cancelText: 'Batal',
        onCancel: () => setModal(p => ({...p, isOpen: false})),
        onConfirm: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          await supabase.from('wishes').delete().eq('id', id).eq('user_id', user.id); // <--- KUNCI DELETE
          fetchAllData();
          setModal(p => ({...p, isOpen: false}));
        }
      });
    }
  };

  // ==========================================
  // ACTION: SUCCESS (MISI SELESAI)
  // ==========================================
  const handleSuccessProject = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ubah status jadi completed
    await supabase.from('wishes').update({ status: 'completed' }).eq('id', id).eq('user_id', user.id); // <--- KUNCI UPDATE
    fetchAllData();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Dream Sandbox <Gamepad2 className="text-purple-600 dark:text-purple-500" size={28} />
          </h2>
          <p className="text-gray-500 mt-1 text-xs md:text-sm">Arsitektur Mimpimu: Bedah, Simulasikan, dan Visualisasikan.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* KOLOM KIRI: FORM ARCHITECT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-colors duration-300">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-6">
              <Layers className="text-purple-600 dark:text-purple-500" size={20} /> Project Architect
            </h3>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">Step 1</span> Identitas
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Nama Proyek</label>
                  <input placeholder="Contoh: Rakit PC Server" className="w-full p-3.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Target Rekening</label>
                  <div className="relative">
                    <Wallet size={16} className="absolute left-4 top-4 text-gray-500" />
                    <input placeholder="Contoh: BCA" className="w-full p-3.5 pl-11 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none" value={targetBank} onChange={e => setTargetBank(e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><ImageIcon size={12}/> Foto Inspirasi (URL)</label>
                <input placeholder="Paste URL gambar dari web (Opsional)" className="w-full p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-xs outline-none focus:border-purple-500 font-mono" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Quote size={12}/> Motivasi</label>
                <textarea placeholder="Kenapa harus memperjuangkan ini?" className="w-full p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 resize-none h-20" value={motivationNote} onChange={e => setMotivationNote(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="flex items-center gap-2"><span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">Step 2</span> Material</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input placeholder="Nama Item" className="w-full sm:flex-1 p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="number" placeholder="Harga" className="w-full sm:w-28 p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 font-mono" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                  <input type="number" placeholder="Qty" className="w-16 p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-center text-gray-900 dark:text-white outline-none focus:border-purple-500 font-mono" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: e.target.value})} />
                  <button onClick={handleAddItem} className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shrink-0"><Plus size={16}/></button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto no-scrollbar bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-200 dark:border-gray-800/50">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-800/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{item.name} <span className="text-gray-500 text-xs font-mono">x{item.qty}</span></span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-gray-500 dark:text-gray-400 text-xs">{formatRp(item.price * item.qty)}</span>
                        <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="flex items-center gap-2"><span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">Step 3</span> Simulasi Tabungan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Income Bulanan</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-500 text-xs font-bold">Rp</span>
                    <input type="number" placeholder="Gaji" className="w-full p-3 pl-8 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-xs outline-none focus:border-purple-500 font-mono" value={monthlyIncome} onChange={e => setMonthlyIncome(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                    <span>Rasio Tabungan</span>
                    <span className="text-purple-600 dark:text-purple-400">{savingPercent}%</span>
                  </label>
                  <input type="range" min="5" max="100" step="5" value={savingPercent} onChange={e => setSavingPercent(Number(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-500 mt-2" />
                  <p className="text-[10px] text-gray-500 font-mono mt-2 text-right">Potongan: {formatRp(capacity)}/bln</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input type="checkbox" className="w-4 h-4 accent-purple-600 dark:accent-purple-500" checked={isCredit} onChange={e => setIsCredit(e.target.checked)} />
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Percent size={14}/> Skema DP / Kredit</span>
                </label>
                {isCredit && (
                  <div className="pl-7 pt-2 border-t border-gray-200 dark:border-gray-800/50">
                    <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                      <span>Berapa Persen DP?</span>
                      <span className="text-orange-600 dark:text-orange-400">{dpPercent}% dari Total</span>
                    </label>
                    <input type="range" min="10" max="90" step="5" value={dpPercent} onChange={e => setDpPercent(Number(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-600 dark:accent-orange-500" />
                  </div>
                )}
              </div>

              <div className="bg-purple-50 dark:bg-[#121212] border border-purple-200 dark:border-purple-900/30 rounded-xl p-5 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>Grand Total (+10% Inflasi)</span>
                  <span className="font-mono">{formatRp(grandTotal)}</span>
                </div>
                {isCredit && (
                  <div className="flex justify-between items-center text-xs text-orange-600 dark:text-orange-400 border-t border-gray-300 dark:border-gray-800/50 pt-2 mt-2">
                    <span className="font-bold">Target DP ({dpPercent}%)</span>
                    <span className="font-mono font-bold">{formatRp(targetFund)}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-1 flex items-center gap-1"><SlidersHorizontal size={10}/> Adaptive Timeline</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{etaMonths > 0 ? `${etaMonths} Bulan` : 'Menunggu Input...'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-1">Kesulitan</p>
                    <p className={`text-xs font-bold ${difficulty.color}`}>{difficulty.level}</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleSaveWish} className="w-full mt-8 py-4 font-bold bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-xl transition-all flex justify-center items-center gap-2 shadow-xl">
              <Rocket size={18} /> Kunci Proyek & Mulai
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: ACTIVE PROJECTS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white uppercase tracking-wide">
              <Target className="text-purple-600 dark:text-purple-500" size={20} /> Active Projects
            </h3>
          </div>

          {loading ? (
            <div className="p-10 text-center animate-pulse text-gray-500 font-mono text-sm">Menyelaraskan data...</div>
          ) : (
            <div className="space-y-6">
              {wishes.map((wish) => {
                const wishSubtotal = wish.items.reduce((acc: number, item: any) => acc + (item.price * item.qty), 0);
                const wishGrandTotal = wishSubtotal * 1.10; 
                const currentTargetFund = wish.is_credit ? wishGrandTotal * ((wish.dp_percentage || 100) / 100) : wishGrandTotal;
                
                const isComplete = wish.saved_amount >= currentTargetFund;
                const pct = Math.min((wish.saved_amount / currentTargetFund) * 100, 100) || 0;

                return (
                  <div key={wish.id} className={`bg-white dark:bg-[#151515] border rounded-3xl relative overflow-hidden transition-all shadow-lg ${isComplete ? 'border-green-400 dark:border-green-500/50' : 'border-gray-200 dark:border-gray-800/80'}`}>
                    
                    {wish.image_url && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-40 bg-cover bg-center opacity-10 dark:opacity-30 mix-blend-luminosity dark:mix-blend-luminosity" style={{backgroundImage: `url(${wish.image_url})`}} />
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-white dark:to-[#151515]" />
                      </>
                    )}

                    {isComplete && <div className="absolute top-0 right-0 p-4 bg-green-50 dark:bg-green-500/20 rounded-bl-3xl border-b border-l border-green-200 dark:border-green-500/50 z-20"><CheckCircle2 className="text-green-600 dark:text-green-500" /></div>}

                    {/* TOMBOL SUREN / HAPUS (Ditampilkan hanya jika belum komplit) */}
                    {!isComplete && (
                      <div className="absolute top-4 right-4 z-20">
                         <button 
                           onClick={() => triggerTrashOrSuren(wish.id, wish.saved_amount, wish.title)} 
                           className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-[#121212]/80 hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 border border-gray-200 dark:border-gray-800 rounded-lg transition-all shadow-sm backdrop-blur-sm" 
                           title={wish.saved_amount > 0 ? "Suren & Tarik Dana" : "Hapus Proyek"}
                         >
                           {wish.saved_amount > 0 ? <Flag size={14} /> : <Trash2 size={14} />}
                           {wish.saved_amount > 0 && <span className="text-xs font-bold mr-1">Suren</span>}
                         </button>
                      </div>
                    )}

                    <div className="p-6 md:p-7 relative z-10">
                      <div className="mb-6 pr-12">
                        <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-2 drop-shadow-md">{wish.title}</h4>
                        {wish.motivation_note && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic flex items-start gap-2 mb-4 bg-gray-50 dark:bg-black/40 p-3 rounded-lg border border-gray-200 dark:border-gray-800/50 backdrop-blur-sm">
                            <Quote size={14} className="text-purple-600 dark:text-purple-500 shrink-0 mt-0.5"/> "{wish.motivation_note}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                          <span className="bg-gray-100 dark:bg-[#1A1A1A] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center gap-1.5"><Wallet size={12} className="text-purple-600 dark:text-purple-500"/> {wish.target_bank}</span>
                          <span className="bg-gray-100 dark:bg-[#1A1A1A] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800">Kapasitas: {formatRp(wish.savings_capacity)}/bln</span>
                          {wish.is_credit && <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50">DP: {wish.dp_percentage}%</span>}
                        </div>
                      </div>

                      <div className="space-y-3 mt-8">
                        <div className="flex justify-between items-end text-sm font-bold tracking-wide">
                          <span className="text-gray-900 dark:text-white">{pct.toFixed(1)}% <span className="text-gray-500 text-xs font-normal">Menuju {wish.is_credit ? 'DP' : 'Impian'}</span></span>
                        </div>
                        <div className="relative h-4 w-full bg-gray-200 dark:bg-[#121212] rounded-full overflow-hidden border border-gray-300 dark:border-gray-800 shadow-inner">
                          <div className={`absolute h-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-fuchsia-400 dark:from-purple-600 dark:to-fuchsia-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mt-6 pt-5 border-t border-gray-200 dark:border-gray-800/50">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">Dana {wish.is_credit ? 'DP ' : ''}Terkumpul</p>
                          <p className="font-mono font-bold text-gray-900 dark:text-white text-xl">{formatRp(wish.saved_amount)} <span className="text-sm text-gray-500">/ {formatRp(currentTargetFund)}</span></p>
                        </div>
                        
                        {/* KONDISI TOMBOL: JIKA SELESAI VS BELUM SELESAI */}
                        {isComplete ? (
                          <button 
                            onClick={() => handleSuccessProject(wish.id)}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all text-sm font-bold w-full sm:w-auto shadow-lg shadow-green-500/20"
                          >
                            <CheckCircle2 size={18} /> Eksekusi Pembelian
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSetorModal({ isOpen: true, wishId: wish.id, wishTitle: wish.title, targetFund: currentTargetFund, currentSaved: wish.saved_amount, sourceWalletId: '', amount: '' })}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-300 rounded-xl transition-all text-sm font-bold w-full sm:w-auto shadow-lg"
                          >
                            <Plus size={16} /> Setor Dana
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {wishes.length === 0 && (
                <div className="p-10 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl text-center text-gray-500 text-sm">
                  Belum ada proyek aktif. Rancang mimpimu sekarang!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: SETOR DANA */}
      {setorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[32px] shadow-2xl max-w-sm w-full border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                  <Wallet size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white italic uppercase tracking-tight">Deposit Funds</h3>
              </div>
              <button onClick={() => setSetorModal(p => ({...p, isOpen: false}))} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Node (Debit)</label>
                <select className="w-full p-4 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 cursor-pointer transition-all" value={setorModal.sourceWalletId} onChange={e => setSetorModal({...setorModal, sourceWalletId: e.target.value})}>
                  <option value="" disabled>Pilih Dompet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} - {formatRp(w.balance)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantum Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-500 font-bold text-sm">Rp</span>
                  <input autoFocus type="number" placeholder="0" className="w-full p-4 pl-12 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-purple-500 font-mono text-lg" value={setorModal.amount} onChange={e => setSetorModal({...setorModal, amount: e.target.value})} />
                </div>
              </div>
            </div>
            <button onClick={handleExecuteSetor} disabled={!setorModal.sourceWalletId || !setorModal.amount} className="w-full py-4 font-black rounded-2xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-xl shadow-purple-500/20 uppercase tracking-widest text-xs transition-all">
              <ArrowRightLeft size={18}/> Execute Sync
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: SUREN & REFUND */}
      {surenModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181818] p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <Flag size={28} className="text-red-500" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Batal Proyek</h3>
              </div>
              <button onClick={() => setSurenModal(p => ({...p, isOpen: false}))} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Kamu akan membatalkan <span className="font-bold text-gray-900 dark:text-white">{surenModal.wishTitle}</span>. Uang sebesar <span className="font-bold text-green-500 font-mono">{formatRp(surenModal.savedAmount)}</span> akan dikembalikan.
            </p>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Kembalikan Uang Ke</label>
                <select className="w-full p-3.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-red-500 cursor-pointer" value={surenModal.targetWalletId} onChange={e => setSurenModal({...surenModal, targetWalletId: e.target.value})}>
                  <option value="" disabled>Pilih Dompet / Rekening</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleExecuteSuren} disabled={!surenModal.targetWalletId} className="w-full py-3.5 font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              <Flag size={18}/> Tarik Dana & Hapus Proyek
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: GLOBAL CONFIRM (Untuk Hapus Proyek yang 0 Rupiah) */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[32px] shadow-2xl max-w-sm w-full border-2 border-gray-200 dark:border-white/5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${modal.type === 'alert' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                {modal.type === 'alert' ? <ShieldAlert size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-wider">{modal.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">{modal.message}</p>
            </div>
            
            <div className="flex gap-3">
              {modal.type !== 'alert' && (
                <button onClick={modal.onCancel} className="flex-1 px-5 py-3 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 dark:text-gray-400 rounded-xl transition-colors">Batal</button>
              )}
              <button onClick={modal.onConfirm} className={`flex-[2] px-5 py-3 text-xs font-black rounded-xl text-white uppercase tracking-widest transition-all shadow-lg ${modal.type === 'confirm' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-gray-900 dark:bg-white dark:text-black'}`}>
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DreamSandboxPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-mono text-gray-500 animate-pulse">Menghubungkan ruang mimpi...</div>}>
      <DreamSandboxContent />
    </Suspense>
  );
}