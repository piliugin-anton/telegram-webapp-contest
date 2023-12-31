require('dotenv').config()
require('module-alias/register')

const HyperExpress = require('hyper-express')
const setRoutes = require('@app/routes')

const isProduction = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.SERVER_PORT, 10) + (isProduction ? 0 : 1)

const options = {}
if (process.env.SERVER_CERTIFICATE && process.env.SERVER_KEY) {
  options.cert_file_name = process.env.SERVER_CERTIFICATE
  options.key_file_name = process.env.SERVER_KEY
}

const server = new HyperExpress.Server(options)
setRoutes(server, isProduction)

server.listen(PORT).then((socket) => {
  process.emit('ready')
	if (isProduction) process.send('ready')

  console.log(`Server started on port ${PORT}`)
})
.catch((error) => console.log(`Failed to start server on port ${PORT}`, error))

const stopServer = () => {
  if (server._forksController) {
    server._forksController.gracefulShutdown()
  }

  server.close()
  process.exit(0)
}

const events = ['SIGINT', 'SIGTERM']
events.forEach((eventType) => process.once(eventType, stopServer))
