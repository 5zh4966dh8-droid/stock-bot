const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const myPortfolio = [
    { symbol: 'VOO', name: 'VOO', initialIls: 61000, isIL: false },
    { symbol: 'VGT', name: 'VGT', initialIls: 33833, isIL: false },
    { symbol: 'VTI', name: 'VTI', initialIls: 26642, isIL: false },
    { symbol: 'VXUS', name: 'VXUS', initialIls: 26238, isIL: false },
    { symbol: 'AAPL', name: 'Apple', initialIls: 12149, isIL: false },
    { symbol: '^TA125.TA', name: 'ת"א 125', initialIls: 9177, isIL: true },
    { symbol: '^TAFIN.TA', name: 'ת"א פיננסים', initialIls: 4386, isIL: true },
    { symbol: 'BOTZ', name: 'BOTZ', initialIls: 2959, isIL: false },
    { symbol: 'MU', name: 'MU', initialIls: 2318, isIL: false },
    { symbol: 'URA', name: 'URA (אורניום)', initialIls: 2318, isIL: false },
    { symbol: 'CIBR', name: 'CIBR', initialIls: 2234, isIL: false },
    { symbol: 'GOOGL', name: 'Google', initialIls: 1872, isIL: false },
    { symbol: '^TA90.TA', name: 'ת"א 90', initialIls: 1079, isIL: true },
    { symbol: 'NLR', name: 'NLR', initialIls: 576, isIL: false }
];

const watchlist = [
    { symbol: 'NVDA', name: 'אנבידיה' },
    { symbol: 'TSLA', name: 'טסלה' },
    { symbol: 'META', name: 'מטא' },
    { symbol: 'SMH', name: 'SMH' },
    { symbol: 'OPEN', name: 'OPEN' },
    { symbol: 'WDC', name: 'WDC (סנדיסק)' }
];

function isMarketOpen(symbol) {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
    const day = now.getDay();
    const hour = now.getHours();
    const min = now.getMinutes();
    const totalMin = hour * 60 + min;

    if (symbol.endsWith('.TA') || symbol.startsWith('^')) {
        return (day >= 0 && day <= 4) && (totalMin >= 600 && totalMin <= 1045);
    }
    return (day >= 1 && day <= 5) && (totalMin >= 930 && totalMin <= 1380);
}

async function getReport() {
    let usdToIls = 3.65;
    try {
        const rate = await axios.get('https://open.er-api.com/v6/latest/USD');
        usdToIls = rate.data.rates.ILS;
    } catch (e) {}

    let results = [];
    for (const s of myPortfolio) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) {
                const profitTodayIls = s.initialIls * (d.dp / 100);
                const currentValIls = s.initialIls + profitTodayIls;
                results.push({ ...s, currentValIls, profitTodayIls, dp: d.dp });
            }
        } catch (e) {}
    }

    results.sort((a, b) => {
        if (a.isIL && !b.isIL) return 1;
        if (!a.isIL && b.isIL) return -1;
        return b.currentValIls - a.currentValIls;
    });

    let msg = "💎 *תיק ההשקעות של דוראל* 💎\n━━━━━━━━━━━━━━━\n\n";
    let totalIls = 0;
    let totalProfit = 0;

    for (const r of results) {
        totalIls += r.currentValIls;
        totalProfit += r.profitTodayIls;
        const icon = isMarketOpen(r.symbol) ? (r.dp >= 0 ? "🟢" : "🔴") : "⚪";
        
        msg += icon + " *" + r.name + "*\n";
        msg += "💰 שווי: ₪" + r.currentValIls.toLocaleString(undefined, {maximumFractionDigits: 0}) + " | $" + (r.currentValIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + "\n";
        msg += "📈 שינוי: " + (r.profitTodayIls >= 0 ? "+" : "") + "₪" + r.profitTodayIls.toLocaleString(undefined, {maximumFractionDigits: 0}) + " (" + r.dp.toFixed(2) + "%)\n";
        msg += "━━━━━━━━━━━━━━━\n";
    }

    msg += "\n👑 *סיכום תיק כולל:*\n";
    msg += "💰 שווי שוק: *₪" + totalIls.toLocaleString(undefined, {maximumFractionDigits: 0}) + "*\n";
    msg += "💵 שווי בדולר: *$" + (totalIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0}) + "*\n";
    msg += "📊 יומי: " + (totalProfit >= 0 ? "🟢 +" : "🔴 ") + "₪" + totalProfit.toLocaleString(undefined, {maximumFractionDigits: 0}) + "\n\n";

    msg += "👀 *רשימת מעקב:*\n";
    for (const s of watchlist) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            if (d.c) msg += "⚪ *" + s.name + "*: " + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%\n";
        } catch (e) {}
    }

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

bot.on('message', (msg) => {
    if (msg.text && (msg.text.includes("שוק") || msg.text.includes("תיק"))) getReport();
});

http.createServer((req, res) => { res.writeHead(200); res.end('Dorel Portfolio Active'); }).listen(process.env.PORT || 3000);
