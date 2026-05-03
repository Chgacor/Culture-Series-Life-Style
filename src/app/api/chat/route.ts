import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY in environment. /api/chat cannot initialize AI client.');
}
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY environment variable. AI backend tidak tersedia.' },
        { status: 500 }
      );
    }

    const { 
      message, 
      userId, 
      metrics = { totalLiquidity: 0, totalLocked: 0 }, 
      todayTransactions = [], 
      weeklyTransactions = [], 
      activeProjects = [], 
      todaySchedule = [],
      forgeProjects = [] 
    } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Akses Ditolak. Identitas (User ID) tidak ditemukan.' }, { status: 401 });
    }

    // 1. Tarik Profil User untuk mengetahui nama aslinya
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    const userName = profile?.full_name || 'Architect';

    // 2. Tarik nama-nama dompet milik user ini
    const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', userId);
    const walletNames = wallets && wallets.length > 0 ? wallets.map(w => w.name).join(', ') : 'BCA, Dompet Fisik';

    // 3. Tarik DAFTAR KATEGORI DINAMIS dari budget_limits milik user ini
    const { data: budgetLimits } = await supabase.from('budget_limits').select('name').eq('user_id', userId);
    const categoryNames = budgetLimits && budgetLimits.length > 0 
      ? budgetLimits.map(b => b.name).join(', ') 
      : 'Konsumsi, Operasional, Lifestyle, Lain-lain'; // Fallback jika belum ada data

    // Merangkum data untuk dibaca AI
    const todayLog = Array.isArray(todayTransactions) && todayTransactions.length > 0
      ? todayTransactions.map((t: any) => `- ${t.description}: Rp ${Number(t.amount).toLocaleString('id-ID')}`).join('\n')
      : "Belum ada.";
    const weeklyLog = Array.isArray(weeklyTransactions) && weeklyTransactions.length > 0
      ? weeklyTransactions.map((t: any) => `- ${t.description}: Rp ${Number(t.amount).toLocaleString('id-ID')}`).join('\n')
      : "Belum ada.";
    const projectsLog = Array.isArray(activeProjects) && activeProjects.length > 0
      ? activeProjects.map((p: any) => `- ${p.title} (Sisa: Rp ${(p.target_fund - p.saved_amount).toLocaleString('id-ID')})`).join('\n')
      : "Belum ada.";
    const scheduleLog = Array.isArray(todaySchedule) && todaySchedule.length > 0
      ? todaySchedule.map((s: any) => {
          const label = s.name || s.title || s.task || 'Tidak bernama';
          const statusValue = String(s.status || '').toLowerCase();
          const isDone = s.is_completed === true || ['selesai', 'done', 'completed', 'true'].includes(statusValue);
          return `- ${label} (Status: ${isDone ? 'Selesai' : 'Belum'})`;
        }).join('\n')
      : "Tidak ada jadwal/habit khusus yang tercatat untuk hari ini.";
    
    const forgeLog = Array.isArray(forgeProjects) && forgeProjects.length > 0
      ? forgeProjects.map((p: any) => `- ${p.title} (Deadline: ${p.deadline})`).join('\n')
      : "Belum ada proyek intelektual aktif.";

    const systemPrompt = `
      Kamu adalah "CultureOS Co-Pilot", otak AI canggih dan arsitek gaya hidup. 
      Pengguna yang sedang berinteraksi denganmu bernama asli ${userName}. Kamu bisa menyapanya dengan namanya, atau dengan gelar "Boss" / "Architect".
      Kamu adalah konsultan proaktif yang fokus pada Disiplin Finansial, Optimasi Produktivitas, dan Pembelajaran Hiper-Adaptif.

      ### INSTRUKSI OPERASIONAL:
      - Selalu prioritaskan data dari "KONTEKS REAL-TIME" yang disediakan.
      - Jangan pernah menyuruh Boss untuk "Cek menu" atau "Cek aplikasi". Kamu ADALAH interface-nya. Sampaikan informasi langsung.

      Daftar Dompet saat ini: ${walletNames}. (Jika tidak disebut, gunakan dompet pertama yang logis).
      Daftar Kategori Anggaran Aktif: ${categoryNames}.
      
      KONTEKS REAL-TIME HARI INI:
      - Uang Likuid: Rp ${Number(metrics.totalLiquidity).toLocaleString('id-ID')}
      - PENGELUARAN HARI INI:\n${todayLog}
      - PENGELUARAN MINGGU INI:\n${weeklyLog}
      - PROYEK IMPIAN SAAT INI:\n${projectsLog}
      - JADWAL & RUTINITAS HARI INI:\n${scheduleLog}
      - THE FORGE (Intellectual Projects):\n${forgeLog}

      INSTRUKSI PENTING (BACA DENGAN TELITI):
      1. JAWAB LANGSUNG: Jawab dengan gaya bahasa yang luwes, santai, jenaka, dan profesional.
      
      2. FITUR AUTO-CATAT (TRANSAKSI BIASA): Jika Boss menyuruh mencatat pemasukkan/pengeluaran, selipkan KODE RAHASIA ini:
         [LOG|Deskripsi|NominalAngka|Kategori|NamaDompet]
         
         PENTING UNTUK KATEGORI: Kamu WAJIB HANYA memilih salah satu dari daftar Kategori Anggaran Aktif berikut: [ ${categoryNames} ].
         *Pengecualian: Jika itu adalah uang masuk (gaji, profit, diberi orang), gunakan kategori "Pemasukkan".*
         Jika Boss menyebutkan nama kategori yang tidak ada persis di daftar, cocokkan dengan yang paling mendekati dari daftar di atas.

         Contoh 1: "Beli bensin 35rb pakai dompet fisik" -> [LOG|Beli Bensin|35000|Operasional|Dompet Fisik] (asumsi 'Operasional' ada di daftar).
         Contoh 2: "Gaji masuk 5jt ke BCA" -> [LOG|Gaji Masuk|5000000|Pemasukkan|BCA]
         Contoh 3: "Bayar rumah sakit 300rb pakai BCA" -> [LOG|Rumah Sakit|300000|Kesehatan|BCA] (asumsi 'Kesehatan' ada di daftar).
         
      3. FITUR AUTO-CATAT (BELI EMAS): Jika Boss bilang membeli emas, kamu WAJIB membalas dengan KODE ini:
         [GOLD|GramAngka|HargaPerGramAngka|NamaDompet]
         Contoh Teksmu: "Aset emas berhasil diamankan, Boss. [GOLD|5|1300000|BCA]"
         
      4. FITUR TRANSFER ANTAR DOMPET: Jika Boss menyuruh memindahkan uang dari satu dompet ke dompet lain, keluarkan KODE ini:
         [TRANSFER|NominalAngka|NamaDompetAsal|NamaDompetTujuan]
         Contoh: "Transfer 50rb dari Dompet Fisik ke BCA" -> [TRANSFER|50000|Dompet Fisik|BCA]
    `;

    const modelCandidates = [process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let result: any;
    let lastModelError: any;

    for (const candidateModel of modelCandidates) {
      try {
        result = await ai.models.generateContent({
          model: candidateModel,
          contents: `${systemPrompt}\n\nPengguna: "${message}"`,
        });
        break;
      } catch (modelError: any) {
        lastModelError = modelError;
        const messageText = String(modelError?.message || '').toLowerCase();
        if (messageText.includes('not found') || messageText.includes('not supported') || messageText.includes('404')) continue;
        throw modelError;
      }
    }

    if (!result) throw lastModelError ?? new Error('Tidak ada model AI yang tersedia.');

    let responseText = result.text ?? '';

    // ==========================================
    // MESIN PENDETEKSI KODE RAHASIA EMAS
    // ==========================================
    const goldRegex = /\[GOLD\|(.*?)\|(.*?)\|(.*?)\]/;
    const goldMatch = responseText.match(goldRegex);
    if (goldMatch) {
      const [fullCode, grams, pricePerGram, walletName] = goldMatch;
      const totalCost = Number(grams) * Number(pricePerGram);
      
      await supabase.from('gold_assets').insert([{ user_id: userId, grams: Number(grams), buy_price_per_gram: Number(pricePerGram), description: 'Auto-Buy via AI' }]);
      await supabase.from('transactions').insert([{ user_id: userId, description: `Beli Emas (${grams}g via AI)`, amount: totalCost, category: 'Investasi', wallet: walletName.trim() }]);
      
      const wallet = wallets?.find(w => w.name.toLowerCase().includes(walletName.trim().toLowerCase()));
      if (wallet) {
        await supabase.from('wallets').update({ balance: Number(wallet.balance) - totalCost }).eq('id', wallet.id).eq('user_id', userId);
      }

      responseText = responseText.replace(fullCode, '').trim();
      responseText += `\n\n*(Sistem: Aset **${grams}g Emas** ditambahkan. Saldo ${walletName} terpotong **Rp ${totalCost.toLocaleString('id-ID')}**).*`;
    }

    // ==========================================
    // MESIN PENDETEKSI KODE TRANSFER
    // ==========================================
    const transferRegex = /\[TRANSFER\|(\d+)\|(.*?)\|(.*?)\]/;
    const transferMatch = responseText.match(transferRegex);
    if (transferMatch) {
      const [fullCode, amount, fromWallet, toWallet] = transferMatch;
      
      const sourceW = wallets?.find(w => w.name.toLowerCase().includes(fromWallet.trim().toLowerCase()));
      const destW = wallets?.find(w => w.name.toLowerCase().includes(toWallet.trim().toLowerCase()));

      if (sourceW && destW) {
        await supabase.from('wallets').update({ balance: Number(sourceW.balance) - Number(amount) }).eq('id', sourceW.id).eq('user_id', userId);
        await supabase.from('wallets').update({ balance: Number(destW.balance) + Number(amount) }).eq('id', destW.id).eq('user_id', userId);
        
        await supabase.from('transactions').insert([{ 
          user_id: userId,
          description: `Transfer: ${sourceW.name} → ${destW.name}`, 
          amount: Number(amount), 
          category: 'Operasional', 
          wallet: sourceW.name 
        }]);

        responseText = responseText.replace(fullCode, '').trim();
        responseText += `\n\n*(Sistem: Transfer **Rp ${Number(amount).toLocaleString('id-ID')}** dari ${sourceW.name} ke ${destW.name} berhasil dieksekusi).*`;
      } else {
         responseText = responseText.replace(fullCode, '').trim();
         responseText += `\n\n*(Sistem: Gagal mengeksekusi transfer. Nama dompet tidak dikenali).*`;
      }
    }

    // ==========================================
    // MESIN PENDETEKSI KODE PENGELUARAN BIASA
    // ==========================================
    const logRegex = /\[LOG\|(.*?)\|(\d+)\|(.*?)\|(.*?)\]/;
    const logMatch = responseText.match(logRegex);
    if (logMatch) {
      const [fullCode, desc, amount, category, walletName] = logMatch;
      const cat = category.trim().toLowerCase();
      
      const isIncome = cat === 'gaji' || cat === 'pemasukkan' || cat === 'freelance' || cat === 'investasi' || desc.toLowerCase().includes('masuk');

      await supabase.from('transactions').insert([{ 
        user_id: userId, 
        description: desc.trim(), 
        amount: Number(amount), 
        category: category.trim(), 
        wallet: walletName.trim() 
      }]);
      
      const wallet = wallets?.find(w => w.name.toLowerCase().includes(walletName.trim().toLowerCase()));
      if (wallet) {
        const newBalance = isIncome 
          ? Number(wallet.balance) + Number(amount) 
          : Number(wallet.balance) - Number(amount);
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id).eq('user_id', userId);
      }

      responseText = responseText.replace(fullCode, '').trim();
      responseText += `\n\n*(Sistem: ${isIncome ? 'Pemasukkan' : 'Pengeluaran'} **Rp ${Number(amount).toLocaleString('id-ID')}** dicatat. Saldo ${walletName} diperbarui).*`;
    }

    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    return NextResponse.json({ error: "Sirkuit AI terputus. " + error.message }, { status: 500 });
  }
}