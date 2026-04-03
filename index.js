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
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'META', name: 'Meta' }
];

async function sendStockUpdate(titlePrefix) {
    // יצירת חותמת זמן של ישראל
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
    const dateString = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let message = `${titlePrefix}\n`;
    message += `📅 ${dateString} | 🕒 ${timeString}\n`;
    message += "━━━━━━━━━━━━━━━\n\n";

    for (const stock of myPortfolio) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${finnhubKey}`);
            const price = res.data.c;
            const change = res.data.dp;
            const high = res.data.h;
            const low = res.data.l;
            
            const statusIcon = change >= 0 ? "🟢" : "🔴";
            const trend = change >= 0 ? "+" : "";

            message += `${statusIcon} *${stock.symbol}* (${stock.name})\n`;
            message += `💰 מחיר: *$${price.toLocaleString()}*\n`;
            message += `📊 שינוי: *${trend}${change.toFixed(2)}%*\n`;
            message += `📈 גבוה: $${high} | 📉 נמוך: $${low}\n`;
            message += "━━━━━━━━━━━━━━━\n";
        } catch (e) { console.error("Error fetching " + stock.symbol); }
    }
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function sendMarketNews() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=business&token=${finnhubKey}`);
        const news = res.data.slice(0, 4); 
        let message = "🗞 *חדשות שוק והשקעות* 🗞\n\n";
        news.forEach((item) => {
            message += `🔹 *${item.headline}*\n`;
            message += `🔗 [לכתבה המלאה](${item.url})\n\n`;
        });
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "שגיאה במשיכת חדשות."); }
}

bot.on('message', (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const text = msg.text.toLowerCase();

    if (text.includes("שוק") || text.includes("מצב") || text.includes("טבלה")) {
        sendStockUpdate("⚡ *דוח ביצועים בזמן אמת* ⚡");
    } else if (text.includes("חדשות")) {
        sendMarketNews();
    } else {
        bot.sendMessage(chatId, "היי דוראל! כתוב 'שוק' לטבלה מלאה או 'חדשות' לעדכונים.");
    }
});

// דוח אוטומטי כל ערב ב-23:00 - כאן רשום "סגירת יום"
schedule.scheduleJob('0 23 * * 1-5', () => sendStockUpdate("🏁 *סיכום סגירת יום מסחר* 🏁"));

http.createServer((req, res) => { res.writeHead(200); res.end('Bot Ready with Timestamp'); }).listen(process.env.PORT || 3000);
