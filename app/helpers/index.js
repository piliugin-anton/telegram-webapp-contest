const fs = require('fs')
const error = require('./CustomError')

const mkDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true })
const rmDir = (dirPath) => fs.rmSync(dirPath, { recursive: true, force: true })

module.exports = {
  mkDir,
  rmDir,
  error
}
