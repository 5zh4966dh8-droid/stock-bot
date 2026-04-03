const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

// רשימת המניות שאתה מחזיק + כמויות
const myStocks = [
    { symbol: 'URA', name: 'Uranium ETF', qty: 24 },
    { symbol: 'AAPL', name: 'Apple', qty: 4 },
    { symbol: 'NVDA', name: 'Nvidia', qty: 1 },
    { symbol: 'TSLA', name: 'Tesla', qty: 1 },
    { symbol: 'META', name: 'Meta', qty: 1 }
];

// רשימת מעקב ישראל
const ilWatchlist = [
    { symbol: 'LUMI.TA', name: 'לאומי' },
    { symbol: 'POLI.TA', name: 'פועלים' },
    { symbol: 'ICL.TA', name: 'איי.סי.אל' }
];

function getIsraelTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
}

function isUSOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); 
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 1 && day <= 5) && (total >= 930 && total <= 1380); // 15:30-23:00 (winter time check)
}

function isILOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); 
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 0 && day <= 4) && (total >= 600 && total <= 1045);
}

async function sendPortfolioReport() {
    let usdToIls = 3.65; // ברירת מחדל
    try {
        const rateRes = await axios.get('https://open.er-api.com/v6/latest/USD');
        usdToIls = rateRes.data.rates.ILS;
    } catch (e) {}

    const usOpen = isUSOpen();
    const ilOpen = isILOpen();
    
    let msg = "📊 *דוח תיק השקעות ומעקב*\n━━━━━━━━━━━━━━━\n\n";
    
    // חלק א': מניות ארה"ב (החזקות)
    msg += usOpen ? "🇺🇸 *ארה\"ב - מסחר פעיל* 🟢\n" : "🇺🇸 *ארה\"ב - שוק סגור* ⚪\n";
    let totalDailyProfitUSD = 0;

    for (const s of myStocks) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) {
                const icon = usOpen ? (d.dp >= 0 ? "🟢" : "🔴") : "⚪";
                const dailyProfit = (d.c - d.pc) * s.qty;
                totalDailyProfitUSD += dailyProfit;
                
                msg += icon + " *" + s.name + "* (" + s.qty + " יח')\n";
                msg += "💰 מחיר: $" + d.c.toLocaleString() + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
                msg += "💵 רווח יומי: " + (dailyProfit >= 0 ? "+" : "") + "$" + dailyProfit.toFixed(2) + "\n\n";
            }
        } catch (e) {}
    }

    msg += "💰 *סה\"כ רווח יומי (ארה\"ב):*\n";
    msg += "💵 $" + totalDailyProfitUSD.toFixed(2) + "\n";
    msg += "🇮🇱 ₪" + (totalDailyProfitUSD * usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + "\n";
    msg += "━━━━━━━━━━━━━━━\n\n";

    // חלק ב': מעקב ישראל
    msg += ilOpen ? "🇮🇱 *ישראל - מסחר פעיל* 🟢\n" : "🇮🇱 *ישראל - שוק סגור* ⚪\n";
    for (const s of ilWatchlist) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            const icon = ilOpen ? (d.dp >= 0 ? "🟢" : "🔴") : "⚪";
            if (d.c) {
                msg += icon + " *" + s.name + "*\n";
                msg += "💰 מחיר: ₪" + d.c.toLocaleString() + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n\n";
            }
        } catch (e) {}
    }

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

bot.on('message', (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const txt = msg.text.trim().toLowerCase();
    if (txt.includes("שוק") || txt.includes("מצב") || txt.includes("טבלה")) {
        sendPortfolioReport();
    }
});

// אוטומציה
schedule.scheduleJob('30 17 * * 0-4', () => sendPortfolioReport()); // סיכום ישראל
schedule.scheduleJob('0 23 * * 1-5', () => sendPortfolioReport());  // סיכום ארה"ב

http.createServer((req, res) => { res.writeHead(200); res.end('Portfolio Live'); }).listen(process.env.PORT || 3000);
