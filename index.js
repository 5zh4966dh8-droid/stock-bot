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

// פונקציה לשליחת טבלת מניות (כולל בדיקת שעה)
async function sendStockUpdate(title = "📊 *עדכון שוק* 📊") {
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
        } catch (e) { console.error("Error fetching stock:", e); }
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

// פונקציה לחדשות ממוקדות שוק בלבד
async function sendMarketNews() {
    try {
        // מחפשים חדשות בקטגוריית 'business' שהן יותר רלוונטיות למניות
        const res = await axios.get(`https://finnhub.io/api/v1/news?category=business&token=${finnhubKey}`);
        const news = res.data.slice(0, 4); 
        let message = "🗞 *חדשות שוק והשקעות חמות* 🗞\n\n";
        
        news.forEach((item, index) => {
            message += `🔹 *${item.headline}*\n`;
            message += `🔗 [קישור לידיעה](${item.url})\n\n`;
        });
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(chatId, "מצטער, הייתה שגיאה במשיכת חדשות השוק.");
    }
}

// מאזין חכם להודעות
bot.on('message', (msg) => {
    if (!msg.text) return;
    const text = msg.text.toLowerCase();

    // בדיקה אם ההודעה מכילה "שוק" או "חדשות"
    if (text.includes("שוק")) {
        sendStockUpdate("⚡ *סטטוס שוק בזמן אמת* ⚡");
    } else if (text.includes("חדשות")) {
        sendMarketNews();
    } else {
        bot.sendMessage(chatId, "היי דוראל, אני מחכה לפקודה שלך:\n\n1️⃣ כתוב 'מה מצב ה**שוק**?' לעדכון מחירים.\n2️⃣ כתוב '**חדשות**' לעדכונים כלכליים.");
    }
});

// תזמון אוטומטי (שני-שישי ב-23:00)
schedule.scheduleJob('0 23 * * 1-5', () => sendStockUpdate("🏁 *סיכום סגירת יום* 🏁"));

// שרת חובה ל-Render
http.createServer((req, res) => { res.writeHead(200); res.end('Market Intelligence Active'); }).listen(process.env.PORT || 3000);
