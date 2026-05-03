"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, TrendingUp, Zap, Coffee, 
  Tv, Trophy, History, ArrowRight, 
  Timer, AlertCircle, CheckCircle2,
  CreditCard, Pizza, Flame
} from 'lucide-react';

const formatRp = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Kebiasaan harian statis (karena ini bukan langganan tetap bank, tapi bocor halus)
const DAILY_HABITS = [
  { id: 'coffee', name: 'Kopi Harian (20rb/hari)', monthly: 600000, icon: Coffee, type: 'habit' },
  { id: 'jajan', name: 'Jajanan / GoFood Iseng', monthly: 450000, icon: Pizza, type: 'habit' },
];

export default function OracleScenariosPage() {
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [goldGrams, setGoldGrams] = useState(0);
  const [goldPriceSell, setGoldPriceSell] = useState(0);
  
  // DYNAMIC SACRIFICES STATE
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // SCENARIO STATE
  const [goldGrowthPrediction, setGoldGrowthPrediction] = useState(10);
  const [selectedSacrifices, setSelectedSacrifices] = useState<string[]>([]);

  const fetchOracleData = async () => {
    setLoading(true);
    
    // 0. WAJIB: Ambil KTP User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    // 1. Ambil Proyek (Hanya milik user)
    const { data: projects } = await supabase
      .from('wishes')
      .select('*')
      .eq('user_id', user.id) // <--- KUNCI 1
      .order('created_at', { ascending: false });
      
    if (projects) {
      setActiveProjects(projects.filter(p => p.saved_amount < p.target_fund));
      setCompletedProjects(projects.filter(p => p.saved_amount >= p.target_fund));
    }

    // 2. Ambil Total Emas & Harga (Hanya emas milik user)
    const { data: gold } = await supabase
      .from('gold_assets')
      .select('grams')
      .eq('user_id', user.id); // <--- KUNCI 2
      
    const totalGrams = gold?.reduce((sum, g) => sum + Number(g.grams), 0) || 0;
    setGoldGrams(totalGrams);

    try {
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      setGoldPriceSell(data.sell_price || 0);
    } catch (e) { console.error("Price fetch failed"); }

    // 3. Ambil Biaya Langganan (Hanya tagihan milik user)
    const { data: expenses } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id) // <--- KUNCI 3
      .order('amount', { ascending: false });
      
    if (expenses) {
      // Format data DB agar seragam dengan object Sacrifice
      const formattedSubs = expenses.map(e => ({
        id: e.id,
        name: e.name,
        monthly: Number(e.amount),
        icon: CreditCard, // Ikon default untuk langganan
        type: 'subscription'
      }));
      setSubscriptions(formattedSubs);
    }

    setLoading(false);
  };

  useEffect(() => { fetchOracleData(); }, []);

  const toggleSacrifice = (id: string) => {
    setSelectedSacrifices(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Gabungkan Langganan Real (DB) dengan Kebiasaan Harian
  const ALL_SACRIFICES = [...subscriptions, ...DAILY_HABITS];

  // Kalkulasi Total Pengorbanan
  const totalSacrificeMonthly = ALL_SACRIFICES
    .filter(s => selectedSacrifices.includes(s.id))
    .reduce((sum, s) => sum + s.monthly, 0);

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 font-mono text-sm">Consulting The Oracle...</div>;
  
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 relative">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Oracle Scenarios <Brain className="text-purple-600 dark:text-purple-400" size={28} />
          </h2>
          <p className="text-gray-500 mt-1 text-xs md:text-sm">Simulasi "What-If", Alokasi Strategis, dan Milestone Achievement.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* ========================================= */}
        {/* KOLOM KIRI: SCENARIO BUILDER (WHAT-IF)    */}
        {/* ========================================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* A. DYNAMIC PROJECTION: GOLD IMPACT */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-6">
              <TrendingUp className="text-yellow-600 dark:text-yellow-500" size={20} /> Asset Dynamic Projection
            </h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl transition-colors">
                <p className="text-[10px] text-yellow-700 dark:text-yellow-500 font-bold uppercase tracking-widest mb-2">Aset Terdeteksi: Emas</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{goldGrams}g</span>
                  <span className="text-sm font-mono text-gray-500">Value: {formatRp(goldGrams * goldPriceSell)}</span>
                </div>
              </div>

              <div>
                <label className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-4">
                  <span>Prediksi Kenaikan Emas (1 Thn)</span>
                  <span className="text-yellow-600 dark:text-yellow-500">+{goldGrowthPrediction}%</span>
                </label>
                <input 
                  type="range" min="0" max="50" step="5" 
                  value={goldGrowthPrediction} 
                  onChange={(e) => setGoldGrowthPrediction(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-600 dark:accent-yellow-500" 
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  "Jika harga emas naik <span className="text-yellow-600 dark:text-yellow-500 font-bold">{goldGrowthPrediction}%</span>, maka daya beli asetmu akan bertambah <span className="text-gray-900 dark:text-white font-bold">{formatRp((goldGrams * goldPriceSell) * (goldGrowthPrediction/100))}</span>. Ini bisa memangkas waktu proyek hingga 1-3 bulan tergantung target."
                </p>
              </div>
            </div>
          </div>

          {/* B. THE SACRIFICE INSIGHT (LIVE DATA) */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Flame className="text-red-600 dark:text-red-500" size={20} /> The Sacrifice Engine
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Analisis dampak penghentian biaya langganan & kebiasaan foya-foya terhadap mimpimu.</p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 no-scrollbar">
              {ALL_SACRIFICES.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">Belum ada data biaya langganan.</p>
              ) : (
                ALL_SACRIFICES.map(s => {
                  const Icon = s.icon;
                  const isActive = selectedSacrifices.includes(s.id);
                  const isSub = s.type === 'subscription';

                  return (
                    <button 
                      key={s.id} 
                      onClick={() => toggleSacrifice(s.id)}
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        isActive 
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40 shadow-sm' 
                        : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <Icon size={18} className={isActive ? 'text-red-600 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'} />
                        <div>
                          <span className={`text-sm font-bold block ${isActive ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{s.name}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${isSub ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                            {isSub ? 'Langganan Aktif' : 'Bocor Halus'}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-bold text-gray-900 dark:text-white sm:text-right">{formatRp(s.monthly)}<span className="text-[10px] text-gray-500 font-normal">/bln</span></span>
                    </button>
                  );
                })
              )}
            </div>

            {totalSacrificeMonthly > 0 && (
              <div className="mt-6 p-5 bg-gray-900 dark:bg-[#121212] text-white rounded-2xl space-y-3 border border-gray-800 shadow-inner transition-colors">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Potential Conversion (1 Tahun)</p>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-900/30 text-red-500 rounded-xl">
                    <ArrowRight size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white font-mono">{formatRp(totalSacrificeMonthly * 12)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uang ini bisa langsung dipindahkan ke Sinking Funds <span className="font-bold text-purple-400">Dream Sandbox</span>-mu sekarang juga.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* KOLOM KANAN: MILESTONES & HISTORY         */}
        {/* ========================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* A. TIME-TO-GOAL COUNTDOWN */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-6">
              <Timer className="text-blue-600 dark:text-blue-500" size={20} /> Time-to-Goal Dashboard
            </h3>

            <div className="space-y-4">
              {activeProjects.length > 0 ? activeProjects.map(p => {
                const sisaDana = p.target_fund - p.saved_amount;
                const sisaBulan = p.savings_capacity > 0 ? Math.ceil(sisaDana / p.savings_capacity) : 0;
                
                return (
                  <div key={p.id} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                        <Timer size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{p.title}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Estimasi Eksekusi</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-500">{sisaBulan} <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Bulan</span></p>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">Belum ada proyek aktif untuk diproyeksikan.</p>
              )}
            </div>
          </div>

          {/* B. HISTORY OF GROWTH (ACHIEVEMENTS) */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl transition-colors duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="text-purple-600 dark:text-purple-400" size={20} /> History of Growth
              </h3>
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold">
                {completedProjects.length} Wins
              </span>
            </div>

            <div className="space-y-4">
              {completedProjects.length > 0 ? completedProjects.map(p => (
                <div key={p.id} className="group flex items-center justify-between p-5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-purple-300 dark:hover:border-purple-500/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-500 rounded-xl shadow-inner">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{p.title}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">Completed: {new Date(p.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nilai Proyek</p>
                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{formatRp(p.target_fund)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                  <History className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={32} />
                  <p className="text-sm text-gray-500">Belum ada "Mini Wins". Selesaikan proyekmu di Dream Sandbox!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}