const path = require('path')
const WorkerQueue = require('@app/deps/WorkerQueue')
const { mkDir } = require('@app/helpers')

const isProduction = process.env.NODE_ENV === 'production'
const workerFilename = path.join(__dirname, '..', 'worker.js')
const RESULTS_DIR = path.join(__dirname, '..', '.result')

mkDir(RESULTS_DIR)

const queue = new WorkerQueue({
	concurrency: 2
})

const onDequeue = (data) => process.send(isProduction ? { type: 'render', data } : data)

queue.on('finished', onDequeue)
queue.on('error', onDequeue)

const AddTask = (request, response) => {
  const { initData, format, backgroundColor, canvasWidth, canvasHeight, data } = request.locals

  // add to queue
  const id = queue.addTask({
		workerFilename,
		data: {
      dir: RESULTS_DIR,
      format,
			canvasWidth,
			canvasHeight,
      data,
      backgroundColor,
      initData
    }
	})

  response.json({ id })
}

module.exports = {
  AddTask,
  RESULTS_DIR
}
