"use client";

import { useState } from 'react';
import { Send, Loader2, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // <--- Wajib import Supabase

export default function TransactionInput() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);

    try {
      // 1. Ambil identitas user yang sedang mengetik
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Autentikasi gagal. Silakan login ulang.");
        setLoading(false);
        return;
      }

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Catat transaksi ini: ${input}`,
          userId: user.id, // <--- SUNTIKKAN USER ID KE DALAM PAYLOAD UNTUK AI
          metrics: { totalLiquidity: 0, totalLocked: 0 } 
        })
      });

      setInput('');
      window.location.reload(); // Paksa reload agar tabel Ledger terupdate instan
    } catch (error) {
      console.error("Gagal mencatat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cth: Gaji masuk BCA 5jt..."
          rows={3}
          disabled={loading}
          className="w-full resize-none bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white text-sm p-3.5 pr-10 rounded-2xl border border-gray-200 dark:border-gray-800 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1A1A1A] transition-all shadow-inner disabled:opacity-50 no-scrollbar"
        />
        <Bot size={16} className="absolute top-4 right-4 text-gray-400 opacity-50" />
      </div>

      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-md disabled:cursor-not-allowed"
      >
        {loading ? <><Loader2 className="animate-spin" size={16} /> Sedang Menyimpan...</> : <><Send size={16} /> Eksekusi AI</>}
      </button>
    </form>
  );
}