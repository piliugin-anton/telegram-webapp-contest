class CustomError extends Error {
  constructor(message, code = 500) {
    super(message)

    this.name = 'CustomError'
    this.code = code
  }
}

const INVALID_REQUEST = new CustomError('Invalid request', 400)
const INTERNAL_ERROR = new CustomError('Internal server error', 500)

module.exports = {
  CustomError,
  INVALID_REQUEST,
  INTERNAL_ERROR
}