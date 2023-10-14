const CanvasKitInit = require('canvaskit-wasm/bin/canvaskit.js')
const path = require('path')
const fs = require('fs')

module.exports = class CanvasKit {
  static async getCanvas(width, height) {
    const instance = await CanvasKitInit({
      locateFile: (file) => path.join(__dirname, '..', '..', '..', 'node_modules', 'canvaskit-wasm', 'bin', file)
    })
    const canvas = instance.MakeCanvas(width, height)

    canvas.encodeImage = encodeImage
    canvas.saveImage = saveImage

    return canvas
  }
}

function saveImage(imagePath) {
  fs.writeFileSync(imagePath, this.encodeImage(), 'base64')
}

function encodeImage() {
  return this.toDataURL().substring(21)
}
