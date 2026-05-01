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

    // FIX: Menggabungkan semua variabel dalam SATU kali pemanggilan req.json()
    const { 
      message, 
      metrics = { totalLiquidity: 0, totalLocked: 0 }, 
      todayTransactions = [], 
      weeklyTransactions = [], 
      activeProjects = [], 
      todaySchedule = [],
      forgeProjects = [] // Menambahkan forgeProjects di sini
    } = await req.json();

    // 1. Tarik nama-nama dompet secara live agar AI tahu
    const { data: wallets } = await supabase.from('wallets').select('*');
    const walletNames = wallets ? wallets.map(w => w.name).join(', ') : 'BCA, Dompet Fisik';

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
    
    // Rangkuman Forge Projects
    const forgeLog = Array.isArray(forgeProjects) && forgeProjects.length > 0
      ? forgeProjects.map((p: any) => `- ${p.title} (Deadline: ${p.deadline}, Intensity: ${p.target_hours} hours total)`).join('\n')
      : "Belum ada proyek intelektual aktif.";

    const systemPrompt = `
      Kamu adalah "CultureOS Co-Pilot", otak AI canggih dan arsitek gaya hidup untuk pengguna yang kamu panggil "Boss" atau "Architect". Kamu bukan sekadar chatbot; kamu adalah konsultan proaktif yang fokus pada tiga pilar inti: Disiplin Finansial, Optimasi Produktivitas, dan Pembelajaran Hiper-Adaptif.

      ### 1. PERSONALITAS & TONE
      - Bicara dengan kecerdasan tingkat tinggi: Profesional, tajam, sedikit jenaka, namun tetap grounded.
      - Jaga persona "Stoic Mentor": Dorong pertumbuhan jangka panjang daripada gratifikasi jangka pendek.
      - Jujur langsung: Jika Boss boros, sebutkan dengan logika, tapi selalu berikan jalan untuk penebusan.

      ### 2. FINANCIAL WATCHDOG (Anti-Boros)
      - Kamu punya akses real-time ke Ledger dan Wallets.
      - Tujuan utama: Ubah "belanja impulsif" menjadi "investasi strategis".
      - Analisis pola pengeluaran. Jika deteksi pengeluaran rendah-nilai berulang, sarankan "Freeze" di mesin Anti-Impulse.
      - Puji kontribusi Sinking Fund yang sukses dan akuisisi aset emas.

      ### 3. THE LEARNING ENGINE (Referensi Kontekstual)
      - Kamu bertindak sebagai Pustakawan Pribadi.
      - Setiap kali Boss sebut tugas atau proyek (misal "Rakit PC Server" atau "Belajar Laravel"), tawarkan referensi belajar berkualitas tinggi (dokumentasi, artikel, atau kerangka konseptual) alih-alih nasihat generik.
      - Hubungkan belajar dengan aksi: Jika jadwal tunjukkan tugas "Design Feed", sarankan konsep teori warna atau tren tipografi.

      ### 4. SCHEDULE & ROUTINE COMMAND
      - Kamu adalah penjaga "Daily Hub".
      - Bantu Boss navigasi hari. Jika dia tanya jadwal, jangan cuma list tugas—analisis. Identifikasi bottleneck atau sarankan waktu terbaik eksekusi tugas deep-work berdasarkan pola produktivitasnya.

      ### 5. ADAPTIVE EVOLUTION (The Feedback Loop)
      - Kamu dirancang untuk "Belajar bagaimana Boss belajar."
      - Amati preferensinya: Apakah dia suka detail teknis atau overview filosofis? Apakah dia kesulitan rutinitas pagi atau budgeting akhir pekan?
      - Sesuaikan gaya intervensimu. Jadi lebih ketat jika disiplin melemah, lebih kolaboratif saat dia dalam "Flow State."

      ### INSTRUKSI OPERASIONAL:
      - Selalu prioritaskan data dari "KONTEKS REAL-TIME" yang disediakan (Wallets, Ledger, Projects, Schedule).
      - Untuk pencatatan finansial, gunakan kode rahasia secara ketat:
        * [LOG|Deskripsi|NominalAngka|Kategori|NamaDompet] untuk pengeluaran/pemasukkan.
        * [GOLD|GramAngka|HargaPerGramAngka|NamaDompet] untuk aset emas.
        * [TRANSFER|NominalAngka|NamaDompetAsal|NamaDompetTujuan] untuk alokasi.
      - Jangan pernah bilang Boss untuk "Cek menu." Kamu ADALAH interface. Sampaikan informasi langsung.

      Daftar Dompet Pengguna saat ini: ${walletNames}. (Jika tidak disebut, gunakan dompet pertama).
      
      KONTEKS REAL-TIME HARI INI:
      - Uang Likuid: Rp ${Number(metrics.totalLiquidity).toLocaleString('id-ID')}
      - Sinking Funds: Rp ${Number(metrics.totalLocked).toLocaleString('id-ID')}
      - PENGELUARAN HARI INI:\n${todayLog}
      - PENGELUARAN MINGGU INI:\n${weeklyLog}
      - PROYEK IMPIAN SAAT INI:\n${projectsLog}
      - JADWAL & RUTINITAS HARI INI:\n${scheduleLog}
      - THE FORGE (Intellectual Projects):\n${forgeLog}

      INSTRUKSI PENTING (BACA DENGAN TELITI):
      1. JAWAB LANGSUNG: Jika Boss bertanya tentang jadwal, kegiatan, proyek, atau keuangannya, BACAKAN DATANYA LANGSUNG dengan gaya bahasa yang luwes, santai, dan profesional. JANGAN PERNAH menyuruh Boss untuk mengecek menu atau tab lain.
      
      2. FITUR AUTO-CATAT (TRANSAKSI BIASA): Jika Boss menyuruh mencatat pemasukkan/pengeluaran, selipkan KODE RAHASIA ini:
         [LOG|Deskripsi|NominalAngka|Kategori|NamaDompet]
         Contoh: "Gaji masuk BCA 5jt" -> [LOG|Gaji Masuk|5000000|Gaji|BCA]
         Contoh: "Beli bensin 35000 pakai Dompet Fisik" -> [LOG|Beli bensin|35000|Operasional|Dompet Fisik]
         
      3. FITUR AUTO-CATAT (BELI EMAS): Jika Boss bilang membeli emas, kamu WAJIB membalas dengan KODE ini:
         [GOLD|GramAngka|HargaPerGramAngka|NamaDompet]
         Contoh Teksmu: "Aset emas berhasil diamankan, Boss. [GOLD|5|1300000|BCA]"
         
      4. FITUR TRANSFER ANTAR DOMPET: Jika Boss menyuruh transfer atau memindahkan uang dari satu dompet ke dompet lain, keluarkan KODE ini:
         [TRANSFER|NominalAngka|NamaDompetAsal|NamaDompetTujuan]
         Contoh: "Transfer 50rb dari Dompet Fisik ke BCA" -> [TRANSFER|50000|Dompet Fisik|BCA]

      5. Jika atasan bertanya tentang "pembelajaran" atau "The Forge", lihat proyek-proyek di atas. Secara proaktif sarankan kerangka kerja teknis atau sumber daya pembelajaran. Misalnya, jika dia sedang membangun ERP, sarankan untuk membaca tentang "Arsitektur Basis Data Multi-tenant".
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
        if (messageText.includes('not found') || messageText.includes('not supported') || messageText.includes('404')) {
          continue;
        }
        throw modelError;
      }
    }

    if (!result) {
      throw lastModelError ?? new Error('Tidak ada model AI yang tersedia.');
    }

    let responseText = result.text ?? '';

    // ==========================================
    // MESIN PENDETEKSI KODE RAHASIA EMAS
    // ==========================================
    const goldRegex = /\[GOLD\|(.*?)\|(.*?)\|(.*?)\]/;
    const goldMatch = responseText.match(goldRegex);
    if (goldMatch) {
      const [fullCode, grams, pricePerGram, walletName] = goldMatch;
      const totalCost = Number(grams) * Number(pricePerGram);
      
      await supabase.from('gold_assets').insert([{ grams: Number(grams), buy_price_per_gram: Number(pricePerGram), description: 'Auto-Buy via AI' }]);
      await supabase.from('transactions').insert([{ description: `Beli Emas (${grams}g via AI)`, amount: totalCost, category: 'Investasi', wallet: walletName.trim() }]);
      
      const wallet = wallets?.find(w => w.name.toLowerCase().includes(walletName.trim().toLowerCase()));
      if (wallet) {
        await supabase.from('wallets').update({ balance: Number(wallet.balance) - totalCost }).eq('id', wallet.id);
      }

      responseText = responseText.replace(fullCode, '').trim();
      responseText += `\n\n*(Sistem: Aset **${grams}g Emas** ditambahkan. Saldo ${walletName} terpotong **Rp ${totalCost.toLocaleString('id-ID')}**).*`;
    }

    // ==========================================
    // MESIN PENDETEKSI KODE TRANSFER (BARU)
    // ==========================================
    const transferRegex = /\[TRANSFER\|(\d+)\|(.*?)\|(.*?)\]/;
    const transferMatch = responseText.match(transferRegex);
    if (transferMatch) {
      const [fullCode, amount, fromWallet, toWallet] = transferMatch;
      
      const sourceW = wallets?.find(w => w.name.toLowerCase().includes(fromWallet.trim().toLowerCase()));
      const destW = wallets?.find(w => w.name.toLowerCase().includes(toWallet.trim().toLowerCase()));

      if (sourceW && destW) {
        await supabase.from('wallets').update({ balance: Number(sourceW.balance) - Number(amount) }).eq('id', sourceW.id);
        await supabase.from('wallets').update({ balance: Number(destW.balance) + Number(amount) }).eq('id', destW.id);
        
        await supabase.from('transactions').insert([{ 
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

      await supabase.from('transactions').insert([{ description: desc.trim(), amount: Number(amount), category: category.trim(), wallet: walletName.trim() }]);
      
      const wallet = wallets?.find(w => w.name.toLowerCase().includes(walletName.trim().toLowerCase()));
      if (wallet) {
        const newBalance = isIncome 
          ? Number(wallet.balance) + Number(amount) 
          : Number(wallet.balance) - Number(amount);
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
      }

      responseText = responseText.replace(fullCode, '').trim();
      responseText += `\n\n*(Sistem: ${isIncome ? 'Pemasukkan' : 'Pengeluaran'} **Rp ${Number(amount).toLocaleString('id-ID')}** dicatat. Saldo ${walletName} diperbarui).*`;
    }

    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    return NextResponse.json({ error: "Sirkuit AI terputus. " + error.message }, { status: 500 });
  }
}