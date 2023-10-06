import axios from 'axios'
import Canvas from '~/src/canvas'
import ColorPicker from '~/src/color-picker'
import LineSettings from '~/src/line-settings'
import DownloadSettings from '~/src/download-settings'
import { debounce } from '~/src/helpers'

import ColorsIcon from '~/assets/icons/colors-icon.svg?raw'
import BackgroundIcon from '~/assets/icons/background-icon.svg?raw'
import LineIcon from '~/assets/icons/line-icon.svg?raw'
import DownloadIcon from '~/assets/icons/download-icon.svg?raw'

export default class App {
	constructor(options = {}) {
		this.loader = document.getElementById('loader')
		this.mask = document.getElementById('mask')
		this.menu = document.getElementById('menu')

		const defaultOptions = {
			color: '#FFC20A',
			backgroundColor: '#FFFFFF',
			palette: [
				'#FFC20A',
				'#0C7BDC',
				'#E1BE6A',
				'#40B0A6',
				'#E66100',
				'#5D3A9B',
				'#FEFE62',
				'#D35FB7',
				'#1AFF1A',
				'#994F00',
				'#006CD1',
				'#005AB5',
				'#DC3220',
				'#1A85FF'
			],
			lineWidth: 4,
			format: null
		}

		this.options = {
			...defaultOptions,
			...options
		}

		document.addEventListener('gesturestart', (ev) => ev.preventDefault())

		this.handleResize = debounce(this.updateElementsPosition.bind(this), 100)
		window.addEventListener('resize', this.handleResize, false)

		this.tg = window.Telegram.WebApp

		// Main button
		this.tg.MainButton.isVisible = false
		this.tg.MainButton.isActive = false
		this.tg.MainButton.onClick(this.handleMainButtonClick.bind(this))

		// Back button
		this.tg.BackButton.isVisible = true
		this.tg.BackButton.onClick(() => {
			this.tg.showConfirm('Are you sure you want to close the WebApp?', (isOkay) => {
    		if (isOkay) this.tg.close()
  		})
		})

		this.tg.onEvent('viewportChanged', this.handleViewPortChange.bind(this))

		this.tg.expand()
		this.tg.enableClosingConfirmation()
	}

	get color() {
		return this.options.color
	}

	get backgroundColor() {
		return this.options.backgroundColor
	}

	get palette() {
		return this.options.palette
	}

	get lineWidth() {
		return this.options.lineWidth
	}

	get allowHeightResize() {
		return !this.tg.MainButton.isVisible
	}

	get format() {
		return this.options.format
	}

	get isRenderable() {
		const flatData = this.canvas.history.flat()

		return flatData.length >= 2
	}

	showLoading() {
		this.loader.classList.remove('hidden')
	}

	hideLoading() {
		this.loader.classList.add('hidden')
	}

	showMask() {
		this.mask.classList.remove('hidden')
	}

	hideMask() {
		this.mask.classList.add('hidden')
	}

	init() {
		this.canvas = new Canvas({
			elementSelector: '#canvas',
			options: this.options,
		})
	
		this.canvas.on('newLine', this.updateButtonsState.bind(this))
		this.canvas.on('undo', this.updateButtonsState.bind(this))
		this.canvas.on('redo', this.updateButtonsState.bind(this))
		this.canvas.on('mode', this.updateMode.bind(this))

  	this.mode = document.getElementById('mode')
  	this.undo = document.getElementById('undo')
  	this.redo = document.getElementById('redo')

		this.mode.addEventListener('click', () => this.canvas.toggleMode())
		this.undo.addEventListener('click', () => this.canvas.undo())
		this.redo.addEventListener('click', () => this.canvas.redo())

		this.strokeColorPicker = new ColorPicker({
			elementSelector: '#color-picker',
			color: this.color,
			palette: this.palette,
			icon: ColorsIcon
		})
	
		this.backgroundColorPicker = new ColorPicker({
			elementSelector: '#background-color-picker',
			color: this.backgroundColor,
			palette: this.palette,
			icon: BackgroundIcon
		})
		
		this.lineSettings = new LineSettings({
			elementSelector: '#line-settings',
			options: this.options,
			icon: LineIcon
		})
	
		this.downloadSettings = new DownloadSettings({
			elementSelector: '#download-settings',
			options: this.options,
			icon: DownloadIcon
		})
	
		this.strokeColorPicker.on('change', this.handleColorChange.bind(this))
		this.backgroundColorPicker.on('change', this.handleBackgroundColorChange.bind(this))
		this.downloadSettings.on('format', this.handleDownloadFormatChange.bind(this))

		this.tg.ready()

		this.hideLoading()
		this.hideMask()
	}

	handleColorChange(color) {
		this.options.color = color.toHEXA().toString()
	
		this.canvas.disableEraser()
	}

	handleBackgroundColorChange(color) {
		this.options.backgroundColor = color.toHEXA().toString()
	
		this.canvas.updateBackground()
	}

	handleDownloadFormatChange(format) {
		this.options.format = format
		
		this.tg.MainButton.text = `Get ${this.format}`

		if (this.isRenderable) {
			if (!this.tg.MainButton.isActive) this.tg.MainButton.enable()
			if (!this.tg.MainButton.isVisible) this.tg.MainButton.show()
		}
	}

	handleViewPortChange({ isStateStable }) {
		if (!this.tg.isExpanded) {
			this.tg.expand()
		} else {
			this.handleResize()
		}
	}

	async handleMainButtonClick() {
		this.tg.MainButton.showProgress(false)
		this.showMask()
	
		this.hideControls()
	
		const payload = {
			initData: this.tg.initData,
			format: this.format,
			data: this.canvas.history,
			backgroundColor: this.backgroundColor
		}
	
		try {
			const { data } = await axios.post('/api/task', payload)
	
			console.log(data)
		} catch (ex) {
			console.log(ex)
		}
	}

	updateElementsPosition() {
		this.hideControls()

		this.lineSettings.setSettingsElementPosition()
		this.downloadSettings.setSettingsElementPosition()
		this.canvas.resizeCanvas()
	}

	updateButtonsState({ undoEnabled, redoEnabled }) {
    this.undo.disabled = !undoEnabled
    this.redo.disabled = !redoEnabled

    if (this.isRenderable) {
			this.downloadSettings.enableButton()

			if (this.format) {
				if (!this.tg.MainButton.isActive) this.tg.MainButton.enable()
      	if (!this.tg.MainButton.isVisible) this.tg.MainButton.show()
			}
    } else {
			this.downloadSettings.disableButton()

      if (this.tg.MainButton.isVisible) this.tg.MainButton.hide()
		}
  }

  updateMode(canvasMode) {
    if (canvasMode) {
      this.mode.classList.remove('--eraser')
      this.mode.classList.add('--pencil')
    } else {
      this.mode.classList.remove('--pencil')
      this.mode.classList.add('--eraser')
    }
  }

	hideControls() {
		this.strokeColorPicker.hide()
		this.backgroundColorPicker.hide()
		this.lineSettings.hide()
		if (!this.tg.MainButton.isActive) this.downloadSettings.hide()
	}
}
