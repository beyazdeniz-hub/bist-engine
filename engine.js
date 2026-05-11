const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const analyzer = require('./analyzer'); 

const TOKEN = process.env.TRADINGVIEW_TOKEN;
const CHAT_ID = process.env.TRADINGVIEW_CHAT_ID;

async function runLogic() {
    // Tarayıcıyı hızlandırmak için gereksiz kaynakları (resim vb.) yüklememesini sağlıyoruz
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    try {
        console.log("1. Liste taranıyor...");
        await page.goto('https://www.turkishbulls.com/SignalList.aspx?lang=tr&MarketSymbol=IMKB', { waitUntil: 'networkidle2' });
        
        const tickers = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows.filter(r => r.innerText.includes('AL'))
                       .map(r => {
                           const link = r.querySelector('a[href*="Ticker="]');
                           return link ? new URL(link.href).searchParams.get("Ticker") : null;
                       }).filter(t => t !== null);
        });

        // HIZLI TEST: Sadece ilk 3 hisseyi alıyoruz
        const testList = tickers.slice(0, 3);
        console.log(`🚀 Test Başladı! İncelenecek Hisseler: ${testList.join(", ")}`);

        for (const ticker of testList) {
            const detailPage = await browser.newPage();
            try {
                await detailPage.goto(`https://www.turkishbulls.com/SignalPage.aspx?lang=tr&Ticker=${ticker}`, { waitUntil: 'domcontentloaded' });
                
                const candles = await detailPage.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('#ctl00_ContentPlaceHolder1_SignalHistory1_GridView1 tr')).slice(1, 25);
                    return rows.map(r => ({
                        close: parseFloat(r.cells[1].innerText.replace(',', '.')),
                        open: parseFloat(r.cells[2].innerText.replace(',', '.')),
                        high: parseFloat(r.cells[3].innerText.replace(',', '.')),
                        low: parseFloat(r.cells[4].innerText.replace(',', '.')),
                        volume: 0
                    })).reverse();
                });

                const result = analyzer.analyzeTicker(ticker, candles);

                if (result) {
                    console.log(`🎯 Sinyal Şartları Sağlandı: ${ticker}`);
                    const chartPage = await browser.newPage();
                    await chartPage.setViewport({width: 1200, height: 800});
                    await chartPage.goto(`https://www.tradingview.com/chart/?symbol=BIST:${ticker}`, {waitUntil: 'networkidle2'});
                    
                    // Grafik yükleme süresini test için 5 saniyeye çektim
                    await new Promise(r => setTimeout(r, 5000));
                    
                    const path = `${ticker}.png`;
                    await chartPage.screenshot({path});
                    
                    await sendTelegram(result, path);
                    if(fs.existsSync(path)) fs.unlinkSync(path);
                    await chartPage.close();
                } else {
                    console.log(`ℹ️ ${ticker} analiz edildi ancak skor barajını (50+) geçemedi.`);
                }
            } catch (err) {
                console.log(`⚠️ ${ticker} hatası: ${err.message}`);
            } finally {
                await detailPage.close();
            }
        }
    } finally {
        await browser.close();
        console.log("🏁 Test tamamlandı.");
    }
}

async function sendTelegram(res, photo) {
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('photo', fs.createReadStream(photo));
    const caption = `🚀 *BİST TEST SİNYAL: ${res.ticker}*\n━━━━━━━━━━━━━━━━━━\n🎯 Skor: ${res.score}/100\n🕯 Formasyon: ${res.pattern || 'Belirsiz'}\n🛡 Alış: ${res.buyLevel} TL\n🛑 Stop: ${res.stopLevel} TL`;
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, form, { headers: form.getHeaders() });
}

runLogic();
