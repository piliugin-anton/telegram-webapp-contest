const HyperExpress = require('hyper-express')
const Router = new HyperExpress.Router()

const STATIC_MEMORY_CACHE = require('@app/routes/static')
const ReportError = require('@app/routes/error')
const { AddTask, RESULTS_DIR } = require('@app/routes/task')
const { StaticFiles, TelegramAuthMiddleware, ValidateTask }  = require('@app/middleware')
const { CustomError, INTERNAL_ERROR } = require('@app/helpers').error

const setRoutes = (server, isProduction) => {
  server.set_error_handler((request, response, error) => {
		if (!isProduction) console.log(error)
    const isCustom = error instanceof CustomError
  
    response.status(isCustom ? error.code : INTERNAL_ERROR.code).json({ error: isCustom ? error.message : INTERNAL_ERROR.message })
  })

  Router.post('/error', TelegramAuthMiddleware, ReportError)
  Router.post('/task', TelegramAuthMiddleware, ValidateTask, AddTask)

  server.use('/api', Router)

  server.get('/result/:file', StaticFiles({ root: RESULTS_DIR, paramName: 'file', attachment: true }))

  if (isProduction) server.get('/*', STATIC_MEMORY_CACHE())
}

module.exports = setRoutes
