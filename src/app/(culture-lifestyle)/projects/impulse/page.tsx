"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Snowflake, ShieldAlert, Clock, 
  CheckCircle2, XCircle, ShoppingCart, 
  ThermometerSnowflake, Flame, Target
} from 'lucide-react';

const formatRp = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

export default function AntiImpulseEnginePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // FORM STATE
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [priority, setPriority] = useState('Nice-to-Have');

  const fetchData = async () => {
    setLoading(true);
    // 1. Ambil KTP user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Kunci tarikan data hanya untuk barang user ini
    const { data } = await supabase
      .from('impulse_carts')
      .select('*')
      .eq('user_id', user.id) // <--- KUNCI KEAMANAN
      .order('created_at', { ascending: false });
      
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    // Live Timer Engine
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFreezeItem = async () => {
    if (!itemName || !itemPrice) return alert("Masukkan nama barang dan harganya!");
    
    // 3. Tarik KTP sebelum menyimpan
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('impulse_carts').insert([{
      user_id: user.id, // <--- SUNTIKAN KTP KEPEMILIKAN
      item_name: itemName,
      price: Number(itemPrice),
      priority: priority,
      status: 'cooling'
    }]);

    setItemName(''); setItemPrice(''); setPriority('Nice-to-Have');
    fetchData();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 4. Kunci ganda saat update status (Reject/Approve)
    await supabase.from('impulse_carts')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('user_id', user.id); // <--- KUNCI UPDATE
      
    fetchData();
  };

  // ENGINE: LEMPAR KE SANDBOX
  const handleMakeGoal = async (item: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 5. Ubah status jadi goal (dengan kunci ganda)
    await supabase.from('impulse_carts')
      .update({ status: 'goal' })
      .eq('id', item.id)
      .eq('user_id', user.id); // <--- KUNCI UPDATE
    
    // Redirect ke Sandbox bawa parameter data
    router.push(`/projects/wish?title=${encodeURIComponent(item.item_name)}&price=${item.price}`);
  };

  const getCountdown = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    const unlockTime = createdTime + (24 * 60 * 60 * 1000); // +24 Jam
    const timeLeft = unlockTime - currentTime;

    if (timeLeft <= 0) return { locked: false, text: "Ready for Verdict" };

    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return { 
      locked: true, 
      text: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` 
    };
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 font-mono text-sm">Menyalakan Mesin Pendingin...</div>;

  const coolingItems = items.filter(i => i.status === 'cooling');
  const rejectedItems = items.filter(i => i.status === 'rejected');
  const moneySaved = rejectedItems.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 relative">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Anti-Impulse Engine <Snowflake className="text-cyan-600 dark:text-cyan-400" size={28} />
          </h2>
          <p className="text-gray-500 mt-1 text-xs md:text-sm">Filter Prioritas & Ruang Karantina Dopamin 24 Jam.</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 px-5 py-3 rounded-xl transition-colors">
          <p className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-widest mb-1">Uang Terselamatkan</p>
          <p className="text-xl font-mono font-black text-green-700 dark:text-green-400">{formatRp(moneySaved)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* ========================================= */}
        {/* KOLOM KIRI: INPUT THE FREEZER             */}
        {/* ========================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <ThermometerSnowflake className="text-cyan-600 dark:text-cyan-500" size={20} /> Karantina Barang
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Punya keinginan impulsif untuk *checkout* keranjang *e-commerce*? Masukkan ke sini dan biarkan otakmu mendingin selama 24 jam.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Nama Barang Keinginan</label>
                <input 
                  placeholder="Contoh: Sepatu Nike Air Jordan" 
                  className="w-full p-3.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                  value={itemName} onChange={e => setItemName(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Estimasi Harga</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-bold">Rp</span>
                  <input 
                    type="number" placeholder="2500000" 
                    className="w-full p-3.5 pl-12 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:border-cyan-500 outline-none font-mono transition-colors"
                    value={itemPrice} onChange={e => setItemPrice(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Priority Ranking</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPriority('Nice-to-Have')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      priority === 'Nice-to-Have' 
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-500/50 text-purple-700 dark:text-purple-400 shadow-sm' 
                      : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Flame size={18} />
                    <span className="text-xs font-bold">Nice-to-Have</span>
                  </button>
                  <button 
                    onClick={() => setPriority('Must-Have')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      priority === 'Must-Have' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-400 shadow-sm' 
                      : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ShieldAlert size={18} />
                    <span className="text-xs font-bold">Must-Have</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={handleFreezeItem}
                className="w-full mt-4 py-4 font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Snowflake size={18} /> Bekukan Barang Ini (24 Jam)
              </button>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* KOLOM KANAN: THE FREEZER (COOLING ZONE)   */}
        {/* ========================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-cyan-50 dark:bg-[#12181F] border border-cyan-200 dark:border-cyan-900/30 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-cyan-200 dark:border-cyan-900/50 pb-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-cyan-800 dark:text-cyan-400 uppercase tracking-wide">
                <Clock className="text-cyan-600" size={20} /> The Cooling Zone
              </h3>
              <span className="text-xs font-bold bg-cyan-200 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 px-3 py-1 rounded-full">
                {coolingItems.length} Menunggu
              </span>
            </div>

            <div className="space-y-4">
              {coolingItems.map(item => {
                const { locked, text } = getCountdown(item.created_at);
                const isMust = item.priority === 'Must-Have';

                return (
                  <div key={item.id} className="bg-white dark:bg-[#1A1E24] border border-cyan-200 dark:border-cyan-900/50 rounded-2xl p-5 relative overflow-hidden transition-colors shadow-sm">
                    {locked && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.item_name}</h4>
                        <div className="flex gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${isMust ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50'}`}>
                            {item.priority}
                          </span>
                          <span className="text-[10px] font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#121212] px-2 py-1 rounded border border-gray-200 dark:border-gray-800">
                            {formatRp(item.price)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right w-full sm:w-auto">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status Karantina</p>
                        <div className={`inline-flex items-center gap-1.5 font-mono font-black text-xl px-3 py-1.5 rounded-lg border ${locked ? 'bg-cyan-50 dark:bg-[#12181F] text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-800'}`}>
                          {locked ? <Clock size={16} className="animate-pulse" /> : <CheckCircle2 size={16} />}
                          {text}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                      <button 
                        disabled={locked}
                        onClick={() => handleUpdateStatus(item.id, 'rejected')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400"
                      >
                        <XCircle size={16}/> Tolak Beli
                      </button>
                      <button 
                        disabled={locked}
                        onClick={() => handleMakeGoal(item)}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400"
                      >
                        <Target size={16}/> Jadikan Goal
                      </button>
                      <button 
                        disabled={locked}
                        onClick={() => handleUpdateStatus(item.id, 'approved')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                      >
                        <ShoppingCart size={16}/> Beli Langsung
                      </button>
                    </div>
                  </div>
                );
              })}

              {coolingItems.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-cyan-200 dark:border-cyan-900/50 rounded-2xl">
                  <Snowflake className="mx-auto text-cyan-300 dark:text-cyan-800 mb-3" size={32} />
                  <p className="text-sm text-cyan-700 dark:text-cyan-600">Tidak ada barang di dalam Freezer.</p>
                </div>
              )}
            </div>
          </div>

          {/* THE VERDICT HISTORY */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
             <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
               <ShieldAlert className="text-green-500" size={16} /> Riwayat Keputusan Logis
             </h3>
             
             <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
               {items.filter(i => i.status !== 'cooling').map(item => (
                 <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl transition-colors">
                   <div>
                     <p className={`text-sm font-bold ${item.status === 'rejected' ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-900 dark:text-white'}`}>{item.item_name}</p>
                     <p className="text-xs text-gray-500 font-mono mt-0.5">{formatRp(item.price)}</p>
                   </div>
                   <div className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-bold border ${
                     item.status === 'rejected' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-800' : 
                     item.status === 'goal' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' :
                     'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-800'
                   }`}>
                     {item.status === 'rejected' ? 'Dibatalkan' : item.status === 'goal' ? 'Masuk Sandbox' : 'Dibeli'}
                   </div>
                 </div>
               ))}
               {items.filter(i => i.status !== 'cooling').length === 0 && (
                  <p className="text-xs text-gray-500 italic">Belum ada riwayat keputusan.</p>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}