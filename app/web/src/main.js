import '~/scss/main.scss'

import axios from 'axios'
import Canvas from '~/canvas'
import ColorPicker from '~/color-picker'
import LineSettings from '~/line-settings'
import DownloadSettings from '~/download-settings'
import ColorsIcon from '~/assets/icons/colors-icon.svg?raw'
import BackgroundIcon from '~/assets/icons/background-icon.svg?raw'
import LineIcon from '~/assets/icons/line-icon.svg?raw'
import DownloadIcon from '~/assets/icons/download-icon.svg?raw'

// const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL
const telegram = window.Telegram.WebApp

// Back button
telegram.BackButton.isVisible = true
telegram.BackButton.onClick(() => {
  telegram.showConfirm('Are you sure you want to close the WebApp?', (isOkay) => {
    if (isOkay) telegram.close()
  })
})

// Main button
telegram.MainButton.isVisible = false
telegram.MainButton.isActive = false

telegram.expand()
telegram.enableClosingConfirmation()

document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('menu')
  const mode = document.getElementById('mode')
  const undo = document.getElementById('undo')
  const redo = document.getElementById('redo')

  const updateButtonsState = ({ undoEnabled, redoEnabled }) => {
    undo.disabled = !undoEnabled
    redo.disabled = !redoEnabled

    if (canvas.history.length && options.format) {
      if (!telegram.MainButton.isActive) telegram.MainButton.enable()
      if (!telegram.MainButton.isVisible) telegram.MainButton.show()
    }
  }

  const updateMode = (canvasMode) => {
    if (canvasMode) {
      mode.classList.remove('--eraser')
      mode.classList.add('--pencil')
    } else {
      mode.classList.remove('--pencil')
      mode.classList.add('--eraser')
    }
  }

  const options = {
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
    width: window.innerWidth,
    height: window.innerHeight - menu.offsetHeight,
    format: null,
    get allowHeightResize() {
      return !telegram.MainButton.isVisible
    }
  }

  const canvas = new Canvas({
    elementSelector: '#canvas',
    options
  })

  canvas.on('newLine', updateButtonsState)
  canvas.on('undo', updateButtonsState)
  canvas.on('redo', updateButtonsState)
  canvas.on('mode', updateMode)  

  mode.addEventListener('click', () => canvas.toggleMode())

  undo.addEventListener('click', () => canvas.undo())
  redo.addEventListener('click', () => canvas.redo())

  const strokeColorPicker = new ColorPicker({
    elementSelector: '#color-picker',
    color: options.color,
    palette: options.palette,
    icon: ColorsIcon
  })

  const backgroundColorPicker = new ColorPicker({
    elementSelector: '#background-color-picker',
    color: options.backgroundColor,
    palette: options.palette,
    icon: BackgroundIcon
  })
  
  const lineSettings = new LineSettings({
    elementSelector: '#line-settings',
    options,
    icon: LineIcon
  })

  const downloadSettings = new DownloadSettings({
    elementSelector: '#download-settings',
    options,
    icon: DownloadIcon
  })

  strokeColorPicker.on('change', (color) => {
    options.color = color.toHEXA().toString()

    canvas.disableEraser()
  })

  backgroundColorPicker.on('change', (color) => {
    options.backgroundColor = color.toHEXA().toString()

    canvas.updateBackground()
  })

  downloadSettings.on('format', (format) => {
    options.format = format

    telegram.MainButton.text = `Get ${format}`

    if (canvas.history.length) {
      if (!telegram.MainButton.isActive) telegram.MainButton.enable()
      if (!telegram.MainButton.isVisible) telegram.MainButton.show()
    }
  })

  window.addEventListener('resize', () => {
    options.width = window.innerWidth
    if (options.allowHeightResize) options.height = window.innerHeight - menu.offsetHeight

    canvas.resizeCanvas()
    lineSettings.setSettingsElementPosition()
    downloadSettings.setSettingsElementPosition()
  }, false)

  telegram.onEvent('viewportChanged', function expandWindow() {
    if (!this.isExpanded) this.expand()
  })

  telegram.MainButton.onClick(async () => {
    telegram.MainButton.showProgress(false)

    strokeColorPicker.hide()
    backgroundColorPicker.hide()
    lineSettings.hide()
    downloadSettings.hide()

    const payload = {
      initData: telegram.initData,
      format: options.format,
      data: canvas.history,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      backgroundColor: options.backgroundColor
    }

    try {
      const { data } = await axios.post('/api/task', payload)

      console.log(data)
    } catch (ex) {
      console.log(ex)
    }
  })
})
