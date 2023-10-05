const { INVALID_REQUEST } = require('@app/helpers').error

const ValidateTask = async (request, response, next) => {
	const { format, data, backgroundColor } = await request.json()

  if (
    (format !== 'picture' && format !== 'video' && format !== 'GIF') ||
    typeof backgroundColor !== 'string' || !/^#[0-9A-F]{6}$/i.test(backgroundColor) ||
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

	let XMIN = 0
	let XMAX = 0
	let YMIN = 0
	let YMAX = 0

	const flatData = data.flat()

	for (let i = 0; i < flatData.length; i++) {
		const { from, to, isCircle, x, y, radius } = flatData[i]

		if (
			(isCircle && !isFinite(x) || !isFinite(y) || !isFinite(radius) || radius < 1 || radius > 40) ||
			(!isCircle && !from || !to || !isFinite(from.x) || !isFinite(from.y) || !isFinite(to.x) || !isFinite(to.y))
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

	if (width < 1 || width > 4096) return result
	if (height < 1 || height > 2034) return result

	result.isValid = true
	result.canvasWidth = width
	result.canvasHeight = height
	result.normalizedData = data

	// NORMALIZE DATA!
	const XOFFSET = XMIN <= 0 ? XMIN : -XMIN
	const YOFFSET = YMIN <= 0 ? YMIN : -YMIN

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

module.exports = {
	ValidateTask
}
