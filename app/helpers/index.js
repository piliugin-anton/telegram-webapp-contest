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

function drawCircle(ctx, data) {
  ctx.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

  ctx.beginPath()
  ctx.arc(data.x, data.y, data.radius, 0, getRadians(360))
  ctx.fillStyle = data.fillStyle
  ctx.fill()
}

function drawLine(ctx, data) {
  ctx.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

  ctx.beginPath()
  ctx.moveTo(data.from.x, data.from.y)
  ctx.lineTo(data.to.x, data.to.y)
  ctx.lineWidth = data.lineWidth
  ctx.strokeStyle = data.strokeStyle
  ctx.lineJoin = 'round'
  ctx.closePath()
  ctx.stroke()
}

function getRadians(degrees) {
  return (Math.PI / 180) * degrees
}

module.exports = {
  runService,
  drawCircle,
  drawLine,
  error
}