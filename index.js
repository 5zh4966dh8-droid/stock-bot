const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const myPortfolio = [
    { symbol: 'URA', name: 'Uranium ETF (Owned)' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'NVDA', name: 'Nvidia' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'GOOGL', name: 'Google' },
    { symbol: 'MSFT', name: 'Microsoft' }
];

// פונקציה להבאת שער הדולר
async function getUSDILS() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=FX:USILS&token=${finnhubKey}`);
        const rate = res.data.c;
        if (!rate) return "לא הצלחתי למשוך שער דולר כרגע.";
        return `🇺🇸 🇮🇱 *שער הדולר:* **${rate.toFixed(3)} ש"ח**`;
    } catch (e) { return "שגיאה במשיכת שער הדולר."; }
}

// פונקציה להבאת נתונים על מניה בודדת (חיפוש חופשי)
async function sendSingleStock(symbol) {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubKey}`);
        const price = res.data.c;
        if (!price) return bot.sendMessage(chatId, "❌ לא מצאתי מניה עם הסימול הזה.");
        
        const change = res.data.dp;
        const statusIcon = change >= 0 ? "🟢" : "🔴";
        let message = `🔍 *תוצאות חיפוש עבור ${symbol.toUpperCase()}*\n\n`;
        message += `${statusIcon} מחיר: *$${price.toLocaleString()}*\n`;
        message += `📊 שינוי: *${change >= 0 ? "+" : ""}${change.toFixed(2)}%*\n`;
        message += `📈 גבוה: $${res.data.h} | 📉 נמוך: $${res.data.l}`;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "שגיאה בחיפוש המניה."); }
}

async function sendStockUpdate(titlePrefix) {
    const usdStr = await getUSDILS();
    let message = `${titlePrefix}\n${usdStr}\n`;
    message += "━━━━━━━━━━━━━━━\n\n";
    for (const stock of myPortfolio) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${finnhubKey}`);
            const price = res.data.c;
            const change = res.data.dp;
            message += `${change >= 0 ? "🟢" : "🔴"} *${stock.symbol}*\n💰 *$${price.toLocaleString()}* (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)\n━━━━━━━━━━━━━━━\n\n`;
        } catch (e) { console.error(e); }
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

bot.on('message', async (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const text = msg.text.trim();
    const lowerText = text.toLowerCase();

    if (lowerText.includes("חדשות")) {
        // (פונקציית החדשות המוכרת)
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=business&token=${finnhubKey}`);
        let newsMsg = "🗞 *חדשות שוק* 🗞\n\n";
        res.data.slice(0, 3).forEach(item => newsMsg += `🔹 *${item.headline}*\n🔗 [לינק](${item.url})\n\n`);
        bot.sendMessage(chatId, newsMsg, { parse_mode: 'Markdown' });
    } 
    else if (lowerText.includes("דולר")) {
        const rate = await getUSDILS();
        bot.sendMessage(chatId, rate, { parse_mode: 'Markdown' });
    }
    else if (lowerText.includes("שוק") || lowerText.includes("מצב")) {
        // (בדיקת שוק פתוח/סגור ששיפרנו)
        sendStockUpdate("⚡ *סטטוס שוק* ⚡"); 
    } 
    else if (text.length <= 5 && /^[A-Za-z]+$/.test(text)) {
        // אם כתבת מילה קצרה באנגלית (כמו AMZN) - זה חיפוש מניה
        sendSingleStock(text);
    }
});

schedule.scheduleJob('0 23 * * 1-5', () => sendStockUpdate("🏁 *סיכום סגירה* 🏁"));
http.createServer((req, res) => { res.writeHead(200); res.end('Pro Bot Active'); }).listen(process.env.PORT || 3000);
