"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Users, Search, UserPlus, Fingerprint, 
  ShieldCheck, Globe, UserCheck, X, Copy, CheckCircle2,
  Clock, Check, UserMinus, Bell, Activity
} from 'lucide-react';

export default function NetworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myArchitectId, setMyArchitectId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // ── NETWORK STATES ──
  const [friends, setFriends] = useState<any[]>([]); // Status: 'accepted'
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]); // Status: 'pending', friend_id = me
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]); // Status: 'pending', user_id = me
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  // ── FETCH DATA ──
  const fetchNetworkData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth');

    setCurrentUser(user);

    // 1. Dapatkan Profil Sendiri
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile && !profile.architect_id) {
      const generatedId = `ARC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await supabase.from('profiles').update({ architect_id: generatedId }).eq('id', user.id);
      profile.architect_id = generatedId;
    }
    setMyArchitectId(profile?.architect_id || '');

    // 2. Dapatkan SEMUA Koneksi (Dua Arah)
    const { data: connections } = await supabase
      .from('network_connections')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (connections && connections.length > 0) {
      // Kumpulkan semua ID target (selain ID kita sendiri)
      const targetIds = connections.map(c => c.user_id === user.id ? c.friend_id : c.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', targetIds);

      if (profilesData) {
        const accepted: any[] = [];
        const incoming: any[] = [];
        const outgoing: any[] = [];

        connections.forEach(conn => {
          const isMeSender = conn.user_id === user.id;
          const targetProfile = profilesData.find(p => p.id === (isMeSender ? conn.friend_id : conn.user_id));
          
          if (!targetProfile) return;

          const connectionData = { ...targetProfile, connection_id: conn.id };

          if (conn.status === 'accepted') {
            accepted.push(connectionData);
          } else if (conn.status === 'pending') {
            if (isMeSender) outgoing.push(connectionData);
            else incoming.push(connectionData);
          }
        });

        setFriends(accepted);
        setIncomingRequests(incoming);
        setOutgoingRequests(outgoing);
      }
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => { fetchNetworkData(); }, [fetchNetworkData]);

  // ── HANDLERS ──
  const handleCopyId = () => {
    navigator.clipboard.writeText(myArchitectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    setActionMessage({ text: '', type: '' });

    if (searchQuery.trim().toUpperCase() === myArchitectId) {
      setActionMessage({ text: 'Ini adalah ID Anda sendiri.', type: 'error' });
      setIsSearching(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, bio, architect_id')
      .eq('architect_id', searchQuery.trim().toUpperCase())
      .single();

    if (data) setSearchResult(data);
    else setActionMessage({ text: 'Architect ID tidak ditemukan dalam server.', type: 'error' });
    
    setIsSearching(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult || !currentUser) return;
    setIsSearching(true);
    
    const { error } = await supabase.from('network_connections').insert([
      { user_id: currentUser.id, friend_id: searchResult.id, status: 'pending' }
    ]);

    if (!error) {
      setActionMessage({ text: 'Permintaan koneksi berhasil dikirim!', type: 'success' });
      setSearchResult(null);
      setSearchQuery('');
      fetchNetworkData();
    } else {
      setActionMessage({ text: 'Gagal mengirim permintaan. Mungkin sudah ada permintaan aktif.', type: 'error' });
    }
    setIsSearching(false);
  };

  const handleAcceptRequest = async (connectionId: string) => {
    await supabase.from('network_connections').update({ status: 'accepted' }).eq('id', connectionId);
    fetchNetworkData();
  };

  const handleRejectOrCancel = async (connectionId: string) => {
    await supabase.from('network_connections').delete().eq('id', connectionId);
    fetchNetworkData();
  };

  const handleRemoveFriend = async (connectionId: string) => {
    if (!confirm("Putus koneksi dengan Architect ini? Akses jadwal & profil akan dicabut.")) return;
    await supabase.from('network_connections').delete().eq('id', connectionId);
    fetchNetworkData();
  };

  // Helper untuk mengecek status relasi di Search Result
  const getRelationStatus = (targetId: string) => {
    if (friends.some(f => f.id === targetId)) return 'accepted';
    if (incomingRequests.some(r => r.id === targetId)) return 'incoming';
    if (outgoingRequests.some(r => r.id === targetId)) return 'outgoing';
    return 'none';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] text-gray-500 dark:text-white/50 font-mono text-sm">ESTABLISHING NETWORK UPLINK...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 md:space-y-8 pb-16">
      
      {/* ── TOPBAR ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={18} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">CultureOS / Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Inner Circle Network</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* ──── LEFT COL: ID, SEARCH, & INBOX ──── */}
        <div className="lg:col-span-5 space-y-6 md:space-y-8">
          
          {/* MY ARCHITECT ID CARD */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Fingerprint size={120} /></div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500"/> Identitas Publik</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Bagikan ID ini agar rekan dapat meminta izin akses ke profil Anda.</p>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
              <code className="flex-1 text-2xl font-black text-gray-900 dark:text-white tracking-widest">{myArchitectId}</code>
              <button onClick={handleCopyId} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors shrink-0">
                {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* INBOX PERMINTAAN MASUK */}
          {incomingRequests.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-[#151515] border border-purple-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Bell size={18} className="text-purple-500" /> Permintaan Masuk ({incomingRequests.length})
              </h3>
              <div className="space-y-3">
                {incomingRequests.map(req => (
                  <div key={req.id} className="p-4 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black shrink-0">
                        {req.avatar_url ? <img src={req.avatar_url} className="w-full h-full object-cover rounded-xl" alt="avatar"/> : req.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{req.full_name}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAcceptRequest(req.connection_id)} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"><Check size={14}/> Terima</button>
                      <button onClick={() => handleRejectOrCancel(req.connection_id)} className="px-3 py-2 bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-900/30 hover:text-red-500 text-gray-500 rounded-xl transition-colors"><X size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH & ADD NETWORK */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Search size={18} className="text-purple-500" /> Radar Jaringan</h3>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input type="text" placeholder="ID: ARC-XXXX" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white font-mono uppercase outline-none focus:border-purple-500 transition-colors"
              />
              <button type="submit" disabled={isSearching || !searchQuery} className="bg-purple-600 text-white px-5 rounded-xl hover:bg-purple-500 disabled:opacity-50 transition-colors font-bold shadow-md shadow-purple-500/20">Lacak</button>
            </form>

            {actionMessage.text && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 border ${actionMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'}`}>
                {actionMessage.text}
              </div>
            )}

            {searchResult && (
              <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black overflow-hidden">
                    {searchResult.avatar_url ? <img src={searchResult.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : searchResult.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{searchResult.full_name}</p>
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{searchResult.role}</p>
                  </div>
                </div>
                {searchResult.bio && <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">"{searchResult.bio}"</p>}
                
                {getRelationStatus(searchResult.id) === 'accepted' ? (
                  <div className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-900/30"><CheckCircle2 size={14}/> Sudah Terkoneksi</div>
                ) : getRelationStatus(searchResult.id) === 'outgoing' ? (
                  <div className="w-full py-2.5 bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 text-gray-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2"><Clock size={14}/> Menunggu Konfirmasi...</div>
                ) : getRelationStatus(searchResult.id) === 'incoming' ? (
                  <div className="w-full py-2.5 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-500 border border-purple-200 dark:border-purple-900/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2"><Bell size={14}/> Cek Inbox Permintaan Anda</div>
                ) : (
                  <button onClick={handleSendRequest} disabled={isSearching} className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <UserPlus size={14} /> Kirim Permintaan Koneksi
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ──── RIGHT COL: INNER CIRCLE LIST ──── */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-6">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg"><Users className="text-emerald-500" size={20} /> Inner Circle Profiles</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Daftar koneksi yang memiliki otorisasi penuh.</p>
              </div>
              <div className="bg-gray-100 dark:bg-[#1A1A1A] px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                {friends.length} Node(s)
              </div>
            </div>

            <div className="space-y-4">
              {friends.length > 0 ? friends.map(friend => (
                <div key={friend.id} className="group flex flex-col sm:flex-row sm:items-start gap-4 p-5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                  
                  {/* LINK / ROUTER PUSH PADA AREA NAMA & AVATAR */}
                  <div 
                    onClick={() => router.push(`/profile/network/${friend.id}`)}
                    className="flex items-center gap-4 min-w-[200px] shrink-0 cursor-pointer group/avatar"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-black shrink-0 overflow-hidden group-hover/avatar:ring-2 group-hover/avatar:ring-blue-500 transition-all">
                      {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : friend.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover/avatar:text-blue-500 transition-colors">{friend.full_name}</h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-gray-200 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">{friend.role || 'USER'}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2">
                    <p className={`text-xs leading-relaxed border-l-2 pl-3 ${friend.bio ? 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700' : 'text-gray-400 italic border-transparent'}`}>
                      {friend.bio || 'Tidak ada deskripsi sistem.'}
                    </p>
                    {friend.stoic_quote && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium italic bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        "{friend.stoic_quote}"
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* TOMBOL LIHAT AKTIVITAS / JADWAL */}
                    <button 
                      onClick={() => router.push(`/profile/network/${friend.id}`)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800" 
                      title="Lihat Profil & Jadwal"
                    >
                      <Activity size={16} />
                    </button>
                    
                    <button onClick={() => handleRemoveFriend(friend.connection_id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Cabut Otorisasi">
                      <UserMinus size={16} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                  <UserCheck size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">Jaringan Kosong</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Gunakan Radar Jaringan untuk mengirimkan permintaan koneksi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}