import '@simonwep/pickr/dist/themes/nano.min.css'
import Pickr from '@simonwep/pickr'
import { getContrastYIQ } from '~/src/helpers'

export default class ColorPicker extends Pickr {
  constructor({ elementSelector, color = '#000000', palette = null, icon = null }) {
    const element = document.querySelector(elementSelector)

    if (!element) throw new Error(`Cannot find an element with selector ${elementSelector}`)

    super({
      el: element,
			autoReposition: true,
      theme: 'nano', // or 'classic', or 'nano'
    
      lockOpacity: true,
      comparison: false,
      default: color,
      defaultRepresentation: 'HEX',
      showAlways: false,
      closeWithKey: 'Escape',
      useAsButton: true,
    
      swatches: palette,
    
      components: {
    
        // Main components
        preview: true,
        opacity: false,
        hue: true,
    
        // Input / output Options
        interaction: {
          hex: false,
          rgba: false,
          hsla: false,
          hsva: false,
          cmyk: false,
          input: false,
          clear: false,
          save: false
        }
      }
    })

    this.element = element
    this.icon = icon
    this.iconColor = '#000000'

    this.on('change', this.handleColorChange.bind(this))

    if (this.icon) {
      this.insertIconElement()
    }
  }

  handleColorChange(color) {
    if (!this.iconElement) return

    const pickerColor = color.toHEXA().toString()
    const contrastColor = getContrastYIQ(pickerColor)
    
    if (contrastColor === this.iconColor) return

    const paths = this.iconElement.getElementsByTagName('path')
    if (!paths) return

    [...paths].forEach((path) => {
      path.setAttribute('fill', contrastColor)
    })

    this.iconColor = contrastColor
  }

  insertIconElement() {
    if (this.iconElement) return
  
    const div = document.createElement('div')
    div.innerHTML = this.icon.trim()

    this.iconElement = div.firstChild
    this.iconElement.classList.add('app__menu__item__icon')
    this.element.insertAdjacentElement('beforeend', this.iconElement)
  }
}
