"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Plus, X, HandCoins, AlertCircle, Edit2, Check, BookOpenCheck } from 'lucide-react';

export default function RecurringGoalsPage() {
  const [budgetLimits, setBudgetLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Form Tambah Anggaran
  const [isAdding, setIsAdding] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', limit_amount: '', description: '' });

  // State Form Edit Batas
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');

  // State Modal Konfirmasi
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', data: null as any });

  const fetchData = async () => {
    setLoading(true);
    // Tarik data batas anggaran dari database
    const { data: limitsData } = await supabase.from('budget_limits').select('*').order('name');
    if (limitsData) setBudgetLimits(limitsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- FUNGSI TAMBAH ANGGARAN ---
  const handleAddBudget = async () => {
    if (!newBudget.name || !newBudget.limit_amount) return;
    
    await supabase.from('budget_limits').insert([{
      name: newBudget.name,
      limit_amount: Number(newBudget.limit_amount),
      description: newBudget.description
    }]);
    
    setIsAdding(false);
    setNewBudget({ name: '', limit_amount: '', description: '' });
    fetchData();
  };

  // --- FUNGSI EDIT BATAS ---
  const handleUpdateLimit = async (id: string) => {
    if (!editLimit) return;
    
    await supabase.from('budget_limits')
      .update({ limit_amount: Number(editLimit) })
      .eq('id', id);
    
    setEditingId(null);
    setEditLimit('');
    fetchData();
  };

  // --- FUNGSI HAPUS ANGGARAN ---
  const handleDelete = async (id: string, name: string) => {
    if(confirm(`Yakin ingin menghapus kategori anggaran "${name}"? Seluruh pencatatan transaksi sebelumnya tidak akan terhapus, namun tidak akan dipantau lagi.`)) {
      await supabase.from('budget_limits').delete().eq('id', id);
      fetchData();
    }
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  
  // Total audit untuk dasbor recap
  const totalLimit = budgetLimits.reduce((sum, sub) => sum + Number(sub.limit_amount), 0);

  // Ikon-ikon untuk kartu Kamus Kategori
  const CATEGORY_ICONS: Record<string, string> = {
    'Konsumsi': '🍔',
    'Lifestyle': '👕',
    'Operasional': '⛽',
    'default': '📊'
  };

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Memuat Sistem Anggaran...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Recurring Goals & Budgets 🎯</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manajemen batas anggaran bulanan dan penjelasan kategori.</p>
      </header>

      {/* --- DASBOR RECAP & KAMUS KATEGORI --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        
        {/* Kartu Kiri: Total Beban Bulanan */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900/80 dark:to-indigo-900/80 border border-transparent dark:border-blue-800 p-8 rounded-2xl shadow-lg text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-2">
                <AlertCircle size={16} /> Subscription Audit & Target Anggaran (Total Bulanan)
              </p>
              <p className="text-4xl font-bold tracking-tight">{formatRupiah(totalLimit)} <span className="text-base font-normal opacity-80">/ bulan</span></p>
            </div>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-gray-100 font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              {isAdding ? 'Batal' : <><Plus size={18} /> Tambah Anggaran</>}
            </button>
          </div>
        </div>

        {/* --- KARTU KANAN: KAMUS KATEGORI (ISI AREA KOSONG) --- */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hiddentransition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2"><BookOpenCheck size={20}/> Kamus Kategori Pengeluaran</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 h-32 overflow-y-auto">
            {budgetLimits.length === 0 ? (
              <p className="p-6 text-center text-gray-500 text-sm">Belum ada kategori anggaran.</p>
            ) : (
              budgetLimits.map(sub => (
                <div key={sub.id} className="p-4 flex flex-col md:flex-row items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/50 transition-colors">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-400">
                      {CATEGORY_ICONS[sub.name] || CATEGORY_ICONS['default']}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-md">{sub.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{sub.description || 'Kategori operasional bulanan.'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- FORM TAMBAH ANGGARAN --- */}
      {isAdding && (
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm transition-colors">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Target size={18}/> Daftarkan Kategori Anggaran Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Nama (ex: Kesehatan)</label>
              <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newBudget.name} onChange={e => setNewBudget({...newBudget, name: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Batas Bulanan (Rp)</label>
              <input type="number" className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newBudget.limit_amount} onChange={e => setNewBudget({...newBudget, limit_amount: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Penjelasan Singkat (Opsional)</label>
              <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-[#2A2A2A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newBudget.description} onChange={e => setNewBudget({...newBudget, description: e.target.value})} />
            </div>
            <div className="col-span-1">
              <button onClick={handleAddBudget} className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                Simpan Anggaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIST TARGET ANGGARAN AKTIF (THRESHOLD & EDIT) --- */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Active Budget Targets</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 h-64 overflow-y-auto">
          {budgetLimits.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">Belum ada target anggaran yang didaftarkan.</p>
          ) : (
            budgetLimits.map(sub => {
              const isEditing = editingId === sub.id;

              return (
                <div key={sub.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/50 transition-colors">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-400">
                      {CATEGORY_ICONS[sub.name] || CATEGORY_ICONS['default']}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{sub.name}</h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1 mt-1">
                        🎯 Batas: {formatRupiah(sub.limit_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
                    <div className="text-right flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input type="number" autoFocus className="p-2 text-xs bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white w-24 outline-none focus:ring-1 focus:ring-blue-500" value={editLimit} onChange={e => setEditLimit(e.target.value)} />
                          <button onClick={() => handleUpdateLimit(sub.id)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"><X size={14}/></button>
                        </div>
                      ) : (
                        <p className="font-bold text-2xl text-gray-900 dark:text-white">{formatRupiah(sub.limit_amount)}</p>
                      )}
                      
                      {!isEditing && (
                        <button 
                          onClick={() => { setEditingId(sub.id); setEditLimit(sub.limit_amount.toString()); }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit Batas Anggaran"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    {!isEditing && (
                      <button 
                        onClick={() => setModal({
                          isOpen: true, title: 'Hapus Kategori', 
                          message: `Yakin ingin menghapus kategori anggaran "${sub.name}"?`,
                          data: { id: sub.id, name: sub.name }
                        })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Hapus Kategori Anggaran"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-800 text-center relative overflow-hidden transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{modal.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{modal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => handleDelete(modal.data.id, modal.data.name)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}