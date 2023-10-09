const { INVALID_REQUEST } = require('@app/helpers').error

const ReportError = async (request, response) => {
  const { fileName, lineNumber, columnNumber, message, stack } = await request.json()

  if (!fileName || !lineNumber || !columnNumber || !message || !stack) return INVALID_REQUEST

  console.log(`Error in file ${fileName} on line ${lineNumber}, column ${columnNumber}\nMessage: ${message}\nStack: ${stack}`)

  response.json({ 42: true })
}

module.exports = ReportError
