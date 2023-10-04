const path = require('path')
const ffmpegStatic = require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')

ffmpeg.setFfmpegPath(ffmpegStatic)

const encode = ({ input, inputOptions, videoCodec, audioCodec, noAudio = false, outputOptions, outputFilePath, reportProgress = true } = {}) => {
  return new Promise((resolve, reject) => {
    const ff = ffmpeg()
    
    if (!Array.isArray(input)) input = [input]

    for (let i = 0; i < input.length; i++) {
      ff.input(input[i])
    }

    if (inputOptions && typeof inputOptions === 'object') {
      for (const option in inputOptions) {
        ff.inputOptions(option, inputOptions[option])
      }
    }

    if (videoCodec) ff.videoCodec(videoCodec)

    if (noAudio) {
      ff.noAudio()
    } else if (audioCodec) {
      ff.audioCodec(audioCodec)
    }
    
    if (outputOptions && typeof outputOptions === 'object') {
      for (const option in outputOptions) {
        ff.outputOptions(option, outputOptions[option])
      }
    }

    ff.saveToFile(outputFilePath)

    if (reportProgress) {
      ff.on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.floor(progress.percent)}% done`)
        }
      })
    }

    ff.on('end', resolve)
    ff.on('error', reject)
  })
}

const encodeFromImages = ({ framesPath = '', framePattern = 'frame-%d.png', frameRate = 60, videoCodec = 'libx264', outputOptions = { '-pix_fmt': 'yuv420p' }, outputFilePath = 'output.mp4' } = {}) => encode({
  input: path.join(framesPath, framePattern),
  inputOptions: {
    '-framerate': frameRate
  },
  noAudio: true,
  videoCodec,
  outputOptions,
  outputFilePath
})

module.exports = {
  encode,
  encodeFromImages
}