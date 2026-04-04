const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
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

async function getHistoricalData(s) {
    try {
        const symbol = s.symbol.replace('^', '%5E');
        // מושכים נתונים לשנה האחרונה
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
        const res = await axios.get(url, { timeout: 15000 });
        const result = res.data.chart.result[0];
        const prices = result.indicators.quote[0].close.filter(p => p != null);
        const current = result.meta.regularMarketPrice;
        const prevClose = result.meta.previousClose;
        
        const priceWeekAgo = prices[prices.length - 6] || prices[0];
        const priceMonthAgo = prices[prices.length - 22] || prices[0];
        const priceYearAgo = prices[0];

        return {
            current,
            dayP: ((current - prevClose) / prevClose) * 100,
            weekP: ((current - priceWeekAgo) / priceWeekAgo) * 100,
            monthP: ((current - priceMonthAgo) / priceMonthAgo) * 100,
            yearP: ((current - priceYearAgo) / priceYearAgo) * 100
        };
    } catch (e) { return null; }
}

async function getUsd() {
    try {
        const res = await axios.get('https://open.er-api.com/v6/latest/USD');
        return res.data.rates.ILS;
    } catch (e) { return 3.65; }
}

async function getReport() {
    const usd = await getUsd();
    let totalIls = 0, totalProfitDay = 0;
    let msg = `🏅 *DOREL STRATEGY - EXECUTIVE REPORT*\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n💵 USD/ILS: *${usd.toFixed(2)}* | 🗓 ${new Date().toLocaleDateString('he-IL')}\n━━━━━━━━━━━━━━━━━━\n\n`;

    for (const s of myPortfolio) {
        const d = await getHistoricalData(s);
        if (!d) continue;

        const profitTodayIls = s.initialIls * (d.dayP / 100);
        const currentValIls = s.initialIls + profitTodayIls;
        const currentValUsd = currentValIls / usd;
        
        totalIls += currentValIls;
        totalProfitDay += profitTodayIls;

        msg += `💎 *${s.name}*\n`;
        msg += `💰 ₪${currentValIls.toLocaleString(undefined, {maximumFractionDigits: 0})} | $${currentValUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}\n`;
        msg += `📈 Today: *${(profitTodayIls >= 0 ? "+" : "")}₪${profitTodayIls.toLocaleString(undefined, {maximumFractionDigits: 0})}* (${d.dayP.toFixed(2)}%)\n`;
        msg += `📊 Week: *${d.weekP.toFixed(2)}%* | Month: *${d.monthP.toFixed(2)}%*\n`;
        msg += `📅 Year: *${d.yearP.toFixed(2)}%*\n`;
        msg += `──────────────────\n`;
    }

    msg += `\n🏆 *TOTAL PORTFOLIO SUMMARY*\n`;
    msg += `💰 Market Value: *₪${totalIls.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n`;
    msg += `💵 Dollar Value: *$${(totalIls / usd).toLocaleString(undefined, {maximumFractionDigits: 0})}*\n`;
    msg += `📊 Daily Change: ${(totalProfitDay >= 0 ? "🟢 +" : "🔴 ")}₪${totalProfitDay.toLocaleString(undefined, {maximumFractionDigits: 0})}\n`;
    
    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(console.error);
}

bot.on('message', (m) => { if (m.text && (m.text.includes("שוק") || m.text.includes("תיק"))) getReport(); });

schedule.scheduleJob('20 16 * * 1-5', getReport);
schedule.scheduleJob('50 22 * * 1-5', getReport);
schedule.scheduleJob('15 17 * * 0-4', getReport);

http.createServer((req, res) => res.end('Dorel Strategy Live')).listen(process.env.PORT || 3000);
