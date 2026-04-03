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
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 1 && day <= 5) && (total >= 990 && total <= 1380);
}

function isILOpen() {
    const il = getIsraelTime();
    const day = il.getDay(); 
    const hour = il.getHours();
    const min = il.getMinutes();
    const total = hour * 60 + min;
    return (day >= 0 && day <= 4) && (total >= 600 && total <= 1045);
}

async function sendPortfolioUpdate(portfolio, title, isIsrael = false) {
    const il = getIsraelTime();
    const timeStr = il.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = il.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    
    let message = "*" + title + "*\n";
    message += "📅 " + dateStr + " | 🕒 " + timeStr + "\n";
    message += "━━━━━━━━━━━━━━━\n\n";
    
    for (const s of portfolio) {
        try {
            const res = await axios.get("https://finnhub.io/api/v1/quote?symbol=" + s.symbol + "&token=" + finnhubKey);
            const d = res.data;
            
            // אם יש מחיר (גדול מ-0)
            if (d.c && d.c > 0) {
                const icon = d.dp >= 0 ? "🟢" : "🔴";
                const cur = isIsrael ? "₪" : "$";
                message += icon + " *" + s.name + "* (" + s.symbol.replace('.TA','') + ")\n";
                message += "💰 מחיר: *" + cur + d.c.toLocaleString() + "* (" + (d.dp >= 0 ? "+" : "") + d.dp.toFixed(2) + "%)\n";
                message += "📈 גבוה: " + d.h + " | 📉 נמוך: " + d.l + "\n";
            } else {
                // אם המחיר "לא משכנע" או לא קיים - עיגול אפור
                message += "⚪ *" + s.name + "* (" + s.symbol.replace('.TA','') + ")\n";
                message += "⚠️ נתוני בורסה לא זמינים כרגע\n";
            }
            message += "━━━━━━━━━━━━━━━\n";
        } catch (e) {
            message += "❌ שגיאה בטעינת " + s.name + "\n━━━━━━━━━━━━━━━\n";
        }
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

bot.on('message', async (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const txt = msg.text.trim().toLowerCase();
    
    if (txt.includes("שוק") || txt.includes("מצב")) {
        if (isILOpen()) {
            await sendPortfolioUpdate(ilPortfolio, "🇮🇱 בורסת תל אביב - זמן אמת", true);
        } else {
            bot.sendMessage(chatId, "🇮🇱 *בורסת ישראל סגורה כרגע*", {
                reply_markup: { inline_keyboard: [[{ text: "הצג נתוני סגירה לישראל", callback_data: 'get_il' }]] }
            });
        }

        if (isUSOpen()) {
            await sendPortfolioUpdate(usPortfolio, "🇺🇸 בורסת ארה\"ב - זמן אמת");
        } else {
            bot.sendMessage(chatId, "🇺🇸 *בורסת ארה\"ב סגורה כרגע*", {
                reply_markup: { inline_keyboard: [[{ text: "הצג נתוני סגירה לארה\"ב", callback_data: 'get_us' }]] }
            });
        }
    }
});

bot.on('callback_query', async (q) => {
    if (q.data === 'get_il') await sendPortfolioUpdate(ilPortfolio, "📊 נתוני סגירה - ישראל", true);
    if (q.data === 'get_us') await sendPortfolioUpdate(usPortfolio, "📊 נתוני סגירה - ארה\"ב");
    bot.answerCallbackQuery(q.id);
});

schedule.scheduleJob('0 10 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🔔 פתיחת מסחר בתל אביב 🇮🇱", true));
schedule.scheduleJob('30 17 * * 0-4', () => sendPortfolioUpdate(ilPortfolio, "🏁 סיכום מסחר בתל אביב 🇮🇱", true));
schedule.scheduleJob('30 16 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🔔 פתיחת מסחר בוול סטריט 🇺🇸"));
schedule.scheduleJob('0 23 * * 1-5', () => sendPortfolioUpdate(usPortfolio, "🏁 סיכום מסחר בוול סטריט 🇺🇸"));

http.createServer((req, res) => { res.writeHead(200); res.end('Dorel Visual Fix'); }).listen(process.env.PORT || 3000);
