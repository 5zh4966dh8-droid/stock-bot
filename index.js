const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const usPortfolio = [
    { symbol: 'URA', name: 'Uranium ETF' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'NVDA', name: 'Nvidia' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'META', name: 'Meta' }
];

const ilPortfolio = [
    { symbol: 'LUMI.TA', name: 'לאומי' },
    { symbol: 'POLI.TA', name: 'פועלים' },
    { symbol: 'NICE.TA', name: 'נייס' },
    { symbol: 'ICL.TA', name: 'איי.סי.אל' }
];

function getIsraelTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
}

function isUSOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); 
    const totalMin = il.getHours() * 60 + il.getMinutes();
    return (day >= 1 && day <= 5) && (totalMin >= 990 && totalMin <= 1380);
}

function isILOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); 
    const totalMin = il.getHours() * 60 + il.getMinutes();
    return (day >= 0 && day <= 4) && (totalMin >= 600 && totalMin <= 1045);
}

async function sendPortfolioUpdate(portfolio, title, isIsrael = false) {
    const il = getIsraelTime();
    const timeStr = il.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = il.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    
    let message = `\${title}\n📅 \${dateStr} | 🕒 \${timeStr}\n━━━━━━━━━━━━━━━\n\n`;
    
    for (const s of portfolio) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=\${s.symbol}&token=\${finnhubKey}`);
            const d = res.data;
            if (d.c) {
                const icon = d.dp >= 0 ? "🟢" : "🔴";
                const cur = isIsrael ? "₪" : "$";
                message += `\${icon} *\${s.symbol.replace('.TA', '')}* (\${s.name})\n`;
                message += `💰: *\${cur}\${d.c}* (\${d.dp >= 0 ? "+" : ""}\${d.dp.toFixed(2)}%)\n`;
                message += `📈 \${d.h} | 📉 \${d.l}\n━━━━━━━━━━━━━━━\n\n`;
            }
        } catch (e) {}
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

bot.on('message', async (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const txt = msg.text.trim().toLowerCase();
    
    if (txt.includes("שוק") || txt.includes("מצב")) {
        if (isILOpen()) await sendPortfolioUpdate(ilPortfolio, "🇮🇱 *תל אביב - זמן אמת*", true);
        else bot.sendMessage(chatId, "🇮🇱 *בורסת ישראל סגורה.*", { 
            reply_markup: { inline_keyboard: [[{ text: "🇮🇱 הצג נתוני סגירה לישראל", callback_data: 'show_il' }]] } 
        });

        if (isUSOpen()) await sendPortfolioUpdate(usPortfolio, "🇺🇸 *וול סטריט - זמן אמת*");
        else bot.sendMessage(chatId, "🇺🇸 *בורסת ארה\"ב סגורה.*", { 
            reply_markup: { inline_keyboard: [[{ text: "🇺🇸 הצג נתוני סגירה לארה\"ב", callback_data: 'show_us' }]] } 
        });
    } else if (txt.includes("דולר")) {
        const res = await axios.get('https://open.er-api.com/v6/latest/USD');
        bot.sendMessage(chatId, `🇺🇸 🇮🇱 *שער הדולר:* **\${res.data.rates.ILS.toFixed(3)} ש"ח**`, { parse_mode: 'Markdown' });
    }
});

bot.on('callback_query', (q) => {
    if (q.data === 'show_us') sendPortfolioUpdate(usPortfolio, "📊 *ארה\"ב - נתוני סגירה*");
    if (q.data === 'show_il') sendPortfolioUpdate(ilPortfolio, "📊 *ישראל - נתוני סגירה*", true);
    bot.answerCallbackQuery(q.id);
});

schedule.scheduleJob('0 10 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🔔 *פתיחת מסחר בתל אביב* 🇮🇱", true));
schedule.scheduleJob('30 17 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🏁 *סיכום מסחר בתל אביב* 🇮🇱", true));
schedule.scheduleJob('30 16 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🔔 *פתיחת מסחר בוול סטריט* 🇺🇸"));
schedule.scheduleJob('0 23 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🏁 *סיכום מסחר בוול סטריט* 🇺🇸"));

http.createServer((req, res) => { res.writeHead(200); res.end('Stable'); }).listen(process.env.PORT || 3000);
