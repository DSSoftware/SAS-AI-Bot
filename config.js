require('dotenv').config();

module.exports = {
    telegram_token: process.env.tokens_tg,
    gemini_token: process.env.tokens_ai,
    whitelisted: [
        1078449859, // Artem
        1988990363, // Vlad
        7116696790, // Din
        7468309565, // Kirill
    ]
};