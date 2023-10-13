require('module-alias/register')

const { workerData, parentPort } = require('worker_threads')
const fs = require('fs')
const path = require('path')
const { createCanvas, clearAllCache } = require('@napi-rs/canvas')
const FFmpeg = require('@app/deps/FFmpeg')
const { mkDir, rmDir } = require('@app/helpers')

const { format, canvasWidth, canvasHeight, data, initData, backgroundColor, dir } = workerData

const canvas = createCanvas(canvasWidth, canvasHeight)

const framesPath = path.join(dir, `${initData.query_id}-ffmpeg`)
const framesPattern = 'frame-%d.png'

const isAnimation = format === 'video' || format === 'GIF'
const extensions = {
  picture: 'jpg',
  video: 'mp4',
  GIF: 'gif'
}

const extension = extensions[format]

if (isAnimation) mkDir(framesPath)

function getRadians(degrees) {
  return (Math.PI / 180) * degrees
}

function drawCircle(ctx, data) {
  ctx.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

  ctx.beginPath()
	ctx.fillStyle = data.fillStyle
  ctx.arc(data.x, data.y, data.radius, 0, getRadians(360))
  ctx.fill()
}

function drawLine(ctx, data) {
  ctx.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

  ctx.beginPath()
	ctx.lineWidth = data.lineWidth
  ctx.strokeStyle = data.strokeStyle
  ctx.lineJoin = 'round'
  ctx.moveTo(data.from.x, data.from.y)
  ctx.lineTo(data.to.x, data.to.y)
  ctx.closePath()
  ctx.stroke()
}

function saveFrame(canvas, frameIndex) {
  const frameFileName = `frame-${frameIndex}.png`
  const pngData = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(framesPath, frameFileName), pngData)

  return ++frameIndex
}

function draw() {
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

draw()

if (format === 'picture') {
  canvas.encode('jpeg').then((imageData) => {
    const fileName = `${initData.query_id}.${extension}`
    const filePath = path.join(dir, fileName)
    fs.writeFileSync(filePath, imageData)
    
    clearAllCache()

    parentPort.postMessage({ fileName, filePath })
  })
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
    clearAllCache()
  })
}
