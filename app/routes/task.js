const crypto = require('crypto')
const path = require('path')
const { error: { INVALID_REQUEST }, runService, mkDir } = require('../helpers')

const RESULTS_DIR = path.join(__dirname, '..', '.result')
mkDir(RESULTS_DIR)

const AddTask = async (request, response) => {
  const { format, data, canvasWidth, canvasHeight, backgroundColor } = await request.json()

  console.log(data)

  if (
    (format !== 'picture' && format !== 'video') ||
    !isFinite(canvasWidth) || !isFinite(canvasHeight) ||
    canvasWidth < 1 || canvasWidth > 4096 || canvasHeight < 1 || canvasHeight > 2305 ||
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

module.exports = {
  AddTask,
  RESULTS_DIR
}