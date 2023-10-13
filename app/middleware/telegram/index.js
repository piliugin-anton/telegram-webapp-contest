const crypto = require('crypto')
const INVALID_REQUEST = require('../../helpers').error

const TelegramAuthMiddleware = (request, response, next) => {
  const initData = request.headers['telegram-webapp-initdata']

  if (typeof initData !== 'string') return INVALID_REQUEST

  try {
    const params = new URLSearchParams(initData)
    
    if (!params.has('query_id') || !params.has('hash') || !params.has('user') || !params.has('auth_date')) return INVALID_REQUEST

    const hash = params.get('hash')
    params.delete('hash')

    params.sort()

    let dataCheckString = ''
    for (const [key, value] of params.entries()) {
      if (dataCheckString.length) dataCheckString += '\n'

      dataCheckString += `${key}=${value}`
    }
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN)
    const validHash = crypto.createHmac('sha256', secretKey.digest()).update(dataCheckString).digest('hex')

    if (hash !== validHash) return INVALID_REQUEST

    const initDataObject = Object.fromEntries(params)
    initDataObject.auth_date = parseInt(initDataObject.auth_date, 10)
    initDataObject.user = JSON.parse(initDataObject.user)

    request.locals.initData = initDataObject

    next()
  } catch (ex) {
    return ex
  }
}

module.exports = {
  TelegramAuthMiddleware
}
