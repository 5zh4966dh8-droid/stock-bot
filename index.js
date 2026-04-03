const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

// המניות שלך עם הכמויות
const myStocks = [
    { symbol: 'URA', name: 'אורניום', qty: 24 },
    { symbol: 'AAPL', name: 'אפל', qty: 4 },
    { symbol: 'NVDA', name: 'אנבידיה', qty: 1 },
    { symbol: 'TSLA', name: 'טסלה', qty: 1 },
    { symbol: 'META', name: 'מטא', qty: 1 }
];

const watchlistIL = [
    { symbol: 'LUMI.TA', name: 'לאומי' },
    { symbol: 'POLI.TA', name: 'פועלים' }
];

async function getSummary() {
    let usdToIls = 3.65;
    try {
        const rate = await axios.get('https://open.er-api.com/v6/latest/USD');
        usdToIls = rate.data.rates.ILS;
    } catch (e) {}

    let msg = "📊 *תיק ההשקעות שלי*\n━━━━━━━━━━━━━━━\n\n";
    let totalPortfolioValueUSD = 0;
    let totalDailyProfitUSD = 0;

    for (const s of myStocks) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) {
                const stockValue = d.c * s.qty;
                const dailyProfit = (d.c - d.pc) * s.qty;
                
                totalPortfolioValueUSD += stockValue;
                totalDailyProfitUSD += dailyProfit;
                
                msg += "⚪ *" + s.name + "* (" + s.qty + " יח')\n";
                msg += "💵 שווי פוזיציה: $" + stockValue.toLocaleString() + "\n";
                msg += "💰 מחיר: $" + d.c + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
                msg += "📉 רווח יומי: " + (dailyProfit >= 0 ? "+" : "") + "$" + dailyProfit.toFixed(2) + "\n\n";
            }
        } catch (e) {}
    }

    msg += "🏦 *סיכום תיק כולל:*\n";
    msg += "💰 שווי התיק: $" + totalPortfolioValueUSD.toLocaleString() + " / ₪" + (totalPortfolioValueUSD * usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + "\n";
    msg += "📈 רווח יומי: " + (totalDailyProfitUSD >= 0 ? "+" : "") + "$" + totalDailyProfitUSD.toFixed(2) + " (₪" + (totalDailyProfitUSD * usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + ")\n";
    msg += "━━━━━━━━━━━━━━━\n\n";

    msg += "🇮🇱 *מעקב ישראל:*\n";
    for (const s of watchlistIL) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) {
                msg += "⚪ *" + s.name + "*: ₪" + d.c + " (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
            }
        } catch (e) {}
    }

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

bot.on('message', (msg) => {
    if (msg.text && (msg.text.includes("שוק") || msg.text.includes("תיק"))) getSummary();
});

schedule.scheduleJob('30 17 * * 0-4', () => getSummary());
schedule.scheduleJob('0 23 * * 1-5', () => getSummary());

http.createServer((req, res) => { res.writeHead(200); res.end('Active'); }).listen(process.env.PORT || 3000);
