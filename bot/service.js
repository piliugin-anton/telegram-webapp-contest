require('dotenv').config()
require('module-alias/register')

const path = require('path')
const crypto = require('crypto')
const { Telegraf, Markup, Input } = require('telegraf')
const { message } = require('telegraf/filters')

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
})
bot.start((ctx) => ctx.replyWithHTML('hello', Markup.inlineKeyboard([
  [Markup.button.webApp('ksjdnfkjsdfsdf', process.env.VITE_WEBAPP_URL, false)]
])))
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
bot.hears('hi', async (ctx) => await ctx.replyWithSticker(Input.fromLocalFile(path.join(__dirname, 'sample.tgs'))))

const events = ['SIGINT', 'SIGTERM']
events.forEach((eventType) => process.once(eventType, () => {
  bot.stop(eventType)
  process.exit(0)
}))

process.on('message', async ({ request, fileName, filePath }) => {
  console.log('Bot got message from parent process', request)

  try {
    const { initData, id } = request
    
    const title = `drawing-${id}`
    await bot.telegram.answerWebAppQuery(initData.query_id, {
      type: 'article',
      id: `article:${id}`,
      title,
      input_message_content: {
        message_text: `[${title}](${process.env.VITE_WEBAPP_URL}/result/${fileName})`,
        parse_mode: 'Markdown'
      }
    })
    
  } catch (ex) {
    console.log(ex)
  }
})

async function start() {
  bot.botInfo = await bot.telegram.getMe()
  console.log('Telegram bot started')
  process.emit('ready')

  bot.launch()
}

start()