require('dotenv').config()
require('module-alias/register')

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Telegraf, Markup, Input } = require('telegraf')
const { message } = require('telegraf/filters')

const isProduction = process.env.NODE_ENV === 'production'
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
  if (bot.botInfo) bot.stop(eventType)
  process.exit(0)
}))

if (isProduction) {
	const pm2 = require('pm2')

	pm2.launchBus((err, pm2_bus) => {
		if (err) throw err

		pm2_bus.on('rendered', ({ data }) => onRenderReady(data))
	})
} else {
	process.on('message', onRenderReady)
}

async function onRenderReady({ request, fileName, filePath }) {
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
}

async function start() {
  bot.botInfo = await bot.telegram.getMe()

	const options = {}
	if (process.env.BOT_DOMAIN) {
		let certificate
		if (process.env.BOT_CERTIFICATE === 'self-signed') {
			const certPath = path.join(__dirname, 'self-signed.pem')

			if (fs.accessSync(certPath, fs.constants.R_OK)) {
				certificate = certPath
			} else {
				console.log(`Generate a self-signed PEM certificate according to instruction (https://core.telegram.org/bots/self-signed) and place it in project root dir, so the full path to a .pem file will look like: ${certPath}`)
			}
		} else if (fs.accessSync(process.env.BOT_CERTIFICATE, fs.constants.R_OK)) {
			certificate = process.env.BOT_CERTIFICATE
		}

		const domain = `${certificate ? 'https' : 'http'}://${process.env.BOT_DOMAIN}`
		const port = parseInt(process.env.BOT_PORT, 10)
		const secretToken = crypto.randomBytes(64).toString('hex')

		options.webhook = {
			domain,
			port,
			secretToken,
			certificate,
		}
	}

  bot.launch(options)

	console.log('Telegram bot started')

  process.emit('ready')
	if (isProduction) process.send('ready')
}

start()
