const path = require('path')
const LiveDirectory = require('live-directory')

const ROOT_DIRECTORY = path.join(__dirname, '..', 'web', 'build')

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

module.exports = STATIC_MEMORY_CACHE