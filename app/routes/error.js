const ReportError = async (request, response) => {
  const { fileName, lineNumber, columnNumber, message, stack } = await request.json()

  console.log(`Error in file ${fileName} on line ${lineNumber}, column ${columnNumber}\nMessage: ${message}\nStack: ${stack}`)

  response.json({ 42: true })
}

module.exports = ReportError
