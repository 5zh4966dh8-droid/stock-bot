const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const myPortfolio = [
    { symbol: 'URA', name: 'Uranium ETF' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'NVDA', name: 'Nvidia' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'GOOGL', name: 'Google' }
];

// פונקציה שמביאה שער דולר ממקור חלופי ואמין
async function getUSD() {
    try {
        const res = await axios.get('https://open.er-api.com/v6/latest/USD');
        const rate = res.data.rates.ILS;
        if (rate) {
            return `🇺🇸 🇮🇱 *שער הדולר:* **${rate.toFixed(3)} ש"ח**`;
        }
        return "⚠️ שער הדולר לא זמין כרגע.";
    } catch (e) { 
        return "❌ שגיאה זמנית בחיבור לשער הדולר."; 
    }
}

async function sendMarketNews() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=business&token=${finnhubKey}`);
        const news = res.data.slice(0, 3);
        let nMsg = "🗞 *חדשות שוק והשקעות* 🗞\n\n";
        news.forEach(i => {
            nMsg += `🔹 *${i.headline}*\n🔗 [לינק לכתבה](${i.url})\n\n`;
        });
        bot.sendMessage(chatId, nMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (e) { bot.sendMessage(chatId, "❌ שגיאה במשיכת חדשות."); }
}

async function sendUpdate(title) {
    const usd = await getUSD();
    let msg = `${title}\n${usd}\n━━━━━━━━━━━━━━━\n\n`;
    
    for (const s of myPortfolio) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${finnhubKey}`);
            const price = res.data.c;
            const change = res.data.dp;
            if (price) {
                msg += `${change >= 0 ? "🟢" : "🔴"} *${s.symbol}*\n💰 *$${price}* (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)\n━━━━━━━━━━━━━━━\n\n`;
            }
        } catch (e) { console.error("Error for " + s.symbol); }
    }
    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

bot.on('message', async (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const txt = msg.text.trim();
    const low = txt.toLowerCase();

    if (low.includes("חדשות")) {
        await sendMarketNews();
    } else if (low.includes("דולר")) {
        const d = await getUSD();
        bot.sendMessage(chatId, d, { parse_mode: 'Markdown' });
    } else if (low.includes("שוק") || low.includes("מצב")) {
        await sendUpdate("📊 *מצב השוק* 📊");
    } else if (txt.length >= 2 && txt.length <= 5 && /^[A-Za-z]+$/.test(txt)) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${txt.toUpperCase()}&token=${finnhubKey}`);
            if (res.data.c) {
                const c = res.data.dp;
                let sMsg = `🔍 *תוצאה עבור ${txt.toUpperCase()}*\n`;
                sMsg += `${c >= 0 ? "🟢" : "🔴"} מחיר: *$${res.data.c}* (${c >= 0 ? "+" : ""}${c.toFixed(2)}%)\n`;
                bot.sendMessage(chatId, sMsg, { parse_mode: 'Markdown' });
            }
        } catch (e) { bot.sendMessage(chatId, "שגיאה בחיפוש."); }
    }
});

schedule.scheduleJob('0 23 * * 1-5', () => sendUpdate("🏁 *סיכום סגירה* 🏁"));
http.createServer((req, res) => { res.writeHead(200); res.end('Final Version Active'); }).listen(process.env.PORT || 3000);
