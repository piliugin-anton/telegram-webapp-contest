const { Worker } = require('worker_threads')
const crypto = require('crypto')
const EventEmitter = require('@foxify/events').default

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
			concurrency: 1
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
			value: () => {
        return new Promise((resolve, reject) => {
          const worker = new Worker(this.tasks[taskId].workerFilename, { workerData: this.tasks[taskId].data })
          worker.once('message', resolve)
          worker.once('error', reject)
          worker.once('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
          })
        })
      }
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

		this.emit('error', { taskId, task: this.tasks[taskId], error: error.message })
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
