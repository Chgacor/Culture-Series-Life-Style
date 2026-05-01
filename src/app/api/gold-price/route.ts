import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) throw new Error("API Key hilang dari .env.local");

    // 1. Tarik Harga Emas Live Hari Ini dalam USD (Pasti berhasil)
    const goldRes = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json"
      },
      // Cache 1 jam agar kuota API gratisanmu awet
      next: { revalidate: 3600 } 
    });

    const goldData = await goldRes.json();
    if (goldData.error) throw new Error(goldData.error);

    const liveOunceUSD = goldData.price;

    // 2. Tarik Kurs USD ke IDR Live
    let exchangeRate = 16200; 
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
      const rateData = await rateRes.json();
      if (rateData?.rates?.IDR) {
        exchangeRate = rateData.rates.IDR;
      }
    } catch (e) {
      console.log("Gagal ambil kurs live, pakai default");
    }

    // 3. Konversi Ounce ke Gram
    const pricePerGramUSD = liveOunceUSD / 31.1035;
    const liveBuyPriceIDR = Math.round(pricePerGramUSD * exchangeRate);

    // 4. Kalkulasi Harga Buyback (Spread)
    // Harga jual emas biasanya 3% lebih rendah dari harga beli
    const liveSellPriceIDR = Math.round(liveBuyPriceIDR * 0.97);

    return NextResponse.json({
      buy_price: liveBuyPriceIDR,
      sell_price: liveSellPriceIDR,
      source: "GoldAPI Live + ER-API"
    });

  } catch (error) {
    console.error("❌ Live Price API Error:", error);
    
    // Fallback Darurat: Menggunakan Harga Pluang Terakhir
    return NextResponse.json({
      buy_price: 2614357,
      sell_price: 2557853,
      source: "Fallback Pluang"
    });
  }
}