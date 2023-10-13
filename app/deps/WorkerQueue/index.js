const crypto = require('crypto')
const EventEmitter = require('@foxify/events').default
const { runService } = require('@app/helpers')

module.exports = class WorkerQueue extends EventEmitter {
  static STATUS = Object.freeze({
    ADDED: 0,
    STARTED: 1,
    FINISHED: 2,
    ERROR: 3
  })

	tasks = {
		_queue: []
	}
	runningTasks = 0

	constructor(options = {}) {
		super()

		const defaultOptions = {
			concurrency: 2
		}

		const {
			concurrency = defaultOptions.concurrency
		} = options

		this.concurrency = typeof concurrency !== 'number' || !isFinite(concurrency) ? defaultOptions.concurrency : concurrency
	}

	addTask({ workerFilename, data }) {
		const taskId = crypto.randomUUID()

		this.tasks[taskId] = {
			workerFilename,
			data
		}

		Object.defineProperty(this.tasks[taskId], 'promise', {
			enumerable: false,
			configurable: false,
			writable: false,
			value: () => runService(this.tasks[taskId].workerFilename, this.tasks[taskId].data)
		})

		this.onTaskAdded(taskId)

		if (this.runningTasks < this.concurrency) {
			this.runTask(taskId)
		} else {
			this.tasks._queue.push(taskId)
		}

		return taskId
	}

	onTaskAdded(taskId) {
    const task = this.tasks[taskId]
    task.status = WorkerQueue.STATUS.ADDED

    // save state to disk

		this.emit('added', { taskId, task })
	}

	onTaskStarted(taskId) {
		this.runningTasks++

		const task = this.tasks[taskId]
    task.status = WorkerQueue.STATUS.STARTED

    // save state to disk

		this.emit('started', { taskId, task })
	}

	onTaskFinished(taskId, result) {
    const task = this.tasks[taskId]
    task.status = WorkerQueue.STATUS.FINISHED

		this.emit('finished', { taskId, task, result })
	}

	onTaskError(taskId, error) {
    const task = this.tasks[taskId]
    task.status = WorkerQueue.STATUS.ERROR

		this.emit('error', { taskId, task: this.tasks[taskId], error })
	}

	onAfterTask(taskId) {
		this.runningTasks--

		delete this.tasks[taskId]

		// save state to disk

		if (this.runningTasks < this.concurrency && this.tasks._queue.length) {
			this.runTask(this.tasks._queue.shift())
		}
	}

	runTask(taskId) {
		this.tasks[taskId]
			.promise()
			.then((result) => this.onTaskFinished(taskId, result))
			.catch((error) => this.onTaskError(taskId, error))
			.finally(() => this.onAfterTask(taskId))
			
		this.onTaskStarted(taskId)
	}

  isRunning(taskId) {
    return this.tasks[taskId] && this.tasks[taskId].status === WorkerQueue.STATUS.STARTED
  }
}
