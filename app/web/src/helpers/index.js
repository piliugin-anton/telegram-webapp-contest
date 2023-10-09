export function getContrastYIQ(hexcolor) {
	if (hexcolor.slice(0, 1) === '#') {
		hexcolor = hexcolor.slice(1)
	}

	const R = parseInt(hexcolor.substr(0, 2), 16)
	const G = parseInt(hexcolor.substr(2, 2), 16)
	const B = parseInt(hexcolor.substr(4, 2), 16)

	const YIQ = ((R * 299) + (G * 587) + (B * 114)) / 1000

	return (YIQ >= 128) ? '#000000' : '#FFFFFF'
}

export function debounce(func, timeout = 300) {
  let timer

  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => func.apply(this, args), timeout)
  }
}

export function isValidHexColor(string) {
  return /^#[0-9A-F]{6}$/i.test(string)
}
