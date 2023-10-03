
const HyperExpress = require('hyper-express')
const Router = new HyperExpress.Router()
const LiveDirectory = require('live-directory')
const path = require('path')
const crypto = require('crypto')
const { StaticFiles, TelegramAuthMiddleware }  = require('./middleware')
const { error: { CustomError, INVALID_REQUEST }, runService } = require('./helpers')

const ROOT_DIRECTORY = path.join(__dirname, 'web', 'build')
const RESULTS_DIR = path.join(__dirname, '.result')

const STATIC_MEMORY_CACHE = (isProduction) => {
  const LiveAssets = new LiveDirectory(ROOT_DIRECTORY, {
    static: isProduction,
    cache: {
      max_file_count: 50,
      max_file_size: 1024 * 1024 * 2.5, // 2.5 MB - Most assets will be under 2.5 MB hence they can be cached
    },
    filter: {
      keep: {
        extensions: ['html', 'css', 'js', 'json', 'png', 'jpg', 'jpeg'] // We only want to serve files with these extensions
      }
    }
  })

  return (request, response) => {
    const filePath = request.path === '/' ? 'index.html' : request.path
    const fileExtensionName = path.extname(filePath)
    const file = LiveAssets.get(filePath)

    if (!file || !fileExtensionName) return response.status(404).send('Not Found')

    const extension = fileExtensionName.substring(1)
    response.type(extension)

    if (file.cached) {
      return response.send(file.content)
    } else {
      const readable = file.stream()

      return readable.pipe(response)
    }
  }
}

const task = async (request, response) => {
  const { format, data, canvasWidth, canvasHeight, backgroundColor } = await request.json()

  if (
    (format !== 'picture' && format !== 'video') ||
    !isFinite(canvasWidth) || !isFinite(canvasHeight) ||
    canvasWidth < 1 || canvasWidth > 7680 || canvasHeight < 1 || canvasHeight > 4320 ||
    typeof backgroundColor !== 'string' ||
    (!Array.isArray(data) || Array.isArray(data) && data.length < 1)
  ) return INVALID_REQUEST

  const { initData } = request.locals

  // add to queue
  const id = crypto.randomUUID()

  response.json({ id })

  try {
    const result = await runService({
      dir: RESULTS_DIR,
      format,
      data,
      canvasHeight,
      canvasWidth,
      backgroundColor,
      request: {
        id,
        initData
      }
    })
  
    process.send(result)
  } catch (ex) {
    console.log(ex)
  }
  
}

const setRoutes = (server, isProduction) => {
  Router.post('/task', task)
  Router.use('/task', TelegramAuthMiddleware)

  server.use('/api', Router)

  server.get('/result/:file', StaticFiles({ root: RESULTS_DIR, paramName: 'file' }))
  server.get('/*', STATIC_MEMORY_CACHE(isProduction))
}

module.exports = setRoutes