
const HyperExpress = require('hyper-express')
const Router = new HyperExpress.Router()

const STATIC_MEMORY_CACHE = require('./static')
const { AddTask, RESULTS_DIR } = require('./task')
const { StaticFiles, TelegramAuthMiddleware }  = require('../middleware')
const { CustomError, INTERNAL_ERROR } = require('../helpers').error

const setRoutes = (server, isProduction) => {
  server.set_error_handler((request, response, error) => {
    const isCustom = error instanceof CustomError
  
    response.status(isCustom ? error.code : INTERNAL_ERROR.code).json({ error: isCustom ? error.message: INTERNAL_ERROR.message })
  })

  Router.post('/task', AddTask)
  Router.use('/task', TelegramAuthMiddleware)

  server.use('/api', Router)

  server.get('/result/:file', StaticFiles({ root: RESULTS_DIR, paramName: 'file' }))
  server.get('/*', STATIC_MEMORY_CACHE(isProduction))
}

module.exports = setRoutes