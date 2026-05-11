const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const analyzer = require('./analyzer'); // Yan taraftaki beyni çağırıyoruz

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// TradingView'den Grafik Çekme Fonksiyonu
async function captureChart(ticker) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`https://www.tradingview.com/chart/?symbol=BIST:${ticker}`, { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 6000)); // Grafiğin yüklenmesi için bekleme
    const path = `${ticker}.png`;
    await page.screenshot({ path });
    await browser.close();
    return path;
}

// Telegram'a Resimli Sinyal Gönderen Fonksiyon
async function sendTelegramSignal(result, photoPath) {
    const caption = `
🚀 *BİST-ENGİNE SİNYAL: $${result.ticker}*
━━━━━━━━━━━━━━━━━━
📊 *Skor:* ${result.score}/100
🕯 *Formasyon:* ${result.pattern || 'Normal'}
📉 *RSI:* ${result.rsi} | *Risk:* %${result.riskPercent}
━━━━━━━━━━━━━━━━━━
🛡 *Alış:* ${result.buyLevel} TL
🛑 *Stop:* ${result.stopLevel} TL
    `;

    // Resim gönderimi için Telegram API çağrısı burada yapılacak
    console.log("Sinyal gönderiliyor:", result.ticker);
}
