"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, LogOut, Brain, Activity, Shield, 
  Users, CalendarClock, ChevronRight, Zap
} from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error("Gagal memuat profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Inisiasi pemutusan koneksi (Log Out)?")) {
      await supabase.auth.signOut();
      router.push('/auth');
    }
  };

  if (loading) {
    return <div className="p-20 text-center animate-pulse text-gray-500 font-mono">EXTRACTING IDENTITY...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
      
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            Identity Card <Shield className="text-blue-600 dark:text-blue-500" size={32} />
          </h2>
          <p className="text-gray-500 mt-2 text-sm font-mono uppercase tracking-widest">Culture Series // User Authorization</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500 font-bold rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors shadow-sm"
        >
          <LogOut size={16} /> <span className="hidden md:inline">Disconnect</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COL 1: PROFILE INFO */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-200 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User size={100} />
            </div>
            
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-6 shadow-lg shadow-blue-500/20 relative z-10">
              {profile?.full_name?.charAt(0) || '?'}
            </div>
            
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Architect Name</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{profile?.full_name || 'Unknown Entity'}</h3>
            </div>

            <div className="space-y-1 mt-4 relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comm Link (Email)</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
                <Mail size={14} /> {profile?.email}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${profile?.role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'}`}>
                Clearance: {profile?.role || 'User'}
              </span>
            </div>
          </div>
        </div>

        {/* COL 2: MENTAL HEALTH & NETWORK PREVIEW */}
        <div className="md:col-span-2 space-y-6">
          
          {/* MENTAL HEALTH MODULE */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-[#151515] dark:to-[#1A1A1A] rounded-[24px] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="text-emerald-500" size={20} /> Kernel Status (Mental Health)
              </h3>
              <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded uppercase tracking-widest">
                Optimal
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={12}/> Focus Level</p>
                <div className="text-lg font-black text-gray-900 dark:text-white">High (Flow State)</div>
              </div>
              <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap size={12}/> Burnout Risk</p>
                <div className="text-lg font-black text-emerald-500">Low (12%)</div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed italic">
                "Kematian tidak datang sekali saja; ia datang sedikit demi sedikit setiap hari. Bagian dari hidup yang telah kita lalui sudah mati. Fokuslah pada hari ini."
              </p>
            </div>
            
            <button className="mt-4 w-full py-3 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#181818] rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors">
              + Update Kondisi Mental Hari Ini
            </button>
          </div>

          {/* INNER CIRCLE / NETWORK (COMING SOON) */}
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-blue-500" size={20} /> Inner Circle (Network)
                </h3>
                <p className="text-xs text-gray-500 mt-1">Sinkronisasi jadwal & status mental dengan rekan</p>
              </div>
              <button className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center justify-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-[#121212]">
              <div className="text-center">
                <CalendarClock size={32} className="text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">Protokol Jaringan Belum Aktif</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Segera hadir: Tambahkan rekan ke dalam lingkaran untuk memantau waktu luang dan mengajukan permohonan "Meetup".
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}