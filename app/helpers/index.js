const { Worker } = require('worker_threads')
const path = require('path')
const error = require('./custom-error')

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'worker.js'), { workerData })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}

function getRadians(degrees) {
  return (Math.PI / 180) * degrees
}

module.exports = {
  runService,
  getRadians,
  error
}