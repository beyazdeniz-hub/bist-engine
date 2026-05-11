const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// GitHub Secrets
const TOKEN = process.env.TRADINGVIEW_TOKEN;
const CHAT_ID = process.env.TRADINGVIEW_CHAT_ID;

async function runBistEngine() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    try {
        console.log("1. Sinyal listesi yükleniyor...");
        await page.goto('https://www.turkishbulls.com/SignalList.aspx?lang=tr&MarketSymbol=IMKB', { waitUntil: 'networkidle2' });

        // Sayfayı en aşağıya kadar kaydır (Tüm hisseleri yükle)
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 200;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if(totalHeight >= scrollHeight) { clearInterval(timer); resolve(); }
                }, 100);
            });
        });

        // Sadece "AL" (Buy) sinyali veren hisselerin kodlarını topla
        const signals = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows.map(row => {
                const tickerCell = row.querySelector('a[href*="Ticker="]');
                const signalCell = row.innerText.includes('AL'); // Tablo metninde AL geçenleri bul
                if (tickerCell && signalCell) {
                    const url = new URL(tickerCell.href);
                    return url.searchParams.get("Ticker");
                }
                return null;
            }).filter(t => t !== null);
        });

        console.log(`${signals.length} adet AL sinyali bulundu. Detaylar inceleniyor...`);

        for (const ticker of signals) {
            const detailPage = await browser.newPage();
            try {
                // Hisse detayına git
                await detailPage.goto(`https://www.turkishbulls.com/SignalPage.aspx?lang=tr&Ticker=${ticker}`, { waitUntil: 'domcontentloaded' });
                
                // Mum formasyonu adını çek (Sayfadaki spesifik metin alanından)
                const pattern = await detailPage.evaluate(() => {
                    const patternNode = document.querySelector('#ctl00_ContentPlaceHolder1_SignalHistory1_GridView1 tr:nth-child(2) td:nth-child(6)');
                    return patternNode ? patternNode.innerText.trim() : "Belirlenemedi";
                });

                console.log(`${ticker} için formasyon: ${pattern}`);

                // TradingView grafiğini çek
                const chartPath = await captureChart(ticker, browser);

                // Telegram'a gönder
                await sendTelegram(ticker, pattern, chartPath);
                
                if (fs.existsSync(chartPath)) fs.unlinkSync(chartPath);
            } catch (e) {
                console.error(`${ticker} detay hatası:`, e.message);
            } finally {
                await detailPage.close();
            }
        }

    } catch (err) {
        console.error("Ana hata:", err.message);
    } finally {
        await browser.close();
    }
}

async function captureChart(ticker, browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`https://www.tradingview.com/chart/?symbol=BIST:${ticker}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 7000));
    const path = `${ticker}.png`;
    await page.screenshot({ path });
    await page.close();
    return path;
}

async function sendTelegram(ticker, pattern, photoPath) {
    const caption = `
📊 *BİST-ENGİNE SİNYAL*
━━━━━━━━━━━━━━━━━━
🔹 *Hisse:* $${ticker}
🕯 *Formasyon:* ${pattern}
━━━━━━━━━━━━━━━━━━
_Grafik TradingView'den çekilmiştir._
    `;

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('photo', fs.createReadStream(photoPath));
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');

    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, form, {
        headers: form.getHeaders()
    });
}

runBistEngine();
