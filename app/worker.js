const { workerData, parentPort } = require('worker_threads')
const fs = require('fs')
const path = require('path')
const { createCanvas } = require('@napi-rs/canvas')
const { drawCircle, drawLine } = require('./helpers')

const { format, canvasWidth, canvasHeight, data, request, backgroundColor, dir } = workerData

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