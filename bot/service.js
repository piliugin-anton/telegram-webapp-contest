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

		pm2_bus.on('queue', ({ data }) => onMessage(data))
	})
} else {
	process.on('message', onMessage)
}

async function onMessage({ taskId, error, result, task }) {
	try {
		const { data: { initData } } = task

		const article = {
			type: 'article',
			id: `article:${taskId}`,
			title: `Drawing-${taskId}`,
			input_message_content: {
				parse_mode: 'Markdown'
			}
		}

		if (error) {
      console.log(error)
			article.input_message_content.message_text = 'Error while processing your request'
		} else {
      const { fileName, filePath } = result

			article.input_message_content.message_text = `[Click here to download result](${process.env.VITE_WEBAPP_URL}/result/${fileName})`
		}

		await bot.telegram.answerWebAppQuery(initData.query_id, article)
	} catch (ex) {
		console.log(ex)
	}
}

function tryAccess(file) {
	const result = { exists: false, accessible: false }

	if (fs.existsSync(file)) {
		result.exists = true

    try {
      fs.accessSync(file, fs.constants.R_OK)
      result.accessible = true
    } catch(ex) {
      console.log(`Process can't read a certificate file ${file}, check file read permissions`)
    }
	} else {
		console.log(`File ${file} does not exists`)
	}

	return result
}

async function start() {
  bot.botInfo = await bot.telegram.getMe()

	const options = getWebhookOptions()

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

bot.catch((err, ctx) => console.log(`Ooops, encountered an error for ${ctx.updateType}`, err))

const events = ['SIGINT', 'SIGTERM']
events.forEach((eventType) => process.once(eventType, () => {
  bot.stop(eventType)
  process.exit(0)
}))

const getWebhookOptions = () => {
  const options = {
    webhook: {}
  }

	if (process.env.BOT_DOMAIN) {
		if (process.env.BOT_CERTIFICATE === 'self-signed') {
			const certPath = path.join(__dirname, 'self-signed.pem')
      const keyPath = path.join(__dirname, 'self-signed.key')
			const certAccess = tryAccess(certPath)
      const keyAccess = tryAccess(keyPath)

			if (!certAccess.exists || !keyAccess.exists) {
				console.log(`Generate a self-signed PEM certificate according to instruction (https://core.telegram.org/bots/self-signed) and place it in project root dir along with a .key file, so the full path to a .pem file will look like: ${certPath} and key path should look like: ${keyPath}`)
			} else {
				options.webhook.certificate = { source: fs.readFileSync(certPath) }
        options.webhook.certificateKey = fs.readFileSync(keyPath)
			}
		} else {
			const certAccess = tryAccess(process.env.BOT_CERTIFICATE)
      const keyAccess = tryAccess(process.env.BOT_KEY)
			if (certAccess.exists && keyAccess.exists) {
        options.webhook.certificate = { source: fs.readFileSync(process.env.BOT_CERTIFICATE) }
        options.webhook.certificateKey = fs.readFileSync(process.env.BOT_KEY)
      } else {
        if (!certAccess.exists) console.log(`Certificate file ${process.env.BOT_CERTIFICATE} doesn't exist`)
        if (!keyAccess.exists) console.log(`Certificate key file ${process.env.BOT_KEY} doesn't exist`)
      }
		}

    const isSSL = options.webhook.certificate && options.webhook.certificateKey
    if (!isSSL) return {}

    options.webhook.tlsOptions = {
      key: options.webhook.certificateKey,
      cert: options.webhook.certificate.source
    }

    const botPort = parseInt(process.env.BOT_PORT, 10)
    options.webhook.port = !isNaN(botPort) ? botPort : 8443
		options.webhook.domain = `${isSSL ? 'https' : 'http'}://${process.env.BOT_DOMAIN}:${options.webhook.port}`
		options.webhook.secretToken = crypto.randomBytes(64).toString('hex')
	}

  return options
} 

start()
