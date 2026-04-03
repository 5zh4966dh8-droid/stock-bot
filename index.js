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

// פונקציה מדויקת לבדיקה אם השוק פתוח לפי שעון ישראל
function isMarketOpen() {
    const now = new Date();
    // המרה לשעון ישראל
    const israelTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
    const day = israelTime.getDay(); // 0=Sun, 1=Mon... 5=Fri, 6=Sat
    const hour = israelTime.getHours();
    const minute = israelTime.getMinutes();
    
    const totalMinutes = hour * 60 + minute;
    const openTime = 16 * 60 + 30; // 16:30
    const closeTime = 23 * 60;     // 23:00

    // פתוח רק בימים שני עד שישי, בין 16:30 ל-23:00
    return (day >= 1 && day <= 5) && (totalMinutes >= openTime && totalMinutes <= closeTime);
}

async function sendStockUpdate(titlePrefix) {
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
            const statusIcon = change >= 0 ? "🟢" : "🔴";
            message += `${statusIcon} *${stock.symbol}* (${stock.name})\n`;
            message += `💰 מחיר: *$${price.toLocaleString()}* (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)\n`;
            message += "━━━━━━━━━━━━━━━\n";
        } catch (e) { console.error(e); }
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

bot.on('message', (msg) => {
    if (!msg.text || msg.chat.id.toString() !== chatId) return;
    const text = msg.text.toLowerCase();

    if (text.includes("שוק") || text.includes("מצב")) {
        if (isMarketOpen()) {
            sendStockUpdate("⚡ *סטטוס שוק בזמן אמת* ⚡");
        } else {
            bot.sendMessage(chatId, "⚠️ *הבורסה סגורה כרגע (פעילה ב'-ו' 16:30-23:00)*\nהאם תרצה לראות את נתוני הסגירה האחרונים?", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ כן, תראה לי", callback_data: 'show_anyway' }],
                        [{ text: "❌ לא, עזוב", callback_data: 'ignore' }]
                    ]
                }
            });
        }
    }
});

bot.on('callback_query', (query) => {
    if (query.data === 'show_anyway') {
        sendStockUpdate("📊 *נתוני סגירה אחרונים* 📊");
    } else if (query.data === 'ignore') {
        bot.sendMessage(chatId, "סבבה, נדבר כשהבורסה תיפתח! 🔔");
    }
    bot.answerCallbackQuery(query.id);
});

schedule.scheduleJob('0 23 * * 1-5', () => sendStockUpdate("🏁 *סיכום סגירת יום מסחר* 🏁"));
http.createServer((req, res) => { res.writeHead(200); res.end('Market Status Fixed'); }).listen(process.env.PORT || 3000);
