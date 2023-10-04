const { fork, exec } = require('child_process')
const chokidar = require('chokidar')

module.exports = class ForkController {
  static SPAWN_STATE = {
    WAITING: -1,
    SPAWNING: 0,
    SPAWNED: 1,
    KILLING: 2,
    KILLED: 3
  }

  forks = {}
  spawnState = ForkController.SPAWN_STATE.WAITING
  watcher = null
  readyPromise = Promise.resolve()
  restartHandler = null

  constructor({ forks = [], watch = true, watchCWD = '.' } = {}) {
    this.addForks(forks)

    if (watch) this.setWatcher(watch, watchCWD)
  }

  removeDuplicates(inputArray) {
    return inputArray.filter((item, pos, array) => array.indexOf(item) === pos)
  }

  setRestartHandler(fn) {
    if (typeof fn === 'function') this.restartHandler = fn
  }

  setWatcher(watchGlobOrBoolean, cwd) {
    if (this.watcher) return

    let watchGlob = typeof watchGlobOrBoolean === 'boolean' && watchGlobOrBoolean === true ? Object.keys(this.forks) : []

    if (typeof watchGlobOrBoolean === 'string') watchGlob.push(watchGlobOrBoolean)

    watchGlob = this.removeDuplicates(watchGlob)
    if (watchGlob.length) {
      if (watchGlob.length === 1) watchGlob = watchGlob[0]

      const ignored = new RegExp('node_modules|(^|[\\/])\\..')

      this.watcher = chokidar.watch(watchGlob, {
        ignored,
        cwd,
        persistent: false
      }).on('change', this.handleFileChange.bind(this))
    }
  }

  addForks(forks) {
    if (this.spawnState !== ForkController.SPAWN_STATE.WAITING) return

    for (let i = 0; i < forks.length; i++) {
      const {
        modulePath = forks[i],
        execArgv = [],
        parameters = [],
        stdio = ['pipe', 'pipe', 'pipe', 'ipc'],
        detached = false,
        stdout = false,
        stderr = false,
        messageTo = null,
        waitForReady = false,
      } = forks[i]

      if (this.forks[modulePath]) continue

      this.forks[modulePath] = {
        process: null,
        state: ForkController.SPAWN_STATE.WAITING,
        waitForReady,
        stdout,
        stderr,
        options: {
          stdio,
          execArgv,
          detached,
        },
        parameters,
        messageTo
      }
    }
  }

  processLineSplit(line, limit = 4) {
    const matches = line.match(/\S+/g)
    
    return [...matches.slice(0, limit), matches.slice(limit).join(' ')]
  }

  findProcess(processName) {
    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'wmic PROCESS GET ParentProcessId,ProcessId,Name,Status,CommandLine' : 'ps -e -o ppid,pid,comm,stat,cmd'

      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(error)

        const [rawHeader, ...lines] = stdout.trim().split('\n').map((line) => line.trim().replace(/\s+/g, ' '))

        const header = rawHeader.split(/\s/g).map(this.normalizeProcessHeader)
        const processList = lines.map((line) => Object.fromEntries(this.processLineSplit(line, header.length - 1).map((value, index) => {
          const propName = header[index]

          value = value.trim()
          if (propName === 'PPID' || propName === 'PID') {
            value = parseInt(value, 10)
          }

          return [propName, value]
        })))
        
        const filtered = processList.filter((proc) => proc.COMMAND.toLowerCase().indexOf(processName.toLowerCase()) > -1)

        resolve(filtered)
      })
    })
  }

  normalizeProcessHeader(str) {
    switch (str) {
      case 'Name':  // for win32
      case 'COMM':  // for darwin
        return 'COMMAND'
        break
      case 'ParentProcessId':
        return 'PPID'
        break
      case 'ProcessId':
        return 'PID'
        break
      case 'Status':
        return 'STAT'
        break
      case 'CommandLine':
        return 'CMD'
        break
      default:
        return str
    }
  }

  async findModuleProcess(modulePath) {
    const nodeProcesses = await this.findProcess('node')

    return nodeProcesses.filter((proc) => proc.CMD.toLowerCase().indexOf(modulePath.toLowerCase()) > -1 && proc.PPID === process.pid)
  }

  spawn(modulePath) {
    return new Promise(async (resolve, reject) => {
      const moduleProcesses = await this.findModuleProcess(modulePath)
      if (moduleProcesses.length) {
        //console.log(moduleProcesses)
        console.log(`${modulePath} is already running with PID(s) ${moduleProcesses.map((proc) => proc.PID).join(', ')}`)

        return resolve()
      }

      let resolved = false

      this.forks[modulePath].state = ForkController.SPAWN_STATE.SPAWNING
      this.forks[modulePath].process = fork(modulePath, this.forks[modulePath].parameters, this.forks[modulePath].options)
  
      if (this.forks[modulePath].messageTo) {
        const emitTo = typeof this.forks[modulePath].messageTo === 'string' ? [this.forks[modulePath].messageTo] : this.forks[modulePath].messageTo
        const receivers = emitTo.reduce((acc, cur) => {
          if (this.forks[cur]) acc.push(this.forks[cur])
  
          return acc
        }, [])
  
        this.forks[modulePath].process.on('message', (message) => receivers.forEach((receiver) => receiver.process.send(message)))
      }

      if (typeof this.forks[modulePath].stdout === 'function') {
        this.forks[modulePath].process.stdout.on('data', this.forks[modulePath].stdout)
      }
  
      if (typeof this.forks[modulePath].stderr === 'function') {
        this.forks[modulePath].process.stderr.on('data', this.forks[modulePath].stderr)
      }

      const readyEventName = this.forks[modulePath].waitForReady ? 'ready' : 'spawn'
      this.forks[modulePath].process.once(readyEventName, () => {
        this.forks[modulePath].state = ForkController.SPAWN_STATE.SPAWNED
        resolved = true
  
        resolve(resolved)
      })
  
      this.forks[modulePath].process.once('error', (error) => {
        if (!resolved) {
          reject(error)
        }
      })

      this.forks[modulePath].process.on('close', async () => {
        this.forks[modulePath].state = ForkController.SPAWN_STATE.KILLED

        if (this.spawnState !== ForkController.SPAWN_STATE.KILLING) await this.respawn(modulePath)
      })
    })
  }

  respawn(modulePath) {
    if (this.forks[modulePath].state !== ForkController.SPAWN_STATE.KILLED) return

    this.forks[modulePath].process = null

    return this.spawn(modulePath)
  }

  spawnAll() {
    if (this.spawnState !== ForkController.SPAWN_STATE.WAITING) return

    this.spawnState = ForkController.SPAWN_STATE.SPAWNING

    const events = [
      'exit',
      'SIGINT',
      'SIGUSR1',
      'SIGUSR2',
      'uncaughtException',
      'SIGTERM'
    ]

    events.forEach((eventType) => process.once(eventType, this.gracefulShutdown.bind(this)))
  
    const promises = []
    for (const modulePath in this.forks) {
      const promise = this.spawn(modulePath)

      promises.push(promise)
    }
  
    return Promise.all(promises).then((forks) => {
      this.spawnState = ForkController.SPAWN_STATE.SPAWNED
    })
  }

  waitForExit() {
    return new Promise((resolve) => {
      const promises = []
      for (const modulePath in this.forks) {
        if (this.forks[modulePath].process) {
          const promise = new Promise((resolve) => this.forks[modulePath].process.once('close', resolve))

          promises.push(promise)
        }
      }

      Promise.all(promises).then(resolve)
    })
  }

  gracefulShutdown() {
    this.spawnState = ForkController.SPAWN_STATE.KILLING
    this.readyPromise = new Promise((resolve, reject) => {
      const promises = [this.waitForExit()]
      for (const modulePath in this.forks) {
        this.kill(this.forks[modulePath])
      }
  
      if (this.watcher) {
        promises.push(this.watcher.close())
      }
      
      Promise.all(promises).then(() => {
        this.spawnState = ForkController.SPAWN_STATE.WAITING

        resolve()
      }).catch(reject)
    })
  }

  kill(fork) {
    fork.state = ForkController.SPAWN_STATE.KILLING

    if (fork.process) {
      process.kill(fork.process.pid, 'SIGTERM')
    }
  }



  handleFileChange(path) {
    if (typeof this.restartHandler !== 'function') return

    console.log(`${path} changed, restarting...`)

    this.restartHandler()
  }
}