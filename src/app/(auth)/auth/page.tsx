"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Terminal, Mail, Lock, User, LogIn, UserPlus, Zap } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName } }
        });
        if (error) throw error;
        alert("Registrasi CultureOS berhasil! Silakan login menggunakan kredensial Anda.");
        setIsLogin(true);
        setForm({ ...form, password: '' });
      }
    } catch (error: any) {
      alert("Akses Ditolak: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Background dibikin murni gelap pekat permanen
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden text-white selection:bg-blue-500/30">
      
      {/* Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Auth Card: Hitam pekat dengan border tipis elegan */}
      <div className="w-full max-w-md bg-[#0F0F0F] rounded-[32px] shadow-2xl border border-[#1A1A1A] p-8 sm:p-10 relative z-10">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <Terminal size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">
            CULTURE<span className="text-blue-500 underline decoration-2 underline-offset-4 not-italic">OS</span>
          </h1>
          <p className="text-xs text-gray-500 mt-3 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
            <Zap size={14} className="text-orange-500"/> 
            {isLogin ? 'System Authentication' : 'Blueprint Registration'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User size={12}/> Full Name</label>
              <input 
                required 
                type="text" 
                placeholder="Architect Name" 
                className="w-full bg-[#141414] border border-[#222222] rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" 
                value={form.fullName} 
                onChange={e => setForm({...form, fullName: e.target.value})} 
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Mail size={12}/> Email Address</label>
            <input 
              required 
              type="email" 
              placeholder="admin@culture.series" 
              className="w-full bg-[#141414] border border-[#222222] rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Lock size={12}/> Security Key (Password)</label>
            <input 
              required 
              type="password" 
              minLength={6} 
              placeholder="••••••••" 
              className="w-full bg-[#141414] border border-[#222222] rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-mono" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
            />
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">PROCESSING...</span>
            ) : isLogin ? (
              <><LogIn size={18} /> INITIATE LOGIN</>
            ) : (
              <><UserPlus size={18} /> REGISTER ACCOUNT</>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#222222] text-center">
          <p className="text-sm text-gray-500">
            {isLogin ? "Belum memiliki otorisasi?" : "Sudah memiliki akses?"}{" "}
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-blue-500 font-bold hover:text-blue-400 hover:underline transition-all"
            >
              {isLogin ? "Daftar sebagai Architect" : "Login ke Sistem"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}