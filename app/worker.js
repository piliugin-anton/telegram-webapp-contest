const { workerData, parentPort } = require('worker_threads')
const fs = require('fs')
const path = require('path')
const { createCanvas } = require('@napi-rs/canvas')

const { format, canvasWidth, canvasHeight, data, request, backgroundColor, dir } = workerData

function getRadians(degrees) {
  return (Math.PI / 180) * degrees
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

const canvas = createCanvas(canvasWidth, canvasHeight)
const ctx = canvas.getContext('2d')

ctx.fillStyle = backgroundColor
ctx.fillRect(0, 0, canvasWidth, canvasHeight)

for (let i = 0; i < data.length; i++) {
  for (let j = 0; j < data[i].length; j++) {
    if (data[i][j].isCircle) {
      drawCircle(ctx, data[i][j])
    } else {
      drawLine(ctx, data[i][j])
    }
  }
}

canvas.encode('jpeg').then(async (imageData) => {
  const fileName = `${request.id}.jpg`
  const filePath = path.join(dir, fileName)
  await fs.promises.writeFile(filePath, imageData)

  parentPort.postMessage({ request, fileName, filePath })
})