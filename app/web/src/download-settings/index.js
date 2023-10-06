import EventEmitter from '@foxify/events'
import { reposition } from 'nanopop'

export default class DownloadSettings extends EventEmitter {
  constructor({ elementSelector, options, icon }) {
    super()

    this.element = document.querySelector(elementSelector)

    if (!this.element) throw new Error(`Cannot find a download settings element with selector ${elementSelector}`)

    this.options = options
    this.isOpen = false
    this.icon = icon

    this.insertSettingsElement()
    this.insertIconElement()

    this.setSettingsElementPosition()

    document.addEventListener('click', this.handleToggleSettings.bind(this))
  }

	get formats() {
		return this.options.formats
	}

  insertSettingsElement() {
    if (this.settingsElement) return

    const container = document.createElement('div')

    container.classList.add('app__menu__download-settings')
    container.setAttribute('aria-label', 'dialog')
    container.setAttribute('role', 'window')

    if (!this.settingsListElement) {
      const list = document.createElement('ul')
      list.classList.add('app__menu__download-settings__list')

			for (const value in this.formats) {
				const { icon, text, disabled } = this.formats[value]

				const li = document.createElement('li')
        const label = document.createElement('label')
        const radio = document.createElement('input')
        radio.setAttribute('type', 'radio')
        radio.setAttribute('name', 'format')
        radio.setAttribute('value', value)
				radio.disabled = disabled
        const iconContainer = document.createElement('div')
        const textNode = document.createElement('span')

        li.classList.add('app__menu__download-settings__list__item')
				if (disabled) li.classList.add('--disabled')
        label.classList.add('app__menu__download-settings__list__item__label')
        radio.classList.add('app__menu__download-settings__list__item__label__radio')
        iconContainer.classList.add('app__menu__download-settings__list__item__label__icon')
        textNode.classList.add('app__menu__download-settings__list__item__label__text')

        iconContainer.innerHTML = icon
        textNode.innerText = text

        label.appendChild(radio)
        label.appendChild(iconContainer)
        label.appendChild(textNode)

        li.appendChild(label)

        radio.addEventListener('change', this.handleFormatSelect.bind(this))

        list.appendChild(li)
			}

      this.settingsListElement = list

      container.appendChild(this.settingsListElement)
    }

    this.settingsElement = container

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
			this.element,
			this.settingsElement
		)
  }

	updateState() {
		const listItems = document.querySelectorAll('.app__menu__download-settings__list__item')

		if (!listItems) return

		listItems.forEach((li) => {
			const radio = li.querySelector('.app__menu__download-settings__list__item__label__radio')

			if (!radio) return

			const { disabled } = this.formats[radio.value]
			
			radio.disabled = disabled

			if (disabled) {
				li.classList.add('--disabled')
			} else {
				li.classList.remove('--disabled')
			}
		})
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
		this.setSettingsElementPosition()

    this.settingsElement.classList.add('--visible')
    this.isOpen = true
  }

  hide() {
    this.settingsElement.classList.remove('--visible')
    this.isOpen = false
  }

  handleFormatSelect(ev) {
		this.emit('format', ev.target.value)
  }
}
