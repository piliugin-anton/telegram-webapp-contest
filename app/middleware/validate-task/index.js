const { INVALID_REQUEST } = require('@app/helpers').error

const CONSTANTS = {
	MAX_WIDTH: 4096,
	MAX_HEIGHT: 2304,
	MAX_LINE_WIDTH: 40,
	get MAX_RADIUS() {
		return this.MAX_LINE_WIDTH / 2
	},
 	PADDING: 20,
	VIDEO_RESOLUTIONS: [
		{
			width: 128,
			height: 96
		},
		{
			width: 176,
			height: 144
		},
		{
			width: 320,
			height: 240
		},
		{
			width: 352,
			height: 288
		},
		{
			width: 352,
			height: 480
		},
		{
			width: 352,
			height: 576
		},
		{
			width: 720,
			height: 480
		},
		{
			width: 720,
			height: 576
		},
		{
			width: 1280,
			height: 720
		},
		{
			width: 1280,
			height: 1024
		},
		{
			width: 1920,
			height: 1080
		},
		{
			width: 2048,
			height: 1024
		},
		{
			width: 2048,
			height: 1080
		},
		{
			width: 2560,
			height: 1920
		},
		{
			width: 3672,
			height: 1536
		},
		{
			width: 3840,
			height: 2160
		},
		{
			width: 4096,
			height: 2048
		},
		{
			width: 4096,
			height: 2304
		}
	]
}

const ValidateTask = async (request, response, next) => {
	const { format, data, backgroundColor } = await request.json()

  if (
    (format !== 'picture' && format !== 'video' && format !== 'GIF') ||
    typeof backgroundColor !== 'string' || !isValidHexColor(backgroundColor) ||
    (!Array.isArray(data) || Array.isArray(data) && data.length < 1)
  ) return INVALID_REQUEST

	const { isValid, canvasWidth, canvasHeight, normalizedData } = validateData(data, format)

	if (!isValid) return INVALID_REQUEST

	request.locals.format = format
	request.locals.backgroundColor = backgroundColor
	request.locals.canvasWidth = canvasWidth
	request.locals.canvasHeight = canvasHeight
	request.locals.data = normalizedData

	next()
}

const validateData = (data, format) => {
	const result = { isValid: false }

	const flatData = data.flat()

	if ((format === 'video' || format === 'GIF') && flatData.length < 2) return result

	let XMIN = CONSTANTS.MAX_WIDTH
	let XMAX = 0
	let YMIN = CONSTANTS.MAX_HEIGHT
	let YMAX = 0

	let hasCircle = false
	for (let i = 0; i < flatData.length; i++) {
		const { from, to, lineWidth, strokeStyle, isCircle, x, y, radius, fillStyle } = flatData[i]

		if (!hasCircle && isCircle) hasCircle = true

		if (
			(isCircle && (typeof x !== 'number' || !isFinite(x) || typeof y !== 'number' || !isFinite(y) || typeof radius !== 'number' || !isFinite(radius) || radius < 1 || radius > CONSTANTS.MAX_RADIUS || !isValidHexColor(fillStyle))) ||
			(!isCircle && (typeof from.x !== 'number' || !isFinite(from.x) || typeof from.y !== 'number' || !isFinite(from.y) || typeof to.x !== 'number' || !isFinite(to.x) || typeof to.y !== 'number' || !isFinite(to.y) || typeof lineWidth !== 'number' || !isFinite(lineWidth) || lineWidth < 1 || lineWidth > CONSTANTS.MAX_LINE_WIDTH || !isValidHexColor(strokeStyle)))
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

	const WIDTH = Math.abs(XMIN - XMAX)
	const HEIGHT = Math.abs(YMIN - YMAX)

	const isJustSingleDot = hasCircle && flatData.length === 1 && WIDTH === 0 && HEIGHT === 0

	// TODO: scaling
	if (!isJustSingleDot) {
		if (WIDTH < 1 || WIDTH > CONSTANTS.MAX_WIDTH) return result
		if (HEIGHT < 1 || HEIGHT > CONSTANTS.MAX_HEIGHT) return result
	}

	result.isValid = true

	const isPaddingWidthAvailable = isPaddingAvailable(WIDTH, CONSTANTS.PADDING * 2, CONSTANTS.MAX_WIDTH)
	const isPaddingHeightAvailable = isPaddingAvailable(HEIGHT, CONSTANTS.PADDING * 2, CONSTANTS.MAX_HEIGHT)

	let canvasWidth = isPaddingWidthAvailable ? WIDTH + (CONSTANTS.PADDING * 2) : WIDTH
	let canvasHeight = isPaddingHeightAvailable ? HEIGHT + (CONSTANTS.PADDING * 2) : HEIGHT

	let xPadding = (isPaddingWidthAvailable ? CONSTANTS.PADDING : 0)
	let yPadding = (isPaddingHeightAvailable ? CONSTANTS.PADDING : 0)

	if (format === 'video') {
		const { width, height } = findClosesResolution(canvasWidth, canvasHeight)

		canvasWidth = width
		canvasHeight = height

		const xDiff = (canvasWidth - WIDTH)
		const yDiff = (canvasHeight - HEIGHT)

		xPadding = xDiff >= 2 ? xDiff / 2 : xDiff
		yPadding = yDiff >= 2 ? yDiff / 2 : yDiff
	}

	result.canvasWidth = canvasWidth
	result.canvasHeight = canvasHeight
	result.normalizedData = data

	// NORMALIZE DATA AND PAD
	const XOFFSET = (XMIN <= 0 ? XMIN : -XMIN) + xPadding
	const YOFFSET = (YMIN <= 0 ? YMIN : -YMIN) + yPadding
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
const findClosesResolution = (width, height) => {
	for (let i = 0; i < CONSTANTS.VIDEO_RESOLUTIONS.length; i++) {
		const resolution = CONSTANTS.VIDEO_RESOLUTIONS[i]
		if (resolution.width >= width && resolution.height >= height) {
			return resolution
		}
	}
}

module.exports = {
	ValidateTask
}
