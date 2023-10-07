require('dotenv').config()
require('module-alias/register')

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Telegraf, Markup } = require('telegraf')

const isProduction = process.env.NODE_ENV === 'production'
const bot = new Telegraf(process.env.BOT_TOKEN)

const webAppButton = Markup.button.webApp('Start drawing!', process.env.VITE_WEBAPP_URL, false)

bot.start((ctx) => ctx.replyWithHTML('To start drawing click on a button below or use a button from menu', Markup.inlineKeyboard([
  [webAppButton]
])))

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
		
		const title = `Drawing-${id}`
		await bot.telegram.answerWebAppQuery(initData.query_id, {
			type: 'article',
			id: `article:${id}`,
			title,
			input_message_content: {
				message_text: `Click to download result: [${title}](${process.env.VITE_WEBAPP_URL}/result/${fileName})`,
				parse_mode: 'Markdown'
			}
		})
		
	} catch (ex) {
		console.log(ex)
	}
}

function tryAccess(file) {
	const result = { exists: false, accessible: false }

	if (fs.existsSync(file)) {
		result.exists = true

		if (fs.accessSync(file, fs.constants.R_OK)) {
			result.accessible = true
		} else {
			console.log(`Process can't read a certificate file ${file}, check file read permissions`)
		}
	} else {
		console.log(`File ${file} does not exists`)
	}

	return result
}

async function start() {
  bot.botInfo = await bot.telegram.getMe()

	const options = {}
	if (process.env.BOT_DOMAIN) {
		let certificate
		if (process.env.BOT_CERTIFICATE === 'self-signed') {
			const certPath = path.join(__dirname, 'self-signed.pem')
			const { exists } = tryAccess(certPath)

			if (!exists) {
				console.log(`Generate a self-signed PEM certificate according to instruction (https://core.telegram.org/bots/self-signed) and place it in project root dir, so the full path to a .pem file will look like: ${certPath}`)
			} else {
				certificate = certPath
			}
		} else {
			const { exists } = tryAccess(process.env.BOT_CERTIFICATE)
			if (exists) certificate = process.env.BOT_CERTIFICATE
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

	bot.telegram.setChatMenuButton({
		chatId: undefined,
		menuButton: {
			type: 'web_app',
			...webAppButton
		}
	})
	.then((result) => result && console.log('Custom menu button is set'))
	.catch(console.log)

  process.emit('ready')
	if (isProduction) process.send('ready')
}

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
})

const events = ['SIGINT', 'SIGTERM']
events.forEach((eventType) => process.once(eventType, () => {
  if (bot.botInfo) bot.stop(eventType)
  process.exit(0)
}))

start()
