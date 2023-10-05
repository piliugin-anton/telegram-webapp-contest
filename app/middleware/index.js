const StaticFiles = require('./static-files')
const { TelegramAuthMiddleware } = require('./telegram')
const { ValidateTask } = require('./validate-task')

module.exports = {
  StaticFiles,
  TelegramAuthMiddleware,
	ValidateTask
}
