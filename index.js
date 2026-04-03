const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

// המניות שלך וכמויות
const myStocks = [
    { symbol: 'URA', name: 'אורניום', qty: 24 },
    { symbol: 'AAPL', name: 'אפל', qty: 4 },
    { symbol: 'NVDA', name: 'אנבידיה', qty: 1 },
    { symbol: 'TSLA', name: 'טסלה', qty: 1 },
    { symbol: 'META', name: 'מטא', qty: 1 }
];

// מניות למעקב ישראל
const watchlistIL = [
    { symbol: 'LUMI.TA', name: 'לאומי' },
    { symbol: 'POLI.TA', name: 'פועלים' }
];

function isUSOpen() {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
    const day = now.getDay(); 
    const hour = now.getHours();
    const min = now.getMinutes();
    const total = hour * 60 + min;
    return (day >= 1 && day <= 5) && (total >= 990 && total <= 1380);
}

async function getSummary() {
    let usdToIls = 3.65;
    try {
        const rate = await axios.get('https://open.er-api.com/v6/latest/USD');
        usdToIls = rate.data.rates.ILS;
    } catch (e) {}

    let msg = "📊 *מצב השוק שלי*\n━━━━━━━━━━━━━━━\n\n";
    let totalDailyProfitUSD = 0;
    const usOpen = isUSOpen();

    // ארה"ב
    msg += usOpen ? "🇺🇸 *ארה\"ב - מסחר פעיל* 🟢\n" : "🇺🇸 *ארה\"ב - שוק סגור* ⚪\n";
    
    for (const s of myStocks) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) {
                const icon = usOpen ? (d.dp >= 0 ? "🟢" : "🔴") : "⚪";
                const profitUSD = (d.c - d.pc) * s.qty;
                totalDailyProfitUSD += profitUSD;
                
                msg += icon + " *" + s.name + "*\n";
                msg += "מחיר: $" + d.c + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
                msg += "רווח יומי: " + (profitUSD >= 0 ? "+" : "") + "$" + profitUSD.toFixed(2) + "\n\n";
            }
        } catch (e) {}
    }

    msg += "💰 *סה\"כ רווח יומי כרגע:*\n";
    msg += "💵 $" + totalDailyProfitUSD.toFixed(2) + "\n";
    msg += "🇮🇱 ₪" + (totalDailyProfitUSD * usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + "\n";
    msg += "━━━━━━━━━━━━━━━\n\n";

    // ישראל
    msg += "🇮🇱 *מעקב ישראל:*\n";
    for (const s of watchlistIL) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            const icon = "⚪"; // סגור כרגע
            if (d.c) {
                msg += icon + " *" + s.name + "*: ₪" + d.c + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
            }
        } catch (e) {}
    }

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

bot.on('message', (msg) => {
    if (msg.text && msg.text.includes("שוק")) getSummary();
});

schedule.scheduleJob('30 17 * * 0-4', () => getSummary());
schedule.scheduleJob('0 23 * * 1-5', () => getSummary());

http.createServer((req, res) => { res.writeHead(200); res.end('Live'); }).listen(process.env.PORT || 3000);
