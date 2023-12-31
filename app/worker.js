require('module-alias/register')

const { workerData, parentPort } = require('worker_threads')

const path = require('path')
const fs = require('fs')
const { createCanvas } = require('canvas')
const FFmpeg = require('@app/deps/FFmpeg')
const { mkDir, rmDir } = require('@app/helpers')

const { format, canvasWidth, canvasHeight, data, initData, backgroundColor, dir } = workerData

const canvas = createCanvas(canvasWidth, canvasHeight)
const circleRadians = getRadians(360)

const framesPath = path.join(dir, `${initData.query_id}-ffmpeg`)
const framesPattern = 'frame-%d.png'

const isAnimation = format === 'video' || format === 'GIF'
const extensions = {
  picture: 'png',
  video: 'mp4',
  GIF: 'gif'
}

const extension = extensions[format]

if (isAnimation) mkDir(framesPath)

draw(canvas)
processResult(canvas)

function getRadians(degrees) {
  return (Math.PI / 180) * degrees
}

function drawCircle(ctx, data) {
  ctx.fillStyle = data.isErasing ? backgroundColor : data.fillStyle
  ctx.beginPath()
  ctx.arc(data.x, data.y, data.radius, 0, circleRadians)
  ctx.fill()
}

function drawLine(ctx, data) {
  ctx.lineWidth = data.lineWidth
  ctx.strokeStyle = data.isErasing ? backgroundColor : data.strokeStyle
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(data.from.x, data.from.y)
  ctx.lineTo(data.to.x, data.to.y)
  ctx.closePath()
  ctx.stroke()
}

function saveFrame(canvas, frameIndex) {
  const frameFileName = `frame-${frameIndex}.png`
  const frameFilePath = path.join(framesPath, frameFileName)
  const buffer = canvas.toBuffer()
  fs.writeFileSync(frameFilePath, buffer, 'binary')

  return ++frameIndex
}

function draw(canvas) {
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  let frameIndex = 0
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (isAnimation && frameIndex === 0) {
        frameIndex = saveFrame(canvas, frameIndex)
      }

      if (data[i][j].isCircle) {
        drawCircle(ctx, data[i][j])
      } else {
        drawLine(ctx, data[i][j])
      }

      if (isAnimation) {
        frameIndex = saveFrame(canvas, frameIndex)
      }
    }

    if (isAnimation) {
      frameIndex = saveFrame(canvas, frameIndex)
    }
  }
}

function processResult(canvas) {
  if (format === 'picture') {
    const fileName = `${initData.query_id}.${extension}`
    const filePath = path.join(dir, fileName)
    const buffer = canvas.toBuffer()
    fs.writeFileSync(filePath, buffer, 'binary')

    parentPort.postMessage({ fileName, filePath })
  } else {
    const fileName = `${initData.query_id}.${extension}`
    const outputFilePath = path.join(dir, fileName)
    const isGIF = format === 'GIF'
  
    const fn = isGIF ? FFmpeg.imagesToGIF : FFmpeg.encodeFromImages
    
    fn({
      framesPath,
      framesPattern,
      frameRate: 60,
      outputFilePath
    })
    .then(() => {
      parentPort.postMessage({ fileName, filePath: outputFilePath })
    })
    .catch((error) => {
      console.log(error)
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath)
  
      parentPort.postMessage({ error })
    })
    .finally(() => {
      rmDir(framesPath)
    })
  }
}

