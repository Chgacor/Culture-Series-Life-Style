// Lokasi: src/app/api/parse-transaction/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Pastikan Supabase di-import di sini

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Teks kosong' }, { status: 400 });

    const lowerText = text.toLowerCase();
    
    // ====================================================================
    // FASE 1: TARIK DAFTAR KATEGORI DINAMIS DARI DATABASE
    // ====================================================================
    // Kita menarik daftar kategori anggaran yang aktif.
    const { data: budgetLimits } = await supabase.from('budget_limits').select('name');
    const dynamicCategories = budgetLimits?.map(b => b.name) || []; // ['Konsumsi', 'Lifestyle', 'Operasional', 'Kesehatan', ...]

    // ====================================================================
    // FASE 2: EKSTRAK NOMINAL (Regex Magic)
    // ====================================================================
    let amount = 0;
    const amountRegex = /(\d+)\s*(rb|ribu|k|juta|jt)/i;
    const amountMatch = lowerText.match(amountRegex);
    
    if (amountMatch) {
      const numberPart = parseInt(amountMatch[1], 10);
      const multiplier = amountMatch[2];
      if (['rb', 'ribu', 'k'].includes(multiplier)) amount = numberPart * 1000;
      else if (['juta', 'jt'].includes(multiplier)) amount = numberPart * 1000000;
    } else {
      const pureNumberMatch = lowerText.match(/\b(\d{4,})\b/); // Fallback digit
      if (pureNumberMatch) amount = parseInt(pureNumberMatch[1], 10);
    }

    // ====================================================================
    // FASE 3: KLASIFIKASI KATEGORI (DI-UPGRADE)
    // ====================================================================
    let category = 'Lainnya'; // Default

    // Logic: Kita memindai apakah teks input mengandung salah satu nama kategori dinamis
    for (const catName of dynamicCategories) {
      if (lowerText.includes(catName.toLowerCase())) {
        category = catName; // Menggunakan nama kategori asli dari database (Misal: 'Kesehatan')
        break; 
      }
    }

    // Fallback: Jika user tidak mengetik nama kategori, kita pakai kamus kata kunci static sebelumnya
    if (category === 'Lainnya') {
      if (/(makan|minum|jajan|kopi|geprek|nasi|warteg|supermarket|indomaret)/.test(lowerText)) category = 'Konsumsi';
      else if (/(baju|sepatu|nonton|bioskop|netflix|spotify|game|hobi)/.test(lowerText)) category = 'Lifestyle';
      else if (/(bensin|ojol|parkir|kos|listrik|internet|air|pulsa|wifi)/.test(lowerText)) category = 'Operasional';
    }

    // ====================================================================
    // FASE 4: IDENTIFIKASI SUMBER DANA & BERSIHKAN DESKRIPSI
    // ====================================================================
    let wallet = 'Cash'; // Default
    const walletKeywords = ['bca', 'mandiri', ' bri', 'bni', 'gopay', 'ovo', 'dana'];
    for (const w of walletKeywords) {
      if (lowerText.includes(w)) {
        wallet = w === 'gopay' ? 'GoPay' : w === 'ovo' ? 'OVO' : w.toUpperCase();
        break; 
      }
    }

    let description = text;
    if (amountMatch) description = description.replace(amountMatch[0], '');
    const walletRegex = new RegExp(`(?:pakai|dengan)?\\s*${wallet}`, 'i');
    description = description.replace(walletRegex, '');
    description = description.trim();
    if (!description || description.length < 2) description = 'Pengeluaran';

    // Kembalikan JSON rapi ke Frontend
    return NextResponse.json({ amount, description, category, wallet });

  } catch (error) {
    console.error('Mesin gagal memproses:', error);
    return NextResponse.json({ error: 'Gagal memproses teks' }, { status: 500 });
  }
}