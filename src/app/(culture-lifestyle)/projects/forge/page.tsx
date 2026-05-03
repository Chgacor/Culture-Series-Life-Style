"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Hammer, Timer, Calendar, Target, Plus, 
  ChevronRight, Library, Zap, CheckCircle2,
  AlertTriangle, Globe, GitBranch, Code2, Trash2, Pencil
} from 'lucide-react';

const formatTgl = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TheForgePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

  // STATE FORM BARU: Dilengkapi Time-Blocking & Arsenal Vault
  const [newProject, setNewProject] = useState({
    title: '', category: 'Software Architecture', deadline: '', 
    daily_hours: '', start_time: '', 
    web_link: '', repo_link: '', asset_link: ''
  });

  const fetchForge = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('projects_forge')
      .select('*')
      .eq('user_id', user.id) // <--- GEMBOK KEAMANAN
      .order('created_at', { ascending: false });
      
    if (data) setProjects(data);
    setLoading(false);
  };

  useEffect(() => { fetchForge(); }, []);

  const handleEditClick = (project: any) => {
    setIsAdding(true);
    setEditingProject(project);
    // Pre-fill form with existing data
    setNewProject({
      title: project.title,
      category: project.category,
      deadline: new Date(project.deadline).toISOString().split('T')[0], // Format for date input
      daily_hours: project.tech_stack?.daily_hours || '',
      start_time: project.tech_stack?.start_time || '',
      web_link: project.tech_stack?.web || '',
      repo_link: project.tech_stack?.repo || '',
      asset_link: project.tech_stack?.asset || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. ENGINE KALKULASI WAKTU
      const tglDeadline = new Date(newProject.deadline);
      const tglSkrg = new Date();
      tglSkrg.setHours(0,0,0,0);
      
      const sisaHari = Math.max(Math.ceil((tglDeadline.getTime() - tglSkrg.getTime()) / (1000 * 3600 * 24)), 1);
      const dailyHours = Number(newProject.daily_hours);
      const totalTargetHours = dailyHours * sisaHari;

      // Kalkulasi End Time untuk Time Blocking Daily Hub
      const [startH, startM] = newProject.start_time.split(':').map(Number);
      const totalStartMins = startH * 60 + startM;
      const totalEndMins = totalStartMins + (dailyHours * 60);
      const endH = Math.floor(totalEndMins / 60) % 24;
      const endM = totalEndMins % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      // 2. PAYLOAD ARSENAL VAULT (JSON)
      const techStackPayload = {
        web: newProject.web_link,
        repo: newProject.repo_link,
        asset: newProject.asset_link,
        daily_hours: newProject.daily_hours,
        start_time: newProject.start_time,
      };

      await handleSaveProject(totalTargetHours, techStackPayload, endTime);
    } catch (err: any) {
      console.error("Critical Error Forge:", err);
      alert("Gagal merakit Blueprint Forge: " + err.message);
    }
  };

  const handleSaveProject = async (totalTargetHours: number, techStackPayload: any, endTime: string) => {
    try {
      // 1. WAJIB: Ambil KTP User sebelum melakukan operasi apa pun
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi telah habis. Silakan login kembali.");
        return;
      }

      if (editingProject) {
        // --- UPDATE LOGIC ---
        const { error: forgeError } = await supabase.from('projects_forge').update({
          title: newProject.title,
          category: newProject.category,
          deadline: newProject.deadline,
          target_hours: totalTargetHours,
          tech_stack: techStackPayload
        })
        .eq('id', editingProject.id)
        .eq('user_id', user.id); // <--- KUNCI UPDATE

        if (forgeError) throw forgeError;

        // Update corresponding task in Daily Hub (Aman karena dikunci user_id)
        const { error: taskError } = await supabase.from('life_tasks').update({
          title: `Forge: ${newProject.title}`,
          start_time: newProject.start_time,
          end_time: endTime,
          recurrence_end_date: newProject.deadline
        })
        .ilike('title', `%Forge: ${editingProject.title}%`)
        .eq('user_id', user.id); // <--- KUNCI UPDATE TASK

        if (taskError) {
          console.warn("Could not update Daily Hub task:", taskError);
        }
      } else {
        // --- CREATE LOGIC ---
        // 3. SIMPAN KE TABEL FORGE DENGAN KTP
        const { error: forgeError } = await supabase.from('projects_forge').insert([{
          user_id: user.id, // <--- SUNTIKAN KTP UTAMA
          title: newProject.title,
          category: newProject.category,
          deadline: newProject.deadline,
          target_hours: totalTargetHours,
          current_hours: 0,
          status: 'active',
          tech_stack: techStackPayload
        }]);

        if (forgeError) throw forgeError;

        // 4. AUTO-INJECT KE DAILY HUB DENGAN KTP
        const { error: taskError } = await supabase.from('life_tasks').insert([{
          user_id: user.id, // <--- SUNTIKAN KTP JADWAL
          title: `Forge: ${newProject.title}`,
          task_type: 'timed',
          start_time: newProject.start_time,
          end_time: endTime,
          target_date: new Date().toISOString().split('T')[0],
          is_recurring: true,
          is_completed: false,
          recurrence_end_date: newProject.deadline
        }]);

        if (taskError) {
          console.error("Error Inject Daily Hub:", taskError);
          alert(`Gagal membuat Time Block di Jadwal Harian: ${taskError.message}`);
        }
      }

      // Reset Form & Refresh
      setIsAdding(false);
      setEditingProject(null);
      setNewProject({ 
        title: '', category: 'Software Architecture', deadline: '', 
        daily_hours: '', start_time: '', web_link: '', repo_link: '', asset_link: '' 
      });
      fetchForge();

    } catch (err: any) {
      console.error("Critical Error Forge:", err);
      alert("Gagal merakit Blueprint Forge: " + err.message);
    }
  };

  const deleteProject = async () => {
    if (!projectToDelete) return;
    
    // Tarik KTP sebelum menghapus
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Hapus dengan penguncian Ganda (ID + User ID)
    await supabase.from('projects_forge')
      .delete()
      .eq('id', projectToDelete.id)
      .eq('user_id', user.id); // <--- KUNCI DELETE FORGE

    await supabase.from('life_tasks')
      .delete()
      .ilike('title', `%Forge: ${projectToDelete.title}%`)
      .eq('user_id', user.id); // <--- KUNCI DELETE TASK
      
    setProjectToDelete(null);
    fetchForge();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* ── FORGE DESTRUCTION MODAL ── */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] border-2 border-red-500/20 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-wider">Destroy Blueprint?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Hancurkan blueprint <span className="text-red-500 font-bold">"{projectToDelete.title}"</span>? Blok waktu di Daily Hub juga akan dihapus secara permanen.</p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setProjectToDelete(null)} className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold text-xs transition-colors">Abort</button>
                <button onClick={deleteProject} className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-colors shadow-xl shadow-red-500/30 uppercase tracking-widest">Execute</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 italic">
            THE FORGE <Hammer className="text-orange-500" size={32} />
          </h2>
          <p className="text-gray-500 text-sm font-mono uppercase tracking-widest mt-1">Time-Blocked Intellectual Chamber</p>
        </div>
        <button 
          onClick={() => {
            if (isAdding) {
              setIsAdding(false);
              setEditingProject(null);
              setNewProject({ title: '', category: 'Software Architecture', deadline: '', daily_hours: '', start_time: '', web_link: '', repo_link: '', asset_link: '' });
            } else {
              setIsAdding(true);
              setEditingProject(null);
            }
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
        >
          {isAdding ? 'Cancel' : <><Zap size={18}/> Draft New Project</>}
        </button>
      </header>
      

      {/* FORM DRAFTING DENGAN TIME-BLOCKING & VAULT */}
      {isAdding && (
        <div className="bg-white dark:bg-[#151515] p-8 rounded-[32px] border-2 border-orange-500/20 shadow-2xl animate-in fade-in zoom-in duration-200">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{editingProject ? 'Edit Blueprint' : 'Draft New Project'}</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1: Core Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Project Name / Objective</label>
                <input required className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50" placeholder="e.g. Build ERP Core v1" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Category</label>
                <input required className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50" value={newProject.category} onChange={e => setNewProject({...newProject, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Deadline</label>
                <input required type="date" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50" value={newProject.deadline} onChange={e => setNewProject({...newProject, deadline: e.target.value})} />
              </div>
            </div>

            {/* Row 2: Time-Blocking Engine */}
            <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900/30 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase mb-2 flex items-center gap-1.5"><Timer size={14}/> Daily Target (Hours)</label>
                <input required type="number" step="0.5" className="w-full bg-white dark:bg-[#121212] border border-orange-200 dark:border-orange-900/50 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50" placeholder="e.g. 4 (jam per hari)" value={newProject.daily_hours} onChange={e => setNewProject({...newProject, daily_hours: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase mb-2 flex items-center gap-1.5"><Calendar size={14}/> Start Time (Setiap Hari)</label>
                <input required type="time" className="w-full bg-white dark:bg-[#121212] border border-orange-200 dark:border-orange-900/50 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50" value={newProject.start_time} onChange={e => setNewProject({...newProject, start_time: e.target.value})} />
              </div>
            </div>

            {/* Row 3: Arsenal Vault (Links) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1"><Globe size={12}/> Web / Docs URL</label>
                <input type="url" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white text-xs outline-none" placeholder="https://laravel.com/docs..." value={newProject.web_link} onChange={e => setNewProject({...newProject, web_link: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1"><GitBranch size={12}/> Repository URL</label>
                <input type="url" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white text-xs outline-none" placeholder="https://github.com/..." value={newProject.repo_link} onChange={e => setNewProject({...newProject, repo_link: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1"><Library size={12}/> Assets / Wiki URL</label>
                <input type="url" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 text-gray-900 dark:text-white text-xs outline-none" placeholder="Figma / Google Drive link..." value={newProject.asset_link} onChange={e => setNewProject({...newProject, asset_link: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl hover:opacity-80 transition-opacity uppercase tracking-widest shadow-xl mt-4">
              {editingProject ? 'Update Blueprint' : 'Initiate Forge & Time Block'}
            </button>
          </form>
        </div>
      )}

      {/* PROJECT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projects.map(proj => {
          const tglDeadline = new Date(proj.deadline);
          const tglSkrg = new Date();
          tglSkrg.setHours(0,0,0,0);
          
          const sisaHari = Math.max(Math.ceil((tglDeadline.getTime() - tglSkrg.getTime()) / (1000 * 3600 * 24)), 1);
          // Karena target_hours adalah (daily * total days), kita bagi kembali sisa jam dengan sisa hari
          const remainingHours = proj.target_hours - proj.current_hours;
          const dailyTarget = (remainingHours / sisaHari).toFixed(1);
          const progressPct = Math.min(((proj.current_hours / proj.target_hours) * 100), 100).toFixed(0);

          // Parse JSONB dari Database
          const vault = proj.tech_stack || {};

          return (
            <div key={proj.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden group hover:border-orange-500/50 transition-all shadow-xl flex flex-col h-full">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl"><Code2 size={24}/></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditClick(proj)} className="text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={18}/></button>
                    <button onClick={() => setProjectToDelete(proj)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{proj.title}</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                   <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold rounded-lg text-gray-500 uppercase">{proj.category}</span>
                   <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg uppercase italic">{sisaHari} Days Left</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1 flex items-center gap-1"><Timer size={10}/> Daily Block</p>
                    <p className="text-xl font-black text-orange-500 font-mono">{dailyTarget} <span className="text-xs text-gray-500">hrs/day</span></p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1 flex items-center gap-1"><Target size={10}/> Target Total</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white font-mono">{proj.target_hours} <span className="text-xs text-gray-500">hrs</span></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-gray-500">Maturity Progress</span>
                    <span className="text-orange-500">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>

              {/* ARSENAL VAULT TERHUBUNG KE LINK ASLI */}
              <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 px-8 flex justify-between items-center border-t border-gray-200 dark:border-gray-800 shrink-0">
                <div className="flex gap-4">
                  {vault.web ? (
                    <a href={vault.web} target="_blank" rel="noreferrer" title="Web/Docs" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"><Globe size={16} /></a>
                  ) : <Globe size={16} className="text-gray-300 dark:text-gray-700 cursor-not-allowed" />}
                  
                  {vault.repo ? (
                    <a href={vault.repo} target="_blank" rel="noreferrer" title="Repository" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><GitBranch size={16} /></a>
                  ) : <GitBranch size={16} className="text-gray-300 dark:text-gray-700 cursor-not-allowed" />}
                  
                  {vault.asset ? (
                    <a href={vault.asset} target="_blank" rel="noreferrer" title="Assets/Wiki" className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"><Library size={16} /></a>
                  ) : <Library size={16} className="text-gray-300 dark:text-gray-700 cursor-not-allowed" />}
                </div>
                
                <button className="text-[11px] font-black uppercase flex items-center gap-1 text-orange-500 hover:gap-2 transition-all">
                  Open Console <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !loading && (
          <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[40px]">
            <Library className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
            <p className="text-gray-500 font-mono text-sm uppercase">Forge is cold. Drafting project required.</p>
          </div>
        )}
      </div>
    </div>
  );
}