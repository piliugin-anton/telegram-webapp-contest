const { INVALID_REQUEST } = require('@app/helpers').error

const CONSTANTS = {
	MAX_WIDTH: 4096,
	MAX_HEIGHT: 2034,
	MAX_RADIUS: 40,
	MAX_LINE_WIDTH: 40,
	PADDING: 20
}

const ValidateTask = async (request, response, next) => {
	const { format, data, backgroundColor } = await request.json()

  if (
    (format !== 'picture' && format !== 'video' && format !== 'GIF') ||
    typeof backgroundColor !== 'string' || !isValidHexColor(backgroundColor) ||
    (!Array.isArray(data) || Array.isArray(data) && data.length < 1)
  ) return INVALID_REQUEST

	const { isValid, canvasWidth, canvasHeight, normalizedData } = validateData(data)

	if (!isValid) return INVALID_REQUEST

	request.locals.format = format
	request.locals.backgroundColor = backgroundColor
	request.locals.canvasWidth = canvasWidth
	request.locals.canvasHeight = canvasHeight
	request.locals.data = normalizedData

	next()
}

const validateData = (data) => {
	const result = { isValid: false }

	let XMIN = CONSTANTS.MAX_WIDTH
	let XMAX = 0
	let YMIN = CONSTANTS.MAX_HEIGHT
	let YMAX = 0

	const flatData = data.flat()

	for (let i = 0; i < flatData.length; i++) {
		const { from, to, isCircle, x, y, radius } = flatData[i]

		if (
			(isCircle && (!isFinite(x) || !isFinite(y) || !isFinite(radius) || radius < 1 || radius > CONSTANTS.MAX_RADIUS)) ||
			(!isCircle && (!isFinite(from.x) || !isFinite(from.y) || !isFinite(to.x) || !isFinite(to.y)))
		) return result

		if (!isCircle) {
			if (from.x < XMIN) XMIN = from.x
			if (from.x > XMAX) XMAX = from.x

			if (to.x < XMIN) XMIN = to.x
			if (to.x > XMAX) XMAX = to.x

			if (from.y < YMIN) YMIN = from.y
			if (from.y > YMAX) YMAX = from.y

			if (to.y < YMIN) YMIN = to.y
			if (to.y > YMAX) YMAX = to.y
		} else {
			if (x < XMIN) XMIN = x
			if (x > XMAX) XMAX = x

			if (y < YMIN) YMIN = y
			if (y > YMAX) YMAX = y
		}
	}

	const width = Math.abs(XMIN - XMAX)
	const height = Math.abs(YMIN - YMAX)

	if (width < 1 || width > CONSTANTS.MAX_WIDTH) return result
	if (height < 1 || height > CONSTANTS.MAX_HEIGHT) return result

	const isPaddingWidthAvailable = isPaddingAvailable(width, CONSTANTS.PADDING * 2, CONSTANTS.MAX_WIDTH)
	const isPaddingHeightAvailable = isPaddingAvailable(height, CONSTANTS.PADDING * 2, CONSTANTS.MAX_HEIGHT)

	result.isValid = true
	result.canvasWidth = isPaddingWidthAvailable ? width + (CONSTANTS.PADDING * 2) : width
	result.canvasHeight = isPaddingHeightAvailable ? height + (CONSTANTS.PADDING * 2) : height
	result.normalizedData = data

	// NORMALIZE DATA AND PAD
	const XOFFSET = (XMIN <= 0 ? XMIN : -XMIN) + (isPaddingWidthAvailable ? CONSTANTS.PADDING : 0)
	const YOFFSET = (YMIN <= 0 ? YMIN : -YMIN) + (isPaddingHeightAvailable ? CONSTANTS.PADDING : 0)
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < data[i].length; j++) {
			const { isCircle } = data[i][j]

			if (!isCircle) {
				data[i][j].from.x += XOFFSET
				data[i][j].to.x += XOFFSET

				data[i][j].from.y += YOFFSET
				data[i][j].to.y += YOFFSET
			} else {
				data[i][j].x += XOFFSET
				data[i][j].y += YOFFSET
			}
		}
	}

	return result
}

const isValidHexColor = (hex) => /^#[0-9A-F]{6}$/i.test(hex)

const isPaddingAvailable = (number, padding, maxNumber) => number + padding <= maxNumber

module.exports = {
	ValidateTask
}
