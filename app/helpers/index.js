const { Worker } = require('worker_threads')
const fs = require('fs')
const error = require('./CustomError')

function runService(filename, workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(filename, { workerData })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}

const mkDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true })
const rmDir = (dirPath) => fs.rmSync(dirPath, { recursive: true, force: true })

module.exports = {
  runService,
  mkDir,
  rmDir,
  error
}
