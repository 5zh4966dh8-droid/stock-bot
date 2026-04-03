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
    { symbol: 'TSLA', name: 'Tesla' }
];

const ilPortfolio = [
    { symbol: 'LUMI.TA', name: 'לאומי' },
    { symbol: 'POLI.TA', name: 'פועלים' },
    { symbol: 'ICL.TA', name: 'איי.סי.אל' }
];

function getIsraelTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
}

function isUSOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); // 1-5 (Mon-Fri)
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 1 && day <= 5) && (total >= 990 && total <= 1380);
}

function isILOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); // 0-4 (Sun-Thu)
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 0 && day <= 4) && (total >= 600 && total <= 1045);
}

async function sendPortfolioUpdate(portfolio, title, isIsrael = false) {
    const il = getIsraelTime();
    const timeStr = il.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    let message = `\${title}\n🕒 \${timeStr}\n━━━━━━━━━━━━━━━\n\n`;
    
    for (const s of portfolio) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=\${s.symbol}&token=\${finnhubKey}`);
            const d = res.data;
            if (d.c && d.c > 0) {
                const icon = d.dp >= 0 ? "🟢" : "🔴";
                const cur = isIsrael ? "₪" : "$";
                message += `\${icon} *\${s.name}*\n`;
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
        // בדיקת ישראל
        if (isILOpen()) {
            await sendPortfolioUpdate(ilPortfolio, "🇮🇱 *בורסת תל אביב - זמן אמת*", true);
        } else {
            bot.sendMessage(chatId, "🇮🇱 *בורסת ישראל סגורה כרגע.*", {
                reply_markup: { inline_keyboard: [[{ text: "✅ בכל זאת הצג ישראל", callback_data: 'get_il' }]] }
            });
        }

        // בדיקת ארה"ב
        if (isUSOpen()) {
            await sendPortfolioUpdate(usPortfolio, "🇺🇸 *בורסת ארה\"ב - זמן אמת*");
        } else {
            bot.sendMessage(chatId, "🇺🇸 *בורסת ארה\"ב סגורה כרגע.*", {
                reply_markup: { inline_keyboard: [[{ text: "✅ בכל זאת הצג ארה\"ב", callback_data: 'get_us' }]] }
            });
        }
    }
});

bot.on('callback_query', async (q) => {
    if (q.data === 'get_il') await sendPortfolioUpdate(ilPortfolio, "📊 *נתוני סגירה - ישראל*", true);
    if (q.data === 'get_us') await sendPortfolioUpdate(usPortfolio, "📊 *נתוני סגירה - ארה\"ב*");
    bot.answerCallbackQuery(q.id);
});

// אוטומציה - ללא שאלות (פשוט שולח בזמן הנכון)
schedule.scheduleJob('0 10 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🔔 *פתיחת מסחר בתל אביב* 🇮🇱", true));
schedule.scheduleJob('30 17 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🏁 *סיכום מסחר בתל אביב* 🇮🇱", true));
schedule.scheduleJob('30 16 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🔔 *פתיחת מסחר בוול סטריט* 🇺🇸"));
schedule.scheduleJob('0 23 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🏁 *סיכום מסחר בוול סטריט* 🇺🇸"));

http.createServer((req, res) => { res.writeHead(200); res.end('Dorel Pro V2'); }).listen(process.env.PORT || 3000);
