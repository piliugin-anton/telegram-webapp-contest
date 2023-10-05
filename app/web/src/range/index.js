import '~/assets/scss/range/range.scss'

import EventEmitter from '@foxify/events'
import RangeTouch from 'rangetouch'

export default class Range extends EventEmitter {
  constructor({ value, min = 0, max = 100, step = 1 }) {
    super()

    this.element = document.createElement('input')
    this.element.setAttribute('type', 'range')

    if (typeof value === 'number') {
      this.element.value = value
    } else {
      this.element.value = 0
    }

    this.element.setAttribute('min', min)
    this.element.setAttribute('max', max)
    this.element.setAttribute('step', step)

    const range = new RangeTouch(this.element, {
      addCSS: true,
      watch: false,
      thumbWidth: 18
    })

    this.element.addEventListener('input', this.handleInputChange.bind(this))
  }

  handleInputChange(ev) {
    const value = ev.target.value

    this.emit('change', value)
  }
}
