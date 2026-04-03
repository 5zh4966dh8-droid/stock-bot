const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');
const schedule = require('node-schedule');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const myStocks = [
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'GOOGL', name: 'Google' },
    { symbol: 'URA', name: 'Uranium ETF' }
];

// פונקציה לשליחת טבלת מניות
async function sendStockUpdate(title) {
    let message = `${title}\n`;
    message += "━━━━━━━━━━━━━━━\n\n";
    for (const stock of myStocks) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${finnhubKey}`);
            const price = res.data.c;
            const change = res.data.dp;
            const statusIcon = change >= 0 ? "🟢" : "🔴";
            message += `${statusIcon} *${stock.symbol}* (${stock.name})\n`;
            message += `💰 מחיר: *$${price.toLocaleString()}*\n`;
            message += `📊 שינוי: *${change >= 0 ? "+" : ""}${change.toFixed(2)}%*\n`;
            message += "━━━━━━━━━━━━━━━\n";
        } catch (e) { console.error(e); }
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

// פונקציה למשיכת חדשות
async function sendMarketNews() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`);
        const news = res.data.slice(0, 3); // לוקחים את 3 הידיעות הראשונות
        let message = "🗞 *חדשות חמות מהדקות האחרונות* 🗞\n\n";
        
        news.forEach((item, index) => {
            message += `${index + 1}. *${item.headline}*\n`;
            message += `🔗 [לקריאה בהרחבה](${item.url})\n\n`;
        });
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: false });
    } catch (e) {
        bot.sendMessage(chatId, "מצטער, הייתה שגיאה במשיכת החדשות.");
    }
}

// האזנה להודעות שלך
bot.on('message', (msg) => {
    const text = msg.text ? msg.text.toLowerCase() : "";
    if (msg.chat.id.toString() !== chatId) return;

    if (text.includes("שוק")) {
        sendStockUpdate("⚡ *סטטוס שוק בזמן אמת* ⚡");
    } else if (text.includes("חדשות")) {
        sendMarketNews();
    } else {
        bot.sendMessage(chatId, "אהלן דוראל! איך אפשר לעזור?\nכתוב 'מה מצב השוק?' לטבלה או 'חדשות' לעדכונים.");
    }
});

// תזמון אוטומטי (שני-שישי ב-23:00)
schedule.scheduleJob('0 23 * * 1-5', () => sendStockUpdate("🏁 *סיכום סגירת יום* 🏁"));

// שרת חובה ל-Render
http.createServer((req, res) => { res.writeHead(200); res.end('Bot Smart Brain Active'); }).listen(process.env.PORT || 3000);
