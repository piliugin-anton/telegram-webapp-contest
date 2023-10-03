require('dotenv').config()

const HyperExpress = require('hyper-express')
const setRoutes = require('./routes')
const { CustomError, INTERNAL_ERROR } = require('./helpers').error

const isProduction = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.SERVER_PORT, 10) + (isProduction ? 0 : 1)

const server = new HyperExpress.Server()

setRoutes(server, isProduction)

server.set_error_handler((request, response, error) => {
  const isCustom = error instanceof CustomError

  response.status(isCustom ? error.code : INTERNAL_ERROR.code).json({ error: isCustom ? error.message: INTERNAL_ERROR.message })
})

server.listen(PORT).then((socket) => {
  process.emit('ready')

  console.log(`Server started on port ${PORT}`)

  /*if (isProduction) {
    const botServicePath = path.join(__dirname, '..', 'bot', 'service.js')

    const abortController = new AbortController()
    const options = {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      detached: false,
      signal: abortController.signal
    }

    const process = fork(botServicePath, [], options)

    server._botService = {
      process,
      abortController
    }
  }*/
})
.catch((error) => console.log(`Failed to start server on port ${PORT}`))

const stopServer = () => {
  /*if (server._botService) {
    server._botService.abortController.abort()
  }*/

  server.close()
  process.exit(0)
}

const events = ['SIGINT', 'SIGTERM']
events.forEach((eventType) => process.once(eventType, stopServer))
