import EventEmitter from '@foxify/events'

import PictureIcon from '../assets/picture-icon.svg?raw'
import VideoIcon from '../assets/video-icon.svg?raw'

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

  insertSettingsElement() {
    if (this.settingsElement) return

    const container = document.createElement('div')

    container.classList.add('app__menu__download-settings')
    container.setAttribute('aria-label', 'dialog')
    container.setAttribute('role', 'window')

    if (!this.settingsListElement) {
      const list = document.createElement('ul')
      list.classList.add('app__menu__download-settings__list')
      
      const items = [
        {
          icon: PictureIcon,
          text: 'Picture',
          value: 'picture'
        },
        {
          icon: VideoIcon,
          text: 'Video',
          value: 'video'
        }
      ]

      items.forEach(({ icon, text, value }) => {
        const li = document.createElement('li')
        const label = document.createElement('label')
        const radio = document.createElement('input')
        radio.setAttribute('type', 'radio')
        radio.setAttribute('name', 'format')
        radio.setAttribute('value', value)
        const iconContainer = document.createElement('div')
        const textNode = document.createElement('span')

        li.classList.add('app__menu__download-settings__list__item')
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
      })

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
    this.settingsElement.style.top = `${this.element.offsetTop - this.settingsElement.offsetHeight - 8}px`

    const left = this.element.offsetLeft
    const showLeft = left + this.settingsElement.offsetWidth > window.innerWidth ? false : true

    if (showLeft) {
      this.settingsElement.style.left = `${left}px`
    } else {
      this.settingsElement.style.left = `${window.innerWidth - this.settingsElement.offsetWidth - 2}px`
    }
  }

  handleToggleSettings(ev) {
    if (this.settingsElement.contains(ev.target)) return

    if (!this.element.contains(ev.target)) {
      if (this.isOpen) this.handleCloseSettings()
    } else if (!this.isOpen) {
        this.handleOpenSettings()
    } else {
      this.handleCloseSettings()
    }
  }

  handleOpenSettings() {
    this.settingsElement.classList.add('--visible')
    this.isOpen = true
  }

  handleCloseSettings() {
    this.settingsElement.classList.remove('--visible')
    this.isOpen = false
  }

  handleFormatSelect(ev) {
    switch (ev.target.value) {
      case 'picture':
        this.emit('format', 'picture')
        break
      
      case 'video':
        this.emit('format', 'video')
        break

      default:
        break
    }
  }
}