const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const token = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const chatId = '7326639240';
const finnhubKey = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';
const bot = new TelegramBot(token, { polling: true });

const myStocks = [
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'GOOGL', name: 'Google' },
    { symbol: 'URA', name: 'Uranium ETF' }
];

async function sendStockUpdate() {
    let message = "🏦 *סיכום שוק יומי* 🏦\n";
    message += "━━━━━━━━━━━━━━━\n\n";

    for (const stock of myStocks) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${finnhubKey}`);
            const price = res.data.c;
            const change = res.data.dp;
            const statusIcon = change >= 0 ? "🟢" : "🔴";
            const trend = change >= 0 ? "+" : "";

            message += `${statusIcon} *${stock.symbol}* (${stock.name})\n`;
            message += `💰 מחיר: *$${price.toLocaleString()}*\n`;
            message += `📊 שינוי: *${trend}${change.toFixed(2)}%*\n`;
            message += "━━━━━━━━━━━━━━━\n";
        } catch (e) {
            console.error("Error with " + stock.symbol);
        }
    }
    
    message += "\n📱 *הבוט פעיל ומנטר עבורך.*";
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(err => console.log('Telegram error:', err));
}

// הפעלה ראשונית
sendStockUpdate();

// שרת חובה ל-Render
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running');
}).listen(process.env.PORT || 3000);

console.log("Bot is alive!");
