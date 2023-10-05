const crypto = require('crypto')
const path = require('path')
const { runService, mkDir } = require('@app/helpers')

const RESULTS_DIR = path.join(__dirname, '..', '.result')
mkDir(RESULTS_DIR)

const AddTask = async (request, response) => {
  const { initData, format, backgroundColor, canvasWidth, canvasHeight, data } = request.locals

  // add to queue
  const id = crypto.randomUUID()

  response.json({ id })

  try {
    const result = await runService({
      dir: RESULTS_DIR,
      format,
			canvasWidth,
			canvasHeight,
      data,
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
