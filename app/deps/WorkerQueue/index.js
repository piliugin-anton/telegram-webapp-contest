const crypto = require('crypto')
const EventEmitter = require('@foxify/events').default
const { runService } = require('@app/helpers')

module.exports = class WorkerQueue extends EventEmitter {
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
		// save state to disk

		this.emit('added', { taskId, task: this.tasks[taskId] })
	}

	onTaskStarted(taskId) {
		this.runningTasks++

		// save state to disk

		this.emit('started', { taskId, task: this.tasks[taskId] })
	}

	onTaskFinished(taskId, result) {
		this.emit('finished', { taskId, task: this.tasks[taskId], result })
	}

	onTaskError(taskId, error) {
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
}
