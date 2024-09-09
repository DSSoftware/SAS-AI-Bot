const config = require("./config");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const TelegramBot = require('node-telegram-bot-api');


const genAI = new GoogleGenerativeAI(config.gemini_token);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = new TelegramBot(config.telegram_token, {polling: true});

const cache = new Map();

function setCache(id, entry){
    if(!cache.has(id)){
        cache.set(msg.from.id, {
            time: new Date().getTime(),
            history: []
        });
    }

    const history = cache.get(id).history;
    history.push(entry);

    cache.set(id, {
        time: new Date().getTime(),
        history: history.slice(-20)
    });
}

function getContext(id){
    if(!cache.has(id)){
        return "You had no previous conversation with this person.\n";
    }

    const history = cache.get(id).history;
    let context = "\n";
    for(const he of history){
        context += `${he.from}${he.text}\n`;
    }

    if(context == "\n"){
        return "You had no previous conversation with this person.\n";
    }

    return context;
}

setInterval(() => {
    for(const ckey of cache.keys()){
        const cached_entry = cache.get(ckey);
        if(cached_entry.time >= (new Date()).getTime() + 60*60*1000){
            cache.delete(ckey);
        }
    }
}, 60000);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    try{
        (async () => {

            if (msg.text === 'Clear History') {
                bot.sendMessage(chatId, `📃 You have cleared the history.`, { parseMode: 'Markdown' });
                cache.delete(msg.from.id);
                return;
            }
            
            if(!config.whitelisted.includes(msg.from.id)){
                bot.sendMessage(chatId, `❌ You are not whitelisted.\nForward this message to @artem2584 to get whitelisted.\n\nUser ID: \`${msg.from.id}\``, { parseMode: 'MarkdownV2' });
                return;
            }

            if(!msg.text){
                bot.sendMessage(chatId, '❌ Text content cannot be empty.');
                return;
            }

            if(!cache.has(msg.from.id)){
                bot.sendMessage(chatId, '📄 Your previous dialogue expired, so we started a new one for you!');
                cache.set(msg.from.id, {
                    time: new Date().getTime(),
                    history: []
                });
            }

            const context = getContext(msg.from.id);

            const originalMessageID = msg.message_id;

            const prompt = `Here's a small piece of previous conversation for you, but might be not full:\n${context.slice(-500)}\nYour goal is to provide answer no matter what. Please, respond to this request:\n${msg.text}`;

            const result = await model.generateContent([prompt]);

            setCache(msg.from.id, {
                from: "User: ",
                text: msg.text
            });

            const response = result.response.text();

            setCache(msg.from.id, {
                from: "You: ",
                text: response
            })

            bot.sendMessage(chatId, response, {
                parse_mode: 'MarkdownV2',
                reply_to_message_id: originalMessageID,
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: [ [{ text: 'Clear History', callback_data: 'clear_history' }] ]
                }
            });
        })().catch((e) => {
            throw e;
        })
    }
    catch(e){
        console.log(e);
        bot.sendMessage(chatId, '❌ Something went wrong while executing your command.');
    }
});