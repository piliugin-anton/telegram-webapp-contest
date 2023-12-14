import EventEmitter from '@foxify/events'

export default class Canvas extends EventEmitter {
  constructor({ elementSelector, options, history, historyIndex }) {
    super()

    this.canvas = document.querySelector(elementSelector)

    if (!this.canvas) throw new Error(`Cannot find a canvas element with selector ${elementSelector}`)

    this.options = options
    this.context = canvas.getContext('2d')

    this.history = history || []
    this.historyIndex = this.history.length ? this.history.length - 1 : -1
    this.step = []
    this.isDrawing = false
    this.isErasing = false
    this.x = this.y = 0
    this.offsetX = this.offsetY = 0
    this.ongoingTouches = []

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this))
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this))
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this))

    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
    document.addEventListener('mouseup', this.handleMouseUp.bind(this))

    this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight

    this.onInit()
  }

  get strokeStyle() {
    return this.options.color
  }

  get lineWidth() {
    return this.options.lineWidth
  }

  get fillStyle() {
    return this.options.backgroundColor
  }

  get undoEnabled() {
    return this.history.length >= 1 && this.historyIndex >= 0
  }

  get redoEnabled() {
    return this.history.length >= 1 && this.historyIndex < this.history.length - 1
  }

  onInit() {
    this.updateBackground()
    this.redraw()
  }

  toggleMode() {
    if (this.isErasing) {
      this.disableEraser()
    } else {
      this.enableEraser()
    }
  }

  enableEraser() {
    this.isErasing = true

    this.context.globalCompositeOperation = 'destination-out'

    this.emit('mode', false)
  }

  disableEraser() {
    this.isErasing = false

    this.context.globalCompositeOperation = 'source-over'

    this.emit('mode', true)
  }

  resizeCanvas() {
		if (this.canvas.width === window.innerWidth && this.canvas.height === window.innerHeight) return

		this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

		this.redraw()
  }

  undo() {
    if (!this.undoEnabled) return

    this.clearArea()

    this.historyIndex--
    if (this.historyIndex >= 0) {
      this.redraw()
    }

    this.emit('undo', { undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled })
  }

  redo() {
    if (!this.redoEnabled) return

    if (this.historyIndex < this.history.length - 1) this.historyIndex++

    this.clearArea()
    this.redraw()

    this.emit('redo', { undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled })
  }

  updateBackground() {
    this.canvas.style.backgroundColor = this.fillStyle
  }

  setCanvasBackground() {
    this.clearArea()

    this.context.fillStyle = this.fillStyle
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.redraw()
  }

  unsetCanvasBackground() {
    this.clearArea()

    this.context.fillStyle = 'rgba(0, 0, 0, 0)'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.redraw()
  }

  redraw() {
    const compositeOperation = this.context.globalCompositeOperation
    const slice = this.history.slice(0, this.historyIndex + 1)

    for (let i = 0; i < slice.length; i++) {
      for (let j = 0; j < slice[i].length; j++) {
        if (slice[i][j].isCircle) {
          this._drawCircle(slice[i][j])
        } else {
          this._drawLine(slice[i][j])
        }
      }
    }

    this.context.globalCompositeOperation = compositeOperation
  }

  updateOffset() {
    this.offsetX = this.canvas.offsetLeft
    this.offsetY = this.canvas.offsetTop
  }

  handleReposition(ev) {
    this.updateOffset()

    this.x = ev.clientX - this.offsetX
    this.y = ev.clientY - this.offsetY
  }

  handleMouseDown(ev) {
    if (ev.button !== 0 || !ev.target.isEqualNode(this.canvas)) return

    this.isDrawing = true
    this.step.length = 0

    this.handleReposition(ev)
  }

  handleMouseMove(ev) {
    if (!this.isDrawing) return
  
    this.drawMouseLine(ev)
  }

  handleMouseUp(ev) {
    if (!this.isDrawing) return

    this.isDrawing = false

    this.drawMouseLine(ev)

    if (this.step.length === 1) {
      this.drawMouseCircle()
    }

    this.updateHistoryAndEmit()
  }

  _drawLine(data) {
    this.context.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

    this.context.beginPath()
    this.context.moveTo(data.from.x, data.from.y)
    this.context.lineTo(data.to.x, data.to.y)
    this.context.lineWidth = data.lineWidth
    this.context.strokeStyle = data.strokeStyle
    this.context.lineJoin = 'round'
    this.context.closePath()
    this.context.stroke()
  }

  getRadians(degrees) {
    return (Math.PI / 180) * degrees
  }

  _drawCircle(data) {
    this.context.globalCompositeOperation = data.isErasing ? 'destination-out' : 'source-over'

    this.context.beginPath()
    this.context.arc(data.x, data.y, data.radius, 0, this.getRadians(360))
    this.context.fillStyle = data.fillStyle
    this.context.fill()
  }

  drawMouseCircle() {
    const halfLineWidth = this.step[0].lineWidth / 2
    const radius = halfLineWidth < 1 ? 1 : halfLineWidth

    this.step[0] = {
      isCircle: true,
      x: this.step[0].from.x,
      y: this.step[0].from.y,
      radius,
      isErasing: this.step[0].isErasing
    }

    if (!this.isErasing) {
      data.fillStyle = this.step[0].strokeStyle
    }

    this._drawCircle(this.step[0])
  }

  drawMouseLine(ev) {
    this.context.beginPath()
    this.context.strokeStyle = this.strokeStyle
    this.context.lineWidth = this.lineWidth
    this.context.lineJoin = 'round'
    this.context.moveTo(this.x, this.y)

    const data = {
      from: {
        x: this.x,
        y: this.y
      },
      lineWidth: this.lineWidth,
      isErasing: this.isErasing
    }
    this.handleReposition(ev)
    data.to = {
      x: this.x,
      y: this.y
    }

    this.context.lineTo(this.x, this.y)
    this.context.closePath()
    this.context.stroke()

    if (!this.isErasing) {
      data.strokeStyle = this.strokeStyle
    }

    this.step.push(data)
  }

  drawTouchCircles(touches) {
    touches.forEach((touch) => {
      const halfLineWidth = this.lineWidth / 2
      const radius = halfLineWidth < 1 ? 1 : halfLineWidth

      const circle = {
        isCircle: true,
        x: touch.clientX - this.offsetX,
        y: touch.clientY - this.offsetY,
        radius,
        isErasing: this.isErasing
      }

      if (!this.isErasing) {
        circle.fillStyle = this.strokeStyle
      }

      this.step.push(circle)

      this._drawCircle(circle)
    })  
  }

  handleTouchStart(ev) {
    if (!ev.target.isEqualNode(this.canvas)) return

    this.isDrawing = true

    ev.preventDefault()

    this.updateOffset()

    for (let i = 0; i < ev.changedTouches.length; i++) {
      this.ongoingTouches.push(this.copyTouch(ev.changedTouches[i]))
    }

    this.step.length = 0
  }

  handleTouchMove(ev) {
    if (!this.isDrawing) return

    ev.preventDefault()

    for (let i = 0; i < ev.changedTouches.length; i++) {
      const idx = this.ongoingTouchIndexById(ev.changedTouches[i].identifier)

      if (idx < 0) continue

      const data = {
        from: {
          x: this.ongoingTouches[idx].clientX - this.offsetX,
          y: this.ongoingTouches[idx].clientY - this.offsetY
        },
        to: {
          x: ev.changedTouches[i].clientX - this.offsetX,
          y: ev.changedTouches[i].clientY - this.offsetY
        },
        lineWidth: this.lineWidth,
        isErasing: this.isErasing
      }

      if (!this.isErasing) {
        data.strokeStyle = this.strokeStyle
      }

      this.step.push(data)

      this.context.beginPath()
      this.context.moveTo(data.from.x, data.from.y)
      this.context.lineTo(data.to.x, data.to.y)
      this.context.lineWidth = this.lineWidth
      this.context.strokeStyle = this.strokeStyle
      this.context.lineJoin = 'round'
      this.context.closePath()
      this.context.stroke()
      this.ongoingTouches.splice(idx, 1, this.copyTouch(ev.changedTouches[i]))  // swap in the new touch record
    }
  }

  handleTouchEnd(ev) {
    if (!this.isDrawing) return

    this.isDrawing = false

    ev.preventDefault()

    const touches = []

    for (let i = 0; i < ev.changedTouches.length; i++) {
      const idx = this.ongoingTouchIndexById(ev.changedTouches[i].identifier)
      if (idx < 0) continue

      touches.push(this.ongoingTouches[idx])
      this.ongoingTouches.splice(idx, 1)
    }

    if (!this.step.length) {
      this.drawTouchCircles(touches)
    }

    this.updateHistoryAndEmit()
  }

  handleTouchCancel(ev) {
    if (!this.isDrawing) return

    this.isDrawing = false

    ev.preventDefault()

    for (let i = 0; i < ev.changedTouches.length; i++) {
      const idx = this.ongoingTouchIndexById(ev.changedTouches[i].identifier)
      this.ongoingTouches.splice(idx, 1)  // remove it; we're done
    }
  }

  copyTouch({ identifier, clientX, clientY }) {
    return { identifier, clientX, clientY }
  }

  ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < this.ongoingTouches.length; i++) {
      const id = this.ongoingTouches[i].identifier
      if (id === idToFind) {
        return i
      }
    }

    return -1   // not found
  }

  clearArea() {
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  updateHistoryAndEmit() {
    const spliceNeeded = this.redoEnabled && this.historyIndex < this.history.length - 1
    
    if (spliceNeeded) {
      this.history = this.history.slice(0, this.historyIndex + 1)
    }

    this.historyIndex = this.history.length
    this.history.push([...this.step])

    this.emit('newLine', { undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled })
  }
}
