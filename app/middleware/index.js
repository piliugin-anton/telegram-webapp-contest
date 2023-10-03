const StaticFiles = require('./static-files')
const { TelegramAuthMiddleware } = require('./telegram')

module.exports = {
  StaticFiles,
  TelegramAuthMiddleware
}