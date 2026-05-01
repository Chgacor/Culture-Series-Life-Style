import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) return NextResponse.json({ error: 'Tanggal diperlukan' }, { status: 400 });

  try {
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) throw new Error("API Key hilang dari .env.local");

    const dateStr = date.replace(/-/g, '');
    
    // 1. Tarik Harga Emas dalam USD
    const goldResponse = await fetch(`https://www.goldapi.io/api/XAU/USD/${dateStr}`, {
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json"
      }
    });

    const textData = await goldResponse.text();
    let goldData;
    
    try {
      goldData = JSON.parse(textData);
    } catch(e) {
      throw new Error(`Respon bukan JSON: ${textData.substring(0, 50)}...`);
    }

    if (goldData.error) throw new Error(goldData.error);

    const pricePerOunceUSD = goldData.price;

    // 2. Tarik Kurs USD ke IDR
    let exchangeRate = 16200; 
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateData = await rateRes.json();
      if (rateData && rateData.rates && rateData.rates.IDR) {
        exchangeRate = rateData.rates.IDR;
      }
    } catch (e) {
      console.log("Gagal ambil kurs live, pakai default");
    }

    // 3. Konversi ke Gram
    const pricePerGramUSD = pricePerOunceUSD / 31.1035;
    const pricePerGramIDR = Math.round(pricePerGramUSD * exchangeRate);

    return NextResponse.json({ price_per_gram: pricePerGramIDR });

  } catch (error: any) {
    const year = parseInt(date.substring(0, 4));
    const basePrice2026 = 2600000; 
    const yearDiff = 2026 - year;
    
    let estimatedPrice = basePrice2026 - (yearDiff * 250000);
    if (estimatedPrice < 500000) estimatedPrice = 500000; 

    return NextResponse.json({ 
      price_per_gram: estimatedPrice,
      note: "Fallback Estimation"
    });
  }
}