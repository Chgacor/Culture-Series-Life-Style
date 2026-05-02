"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Activity, Battery, Droplets, Moon, 
  Wallet, Brain, Flame, Zap, Coffee, 
  CloudRain, ShieldCheck, Check
} from 'lucide-react';

// Definisi Protokol (Habit)
const CORE_PROTOCOLS = [
  { id: 'hydration', name: 'Hidrasi Optimal (2L+)', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500' },
  { id: 'recovery', name: 'Recovery (Tidur 7+ Jam)', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500' },
  { id: 'finance', name: 'Finance Firewall (No-Spend)', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { id: 'learning', name: 'Neural Expand (Baca Buku)', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500' },
];

const MOODS = [
  { id: 'flow', name: 'Flow State', icon: Flame, color: 'text-orange-500', border: 'border-orange-500/50' },
  { id: 'calm', name: 'Calm & Clear', icon: Droplets, color: 'text-blue-500', border: 'border-blue-500/50' },
  { id: 'anxious', name: 'Chaotic / Anxious', icon: CloudRain, color: 'text-gray-400', border: 'border-gray-600/50' },
  { id: 'burnout', name: 'Fatigue / Burnout', icon: Battery, color: 'text-red-500', border: 'border-red-500/50' },
];

export default function SystemHealthPage() {
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState({
    energy_level: 80,
    mood: 'calm',
    protocols_met: [] as string[]
  });

  const getLocalToday = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const today = getLocalToday();

  // ==========================================
  // ENGINE: FETCH DATA
  // ==========================================
  const fetchTelemetry = async () => {
    setLoading(true);
    const { data } = await supabase.from('daily_telemetry').select('*').eq('date', today).single();
    
    if (data) {
      setTelemetry({
        energy_level: data.energy_level,
        mood: data.mood,
        protocols_met: data.protocols_met || []
      });
    } else {
      // Jika belum ada log hari ini, buat baru di background
      await supabase.from('daily_telemetry').insert([{ date: today }]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTelemetry(); }, []);

  // ==========================================
  // ENGINE: UPDATE DATA
  // ==========================================
  const updateTelemetry = async (updates: any) => {
    const newState = { ...telemetry, ...updates };
    setTelemetry(newState); // Optimistic UI update
    await supabase.from('daily_telemetry').update(updates).eq('date', today);
  };

  const toggleProtocol = (protocolId: string) => {
    const isMet = telemetry.protocols_met.includes(protocolId);
    const newProtocols = isMet 
      ? telemetry.protocols_met.filter(id => id !== protocolId)
      : [...telemetry.protocols_met, protocolId];
    
    updateTelemetry({ protocols_met: newProtocols });
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 font-mono text-sm">Membaca metrik sistem tubuh...</div>;

  const protocolScore = Math.round((telemetry.protocols_met.length / CORE_PROTOCOLS.length) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white flex items-center gap-3">
            System Health <Activity className="text-emerald-500" size={28} />
          </h2>
          <p className="text-gray-500 mt-1 text-sm font-mono">Telemetry Data: {today}</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#181818] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <ShieldCheck size={32} className={protocolScore === 100 ? 'text-emerald-500' : 'text-gray-600'} />
          <div>
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-widest mb-1">System Integrity</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-black dark:text-white leading-none">{protocolScore}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KOLOM KIRI: CORE PROTOCOLS (Habits & Finance) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
            <Zap className="text-yellow-500" size={20} />
            <h3 className="font-bold text-lg text-black dark:text-white uppercase tracking-wide">Core Protocols</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {CORE_PROTOCOLS.map(protocol => {
              const Icon = protocol.icon;
              const isActive = telemetry.protocols_met.includes(protocol.id);

              return (
                <div 
                  key={protocol.id} 
                  onClick={() => toggleProtocol(protocol.id)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                    isActive 
                    ? 'bg-gray-50 dark:bg-[#181818] border-gray-300 dark:border-gray-700 shadow-sm' 
                    : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isActive ? `${protocol.bg} bg-opacity-10` : 'bg-gray-100 dark:bg-[#1A1A1A]'}`}>
                      <Icon size={24} className={isActive ? protocol.color : 'text-gray-400 dark:text-gray-600'} />
                    </div>
                    <div>
                      <h4 className={`font-bold ${isActive ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{protocol.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-600 font-mono mt-0.5">
                        Status: {isActive ? <span className={protocol.color}>OPTIMAL</span> : 'STANDBY'}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isActive ? `border-transparent ${protocol.bg}` : 'border-gray-300 dark:border-gray-700'
                  }`}>
                    {isActive && <Check size={16} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* FINANCE MINI-DASHBOARD (Optional visual flavor) */}
          <div className="bg-gray-50 dark:bg-[#181818] border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 opacity-5"><Wallet size={120} /></div>
             <h4 className="text-emerald-600 dark:text-emerald-500 font-bold text-sm uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet size={16}/> Finance Log</h4>
             <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Jika hari ini kamu berhasil menahan diri untuk tidak membeli kopi luar, jajanan, atau *checkout e-commerce*, centang "Finance Firewall" di atas.</p>
             <div className="h-1 w-full bg-gray-200 dark:bg-[#121212] rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${telemetry.protocols_met.includes('finance') ? 'w-full bg-emerald-500' : 'w-0'}`}></div>
             </div>
          </div>
        </div>

        {/* KOLOM KANAN: ENERGY & MOOD MATRIX */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
            <Battery className="text-blue-500" size={20} />
            <h3 className="font-bold text-lg text-black dark:text-white uppercase tracking-wide">Energy & Mood Matrix</h3>
          </div>

          {/* ENERGY SLIDER */}
          <div className="bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-black dark:text-white font-bold">Kapasitas Energi</h4>
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">Berapa sisa tenaga fisik & mentalmu hari ini?</p>
              </div>
              <span className={`text-2xl font-black font-mono ${telemetry.energy_level < 30 ? 'text-red-500' : telemetry.energy_level > 70 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                {telemetry.energy_level}%
              </span>
            </div>
            
            <input 
              type="range" 
              min="0" max="100" step="5"
              value={telemetry.energy_level}
              onChange={(e) => updateTelemetry({ energy_level: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-[#121212] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest">
              <span>Low (Exhausted)</span>
              <span>High (Ready to Grind)</span>
            </div>
          </div>

          {/* MOOD SELECTOR */}
          <div className="grid grid-cols-2 gap-4">
            {MOODS.map(mood => {
              const Icon = mood.icon;
              const isSelected = telemetry.mood === mood.id;

              return (
                <button
                  key={mood.id}
                  onClick={() => updateTelemetry({ mood: mood.id })}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    isSelected 
                    ? `bg-gray-50 dark:bg-[#181818] ${mood.border} shadow-lg` 
                    : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon size={28} className={`mb-3 ${isSelected ? mood.color : 'text-gray-400 dark:text-gray-600'}`} />
                  <h4 className={`font-bold text-sm ${isSelected ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{mood.name}</h4>
                </button>
              );
            })}
          </div>

          {/* AI INSIGHT SIMULATION */}
          <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex gap-4 items-start">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-500 rounded-lg shrink-0"><Brain size={20}/></div>
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-1">System Analysis</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {telemetry.mood === 'burnout' || telemetry.energy_level < 40 
                  ? "Sistem mendeteksi tingkat energi yang rendah. Kurangi beban 'Time-Block' hari ini dan fokuskan pada protokol Recovery (Tidur)."
                  : telemetry.mood === 'flow' && telemetry.energy_level > 70
                  ? "Kondisi optimal. Ini adalah momen yang tepat untuk mengeksekusi tugas berat seperti Kriptografi atau Laravel Deep Dive."
                  : "Kondisi stabil. Pertahankan ritme kerja dan pastikan asupan cairan tubuh (Hidrasi) terpenuhi untuk menjaga fokus."
                }
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}