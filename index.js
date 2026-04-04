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

async function getReport() {
    const usdToIls = await getUsdRate();
    let results = [];
    for (const s of myPortfolio) {
        const d = await getStockData(s);
        const profitTodayIls = s.initialIls * (d.dp / 100);
        results.push({ ...s, currentValIls: s.initialIls + profitTodayIls, dp: d.dp, profitTodayIls });
    }

    results.sort((a, b) => (a.isIL === b.isIL ? b.currentValIls - a.currentValIls : a.isIL ? 1 : -1));

    let msg = `💎 *Dorel's Portfolio* 💎\n━━━━━━━━━━━━━━━\n💵 USD/ILS: *${usdToIls.toFixed(2)}*\n━━━━━━━━━━━━━━━\n\n`;
    let totalIls = 0, totalProfit = 0;

    for (const r of results) {
        totalIls += r.currentValIls;
        totalProfit += r.profitTodayIls;
        msg += `⚪ *${r.name}*\n💰 ₪${r.currentValIls.toLocaleString(undefined, {maximumFractionDigits: 0})} | $${(r.currentValIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0})}\n📈 ${(r.profitTodayIls >= 0 ? "+" : "")}₪${r.profitTodayIls.toLocaleString(undefined, {maximumFractionDigits: 0})} (${r.dp.toFixed(2)}%)\n━━━━━━━━━━━━━━━\n`;
    }

    msg += `\n👑 *Total: ₪${totalIls.toLocaleString(undefined, {maximumFractionDigits: 0})}* ($${(totalIls / usdToIls).toLocaleString(undefined, {maximumFractionDigits: 0})})\n📊 Daily: ${(totalProfit >= 0 ? "🟢 +" : "🔴 ")}₪${totalProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
    
    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(() => {});
}

bot.on('message', (msg) => { if (msg.text && (msg.text.includes("שוק") || msg.text.includes("תיק"))) getReport(); });

// אוטומציות (16:20, 22:50 ארה"ב | 17:15 ישראל)
schedule.scheduleJob('20 16 * * 1-5', getReport);
schedule.scheduleJob('50 22 * * 1-5', getReport);
schedule.scheduleJob('15 17 * * 0-4', getReport);

http.createServer((req, res) => { res.end('Bot is Live'); }).listen(process.env.PORT || 3000);
