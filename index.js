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
    { symbol: 'NLR', name: 'NLR', initialIls: 5076, isIL: false },
    { symbol: 'BOTZ', name: 'BOTZ', initialIls: 2959, isIL: false },
    { symbol: 'MU', name: 'MU', initialIls: 2318, isIL: false },
    { symbol: 'URA', name: 'URA (Uranium)', initialIls: 2318, isIL: false },
    { symbol: 'CIBR', name: 'CIBR', initialIls: 2234, isIL: false },
    { symbol: 'GOOGL', name: 'Google', initialIls: 1872, isIL: false },
    { symbol: '^TA125.TA', name: 'TA-125 Index', initialIls: 9177, isIL: true },
    { symbol: '^TAFN.TA', name: 'TA-Finance Index', initialIls: 4386, isIL: true },
    { symbol: '^TA90.TA', name: 'TA-90 Index', initialIls: 18079, isIL: true }
];

const watchlist = [
    { symbol: 'NVDA', name: 'Nvidia' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'SMH', name: 'SMH' },
    { symbol: 'OPEN', name: 'OPEN' },
    { symbol: 'WDC', name: 'SanDisk (WDC)' }
];

async function getStockData(s) {
    try {
        if (s.isIL || s.symbol.startsWith('^')) {
            const cleanSymbol = s.symbol.replace('^', '%5E');
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`;
            const res = await axios.get(url, { timeout: 10000 });
            const data = res.data.chart.result[0].meta;
            return { c: data.regularMarketPrice, pc: data.previousClose, dp: ((data.regularMarketPrice - data.previousClose) / data.previousClose) * 100 };
        } else {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${finnhubKey}`, { timeout: 10000 });
            return res.data;
        }
    } catch (e) { return { c: 1, pc: 1, dp: 0 }; }
}

async function getUsdRate() {
    try {
        const res = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 7000 });
        return res.data.rates.ILS || 3.65;
    } catch (e) { return 3.65; }
}

async function getMarketNews() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`, { timeout: 7000 });
        return res.data.slice(0, 3).map(n => `▪️ *${n.headline}*`).join('\n');
    } catch (e) { return "News temporarily unavailable."; }
}

function checkGlobalMarketStatus() {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
    const day = now.getDay(), hour = now.getHours(), min = now.getMinutes();
    const totalMin = hour * 60 + min;
    const isUSOpen = (day >= 1 && day <= 5) && (totalMin >= 990 && totalMin <= 1380);
    return isUSOpen ? "🟢 MARKET IS OPEN" : "⚪ MARKET IS CLOSED";
}

async function getReport() {
    const usdToIls = await getUsdRate();
    let results = [];
    for (const s of myPortfolio) {
        const d = await getStockData(s);
        const profitTodayIls = s.initialIls * (d.dp / 100);
        const currentValIls = s.initialIls + profitTodayIls;
        results.push({ ...s, currentValIls, profitTodayIls, dp: d.dp });
    }

    results.sort((a, b) => {
        if (a.isIL && !b.isIL) return 1;
        if (!a.isIL && b.isIL) return -1;
        return b.currentValIls - a.currentValIls;
    });

    let msg = `💎 *Dorel's Portfolio* 💎\n━━━━━━━━━━━━━━━\n`;
    msg += `🌎 ${checkGlobalMarketStatus()}\n`;
    msg += `💵 USD/ILS: *${usdToIls.toFixed(2)}*\n`;
    msg += `━━━━━━━━━━━━━━━\n\n`;

    let totalIls = 0, totalProfit = 0;
    for (const r of results) {
        totalIls += r.currentValIls;
        totalProfit += r.profitTodayIls;
        const icon = r.isIL ? "⚪" : (checkGlobalMarketStatus().includes("OPEN") ? (r.dp >= 0 ? "🟢" : "🔴") : "⚪");
        msg += `${icon} *${r.name}*\n`;
        msg += `💰 Value: ₪${r.currentValIls.toLocaleString(undefined, {maximumFractionDigits: 0})} | $${(r.currentValIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0})}\n`;
        msg += `📈 Today: ${(r.profitTodayIls >= 0 ? "+" : "")}₪${r.profitTodayIls.toLocaleString(undefined, {maximumFractionDigits: 0})} (${r.dp.toFixed(2)}%)\n`;
        msg += `━━━━━━━━━━━━━━━\n`;
    }

    msg += `\n👑 *Total Summary:*\n`;
    msg += `💰 Market Value: *₪${totalIls.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n`;
    msg += `💵 USD Value: *$${(totalIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0})}*\n`;
    msg += `📊 Daily P/L: ${(totalProfit >= 0 ? "🟢 +" : "🔴 ")}₪${totalProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}\n\n`;

    msg += `👀 *Watchlist:*\n`;
    for (const s of watchlist) {
        const d = await getStockData(s);
        msg += `⚪ *${s.name}*: ${(d.dp >= 0 ? "+" : "")}${d.dp.toFixed(2)}%\n`;
    }

    msg += `\n📰 *Latest Market News:*\n`;
    msg += await getMarketNews();

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(e => console.log("Telegram Error"));
}

bot.on('message', (msg) => { if (msg.text && (msg.text.includes("שוק") || msg.text.includes("תיק"))) getReport(); });

schedule.scheduleJob('20 16 * * 1-5', () => getReport());
schedule.scheduleJob('50 22 * * 1-5', () => getReport());
schedule.scheduleJob('15 17 * * 0-4', () => getReport());

http.createServer((req, res) => { res.writeHead(200); res.end('Dorel Stable Bot'); }).listen(process.env.PORT || 3000);
