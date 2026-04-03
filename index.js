const axios = require('axios');
const cron = require('node-cron');

const TELEGRAM_TOKEN = '8504502159:AAEVZoVnSXqaV1zMq2MiHsfdlMeyHORJEXw';
const CHAT_ID = '7326639240';
const FINNHUB_KEY = 'd780k01r01qsamsifve0d780k01r01qsamsifveg';

const portfolio = {
    "VOO": 61061, "VGT": 33833, "VTI": 26642, "VXUS": 26238,
    "AAPL": 12149, "NLR": 5076, "CIBR": 2234, "BOTZ": 2959,
    "MU": 2318, "GOOGL": 1872
};

const watchList = ["NVDA", "TSLA", "MSFT", "AMZN", "URA", "SMH"];

async function getExchangeRate() {
    try {
        const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=USDILS&token=${FINNHUB_KEY}`);
        return res.data.c || 3.7;
    } catch (e) { return 3.7; }
}

async function sendDailyReport() {
    const usdRate = await getExchangeRate();
    let report = `📊 *דו"ח תיק השקעות מעודכן*\n`;
    report += `💵 שער דולר: ₪${usdRate.toFixed(2)}\n`;
    report += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`;

    let totalProfitILS = 0;

    for (const [symbol, investedILS] of Object.entries(portfolio)) {
        try {
            const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
            const data = res.data;
            if (!data.c) continue;

            const profitILS = investedILS * (data.dp / 100);
            const profitUSD = profitILS / usdRate;
            totalProfitILS += profitILS;
            
            const emoji = data.dp >= 0 ? '🟢' : '🔴';
            const isIsraeli = symbol.includes(".TA");

            report += `*${symbol}* | החזקה: ₪${investedILS.toLocaleString()}\n`;
            report += `${emoji} ${data.dp.toFixed(2)}% | ₪${profitILS.toFixed(0)}${isIsraeli ? '' : ` ($${profitUSD.toFixed(1)})`}\n`;
            report += `--- \n`;
        } catch (e) {}
    }

    report += `\n💰 *סה"כ יומי: ₪${totalProfitILS.toFixed(0)}*\n`;
    report += `\n👀 *מעקב:* `;
    for (const s of watchList) {
        try {
            const d = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FINNHUB_KEY}`);
            report += `${s} (${d.data.dp.toFixed(1)}%) | `;
        } catch(e) {}
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID, text: report, parse_mode: 'Markdown'
    });
}

// שולח דו"ח עכשיו ואז כל יום ב-23:00
sendDailyReport();
cron.schedule('0 23 * * 1-5', sendDailyReport);
console.log("הבוט פעיל ומחכה לתזמון היומי ב-23:00.");
