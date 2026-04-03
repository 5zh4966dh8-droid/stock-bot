const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios');

const TOKEN = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const CHAT_ID = '7326639240';

async function check() {
    console.log("בודק נתונים עם הגרסה היציבה...");
    try {
        const apple = await yahooFinance.quote('AAPL');
        const message = `✅ *זה עובד סוף סוף!*\n🍎 *Apple:* $${apple.regularMarketPrice.toFixed(2)}`;
        
        await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log("הודעה נשלחה!");
    } catch (e) {
        console.error("שגיאה:", e.message);
    }
}
check();
