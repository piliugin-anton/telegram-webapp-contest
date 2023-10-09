import EventEmitter from '@foxify/events'
import { reposition } from 'nanopop'

import Line from '~/assets/svg/line.svg?raw'
import Range from '~/src/Range'

export default class LineSettings extends EventEmitter {
  constructor({ elementSelector, options, icon }) {
    super()

    this.element = document.querySelector(elementSelector)

    if (!this.element) throw new Error(`Cannot find a line settings element with selector ${elementSelector}`)

    this.options = options
    this.isOpen = false
    this.icon = icon

    this.insertSettingsElement()
    this.insertIconElement()
    this.insertRangeElement()

    this.setSettingsElementPosition()

    document.addEventListener('pointerdown', this.handleToggleSettings.bind(this))
  }

  get lineWidth() {
    return this.options.lineWidth
  }

  get min() {
    return this.options.min || 1
  }

  get max() {
    return this.options.max || 40
  }

  get step() {
    return this.options.step || 1
  }

  get progress() {
    return (this.lineWidth * 100) / this.max
  }

  get rangeElement() {
    return this.range?.element
  }

  insertRangeElement() {
    if (!this.settingsElement || this.rangeElement) return

    this.range = new Range({
      value: this.lineWidth,
      min: this.min,
      max: this.max,
      step: this.step
    })

    const div = document.createElement('div')
    div.classList.add('app__menu__line-settings__controls')

    div.appendChild(this.rangeElement)

    this.settingsElement.insertAdjacentElement('beforeend', div)

    this.range.on('change', this.handleLineWidthChange.bind(this))
  }

  insertSettingsElement() {
    if (this.settingsElement) return

    const container = document.createElement('div')

    container.classList.add('app__menu__line-settings')
    container.setAttribute('aria-label', 'dialog')
    container.setAttribute('role', 'window')

    if (!this.lineElement) {
      const div = document.createElement('div')
      div.innerHTML = Line.trim()

      this.lineElement = div.firstChild
      this.linePath = this.lineElement.querySelector('path')

      container.appendChild(this.lineElement)
    }

    this.settingsElement = container
    this.updateLineWidth()

    document.body.insertAdjacentElement('beforeend', container)
  }

  insertIconElement() {
    if (this.iconElement) return
  
    const div = document.createElement('div')
    div.innerHTML = this.icon.trim()

    this.iconElement = div.firstChild
    this.iconElement.classList.add('app__menu__item__icon')

    this.element.insertAdjacentElement('beforeend', this.iconElement)
  }

  setSettingsElementPosition() {
    reposition(
			/* reference: */ this.element,
			/* popper: */ this.settingsElement,
			/* We're using the default options */
		)
  }

  updateLineWidth() {
    this.settingsElement.style.setProperty('--progress-value', `${this.progress}%`)

    this.linePath.setAttribute('stroke-width', this.lineWidth)
  }

  handleLineWidthChange(value) {
    this.options.lineWidth = parseInt(value, 10)

    this.updateLineWidth()

    this.emit('change', this.lineWidth)
  }

  handleToggleSettings(ev) {
    if (this.settingsElement.contains(ev.target)) return

    if (!this.element.contains(ev.target)) {
      if (this.isOpen) this.hide()
    } else if (!this.isOpen) {
        this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.settingsElement.classList.add('--visible')
    this.isOpen = true
  }

  hide() {
    this.settingsElement.classList.remove('--visible')
    this.isOpen = false
  }
}
